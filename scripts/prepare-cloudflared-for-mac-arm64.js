#!/usr/bin/env node
/**
 * Przygotowanie cloudflared dla Mac Apple Silicon (arm64).
 * Po buildzie Mac x64 w node_modules jest binarka x64 – przed buildem arm64
 * musimy przywrócić arm64, inaczej build arm64 spakuje złą binarkę.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const CLOUDFLARED_VERSION = '2026.2.0';
const TGZ_URL = `https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-darwin-arm64.tgz`;

const root = path.join(__dirname, '..');
const cfBinDir = path.join(root, 'node_modules', 'cloudflared', 'bin');
const cfBinPath = path.join(cfBinDir, 'cloudflared');
const tmpDir = path.join(root, 'node_modules', '.cloudflared-arm64-tmp');

function log(msg) {
    console.log('[prepare-cloudflared-mac-arm64]', msg);
}

function download(url, redirectCount = 0) {
    const maxRedirects = 5;
    return new Promise((resolve, reject) => {
        const file = path.join(tmpDir, 'cloudflared.tgz');
        const stream = fs.createWriteStream(file);
        const req = https.get(url, { headers: { 'User-Agent': 'Imprezja-Quiz/1.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectCount < maxRedirects) {
                req.destroy();
                stream.close();
                try { fs.unlinkSync(file); } catch (_) {}
                download(res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href, redirectCount + 1)
                    .then(resolve).catch(reject);
                return;
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
    if (process.platform !== 'darwin') {
        log('Pomijam – tylko macOS');
        return;
    }

    if (!fs.existsSync(cfBinPath)) {
        log('Brak node_modules/cloudflared/bin/cloudflared – uruchom npm install');
        process.exit(1);
    }

    const currentArch = execSync(`file "${cfBinPath}"`, { encoding: 'utf8' });
    if (currentArch.includes('arm64')) {
        log('Binarka cloudflared jest już arm64 – OK');
        return;
    }

    log('Binarka cloudflared to x64 – podmieniam na darwin-arm64...');
    try {
        if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
        fs.mkdirSync(tmpDir, { recursive: true });

        log('Pobieram ' + TGZ_URL);
        const tgzPath = await download(TGZ_URL);
        log('Rozpakowuję...');
        execSync(`tar -xzf "${tgzPath}" -C "${tmpDir}"`, { stdio: 'pipe' });
        const extracted = path.join(tmpDir, 'cloudflared');
        if (!fs.existsSync(extracted)) {
            const files = fs.readdirSync(tmpDir);
            throw new Error('W tgz nie ma pliku cloudflared. Zawartość: ' + files.join(', '));
        }
        fs.copyFileSync(extracted, cfBinPath);
        fs.chmodSync(cfBinPath, 0o755);
        fs.rmSync(tmpDir, { recursive: true });
        log('Gotowe – cloudflared podmieniony na darwin-arm64');
    } catch (err) {
        log('Błąd: ' + err.message);
        process.exit(1);
    }
}

main();
