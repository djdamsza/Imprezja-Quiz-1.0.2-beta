#!/usr/bin/env node
/**
 * Buduje NJR Konwerter (PyInstaller) i kopiuje binarkę do resources/njr-converter/,
 * żeby Electron mógł ją spakować w "all in one". Uruchom przed: npm run build (lub build:mac / build:win).
 * Wymaga: Python 3, pip install -r tools/vdj-database-editor/requirements.txt, pip install pyinstaller.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const editorDir = path.join(root, 'tools', 'vdj-database-editor');
const resourcesDir = path.join(root, 'resources', 'njr-converter');
const isWin = process.platform === 'win32';
const py = isWin ? 'python' : 'python3';
const distSubdir = isWin ? path.join('dist', 'NJR-konwerter.exe') : path.join('dist', 'NJR-konwerter');
const sourceBinary = path.join(editorDir, distSubdir);
const destName = isWin ? 'NJR-konwerter.exe' : 'NJR-konwerter';
const destBinary = path.join(resourcesDir, destName);

if (!fs.existsSync(path.join(editorDir, 'njr.spec'))) {
  console.error('Błąd: brak tools/vdj-database-editor/njr.spec');
  process.exit(1);
}

console.log('NJR Konwerter – budowanie (PyInstaller)...');
const pyinstaller = spawnSync(py, ['-m', 'PyInstaller', 'njr.spec'], {
  cwd: editorDir,
  stdio: 'inherit',
  shell: isWin,
});
if (pyinstaller.status !== 0) {
  console.error('PyInstaller zakończył się błędem. Zainstaluj: pip install -r requirements.txt && pip install pyinstaller');
  process.exit(1);
}

if (!fs.existsSync(sourceBinary)) {
  console.error('Błąd: po buildzie brak pliku:', sourceBinary);
  process.exit(1);
}

if (!fs.existsSync(path.join(root, 'resources'))) {
  fs.mkdirSync(path.join(root, 'resources'), { recursive: true });
}
if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
}
fs.copyFileSync(sourceBinary, destBinary);
console.log('✅ Skopiowano:', destBinary);
console.log('Teraz uruchom: npm run build (lub build:mac / build:win)');
