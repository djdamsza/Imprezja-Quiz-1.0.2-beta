#!/usr/bin/env node
/**
 * Smoke test HTTP: sprawdza, czy kluczowe zasoby zwracają 200.
 * Wymaga wcześniej uruchomionego serwera (npm start lub Electron).
 *
 * Użycie:
 *   npm run qa:smoke-http
 *   SMOKE_BASE=http://127.0.0.1:3000 node scripts/release-smoke-http.js
 */
const http = require('http');
const https = require('https');

const base = (process.env.SMOKE_BASE || 'http://127.0.0.1:3000').replace(/\/$/, '');

/** Ścieżki GET — muszą odpowiedzieć 200 (lub 304 dla favicon/cache) */
const PATHS = [
  '/test-connection',
  '/api/version',
  '/api/license/status',
  '/api/admin-status',
  '/start.html',
  '/editor.html',
  '/admin.html',
  '/vote.html',
  '/Screen.html',
  '/admin-pwa.html',
  '/screen-controller.html',
  '/familiada/editor.html',
  '/familiada/admin.html',
  '/familiada/screen.html',
  '/njr-sampler.html',
  '/api/njr-sampler/configs',
  '/whitney.html',
  '/api/whitney/config',
  '/spiewaj-dalej.html',
  '/api/spiewaj-dalej/configs',
  '/bitwa-wokalna.html',
  '/api/bitwa-wokalna/configs',
  '/imprezator.html',
  '/api/imprezator/configs',
  '/statki-solo/editor.html',
  '/api/statki-solo/config',
  '/editor-prezentacja.html',
  '/api/prezentacje/list',
  '/wifi-analyzer.html',
  '/poradniki/changelog.html',
  '/favicon.ico',
  '/join',
  '/dolacz',
  '/hot-or-not-champion/index.html',
  '/license-required.html',
  '/api/familiada/files',
  '/api/uploads-list'
];

function fetchOnce(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 15000 }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

async function main() {
  console.log('🔍 Smoke HTTP — baza:', base);
  const fails = [];
  for (const p of PATHS) {
    const url = base + p;
    try {
      const code = await fetchOnce(url);
      const ok = code === 200 || code === 304;
      if (ok) {
        console.log('  ✅', p, code);
      } else {
        console.log('  ❌', p, code);
        fails.push({ p, code });
      }
    } catch (e) {
      console.log('  ❌', p, e.message);
      fails.push({ p, err: e.message });
    }
  }
  if (fails.length) {
    console.error('\n❌ Smoke: błędy:', fails.length, '/', PATHS.length);
    console.error('   Upewnij się, że serwer działa: npm start lub Electron.');
    process.exit(1);
  }
  console.log('\n✅ Smoke HTTP: OK —', PATHS.length, 'ścieżek');
}

main();
