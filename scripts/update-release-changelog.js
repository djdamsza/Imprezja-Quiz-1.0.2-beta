#!/usr/bin/env node
/**
 * Aktualizuje opis release na GitHub treścią z CHANGELOG.md.
 * Użycie: GITHUB_TOKEN=ghp_xxx node scripts/update-release-changelog.js [wersja]
 *         npm run publish:github:with-changelog  — po publish:github (instalatory + ten krok)
 * Domyślnie: wersja z package.json
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = process.argv[2] || pkg.version;
const repo = pkg.build?.publish?.repo || 'Imprezja-Quiz-1.0.2-beta';
const owner = pkg.build?.publish?.owner || 'djdamsza';

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token) {
  console.error('❌ Ustaw GITHUB_TOKEN lub GH_TOKEN');
  process.exit(1);
}

const changelogPath = path.join(root, 'CHANGELOG.md');
const changelog = fs.readFileSync(changelogPath, 'utf8');

// Wyciągnij sekcję dla danej wersji (od ## vX.Y.Z do następnego ## v)
const tag = 'v' + version;
const sections = changelog.split(/\n(?=## v\d)/);
const section = sections.find(s => s.startsWith('## ' + tag + ' '));
const body = section ? section.replace(/^## [^\n]+\n+/, '').replace(/\n+---\s*\n+$/, '').trim() : '';
if (!body) {
  console.error('❌ Nie znaleziono sekcji dla', tag, 'w CHANGELOG.md');
  process.exit(1);
}
console.log('📝 Changelog dla', tag, '(', body.length, 'znaków)');

function api(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: {
        'User-Agent': 'Imprezja-Quiz-Publish/1.0',
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
    }
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const existing = await api('GET', `${base}/releases/tags/${tag}`);
  if (existing.status !== 200) {
    console.error('❌ Release', tag, 'nie istnieje');
    process.exit(1);
  }
  const releaseId = existing.data.id;
  const patch = await api('PATCH', `${base}/releases/${releaseId}`, { body });
  if (patch.status !== 200) {
    console.error('❌ Nie udało się zaktualizować:', patch.data?.message || patch.data);
    process.exit(1);
  }
  console.log('✅ Opis release zaktualizowany:', `https://github.com/${owner}/${repo}/releases/tag/${tag}`);
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
