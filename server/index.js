// Hạ Long SmartGuide API server (Express, 3 layers: controllers -> services -> repositories).
// In production (`npm run build && npm start`) the same port also serves the built SPA from dist/,
// so a single ngrok tunnel exposes web + API + uploads.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initDb, isFreshDb, closeDb, ROOT_DIR, UPLOAD_DIR, DB_LABEL } from './db.js';
import { seedAll, seedIncremental } from './seed.js';
import { buildApiRouter } from './routes/index.js';
import { cors, errorHandler } from './middleware/index.js';
import { visitorService } from './services/visitorService.js';

const PORT = Number(process.env.PORT) || 3001;
const DIST_DIR = path.join(ROOT_DIR, 'dist');

try {
  await initDb();
  if (isFreshDb()) await seedAll();
  else await seedIncremental();
} catch (err) {
  console.error('[server] Khởi tạo cơ sở dữ liệu thất bại:', err.message);
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '40mb' }));

app.use('/api', cors, buildApiRouter());
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', fallthrough: false }));

const hasDist = fs.existsSync(path.join(DIST_DIR, 'index.html'));
if (hasDist) {
  app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }));
  // SPA fallback: any other GET that accepts HTML returns index.html (/, /admin, /pay/:id, ...).
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.type('html').send(
      '<meta charset="utf-8"><h3>Hạ Long SmartGuide API</h3><p>Chưa có bản build giao diện (dist/). ' +
      'Chạy <code>npm run dev</code> rồi mở <a href="http://localhost:5173">http://localhost:5173</a>, ' +
      'hoặc <code>npm run build</code> rồi <code>npm start</code>.</p>'
    );
  });
}

app.use(errorHandler);

visitorService.startSimulator();

const server = app.listen(PORT, '0.0.0.0', () => {
  const lan = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if ((a.family === 'IPv4' || a.family === 4) && !a.internal) lan.push(`http://${a.address}:${PORT}`);
  }
  console.log(`\n  Hạ Long SmartGuide API  ->  http://localhost:${PORT}/api/health`);
  if (hasDist) console.log(`  Web (dist)              ->  http://localhost:${PORT}`);
  for (const u of lan) console.log(`  LAN                     ->  ${u}`);
  console.log(`  DB: ${DB_LABEL}\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] Cổng ${PORT} đang được sử dụng. Tắt tiến trình khác hoặc đặt PORT=...`);
    process.exit(1);
  }
  throw err;
});

const shutdown = () => {
  visitorService.stopSimulator();
  server.close(() => closeDb().finally(() => process.exit(0)));
  setTimeout(() => process.exit(0), 1500).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
