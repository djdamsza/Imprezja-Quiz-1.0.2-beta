/**
 * Usuwa tło (gradient fioletowo-magenta) z logo Imprezja Quiz.
 * Zachowuje logo z białym obrysem i koroną – tło staje się przezroczyste.
 * Wymaga: npm install sharp (już w projekcie)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const INPUT = path.join(__dirname, '../docs/marketing/imprezja-quiz-logo-original.png');
const OUTPUT = path.join(__dirname, '../public/uploads/imprezja-quiz-logo-transparent.png');
const OUTPUT_DOCS = path.join(__dirname, '../docs/marketing/imprezja-quiz-logo-transparent.png');

// Fallback: jeśli oryginał w assets Cursor
const CURSOR_ASSETS = '/Users/test/.cursor/projects/Users-test-Documents-VoteBattle/assets/imprezja-quiz-grafika-2-kopia-9a8ad40c-13d0-4050-8573-995b80986b11.png';

async function main() {
  let inputPath = INPUT;
  if (!fs.existsSync(inputPath) && fs.existsSync(CURSOR_ASSETS)) {
    inputPath = CURSOR_ASSETS;
    console.log('Używam pliku z assets Cursor');
  }
  if (!fs.existsSync(inputPath)) {
    console.error('Brak pliku wejściowego. Skopiuj logo do:', INPUT, 'lub', path.dirname(CURSOR_ASSETS));
    process.exit(1);
  }

  const img = await sharp(inputPath);
  const meta = await img.metadata();
  const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Pobierz kolory tła z narożników i krawędzi (gradient fioletowo-magenta)
  const cornerSize = Math.min(25, Math.floor(width * 0.04), Math.floor(height * 0.04));
  const sampleRegions = [
    [0, 0], [width - cornerSize, 0], [0, height - cornerSize], [width - cornerSize, height - cornerSize]
  ];
  const bgSamples = [];
  for (const [cx, cy] of sampleRegions) {
    for (let dy = 0; dy < cornerSize; dy++) {
      for (let dx = 0; dx < cornerSize; dx++) {
        const px = Math.max(0, Math.min(cx + dx, width - 1));
        const py = Math.max(0, Math.min(cy + dy, height - 1));
        const i = (py * width + px) * channels;
        bgSamples.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
  }

  function colorDist(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  }

  function isBackground(r, g, b) {
    // Tylko usuń jeśli piksel jest BARDZO podobny do tła z narożników
    const threshold = 75; // podobieństwo do tła – wyższy = więcej tła usunięte
    for (const [sr, sg, sb] of bgSamples) {
      if (colorDist(r, g, b, sr, sg, sb) < threshold) return true;
    }
    // Dodatkowo: ciemne narożniki gradientu (głęboki fiolet)
    if (r < 90 && g < 50 && b < 120) return true;
    return false;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isBackground(r, g, b)) {
        data[i + 3] = 0; // alpha = 0
      }
    }
  }

  const outDir = path.dirname(OUTPUT);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outDirDocs = path.dirname(OUTPUT_DOCS);
  if (!fs.existsSync(outDirDocs)) fs.mkdirSync(outDirDocs, { recursive: true });

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(OUTPUT);

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(OUTPUT_DOCS);

  console.log('Zapisano:', OUTPUT);
  console.log('Zapisano:', OUTPUT_DOCS);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
