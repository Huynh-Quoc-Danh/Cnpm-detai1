// Controller layer (public API): parse HTTP input -> call services -> JSON output.
import os from 'node:os';
import { siteService } from '../services/siteService.js';
import { settingsService } from '../services/settingsService.js';
import { orderService } from '../services/orderService.js';
import { ticketService } from '../services/ticketService.js';
import { visitorService } from '../services/visitorService.js';
import { bearerToken, badRequest } from '../utils/http.js';
import { normLang } from '../utils/text.js';

const visitorIdOf = (req) => {
  const v = req.get('x-visitor-id') || (req.body && req.body.visitorId) || null;
  return v ? String(v).slice(0, 64) : null;
};

function requestPort(req) {
  const host = req.get('x-forwarded-host') || req.get('host') || '';
  const m = /:(\d+)$/.exec(host.split(',')[0].trim());
  if (m) return Number(m[1]);
  return req.socket.localPort || Number(process.env.PORT) || 3001;
}

export const publicController = {
  async health(req, res) {
    res.json({ ok: true, sites: await siteService.count(), time: new Date().toISOString() });
  },
  async config(req, res) {
    res.json(await settingsService.publicConfig());
  },
  async network(req, res) {
    const port = req.query.port ? Number(req.query.port) : requestPort(req);
    const lanUrls = [];
    const ifaces = os.networkInterfaces();
    for (const [name, list] of Object.entries(ifaces)) {
      for (const a of list || []) {
        const fam = typeof a.family === 'string' ? a.family : a.family === 4 ? 'IPv4' : 'IPv6';
        if (fam !== 'IPv4' || a.internal) continue;
        if (a.address.startsWith('169.254.')) continue;
        const url = `http://${a.address}:${port}`;
        // Prefer typical home/campus LAN ranges first; virtual adapters last.
        const virtual = /vEthernet|VirtualBox|VMware|WSL|Hyper-V|docker|br-|veth/i.test(name);
        lanUrls.push({ url, score: (a.address.startsWith('192.168.') ? 0 : a.address.startsWith('10.') ? 1 : 2) + (virtual ? 10 : 0) });
      }
    }
    lanUrls.sort((a, b) => a.score - b.score);
    res.json({ lanUrls: lanUrls.map((x) => x.url) });
  },
  async listSites(req, res) {
    res.json(await siteService.listPublic());
  },
  async getSite(req, res) {
    res.json(await siteService.getPublic(req.params.id));
  },
  async narration(req, res) {
    const payload = await siteService.getNarration(req.params.id, {
      lang: normLang(req.query.lang),
      exhibitId: req.query.exhibitId || null,
      token: bearerToken(req),
      visitorId: visitorIdOf(req)
    });
    res.set('Cache-Control', 'no-store');
    res.json(payload);
  },
  async packages(req, res) {
    res.json(await orderService.listPackages());
  },
  async createOrder(req, res) {
    const b = req.body || {};
    if (b.packageId == null) throw badRequest('packageId là bắt buộc');
    const order = await orderService.create({
      packageId: b.packageId,
      siteId: b.siteId,
      visitorId: b.visitorId || visitorIdOf(req),
      lang: b.lang,
      method: b.method || 'vietqr',
      customerName: b.customerName,
      customerPhone: b.customerPhone
    });
    res.status(201).json(order);
  },
  async getOrder(req, res) {
    res.set('Cache-Control', 'no-store');
    res.json(await orderService.get(req.params.id));
  },
  async payOrder(req, res) {
    res.json(await orderService.pay(req.params.id, { method: req.body && req.body.method }));
  },
  async redeem(req, res) {
    const b = req.body || {};
    const result = await ticketService.redeem(b.code, b.visitorId || visitorIdOf(req));
    res.status(result.ok ? 200 : 400).json(result);
  },
  async verifyTicket(req, res) {
    res.set('Cache-Control', 'no-store');
    res.json(await ticketService.verify(bearerToken(req)));
  },
  async heartbeat(req, res) {
    const body = { ...(req.body || {}) };
    if (!body.visitorId) body.visitorId = visitorIdOf(req);
    res.json(await visitorService.heartbeat(body, req.get('user-agent')));
  }
};
