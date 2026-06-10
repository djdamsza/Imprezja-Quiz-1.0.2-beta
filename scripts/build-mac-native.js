#!/usr/bin/env node
/**
 * Build Mac DMG dla architektury bieżącego Node.js (+ właściwy cloudflared).
 * Na M3 uruchamiaj w natywnym Terminalu (bez Rosetty), inaczej powstanie build Intel.
 */
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

function run(cmd) {
    console.log('>', cmd);
    execSync(cmd, { cwd: root, stdio: 'inherit' });
}

const arch = process.arch;
const isRosetta = process.platform === 'darwin' && arch === 'x64' && process.env.PROCESSOR_ARCHITECTURE === 'arm64';

if (isRosetta) {
    console.warn('');
    console.warn('⚠️  Terminal działa przez Rosettę (Node x64 na Macu Apple Silicon).');
    console.warn('    Powstanie build INTEL — na M3 zobaczysz komunikat o aplikacji Intel.');
    console.warn('    Zamknij Terminal → Pobierz informacje → odznacz „Otwórz w Rosetty”,');
    console.warn('    albo użyj: npm run build:mac:arm64');
    console.warn('');
}

if (arch === 'arm64') {
    run('node scripts/prepare-cloudflared-for-mac-arm64.js');
    run('electron-builder --mac --arm64 --publish never');
} else if (arch === 'x64') {
    run('node scripts/prepare-cloudflared-for-mac-x64.js');
    run('electron-builder --mac --x64 --publish never');
} else {
    console.error('Nieobsługiwana architektura Node:', arch);
    process.exit(1);
}
