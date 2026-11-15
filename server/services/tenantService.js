// BLL: quản lý ban quản lý (tenant) – chỉ quản trị nền tảng (superadmin) được gọi.
// Gồm: tạo / sửa / khoá / xoá ban, gán địa điểm cho ban, tạo và xoá tài khoản quản trị của ban.
import { tenantRepository } from '../repositories/tenantRepository.js';
import { adminRepository, sessionRepository } from '../repositories/adminRepository.js';
import { hashPassword, publicAdmin } from './adminAuthService.js';
import { DEFAULT_TENANT_ID, transaction } from '../db.js';
import { badRequest, notFound, conflict } from '../utils/http.js';
import { iso } from '../utils/time.js';

/** "Ban quản lý Đảo Ti Tốp" -> "ban-quan-ly-dao-ti-top" */
export function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function normalizeTenant(input, previous = null) {
  const src = { ...(previous || {}), ...(input || {}) };
  const name = String(src.name || '').trim();
  if (!name) throw badRequest('Tên ban quản lý không được để trống');
  if (name.length > 255) throw badRequest('Tên ban quản lý quá dài');
  const slug = slugify(src.slug || name);
  if (!slug) throw badRequest('Mã định danh (slug) không hợp lệ');
  return { name, slug, isActive: src.isActive === undefined ? true : !!src.isActive };
}

async function getOr404(id) {
  const t = await tenantRepository.findById(Number(id));
  if (!t) throw notFound('Không tìm thấy ban quản lý');
  return t;
}

async function withSites(tenants) {
  const owners = await tenantRepository.siteOwners();
  return tenants.map((t) => ({
    ...t,
    isDefault: t.id === DEFAULT_TENANT_ID,
    siteIds: [...owners].filter(([, tid]) => tid === t.id).map(([sid]) => sid).sort((a, b) => a - b)
  }));
}

async function tenantAdminOr404(adminId) {
  const a = await adminRepository.findById(Number(adminId));
  if (!a || a.tenantId == null) throw notFound('Không tìm thấy tài khoản của ban quản lý');
  return a;
}

function checkPassword(password) {
  if (!password || String(password).length < 6) throw badRequest('Mật khẩu phải có ít nhất 6 ký tự');
}

export const tenantService = {
  async list() {
    return withSites(await tenantRepository.findAll());
  },

  async create(input) {
    const t = normalizeTenant(input);
    if (await tenantRepository.findBySlug(t.slug)) throw conflict(`Mã định danh "${t.slug}" đã được dùng`);
    const created = await tenantRepository.insert({ ...t, createdAt: iso() });
    return (await withSites([created]))[0];
  },

  async update(id, input) {
    const prev = await getOr404(id);
    const t = normalizeTenant(input, prev);
    if (prev.id === DEFAULT_TENANT_ID && !t.isActive) throw badRequest('Không thể khoá ban quản lý mặc định');
    const other = await tenantRepository.findBySlug(t.slug);
    if (other && other.id !== prev.id) throw conflict(`Mã định danh "${t.slug}" đã được dùng`);
    return (await withSites([await tenantRepository.update(prev.id, t)]))[0];
  },

  async remove(id) {
    const t = await getOr404(id);
    if (t.id === DEFAULT_TENANT_ID) throw badRequest('Không thể xoá ban quản lý mặc định');
    if (t.siteCount || t.packageCount || t.codeCount) {
      throw conflict('Ban quản lý còn địa điểm, gói vé hoặc mã kích hoạt. Hãy chuyển địa điểm sang ban khác và xoá gói vé, mã trước.');
    }
    return transaction(async () => {
      for (const a of await adminRepository.listByTenant(t.id)) await adminRepository.delete(a.id);
      await tenantRepository.delete(t.id);
      return { ok: true };
    });
  },

  /**
   * Đặt danh sách địa điểm của ban. Địa điểm được thêm vào sẽ chuyển từ ban cũ sang;
   * địa điểm bị bỏ ra trả về ban quản lý mặc định.
   */
  async setSites(id, siteIds) {
    const t = await getOr404(id);
    if (!Array.isArray(siteIds)) throw badRequest('siteIds phải là một mảng');
    const owners = await tenantRepository.siteOwners();
    const wanted = [...new Set(siteIds.map(Number))];
    for (const sid of wanted) if (!owners.has(sid)) throw badRequest(`Địa điểm id=${sid} không tồn tại`);
    const removed = [...owners].filter(([sid, tid]) => tid === t.id && !wanted.includes(sid)).map(([sid]) => sid);
    if (removed.length && t.id === DEFAULT_TENANT_ID) {
      throw badRequest('Muốn bớt địa điểm của ban mặc định, hãy gán địa điểm đó cho một ban khác.');
    }
    return transaction(async () => {
      await tenantRepository.setSitesTenant(wanted, t.id);
      await tenantRepository.setSitesTenant(removed, DEFAULT_TENANT_ID);
      return (await withSites([await tenantRepository.findById(t.id)]))[0];
    });
  },

  // ---------- tài khoản quản trị của từng ban ----------
  async listAdmins(id) {
    const t = await getOr404(id);
    return (await adminRepository.listByTenant(t.id)).map(publicAdmin);
  },

  async createAdmin(id, input = {}) {
    const t = await getOr404(id);
    const username = String(input.username || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,64}$/.test(username)) throw badRequest('Tên đăng nhập gồm 3–64 ký tự a-z, 0-9, ".", "_" hoặc "-"');
    if (await adminRepository.findByUsername(username)) throw conflict('Tên đăng nhập đã tồn tại');
    checkPassword(input.password);
    const { hash, salt } = hashPassword(input.password);
    const a = await adminRepository.insert({
      username,
      displayName: String(input.displayName || '').trim() || username,
      role: 'admin',
      tenantId: t.id,
      passwordHash: hash,
      salt,
      createdAt: iso()
    });
    return publicAdmin(a);
  },

  async deleteAdmin(adminId) {
    const a = await tenantAdminOr404(adminId);
    await adminRepository.delete(a.id);
    return { ok: true };
  },

  async resetAdminPassword(adminId, password) {
    const a = await tenantAdminOr404(adminId);
    checkPassword(password);
    const { hash, salt } = hashPassword(password);
    await adminRepository.setPassword(a.id, hash, salt);
    await sessionRepository.deleteForAdmin(a.id, ''); // buộc đăng nhập lại bằng mật khẩu mới
    return { ok: true };
  }
};
