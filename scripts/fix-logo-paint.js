/**
 * Naprawia logo: wypełnia brakującą farbę w literach I, a, Q oraz usuwa plamy nad napisem.
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const INPUT = path.join(__dirname, '../docs/marketing/imprezja-quiz-logo-current.png');
const OUTPUT = path.join(__dirname, '../public/uploads/imprezja-quiz-logo-transparent.png');
const OUTPUT_DOCS = path.join(__dirname, '../docs/marketing/imprezja-quiz-logo-transparent.png');

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error('Brak pliku:', INPUT);
    process.exit(1);
  }

  const { data, info } = await sharp(INPUT).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  function getPixel(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return null;
    const i = (y * width + x) * channels;
    return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
  }

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const i = (y * width + x) * channels;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }

  const neighbors = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

  // 1. Wypełnij luki w literach (I, a, Q): przezroczyste LUB białe piksele z kolorowymi sąsiadami
  for (let iter = 0; iter < 4; iter++) {
    const changes = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p = getPixel(x, y);
        if (!p) continue;
        const isTransparent = p.a < 30;
        const isWhite = p.a > 50 && p.r > 235 && p.g > 235 && p.b > 235;
        const isLightGap = p.a > 50 && p.r > 210 && p.g > 210 && p.b > 210 && (p.r < 250 || p.g < 250 || p.b < 250);
        if (!isTransparent && !isWhite && !isLightGap) continue;

        let sumR = 0, sumG = 0, sumB = 0, count = 0;
        for (const [dx, dy] of neighbors) {
          const n = getPixel(x + dx, y + dy);
          if (n && n.a > 100 && (n.r < 250 || n.g < 250 || n.b < 250)) {
            sumR += n.r;
            sumG += n.g;
            sumB += n.b;
            count++;
          }
        }
        if (count >= 2) {
          const nr = Math.round(sumR / count);
          const ng = Math.round(sumG / count);
          const nb = Math.round(sumB / count);
          changes.push({ x, y, r: nr, g: ng, b: nb });
        }
      }
    }
    for (const c of changes) {
      setPixel(c.x, c.y, c.r, c.g, c.b, 255);
    }
  }

  // 2. Usuń plamy nad napisem (górne 40% obrazu) – różowawe/białawe artefakty
  const stainYLimit = Math.floor(height * 0.42);
  for (let y = 0; y < stainYLimit; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 10) continue;
      // Plamy: jasny róż/fiolet – NIE korona (złota: wysoki R, G, niski B)
      const isCrown = r > 180 && g > 140 && b < 120; // złoty/żółty
      if (isCrown) continue;
      const isLightPinkPurple = r > 180 && g > 140 && b > 160 && r < 255 && (Math.abs(r - b) < 80 || Math.abs(g - b) < 60);
      const isFaintStain = r > 200 && g > 180 && b > 200 && r < 254; // bardzo jasne plamki
      if (isLightPinkPurple || isFaintStain) {
        data[i + 3] = 0;
      }
    }
  }

  await sharp(data, { raw: { width, height, channels } }).png().toFile(OUTPUT);
  await sharp(data, { raw: { width, height, channels } }).png().toFile(OUTPUT_DOCS);

  console.log('Zapisano:', OUTPUT);
  console.log('Zapisano:', OUTPUT_DOCS);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
