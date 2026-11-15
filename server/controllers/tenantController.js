// Controller layer (admin API): quản lý ban quản lý (tenant). Mọi handler chạy sau requireAdmin + requireSuperAdmin.
import { tenantService } from '../services/tenantService.js';

export const tenantController = {
  async list(req, res) { res.json(await tenantService.list()); },
  async create(req, res) { res.status(201).json(await tenantService.create(req.body || {})); },
  async update(req, res) { res.json(await tenantService.update(req.params.id, req.body || {})); },
  async remove(req, res) { res.json(await tenantService.remove(req.params.id)); },
  async setSites(req, res) { res.json(await tenantService.setSites(req.params.id, (req.body || {}).siteIds)); },

  // ---- tài khoản quản trị của ban ----
  async listAdmins(req, res) { res.json(await tenantService.listAdmins(req.params.id)); },
  async createAdmin(req, res) { res.status(201).json(await tenantService.createAdmin(req.params.id, req.body || {})); },
  async deleteAdmin(req, res) { res.json(await tenantService.deleteAdmin(req.params.adminId)); },
  async resetAdminPassword(req, res) {
    res.json(await tenantService.resetAdminPassword(req.params.adminId, (req.body || {}).password));
  }
};
