import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Shared with the server so offline previews match the API's preview rule.
// @ts-ignore plain ESM JS module without type declarations
import { buildPreviewText, estimateDurationSec } from './server/utils/text.js';

const API_TARGET = process.env.API_TARGET || 'http://localhost:3001';

// changeOrigin: false keeps the browser's Host header (e.g. localhost:5173) so
// /api/network can report LAN URLs with the Vite port.
const proxy = {
  '/api': { target: API_TARGET, changeOrigin: false },
  '/uploads': { target: API_TARGET, changeOrigin: false }
};

/**
 * virtual:offline-sites — the seed site documents (server/seed/sites/*.json) with the full
 * narration REMOVED at build time, plus a ~30 s preview text per site/exhibit. Used only as an
 * offline fallback when the API is unreachable; full scripts never reach the client bundle.
 */
function offlineSitesPlugin(): Plugin {
  const VIRTUAL_ID = 'virtual:offline-sites';
  const RESOLVED = '\0' + VIRTUAL_ID;
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'server/seed/sites');
  const PREVIEW_SEC = 30;
  const load = () => {
    const sites: any[] = [];
    const LANGS = ['vi', 'en', 'ko', 'ja', 'zh'] as const;
    const empty = () => Object.fromEntries(LANGS.map((l) => [l, ''])) as Record<(typeof LANGS)[number], string>;
    const previews: Record<string, Record<string, string>> = {};
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
        try {
          const doc = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, ''));
          if (!doc || !Number.isInteger(Number(doc.id))) continue;
          const pv = (n: any, d: any) => {
            const out = empty();
            for (const l of LANGS) {
              const text = (n && n[l]) || '';
              const dur = (d && d[l]) || estimateDurationSec(text, l);
              out[l] = text ? buildPreviewText(text, dur, PREVIEW_SEC, l) : '';
            }
            return out;
          };
          const dur = (n: any, d: any) =>
            Object.fromEntries(LANGS.map((l) => [l, (d && d[l]) || estimateDurationSec((n && n[l]) || '', l)]));
          previews[String(doc.id)] = pv(doc.narration, doc.durationSec);
          const exhibits = (Array.isArray(doc.exhibits) ? doc.exhibits : []).map((e: any, i: number) => {
            const id = e.id || `s${doc.id}-e${i + 1}`;
            previews[id] = pv(e.narration, e.durationSec);
            return { ...e, id, siteId: Number(doc.id), durationSec: dur(e.narration, e.durationSec), narration: empty() };
          });
          sites.push({ ...doc, id: Number(doc.id), durationSec: dur(doc.narration, doc.durationSec), narration: empty(), exhibits });
        } catch {
          /* tolerate files being written */
        }
      }
    }
    sites.sort((a, b) => a.id - b.id);
    return `export const sites = ${JSON.stringify(sites)};\nexport const previews = ${JSON.stringify(previews)};\n`;
  };
  return {
    name: 'halong-offline-sites',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED : null;
    },
    load(id) {
      if (id !== RESOLVED) return null;
      return load();
    },
    // Watch the seed folder from the dev server (addWatchFile on a directory breaks import analysis).
    configureServer(server) {
      if (!fs.existsSync(dir)) return;
      server.watcher.add(dir);
      const onChange = (file: string) => {
        if (!path.resolve(file).startsWith(dir) || !file.endsWith('.json')) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) {
          server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: 'full-reload' });
        }
      };
      server.watcher.on('change', onChange);
      server.watcher.on('add', onChange);
    }
  };
}

export default defineConfig({
  plugins: [react(), offlineSitesPlugin()],
  build: { chunkSizeWarningLimit: 900 },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    open: true,
    proxy
  },
  preview: {
    port: 4173,
    host: true,
    allowedHosts: true,
    proxy
  }
});
