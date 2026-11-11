// Seeding: sites from server/seed/sites/*.json, packages, claim codes, default admin, settings and
// ~90 days of demo order / listen history (flagged demo = 1) so dashboards are not empty.
import fs from 'node:fs';
import path from 'node:path';
import { initDb, transaction, insertMany, SEED_DIR } from './db.js';
import { siteService } from './services/siteService.js';
import { adminAuthService } from './services/adminAuthService.js';
import { DEFAULT_SETTINGS } from './services/settingsService.js';
import { packageRepository } from './repositories/packageRepository.js';
import { codeRepository } from './repositories/ticketRepository.js';
import { siteRepository, exhibitRepository } from './repositories/siteRepository.js';
import { settingsRepository } from './repositories/adminRepository.js';
import { newOrderId } from './utils/ids.js';
import { iso, vnDayStart, vnParts, DAY_MS, HOUR_MS } from './utils/time.js';

const SITES_DIR = path.join(SEED_DIR, 'sites');

export const SEED_PACKAGES = [
  {
    code: 'SITE_SINGLE', nameVi: 'Vé lẻ 1 điểm', nameEn: 'Single site pass',
    descVi: 'Nghe trọn thuyết minh 1 địa điểm và các điểm nhấn trong 24 giờ.',
    descEn: 'Full narration of one site and its highlights for 24 hours.',
    price: 29000, scope: 'site', durationHours: 24, maxPeople: 1, sortOrder: 1
  },
  {
    code: 'ALL_DAY', nameVi: 'Vé ngày – Toàn vịnh', nameEn: 'Day pass – Whole bay',
    descVi: 'Mở khoá toàn bộ địa điểm và điểm nhấn trong 24 giờ, kèm bản đồ GPS tự động.',
    descEn: 'Unlock every site and highlight for 24 hours, with automatic GPS narration.',
    price: 99000, scope: 'all', durationHours: 24, maxPeople: 1, sortOrder: 2,
    badgeVi: 'Phổ biến nhất', badgeEn: 'Most popular'
  },
  {
    code: 'FAMILY', nameVi: 'Gói gia đình', nameEn: 'Family pack',
    descVi: 'Toàn bộ địa điểm cho tối đa 4 người trong 48 giờ.',
    descEn: 'All sites for up to 4 people for 48 hours.',
    price: 199000, scope: 'all', durationHours: 48, maxPeople: 4, sortOrder: 3,
    badgeVi: 'Tiết kiệm', badgeEn: 'Best value'
  }
];

export const SEED_CODES = [
  { code: 'HALONG', scope: 'all', siteIds: [], durationHours: 24, maxUses: 1000, note: 'Mã demo cho buổi thuyết trình đồ án' },
  { code: 'VIP2026', scope: 'all', siteIds: [], durationHours: 72, maxUses: 100, note: 'Mã khách mời VIP' },
  { code: 'DEMO', scope: 'all', siteIds: [], durationHours: 2, maxUses: 10000, note: 'Mã dùng thử 2 giờ' }
];

function readSeedFiles() {
  if (!fs.existsSync(SITES_DIR)) {
    console.warn(`[seed] Không tìm thấy thư mục ${SITES_DIR} – bỏ qua dữ liệu địa điểm.`);
    return [];
  }
  const docs = [];
  const files = fs.readdirSync(SITES_DIR).filter((f) => f.toLowerCase().endsWith('.json'));
  files.sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b));
  for (const f of files) {
    try {
      const raw = fs.readFileSync(path.join(SITES_DIR, f), 'utf8').replace(/^﻿/, '');
      const doc = JSON.parse(raw);
      if (!doc || typeof doc !== 'object' || !Number.isInteger(Number(doc.id))) throw new Error('thiếu "id"');
      docs.push({ file: f, doc });
    } catch (err) {
      console.warn(`[seed] Bỏ qua ${f}: ${err.message}`);
    }
  }
  return docs;
}

/**
 * Import seed site files. With onlyNew=true, only sites whose id has never been seeded are added
 * (so sites deleted by an admin are not resurrected, and content added later is picked up).
 */
export async function seedSites({ onlyNew = false } = {}) {
  const seeded = new Set((await settingsRepository.get('seededSiteIds', [])) || []);
  let count = 0;
  for (const { file, doc } of readSeedFiles()) {
    const id = Number(doc.id);
    if (onlyNew && (seeded.has(id) || (await siteRepository.exists(id)))) continue;
    try {
      await siteService.importSeed(doc);
      seeded.add(id);
      count++;
    } catch (err) {
      console.warn(`[seed] Không nhập được ${file}: ${err.message}`);
    }
  }
  await settingsRepository.set('seededSiteIds', [...seeded].sort((a, b) => a - b));
  if (count) console.log(`[seed] Đã nhập ${count} địa điểm từ server/seed/sites.`);
  return count;
}

