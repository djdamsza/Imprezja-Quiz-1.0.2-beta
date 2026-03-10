#!/usr/bin/env node
/**
 * Publikuje buildy na GitHub Release.
 * Wymaga: GITHUB_TOKEN lub GH_TOKEN (repo scope).
 * Użycie: GITHUB_TOKEN=ghp_xxx node scripts/publish-release.js
 *
 * Tworzy release v1.1.7 (lub aktualną wersję z package.json) i wgrywa pliki z dist/.
 * Jeśli release istnieje – nadpisuje assety.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const repo = pkg.build?.publish?.repo || 'Imprezja-Quiz-1.0.2-beta';
const owner = pkg.build?.publish?.owner || 'djdamsza';
const distDir = path.join(root, 'dist');

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token) {
  console.error('❌ Ustaw GITHUB_TOKEN lub GH_TOKEN (np. export GITHUB_TOKEN=ghp_xxx)');
  process.exit(1);
}

const assets = [
  'Imprezja Quiz Setup ' + version + '.exe',
  'Imprezja Quiz-' + version + '-arm64.dmg',
  'Imprezja Quiz-' + version + '.dmg'
].filter(name => {
  const p = path.join(distDir, name);
  if (!fs.existsSync(p)) {
    console.warn('⚠️ Pominięto (brak pliku):', name);
    return false;
  }
  return true;
});

if (assets.length === 0) {
  console.error('❌ Brak plików do publikacji w dist/');
  process.exit(1);
}

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
    if (body) {
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const tag = 'v' + version;

  console.log('📦 Publikacja', tag, '→', owner + '/' + repo);
  console.log('   Pliki:', assets.join(', '));

  let releaseId;
  const existing = await api('GET', `${base}/releases/tags/${tag}`);
  if (existing.status === 200) {
    releaseId = existing.data.id;
    console.log('   Release istnieje, usuwam stare assety...');
    for (const a of existing.data.assets || []) {
      if (assets.includes(a.name)) {
        await api('DELETE', `${base}/releases/assets/${a.id}`);
        console.log('   Usunięto:', a.name);
      }
    }
  } else {
    const create = await api('POST', `${base}/releases`, {
      tag_name: tag,
      name: 'Imprezja Quiz ' + version,
      body: '## Zmiany w ' + version + '\n\nZobacz [CHANGELOG.md](https://github.com/' + owner + '/' + repo + '/blob/main/CHANGELOG.md) w repozytorium.'
    });
    if (create.status !== 201) {
      console.error('❌ Nie udało się utworzyć release:', create.data?.message || create.data);
      process.exit(1);
    }
    releaseId = create.data.id;
    console.log('   Utworzono release');
  }

  const uploadUrl = `https://uploads.github.com/repos/${owner}/${repo}/releases/${releaseId}/assets`;

  for (const name of assets) {
    const filePath = path.join(distDir, name);
    const stat = fs.statSync(filePath);
    console.log('   Wgrywam:', name, '(' + Math.round(stat.size / 1024 / 1024) + ' MB)');

    const buf = fs.readFileSync(filePath);
    const res = await new Promise((resolve, reject) => {
      const u = new URL('?name=' + encodeURIComponent(name), uploadUrl);
      const req = https.request({
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'User-Agent': 'Imprezja-Quiz-Publish/1.0',
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/octet-stream',
          'Content-Length': buf.length
        }
      }, r => {
        let data = '';
        r.on('data', c => data += c);
        r.on('end', () => resolve({ status: r.statusCode, data: data ? JSON.parse(data) : null }));
      });
      req.on('error', reject);
      req.write(buf);
      req.end();
    });

    if (res.status === 201) {
      console.log('   ✅', name);
    } else {
      console.error('   ❌', name, res.data?.message || res.status);
    }
  }

  console.log('\n✅ Gotowe. Release:', `https://github.com/${owner}/${repo}/releases/tag/${tag}`);
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
