// Controller layer (admin API). All handlers run behind requireAdmin except login.
// Multi-tenant: req.scope (gắn ở middleware) quyết định dữ liệu nào tài khoản được thấy và được sửa.
// Quản trị của một ban quản lý chỉ thao tác trên dữ liệu của ban mình; quản trị nền tảng thấy tất cả.
import { adminAuthService } from '../services/adminAuthService.js';
import { siteService } from '../services/siteService.js';
import { orderService } from '../services/orderService.js';
import { ticketService } from '../services/ticketService.js';
import { settingsService } from '../services/settingsService.js';
import { uploadService } from '../services/uploadService.js';
import { tenantScope } from '../services/tenantScopeService.js';
import { bearerToken } from '../utils/http.js';
import { vnDateKey } from '../utils/time.js';

export const adminController = {
  // ---- auth ----
  async login(req, res) {
    const { username, password } = req.body || {};
    res.json(await adminAuthService.login(username, password));
  },
  async logout(req, res) {
    res.json(await adminAuthService.logout(bearerToken(req)));
  },
  async me(req, res) {
    res.json({ admin: req.adminPublic });
  },
  async changePassword(req, res) {
    const { oldPassword, newPassword } = req.body || {};
    res.json(await adminAuthService.changePassword(req.admin, req.adminToken, oldPassword, newPassword));
  },

  // ---- stats ----
  async overview(req, res) {
    res.json(await tenantScope.overview(req.scope));
  },
  async sales(req, res) {
    res.json(await tenantScope.sales(req.scope, req.query.range || 'day'));
  },
  async live(req, res) {
    res.json(await tenantScope.live(req.scope));
  },

  // ---- sites & exhibits ----
  async listSites(req, res) { res.json(await tenantScope.listSites(req.scope)); },
  async getSite(req, res) {
    tenantScope.assertSite(req.scope, req.params.id);
    res.json(await siteService.getAdmin(req.params.id));
  },
  async createSite(req, res) {
    const body = req.body || {};
    const tenantId = await tenantScope.targetTenant(req.scope, body.tenantId);
    const site = await siteService.create(body);
    await tenantScope.claimSite(site.id, tenantId);
    res.status(201).json(site);
  },
  async updateSite(req, res) {
    tenantScope.assertSite(req.scope, req.params.id);
    res.json(await siteService.update(req.params.id, req.body || {}));
  },
  async deleteSite(req, res) {
    tenantScope.assertSite(req.scope, req.params.id);
    res.json(await siteService.remove(req.params.id));
  },
  async createExhibit(req, res) {
    tenantScope.assertSite(req.scope, req.params.id);
    res.status(201).json(await siteService.createExhibit(req.params.id, req.body || {}));
  },
  async updateExhibit(req, res) {
    await tenantScope.assertExhibit(req.scope, req.params.id);
    res.json(await siteService.updateExhibit(req.params.id, req.body || {}));
  },
  async deleteExhibit(req, res) {
    await tenantScope.assertExhibit(req.scope, req.params.id);
    res.json(await siteService.removeExhibit(req.params.id));
  },

  // ---- packages ----
  async listPackages(req, res) { res.json(await tenantScope.listPackages(req.scope)); },
  async createPackage(req, res) {
    const body = req.body || {};
    const tenantId = await tenantScope.targetTenant(req.scope, body.tenantId);
    const pkg = await orderService.createPackage(body);
    await tenantScope.claimPackage(pkg.id, tenantId);
    res.status(201).json(pkg);
  },
  async updatePackage(req, res) {
    await tenantScope.assertPackage(req.scope, req.params.id);
    res.json(await orderService.updatePackage(req.params.id, req.body || {}));
  },
  async deletePackage(req, res) {
    await tenantScope.assertPackage(req.scope, req.params.id);
    res.json(await orderService.deletePackage(req.params.id));
  },

  // ---- orders ----
  async listOrders(req, res) {
    const { status, from, to, q, page, pageSize } = req.query;
    res.json(await tenantScope.searchOrders(req.scope, { status, from, to, q, page, pageSize }));
  },
  async patchOrder(req, res) {
    await tenantScope.assertOrder(req.scope, req.params.id);
    res.json(await orderService.adminSetStatus(req.params.id, (req.body || {}).status));
  },
  async ordersCsv(req, res) {
    const { status, from, to, q } = req.query;
    const csv = await tenantScope.ordersCsv(req.scope, { status, from, to, q });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="don-hang-${vnDateKey(Date.now())}.csv"`);
    res.send(csv);
  },

  // ---- claim codes ----
  async listCodes(req, res) { res.json(await tenantScope.listCodes(req.scope)); },
  async createCode(req, res) {
    const body = req.body || {};
    const tenantId = await tenantScope.targetTenant(req.scope, body.tenantId);
    const code = await ticketService.createCode(tenantScope.codeInput(req.scope, body, { creating: true }));
    await tenantScope.claimCode(code.code, tenantId);
    res.status(201).json(code);
  },
  async updateCode(req, res) {
    await tenantScope.assertCode(req.scope, req.params.code);
    res.json(await ticketService.updateCode(req.params.code, tenantScope.codeInput(req.scope, req.body || {}, { creating: false })));
  },
  async deleteCode(req, res) {
    await tenantScope.assertCode(req.scope, req.params.code);
    res.json(await ticketService.deleteCode(req.params.code));
  },

  // ---- settings & uploads ----
  // Cài đặt là cấu hình chung của nền tảng: ai cũng đọc được, chỉ quản trị nền tảng được sửa (xem routes).
  async getSettings(req, res) { res.json(await settingsService.get()); },
  async putSettings(req, res) { res.json(await settingsService.update(req.body || {})); },
  async upload(req, res) { res.status(201).json(uploadService.save(req.body || {})); }
};
