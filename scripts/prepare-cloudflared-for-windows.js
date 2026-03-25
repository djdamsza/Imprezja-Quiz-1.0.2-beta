#!/usr/bin/env node
/**
 * Pobiera cloudflared dla Windows (amd64) i zapisuje do resources/cloudflared-windows/cloudflared.exe.
 * Uruchom przed buildem Windows (build:win). Działa na dowolnej platformie (Mac/Windows/Linux).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const CLOUDFLARED_VERSION = require('./cloudflared-version.js');
const URL = `https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-windows-amd64.exe`;

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'resources', 'cloudflared-windows');
const outPath = path.join(outDir, 'cloudflared.exe');

function log(msg) {
    console.log('[prepare-cloudflared-windows]', msg);
}

function download(url) {
    return new Promise((resolve, reject) => {
        const file = outPath + '.tmp';
        const stream = fs.createWriteStream(file);
        const req = https.get(url, { headers: { 'User-Agent': 'Imprezja-Quiz/1.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                req.destroy();
                stream.close();
                try { fs.unlinkSync(file); } catch (_) {}
                const next = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
                return download(next).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                stream.close();
                try { fs.unlinkSync(file); } catch (_) {}
                reject(new Error(`HTTP ${res.statusCode}: ${url}`));
                return;
            }
            res.pipe(stream);
            stream.on('finish', () => { stream.close(); resolve(file); });
        });
        req.on('error', (e) => { stream.close(); try { fs.unlinkSync(file); } catch (_) {} reject(e); });
    });
}

async function main() {
    if (!fs.existsSync(path.join(root, 'resources'))) {
        fs.mkdirSync(path.join(root, 'resources'), { recursive: true });
    }
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    if (fs.existsSync(outPath)) {
        const stat = fs.statSync(outPath);
        if (stat.size > 1000000) {
            log('cloudflared.exe już istnieje (' + Math.round(stat.size / 1024 / 1024) + ' MB) – pomijam pobieranie');
            return;
        }
    }

    log('Pobieram ' + URL);
    try {
        const tmpPath = await download(URL);
        fs.renameSync(tmpPath, outPath);
        log('Gotowe – cloudflared.exe zapisany w resources/cloudflared-windows/');
    } catch (err) {
        log('Błąd: ' + err.message);
        process.exit(1);
    }
}

main();
