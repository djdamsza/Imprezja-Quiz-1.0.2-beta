#!/usr/bin/env node
/**
 * Build Mac DMG — wersja BETA (obok stabilnej instalacji).
 * - Osobny bundle ID: pl.imprezja.votebattle.beta
 * - Osobna nazwa: Imprezja Quiz Beta
 * - Osobny katalog danych (userData Electron)
 * - Port HTTP 3001 / HTTPS 3444 (stabilna: 3000 / 3443)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const betaVersion = `${pkg.version}-beta.1`;

function run(cmd) {
    console.log('>', cmd);
    execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, IMPREZJA_BETA: '1' } });
}

const arch = process.arch;
console.log('');
console.log('📦 Imprezja Quiz — build BETA dla Mac (' + arch + ')');
console.log('   Wersja w DMG:', betaVersion);
console.log('   Instalacja obok stabilnej: /Applications/Imprezja Quiz Beta.app');
console.log('   Dane użytkownika: ~/Library/Application Support/Imprezja Quiz Beta/');
console.log('   Port serwera beta: 3001 (stabilna: 3000)');
console.log('');

if (arch === 'arm64') {
    run('node scripts/prepare-cloudflared-for-mac-arm64.js');
    run(`npx electron-builder --mac --arm64 --publish never --config electron-builder.beta.js --config.extraMetadata.version=${betaVersion}`);
} else if (arch === 'x64') {
    run('node scripts/prepare-cloudflared-for-mac-x64.js');
    run(`npx electron-builder --mac --x64 --publish never --config electron-builder.beta.js --config.extraMetadata.version=${betaVersion}`);
} else {
    console.error('Nieobsługiwana architektura Node:', arch);
    process.exit(1);
}

console.log('');
console.log('✅ Build beta zakończony — sprawdź release-beta/');

const builtApp = path.join(root, 'release-beta/mac-arm64/Imprezja Quiz Beta.app');
const destApp = '/Applications/Imprezja Quiz Beta.app';
if (fs.existsSync(builtApp)) {
    try {
        if (fs.existsSync(destApp)) {
            execSync(`rm -rf ${JSON.stringify(destApp)}`);
        }
        execSync(`ditto ${JSON.stringify(builtApp)} ${JSON.stringify(destApp)}`);
        console.log('');
        console.log('✅ Zainstalowano w /Applications/Imprezja Quiz Beta.app (zastąpiono poprzednią wersję)');
        console.log('   Uruchamiaj tylko z /Applications — nie z release-beta/');
    } catch (err) {
        console.warn('⚠️  Nie udało się skopiować do /Applications:', err.message || err);
        console.warn('   Przeciągnij DMG ręcznie do /Applications (zastąp istniejącą aplikację).');
    }
}
