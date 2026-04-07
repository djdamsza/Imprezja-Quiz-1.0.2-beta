#!/usr/bin/env node
/**
 * Publikuje buildy na GitHub Release.
 * Wymaga: GITHUB_TOKEN lub GH_TOKEN (repo scope).
 * Użycie: GITHUB_TOKEN=ghp_xxx node scripts/publish-release.js
 *         npm run publish:github:with-changelog  — instalatory + opis release z CHANGELOG.md
 *
 * Tworzy release (wersja z package.json) i wgrywa pliki z dist/ oraz napraw-uninstaller.bat z katalogu głównego repo.
 * Jeśli release istnieje – nadpisuje assety.
 *
 * WAŻNE: Każdy plik jest usuwany z release’u dopiero tuż przed swoim uploadem (nie wszystkie naraz).
 * Wcześniejsza wersja skryptu robiła masowe DELETE przed uploadem — przy przerwanym wgrywaniu
 * znikały wszystkie binaria z GitHuba. Usuwanie starych release’ów w UI GitHub też kasuje pliki;
 * tag git zostaje — możesz `npm run publish:github` ponownie z lokalnym dist/.
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

// Instalatory: pliki lokalne (ze spacjami) → nazwy na GitHub (z kropkami, zgodne z linkami w HTML)
const distAssetDefs = [
  { local: 'Imprezja Quiz Setup ' + version + '.exe', upload: 'Imprezja.Quiz.Setup.' + version + '.exe' },
  { local: 'Imprezja Quiz-' + version + '-arm64.dmg', upload: 'Imprezja.Quiz-' + version + '-arm64.dmg' },
  { local: 'Imprezja Quiz-' + version + '.dmg', upload: 'Imprezja.Quiz-' + version + '.dmg' }
];
const distAssets = distAssetDefs.filter(({ local }) => {
  const p = path.join(distDir, local);
  if (!fs.existsSync(p)) {
    console.warn('⚠️ Pominięto (brak pliku):', local);
    return false;
  }
  return true;
});

if (distAssets.length === 0) {
  console.error('❌ Brak plików do publikacji w dist/');
  process.exit(1);
}

const requireAll = process.env.ALLOW_PARTIAL_PUBLISH !== '1';
const expectedCount = distAssetDefs.length;
if (requireAll && distAssets.length < expectedCount) {
  const missing = distAssetDefs
    .filter(({ local }) => !fs.existsSync(path.join(distDir, local)))
    .map(({ local }) => local);
  console.error('❌ Przed publikacją potrzebne są wszystkie 3 instalatory w dist/ (albo ustaw ALLOW_PARTIAL_PUBLISH=1).');
  console.error('   Brakuje lokalnie:', missing.join(', ') || '(nieznane)');
  console.error('   Uruchom: npm run pac');
  process.exit(1);
}

/** @type {{ local?: string, upload: string, localFull?: string }[]} */
const assetMap = distAssets.map(({ local, upload }) => ({ local, upload }));
const batPath = path.join(root, 'napraw-uninstaller.bat');
if (fs.existsSync(batPath)) {
  assetMap.push({ localFull: batPath, upload: 'napraw-uninstaller.bat' });
} else {
  console.warn('⚠️ Brak napraw-uninstaller.bat w katalogu głównym — pomijam (linki na stronie wymagają tego pliku w release)');
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
  console.log('   Pliki:', assetMap.map(x => x.upload).join(', '));

  let releaseId;
  const existing = await api('GET', `${base}/releases/tags/${tag}`);

  if (existing.status === 200) {
    releaseId = existing.data.id;
    const currentAssets = existing.data.assets || [];
    console.log('   Release istnieje, assety:', currentAssets.map(a => a.name).join(', ') || '(brak)');
    console.log('   (Stare wersje plików będą usuwane pojedynczo — tuż przed wgrywaniem każdego z nich.)');
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

  async function releaseAssetsNow() {
    const r = await api('GET', `${base}/releases/${releaseId}`);
    if (r.status !== 200) {
      console.warn('   Nie udało się odczytać listy assetów:', r.status);
      return [];
    }
    return r.data.assets || [];
  }

  let anyUploadFailed = false;

  for (const item of assetMap) {
    const filePath = item.localFull || path.join(distDir, item.local);
    const upload = item.upload;
    const stat = fs.statSync(filePath);
    const sizeLabel = stat.size >= 1048576
      ? Math.round(stat.size / 1024 / 1024) + ' MB'
      : Math.max(1, Math.round(stat.size / 1024)) + ' KB';

    const assets = await releaseAssetsNow();
    const sameName = assets.find(a => a.name === upload);
    if (sameName) {
      const del = await api('DELETE', `${base}/releases/assets/${sameName.id}`);
      if (del.status === 204) {
        console.log('   Usunięto stary asset przed podmianą:', upload);
      } else {
        console.warn('   DELETE przed uploadem nie powiódł się:', upload, del.status, del.data);
      }
      await new Promise(r => setTimeout(r, 1500));
    }

    console.log('   Wgrywam:', upload, '(' + sizeLabel + ')');

    const res = await new Promise((resolve, reject) => {
      const u = new URL('?name=' + encodeURIComponent(upload), uploadUrl);
      const req = https.request({
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'User-Agent': 'Imprezja-Quiz-Publish/1.0',
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/octet-stream',
          'Content-Length': stat.size
        }
      }, r => {
        let data = '';
        r.on('data', c => data += c);
        r.on('end', () => {
          let parsed = null;
          try { parsed = data ? JSON.parse(data) : null; } catch (_) { parsed = { raw: data }; }
          resolve({ status: r.statusCode, data: parsed });
        });
      });
      req.on('error', reject);
      fs.createReadStream(filePath).pipe(req);
    });

    if (res.status === 201) {
      console.log('   ✅', upload);
    } else {
      anyUploadFailed = true;
      const errMsg = res.data?.message || res.data?.errors?.[0]?.message || JSON.stringify(res.data) || res.status;
      console.error('   ❌', upload, errMsg);
      if (res.data) console.error('   Szczegóły:', JSON.stringify(res.data, null, 2));
      console.error('   ⚠️ Ten plik zniknął z release (jeśli był) i nie został zastąpiony — uruchom skrypt ponownie po naprawie sieci / tokenu.');
    }
  }

  if (anyUploadFailed) {
    console.error('\n❌ Publikacja nieudana (co najmniej jeden upload). Popraw problem i uruchom ponownie.');
    process.exit(1);
  }
  console.log('\n✅ Gotowe. Release:', `https://github.com/${owner}/${repo}/releases/tag/${tag}`);
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