/**
 * Seed default rows exactly once per code. Codes already seeded are remembered in settings (key), so a
 * package / claim code deleted in the admin is NOT resurrected on the next restart.
 */
async function seedOnce(key, items, exists, insert) {
  let seeded = await settingsRepository.get(key, null);
  if (!Array.isArray(seeded)) {
    // Older databases: everything present at creation counts as seeded already.
    seeded = [];
    for (const it of items) if (await exists(it.code)) seeded.push(it.code);
    if (seeded.length) {
      await settingsRepository.set(key, seeded);
      return;
    }
  }
  const set = new Set(seeded);
  for (const it of items) {
    if (set.has(it.code)) continue;
    if (!(await exists(it.code))) await insert(it);
    set.add(it.code);
  }
  await settingsRepository.set(key, [...set]);
}

function seedPackages() {
  return seedOnce('seededPackageCodes', SEED_PACKAGES, async (c) => !!(await packageRepository.findByCode(c)), (p) => packageRepository.insert(p));
}

function seedCodes() {
  return seedOnce('seededClaimCodes', SEED_CODES, async (c) => !!(await codeRepository.findByCode(c)), (c) => codeRepository.insert({ ...c, createdAt: iso() }));
}

// ---------------- demo history ----------------
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương', 'Lý'];
const DEM = ['Văn', 'Thị', 'Minh', 'Ngọc', 'Thu', 'Đức', 'Hải', 'Thanh', 'Quang', 'Hoài'];
const TEN = ['An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Hùng', 'Lan', 'Linh', 'Long', 'Mai', 'Nam', 'Phương', 'Quân', 'Sơn', 'Trang', 'Tú', 'Vy', 'Yến'];
const FOREIGN = ['John Smith', 'Emma Wilson', 'Lucas Martin', 'Sophie Müller', 'Olivia Brown', 'Liam Johnson'];
const FOREIGN_BY_LANG = {
  en: FOREIGN,
  ko: ['Kim Min-jun', 'Lee Seo-yeon', 'Park Ji-hoon', 'Choi Yu-na', 'Jung Ha-eun'],
  ja: ['Tanaka Yui', 'Sato Haruto', 'Suzuki Aoi', 'Takahashi Ren'],
  zh: ['Wang Fang', 'Li Wei', 'Zhang Min', 'Liu Yang', 'Chen Jing']
};
/** Demo visitor language mix: vi 60 %, ko 14 %, en 12 %, zh 10 %, ja 4 %. */
const demoLang = (r) => (r < 0.6 ? 'vi' : r < 0.74 ? 'ko' : r < 0.86 ? 'en' : r < 0.96 ? 'zh' : 'ja');

// Hour-of-day weights (VN local), peaks 08–11h and 14–17h.
const HOUR_W = [0, 0, 0, 0, 0, 0.2, 0.6, 1.4, 2.6, 3.2, 3.4, 2.8, 1.8, 2.0, 2.9, 3.3, 3.1, 2.4, 1.4, 0.9, 0.6, 0.3, 0.1, 0];

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weighted(rand, items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) if ((r -= weights[i]) <= 0) return items[i];
  return items[items.length - 1];
}

