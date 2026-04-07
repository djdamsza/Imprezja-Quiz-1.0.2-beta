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
  'Imprezja.Quiz-' + version + '.dmg'
];
const optional = ['napraw-uninstaller.bat'];

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
}

main().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
