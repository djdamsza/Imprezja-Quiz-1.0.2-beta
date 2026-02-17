#!/usr/bin/env node
/**
 * Dodaje napis "14 dni testuj za darmo" do banerów sklepowych.
 * Użycie: node scripts/add-banner-text.js
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const TEXTS = [
  '14 dni',
  'testuj za darmo',
];

const GRAFIKI = path.join(__dirname, '..', 'docs', 'wordpress', 'grafiki');
const BANNERS = [
  'imprezja-banner-shop-16x9.png',
  'imprezja-banner-shop-srodek.png',
];

async function addTextOverlay(inputPath, outputPath) {
  const width = 1920;
  const height = 1080;

  const cx = width / 2;
  // SVG – napis u góry + wpadający w oko „TESTUJ 14 DNI ZA DARMO” na wolnej przestrzeni (dół)
  const boxW = 1100;
  const boxH = 280;
  const boxX = (width - boxW) / 2;
  const svgText = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(0,0,0,0.5)"/>
      <stop offset="100%" style="stop-color:rgba(0,0,0,0.75)"/>
    </linearGradient>
    <linearGradient id="testuj" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700"/>
      <stop offset="50%" style="stop-color:#FFF8DC"/>
      <stop offset="100%" style="stop-color:#FFA500"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="${boxX}" y="0" width="${boxW}" height="${boxH}" rx="24" fill="url(#bg)"/>
  <text x="${cx}" y="115" font-family="Arial, sans-serif" font-size="140" font-weight="bold" fill="white" text-anchor="middle">${TEXTS[0]}</text>
  <text x="${cx}" y="210" font-family="Arial, sans-serif" font-size="95" font-weight="bold" fill="white" text-anchor="middle">${TEXTS[1]}</text>
  <rect x="${(width - 1050) / 2}" y="${height - 160}" width="1050" height="110" rx="16" fill="rgba(0,0,0,0.6)"/>
  <text x="${cx}" y="${height - 85}" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="url(#testuj)" text-anchor="middle" filter="url(#glow)">TESTUJ 14 DNI ZA DARMO</text>
</svg>`;

  const svgBuffer = Buffer.from(svgText);
  const tmpPath = outputPath + '.tmp.png';

  await sharp(inputPath)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toFile(tmpPath);

  fs.renameSync(tmpPath, outputPath);
  console.log('OK:', path.basename(outputPath));
}

async function main() {
  for (const file of BANNERS) {
    const inputPath = path.join(GRAFIKI, file);
    if (!fs.existsSync(inputPath)) {
      console.warn('Pomijam (brak pliku):', file);
      continue;
    }
    await addTextOverlay(inputPath, inputPath);
  }
  console.log('Gotowe.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
