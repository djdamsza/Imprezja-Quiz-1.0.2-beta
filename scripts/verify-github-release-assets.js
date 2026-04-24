#!/usr/bin/env node
/**
 * Porównuje listę assetów na GitHub Release z oczekiwanymi nazwami (z package.json).
 * Dla publicznego repo nie wymaga tokenu.
 *
 *   node scripts/verify-github-release-assets.js [tag, np. v1.2.2]
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const tag = process.argv[2] || 'v' + version;
const repo = pkg.build?.publish?.repo || 'Imprezja-Quiz-1.0.2-beta';
const owner = pkg.build?.publish?.owner || 'djdamsza';

const required = [
  'Imprezja.Quiz.Setup.' + version + '.exe',
  'Imprezja.Quiz-' + version + '-arm64.dmg',
  'Imprezja.Quiz-' + version + '.dmg',
  'latest.yml',
  'latest-mac.yml'
];
const optional = [
  'napraw-uninstaller.bat',
  'Imprezja.Quiz.Setup.' + version + '.exe.blockmap'
];

function getText(url, redirectDepth = 0) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('http://') ? require('http') : https;
    lib.get(url, { headers: { 'User-Agent': 'Imprezja-Quiz-Verify/1.1' } }, res => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && redirectDepth < 8) {
        res.resume();
        const next = new URL(res.headers.location, url).href;
        return resolve(getText(next, redirectDepth + 1));
      }
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, text: data }));
    }).on('error', reject);
  });
}

/** Sprawdza dostępność pliku (bez ściągania całej zawartości). */
function getStatusOnly(url, redirectDepth = 0) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('http://') ? require('http') : https;
    lib.get(url, { headers: { 'User-Agent': 'Imprezja-Quiz-Verify/1.1' } }, res => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && redirectDepth < 8) {
        res.resume();
        const next = new URL(res.headers.location, url).href;
        return resolve(getStatusOnly(next, redirectDepth + 1));
      }
      res.resume();
      resolve(res.statusCode);
    }).on('error', reject);
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Imprezja-Quiz-Verify/1.0', Accept: 'application/vnd.github+json' } }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`;
  const r = await get(url);
  if (r.status !== 200) {
    console.error('❌ Release', tag, '— HTTP', r.status, r.data?.message || '');
    process.exit(1);
  }
  const names = new Set((r.data.assets || []).map(a => a.name));
  const missing = required.filter(n => !names.has(n));
  const extra = [...names].filter(n => !required.includes(n) && !optional.includes(n));
  const missingOptional = optional.filter(n => !names.has(n));

  console.log('📦 Release:', tag, '—', r.data.html_url);
  console.log('   Assety na GitHubie:', [...names].join(', ') || '(brak)');
  if (missing.length) {
    console.error('❌ Brakuje na GitHubie:', missing.join(', '));
    console.error('   Zbuduj: npm run pac');
    console.error('   Wgraj:  GITHUB_TOKEN=… npm run publish:github');
    process.exit(1);
  }
  if (extra.length) {
    console.log('   (Dodatkowe pliki — OK):', extra.join(', '));
  }
  if (missingOptional.length) {
    console.log('   ⚠️ Opcjonalnie na GitHubie:', missingOptional.join(', '), '— możesz dodać przez publish:github jeśli jest lokalnie.');
  }
  console.log('✅ Wszystkie 3 instalatory są na release.');

  const baseDl = `https://github.com/${owner}/${repo}/releases/download/${tag}`;
  let ymlOk = true;
  for (const ymlName of ['latest.yml', 'latest-mac.yml']) {
    const ymlRes = await getText(`${baseDl}/${ymlName}`);
    if (ymlRes.status !== 200) {
      console.error('   ❌ Nie można pobrać', ymlName, '— HTTP', ymlRes.status);
      ymlOk = false;
      continue;
    }
    const urls = [...ymlRes.text.matchAll(/\burl:\s*([^\s#]+)/g)].map(m => m[1].trim());
    if (urls.length === 0) {
      console.warn('   ⚠️', ymlName, '— brak pól url: (pominieto sprawdzanie linków)');
      continue;
    }
    for (const file of urls) {
      const u = `${baseDl}/${encodeURIComponent(file)}`;
      const st = await getStatusOnly(u);
      const ok = st >= 200 && st < 400;
      if (!ok) {
        console.error('   ❌ W', ymlName, 'url wskazuje na brakujący plik (HTTP ' + st + '):', file);
        console.error('      Oczekiwany asset na release:', file);
        ymlOk = false;
      }
    }
  }
  if (!ymlOk) {
    console.error('\n❌ Pliki latest*.yml mają błędne nazwy w url: — auto-update z aplikacji nie zadziała.');
    console.error('   Napraw: zaktualizuj scripts/publish-release.js (patchUpdaterYmlForGithub), przebuduj dist i ponów npm run publish:github.');
    process.exit(1);
  }
  console.log('✅ Adresy url: w latest.yml / latest-mac.yml wskazują na istniejące assety.');
}

main().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
