// DAL: visitors (heartbeat presence) + listens (lượt nghe thuyết minh).
import { run, get, all } from '../db.js';

function rowToVisitor(r) {
  if (!r) return null;
  return {
    visitorId: r.visitor_id,
    siteId: r.site_id,
    lat: r.lat,
    lng: r.lng,
    accuracy: r.accuracy,
    source: r.source,
    lang: r.lang,
    device: r.device,
    userAgent: r.user_agent,
    qrSiteId: r.qr_site_id,
    qrMs: r.qr_ms,
    isSim: !!r.is_sim,
    firstSeen: r.first_seen,
    lastSeen: r.last_seen,
    lastSeenMs: r.last_seen_ms
  };
}

export const visitorRepository = {
  async findById(visitorId) {
    return rowToVisitor(await get('SELECT * FROM visitors WHERE visitor_id = ?', visitorId));
  },
  async upsert(v) {
    await run(
      `INSERT INTO visitors (visitor_id, site_id, lat, lng, accuracy, source, lang, device, user_agent, qr_site_id, qr_ms,
         is_sim, first_seen, last_seen, last_seen_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE site_id = VALUES(site_id), lat = VALUES(lat), lng = VALUES(lng),
         accuracy = VALUES(accuracy), source = VALUES(source), lang = VALUES(lang), device = VALUES(device),
         user_agent = VALUES(user_agent), qr_site_id = VALUES(qr_site_id), qr_ms = VALUES(qr_ms),
         is_sim = VALUES(is_sim), last_seen = VALUES(last_seen), last_seen_ms = VALUES(last_seen_ms)`,
      v.visitorId, v.siteId ?? null, v.lat ?? null, v.lng ?? null, v.accuracy ?? null, v.source ?? null,
      v.lang ?? null, v.device ?? null, v.userAgent ?? null, v.qrSiteId ?? null, v.qrMs ?? null,
      v.isSim ? 1 : 0, v.firstSeen, v.lastSeen, v.lastSeenMs
    );
  },
  async findLive(sinceMs) {
    return (await all('SELECT * FROM visitors WHERE last_seen_ms >= ? ORDER BY last_seen_ms DESC', sinceMs)).map(rowToVisitor);
  },
  async countLiveAtSite(siteId, sinceMs) {
    return (await get('SELECT COUNT(*) AS n FROM visitors WHERE site_id = ? AND last_seen_ms >= ?', siteId, sinceMs)).n;
  },
  async findSimulated() {
    return (await all("SELECT * FROM visitors WHERE is_sim = 1 AND visitor_id LIKE 'sim-%'")).map(rowToVisitor);
  },
  async deleteSimulated() {
    return (await run("DELETE FROM visitors WHERE is_sim = 1 AND visitor_id LIKE 'sim-%'")).changes;
  },
  async delete(visitorId) {
    await run('DELETE FROM visitors WHERE visitor_id = ?', visitorId);
  },
  async purgeOlderThan(ms) {
    return (await run("DELETE FROM visitors WHERE last_seen_ms < ? AND visitor_id NOT LIKE 'sim-%'", ms)).changes;
  }
};

export const listenRepository = {
  /** True if this visitor already has a listen row for the same site/exhibit since sinceMs (de-dup reloads). */
  async existsRecent(visitorId, siteId, exhibitId, sinceMs) {
    if (!visitorId) return false;
    return !!(await get(
      "SELECT 1 AS x FROM listens WHERE visitor_id = ? AND site_id = ? AND IFNULL(exhibit_id, '') = ? AND created_ms >= ? LIMIT 1",
      visitorId, siteId, exhibitId ?? '', sinceMs));
  },
  async insert(l) {
    await run(`INSERT INTO listens (site_id, exhibit_id, lang, visitor_id, locked, created_at, created_ms, demo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      l.siteId, l.exhibitId ?? null, l.lang ?? null, l.visitorId ?? null, l.locked ? 1 : 0,
      l.createdAt, l.createdMs, l.demo ? 1 : 0);
  },
  async between(fromMs, toMs) {
    return all('SELECT site_id, exhibit_id, visitor_id, locked, created_ms FROM listens WHERE created_ms >= ? AND created_ms < ?', fromMs, toMs);
  },
  async countBetween(fromMs, toMs) {
    return (await get('SELECT COUNT(*) AS n FROM listens WHERE created_ms >= ? AND created_ms < ?', fromMs, toMs)).n;
  },
  async distinctVisitorsBetween(fromMs, toMs) {
    return (await get('SELECT COUNT(DISTINCT visitor_id) AS n FROM listens WHERE created_ms >= ? AND created_ms < ?', fromMs, toMs)).n;
  },
  async perSiteBetween(fromMs, toMs) {
    return all('SELECT site_id, COUNT(*) AS n FROM listens WHERE created_ms >= ? AND created_ms < ? GROUP BY site_id', fromMs, toMs);
  }
};
