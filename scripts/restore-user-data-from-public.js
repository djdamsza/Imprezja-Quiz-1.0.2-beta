#!/usr/bin/env node
/**
 * Kopiuje zestawy z public/ (to, co jest w repozytorium / w buildzie) do katalogu danych użytkownika.
 * Domyślnie: tylko brakujące pliki (nie nadpisuje istniejących).
 *   npm run restore:user-data
 * Nadpisanie plików wersją z repozytorium:
 *   node scripts/restore-user-data-from-public.js --overwrite
 *
 * Katalog docelowy: IMPREZJA_DATA_DIR lub ten sam domyślny co server.js / Electron.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const overwrite = process.argv.includes('--overwrite');

function getDefaultDataDir() {
    const home = os.homedir();
    if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'Imprezja Quiz');
    if (process.platform === 'win32') return path.join(process.env.APPDATA || home, 'Imprezja Quiz');
    return path.join(home, '.config', 'Imprezja Quiz');
}

const projectRoot = path.join(__dirname, '..');
const publicRoot = path.join(projectRoot, 'public');
const dataDir = process.env.IMPREZJA_DATA_DIR || getDefaultDataDir();

function shouldCopy(dest) {
    if (overwrite) return true;
    return !fs.existsSync(dest);
}

function copyFile(src, dest, label) {
    try {
        if (!shouldCopy(dest)) return;
        const dir = path.dirname(dest);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.copyFileSync(src, dest);
        console.log('✅', label);
    } catch (e) {
        console.warn('⚠️', label, e.message);
    }
}

function copyJsonDir(rel) {
    const srcDir = path.join(publicRoot, rel);
    if (!fs.existsSync(srcDir)) return;
    const dstDir = path.join(dataDir, rel);
    for (const name of fs.readdirSync(srcDir)) {
        if (!name.toLowerCase().endsWith('.json')) continue;
        const src = path.join(srcDir, name);
        if (!fs.statSync(src).isFile()) continue;
        const dest = path.join(dstDir, name);
        copyFile(src, dest, path.join(rel, name));
    }
}

function copyUploadsDir() {
    const srcDir = path.join(publicRoot, 'uploads');
    if (!fs.existsSync(srcDir)) return;
    const dstDir = path.join(dataDir, 'uploads');
    if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
    for (const name of fs.readdirSync(srcDir)) {
        const src = path.join(srcDir, name);
        if (!fs.statSync(src).isFile()) continue;
        const dest = path.join(dstDir, name);
        copyFile(src, dest, path.join('uploads', name));
    }
}

const rootJsonFiles = [
    'familiada-data.json',
    'njr-sampler-bank-assignment.json',
    'njr-sampler-last.json',
    'spiewaj-dalej-last.json',
    'njr-sampler-config.json',
];

console.log('📂 Źródło (repo):', publicRoot);
console.log('📂 Cel (dane użytkownika):', dataDir);
console.log(overwrite ? '⚠️  Tryb: nadpisywanie istniejących plików (--overwrite)' : '📋 Tryb: tylko brakujące pliki');

for (const rel of ['quizzes', 'familiada', 'njr-sampler-configs', 'spiewaj-dalej-configs', 'bitwa-wokalna-configs', 'prezentacje', 'imprezator-configs']) {
    copyJsonDir(rel);
}

for (const name of rootJsonFiles) {
    const src = path.join(publicRoot, name);
    if (fs.existsSync(src) && fs.statSync(src).isFile()) {
        copyFile(src, path.join(dataDir, name), name);
    }
}

copyUploadsDir();

console.log('\nGotowe. Treści spoza repozytorium (np. quiz dodany tylko lokalnie i nigdy nie zcommitowany) nie da się odzyskać bez kopii zapasowej dysku / Time Machine.');
