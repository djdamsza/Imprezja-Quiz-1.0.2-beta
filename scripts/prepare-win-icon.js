#!/usr/bin/env node
/**
 * Tworzy icon.ico 256x256 z icon.png (wymagane przez electron-builder dla Windows).
 * Uruchamiane przed build:win.
 */
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const iconPng = path.join(root, 'build', 'icon.png');
const iconIco = path.join(root, 'build', 'icon.ico');

if (!fs.existsSync(iconPng)) {
  console.warn('[prepare-win-icon] Brak build/icon.png');
  process.exit(0);
}

(async () => {
  try {
    const sharp = require('sharp');
    const ico = require('sharp-ico');
    await ico.sharpsToIco(
      [sharp(iconPng).resize(256, 256)],
      iconIco,
      { sizes: [256] }
    );
    console.log('[prepare-win-icon] icon.ico 256x256 utworzony');
  } catch (e) {
    console.error('[prepare-win-icon] Błąd:', e.message);
    process.exit(1);
  }
})();
