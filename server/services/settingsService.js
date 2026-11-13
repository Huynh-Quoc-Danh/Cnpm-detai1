// BLL: application settings (stored in the settings table).
import { settingsRepository } from '../repositories/adminRepository.js';
import { badRequest } from '../utils/http.js';

export const APP_NAME = 'Hạ Long SmartGuide';

export const DEFAULT_SETTINGS = {
  publicBaseUrl: null,
  previewSeconds: 30,
  bank: { bankId: 'VCB', accountNo: '1023456789', accountName: 'HA LONG SMARTGUIDE' },
  simulateVisitors: true
};

const listeners = new Set();

function normalizeBaseUrl(v) {
  if (v == null) return null;
  let s = String(v).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    return u.origin + u.pathname.replace(/\/+$/, '');
  } catch {
    throw badRequest('publicBaseUrl không hợp lệ (ví dụ: https://abc.ngrok-free.app)');
  }
}

export const settingsService = {
  async get() {
    const stored = (await settingsRepository.get('app', {})) || {};
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      bank: { ...DEFAULT_SETTINGS.bank, ...(stored.bank || {}) }
    };
  },
  async update(patch = {}) {
    const cur = await this.get();
    const next = { ...cur };
    if ('publicBaseUrl' in patch) next.publicBaseUrl = normalizeBaseUrl(patch.publicBaseUrl);
    if ('previewSeconds' in patch) {
      const n = Number(patch.previewSeconds);
      if (!Number.isFinite(n) || n < 5 || n > 300) throw badRequest('previewSeconds phải trong khoảng 5–300 giây');
      next.previewSeconds = Math.round(n);
    }
    if (patch.bank && typeof patch.bank === 'object') {
      next.bank = {
        bankId: String(patch.bank.bankId ?? cur.bank.bankId).trim(),
        accountNo: String(patch.bank.accountNo ?? cur.bank.accountNo).trim(),
        accountName: String(patch.bank.accountName ?? cur.bank.accountName).trim()
      };
    }
    if ('simulateVisitors' in patch) next.simulateVisitors = !!patch.simulateVisitors;
    await settingsRepository.set('app', next);
    for (const fn of listeners) {
      try { fn(next, cur); } catch (e) { console.error('[settings] listener error', e); }
    }
    return next;
  },
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  async publicConfig() {
    const s = await this.get();
    return {
      appName: APP_NAME,
      previewSeconds: s.previewSeconds,
      publicBaseUrl: s.publicBaseUrl,
      bank: s.bank,
      currency: 'VND'
    };
  }
};
