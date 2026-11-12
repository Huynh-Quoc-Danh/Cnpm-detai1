// Route table: maps URLs to controller handlers.
import { Router } from 'express';
import { publicController as p } from '../controllers/publicController.js';
import { adminController as a } from '../controllers/adminController.js';
import { requireAdmin, apiNotFound } from '../middleware/index.js';

export function buildApiRouter() {
  const r = Router();

  // ---- public ----
  r.get('/health', p.health);
  r.get('/config', p.config);
  r.get('/network', p.network);
  r.get('/sites', p.listSites);
  r.get('/sites/:id', p.getSite);
  r.get('/sites/:id/narration', p.narration);
  r.get('/packages', p.packages);
  r.post('/orders', p.createOrder);
  r.get('/orders/:id', p.getOrder);
  r.post('/orders/:id/pay', p.payOrder);
  r.post('/tickets/redeem', p.redeem);
  r.get('/tickets/verify', p.verifyTicket);
  r.post('/visitors/heartbeat', p.heartbeat);

  // ---- admin ----
  r.post('/admin/login', a.login);
  const ad = Router();
  ad.use(requireAdmin);
  ad.post('/logout', a.logout);
  ad.get('/me', a.me);
  ad.post('/password', a.changePassword);
  ad.get('/stats/overview', a.overview);
  ad.get('/stats/sales', a.sales);
  ad.get('/live', a.live);
  ad.get('/sites', a.listSites);
  ad.post('/sites', a.createSite);
  ad.get('/sites/:id', a.getSite);
  ad.put('/sites/:id', a.updateSite);
  ad.delete('/sites/:id', a.deleteSite);
  ad.post('/sites/:id/exhibits', a.createExhibit);
  ad.put('/exhibits/:id', a.updateExhibit);
  ad.delete('/exhibits/:id', a.deleteExhibit);
  ad.get('/packages', a.listPackages);
  ad.post('/packages', a.createPackage);
  ad.put('/packages/:id', a.updatePackage);
  ad.delete('/packages/:id', a.deletePackage);
  ad.get('/orders.csv', a.ordersCsv);
  ad.get('/orders', a.listOrders);
  ad.patch('/orders/:id', a.patchOrder);
  ad.get('/codes', a.listCodes);
  ad.post('/codes', a.createCode);
  ad.put('/codes/:code', a.updateCode);
  ad.delete('/codes/:code', a.deleteCode);
  ad.get('/settings', a.getSettings);
  ad.put('/settings', a.putSettings);
  ad.post('/upload', a.upload);
  r.use('/admin', ad);

  r.use(apiNotFound);
  return r;
}