export async function seedDemoHistory({ days = 90 } = {}) {
  const sites = await siteRepository.findAll();
  const packages = await packageRepository.findAll({ includeInactive: true });
  if (!packages.length) return { orders: 0, listens: 0 };
  const siteIds = sites.length ? sites.map((s) => s.id) : [1, 2, 3, 4, 5, 6, 7];
  const siteW = sites.length ? sites.map((s) => 1 + Math.log10(1 + (s.reviewsCount || 100))) : siteIds.map(() => 1);
  const exhibitsBySite = new Map();
  for (const id of siteIds) exhibitsBySite.set(id, (await exhibitRepository.findBySite(id)).map((e) => e.id));
  const pkgW = packages.map((p) => (p.code === 'SITE_SINGLE' ? 52 : p.code === 'ALL_DAY' ? 36 : p.code === 'FAMILY' ? 12 : 8));
  const rand = mulberry32(20261019);
  const now = Date.now();
  const today = vnDayStart(now);

  // Rows are collected in memory and written with multi-row INSERTs (much faster than one query per row).
  const orderRows = [];
  const listenRows = [];
  const insOrder = { run: (...v) => orderRows.push([...v, 1]) };
  const insListen = { run: (...v) => listenRows.push([...v, 1]) };
  const usedIds = new Set();
  let nOrders = 0, nListens = 0;

  const randomTimeInDay = (dayStart) => {
    const hour = weighted(rand, HOUR_W.map((_, h) => h), HOUR_W);
    return dayStart + hour * HOUR_MS + Math.floor(rand() * HOUR_MS);
  };

  {
    for (let d = days - 1; d >= 0; d--) {
      const dayStart = today - d * DAY_MS;
      const wd = vnParts(dayStart).weekday;
      const weekend = wd === 0 || wd === 6 ? 1.65 : wd === 5 ? 1.2 : 1;
      const growth = 0.7 + 0.45 * ((days - 1 - d) / Math.max(1, days - 1));
      const noise = 0.75 + rand() * 0.5;
      const nDay = Math.round(22 * weekend * growth * noise);
      const listenersPerOrder = 4 + rand() * 2.5; // ~18–25% conversion
      const nListeners = Math.round(nDay * listenersPerOrder);
      const visitors = [];
      for (let i = 0; i < nListeners; i++) {
        visitors.push({ id: `demo-${d}-${i}`, lang: demoLang(rand()), paid: false, site: weighted(rand, siteIds, siteW) });
      }
      // Orders
      for (let i = 0; i < nDay; i++) {
        const createdMs = randomTimeInDay(dayStart);
        if (createdMs > now) continue;
        const pkg = weighted(rand, packages, pkgW);
        const v = visitors[i % Math.max(1, visitors.length)] || { id: `demo-${d}-o${i}`, lang: 'vi', site: siteIds[0] };
        v.paid = true;
        let id = newOrderId();
        while (usedIds.has(id)) id = newOrderId();
        usedIds.add(id);
        const r = rand();
        const status = r < 0.93 ? 'paid' : r < 0.97 ? 'expired' : r < 0.99 ? 'cancelled' : 'refunded';
        const paidMs = status === 'paid' || status === 'refunded' ? createdMs + Math.floor(40000 + rand() * 200000) : null;
        if (paidMs && paidMs > now) continue;
        const method = weighted(rand, ['vietqr', 'momo', 'card'], [60, 27, 13]);
        const foreign = v.lang !== 'vi';
        const fl = FOREIGN_BY_LANG[v.lang] || FOREIGN;
        const name = rand() < 0.75
          ? foreign ? fl[Math.floor(rand() * fl.length)]
            : `${HO[Math.floor(rand() * HO.length)]} ${DEM[Math.floor(rand() * DEM.length)]} ${TEN[Math.floor(rand() * TEN.length)]}`
          : null;
        const phone = name && !foreign ? '09' + String(Math.floor(rand() * 1e8)).padStart(8, '0') : null;
        insOrder.run(id, pkg.id, pkg.nameVi, v.site, pkg.price, method, status, v.id, v.lang, name, phone,
          iso(createdMs), createdMs, paidMs ? iso(paidMs) : null, paidMs, iso(createdMs + 15 * 60000), `HLSG ${id}`);
        nOrders++;
      }
      // Listens
      for (const v of visitors) {
        const n = 1 + Math.floor(rand() * (v.paid ? 5 : 2.5));
        const base = randomTimeInDay(dayStart);
        for (let k = 0; k < n; k++) {
          const t = base + k * Math.floor(60000 + rand() * 600000);
          if (t > now) break;
          const site = k === 0 ? v.site : rand() < 0.5 ? v.site : weighted(rand, siteIds, siteW);
          const exs = exhibitsBySite.get(site) || [];
          const exId = exs.length && rand() < 0.45 ? exs[Math.floor(rand() * exs.length)] : null;
          insListen.run(site, exId, v.lang, v.id, v.paid ? 0 : 1, iso(t), t);
          nListens++;
        }
      }
    }
  }
  await transaction(async () => {
    await insertMany(`INSERT INTO orders (id, package_id, package_name, site_id, amount, method, status, visitor_id, lang,
      customer_name, customer_phone, created_at, created_ms, paid_at, paid_ms, expires_at, transfer_note, demo) VALUES ?`, orderRows);
    await insertMany(`INSERT INTO listens (site_id, exhibit_id, lang, visitor_id, locked, created_at, created_ms, demo) VALUES ?`, listenRows);
  });
  return { orders: nOrders, listens: nListens };
}

async function seedDefaults() {
  await transaction(async () => {
    await adminAuthService.ensureDefaultAdmin();
    if (!(await settingsRepository.get('app', null))) await settingsRepository.set('app', DEFAULT_SETTINGS);
    await seedPackages();
    await seedCodes();
  });
}

/** Full seed for a brand-new database. */
export async function seedAll() {
  await initDb();
  const t0 = Date.now();
  await seedDefaults();
  await seedSites();
  const demo = await seedDemoHistory();
  await settingsRepository.set('seededAt', iso());
  console.log(`[seed] Hoàn tất: ${await siteRepository.count({ includeInactive: true })} địa điểm, ${demo.orders} đơn hàng demo, ${demo.listens} lượt nghe demo (${Date.now() - t0} ms).`);
  console.log('[seed] Tài khoản quản trị mặc định: admin / admin123');
  return demo;
}

/** Idempotent top-up on every start (new seed files, missing defaults). */
export async function seedIncremental() {
  await seedDefaults();
  await seedSites({ onlyNew: true });
}


