#!/usr/bin/env node
/**
 * Czyści cache i tymczasowe pliki (~2–3 GB).
 * Uruchom: npm run clean:cache
 *
 * Czyści:
 * - Electron, electron-builder (~1.5 GB)
 * - PyInstaller build/dist w NJR Konwerterze (~70 MB)
 * - node_modules/.cache w projekcie
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.join(__dirname, '..');
const home = os.homedir();

const dirs = [
    path.join(home, 'Library', 'Caches', 'electron'),
    path.join(home, 'Library', 'Caches', 'electron-builder'),
    path.join(root, 'tools', 'vdj-database-editor', 'build'),
    path.join(root, 'tools', 'vdj-database-editor', 'dist'),
    path.join(root, 'tools', 'vdj-database-editor', 'test-output'),
    path.join(root, 'node_modules', '.cache'),
];

// Pliki debug w .cursor (logi z sesji)
const cursorDir = path.join(root, '.cursor');
if (fs.existsSync(cursorDir)) {
    try {
        const files = fs.readdirSync(cursorDir);
        for (const f of files) {
            if (f.startsWith('debug-') && f.endsWith('.log')) {
                fs.unlinkSync(path.join(cursorDir, f));
                console.log('✅ Usunięto:', path.join(cursorDir, f));
            }
        }
    } catch { /* ignore */ }
}

for (const dir of dirs) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true });
        console.log('✅ Usunięto:', dir);
    }
}
console.log('📦 Cache wyczyszczony');
