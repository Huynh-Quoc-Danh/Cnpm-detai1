// Controller layer (admin API). All handlers run behind requireAdmin except login.
import { adminAuthService } from '../services/adminAuthService.js';
import { statsService } from '../services/statsService.js';
import { visitorService } from '../services/visitorService.js';
import { siteService } from '../services/siteService.js';
import { orderService } from '../services/orderService.js';
import { ticketService } from '../services/ticketService.js';
import { settingsService } from '../services/settingsService.js';
import { uploadService } from '../services/uploadService.js';
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
    res.json(await statsService.overview());
  },
  async sales(req, res) {
    res.json(await statsService.sales(req.query.range || 'day'));
  },
  async live(req, res) {
    res.json(await visitorService.live());
  },

  // ---- sites & exhibits ----
  async listSites(req, res) { res.json(await siteService.listAdmin()); },
  async getSite(req, res) { res.json(await siteService.getAdmin(req.params.id)); },
  async createSite(req, res) { res.status(201).json(await siteService.create(req.body || {})); },
  async updateSite(req, res) { res.json(await siteService.update(req.params.id, req.body || {})); },
  async deleteSite(req, res) { res.json(await siteService.remove(req.params.id)); },
  async createExhibit(req, res) { res.status(201).json(await siteService.createExhibit(req.params.id, req.body || {})); },
  async updateExhibit(req, res) { res.json(await siteService.updateExhibit(req.params.id, req.body || {})); },
  async deleteExhibit(req, res) { res.json(await siteService.removeExhibit(req.params.id)); },

  // ---- packages ----
  async listPackages(req, res) { res.json(await orderService.listPackages({ includeInactive: true })); },
  async createPackage(req, res) { res.status(201).json(await orderService.createPackage(req.body || {})); },
  async updatePackage(req, res) { res.json(await orderService.updatePackage(req.params.id, req.body || {})); },
  async deletePackage(req, res) { res.json(await orderService.deletePackage(req.params.id)); },

  // ---- orders ----
  async listOrders(req, res) {
    const { status, from, to, q, page, pageSize } = req.query;
    res.json(await orderService.search({ status, from, to, q, page, pageSize }));
  },
  async patchOrder(req, res) {
    res.json(await orderService.adminSetStatus(req.params.id, (req.body || {}).status));
  },
  async ordersCsv(req, res) {
    const { status, from, to, q } = req.query;
    const csv = await orderService.csv({ status, from, to, q });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="don-hang-${vnDateKey(Date.now())}.csv"`);
    res.send(csv);
  },

  // ---- claim codes ----
  async listCodes(req, res) { res.json(await ticketService.listCodes()); },
  async createCode(req, res) { res.status(201).json(await ticketService.createCode(req.body || {})); },
  async updateCode(req, res) { res.json(await ticketService.updateCode(req.params.code, req.body || {})); },
  async deleteCode(req, res) { res.json(await ticketService.deleteCode(req.params.code)); },

  // ---- settings & uploads ----
  async getSettings(req, res) { res.json(await settingsService.get()); },
  async putSettings(req, res) { res.json(await settingsService.update(req.body || {})); },
  async upload(req, res) { res.status(201).json(uploadService.save(req.body || {})); }
};
