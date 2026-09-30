'use strict';

const assert = require('assert');
const {
    CONTRACT_VERSION,
    EVENTS,
    applyBoothPhotos,
    toImageSlide,
} = require('./photo-presentation.js');

function photo(overrides) {
    return Object.assign({
        id: 'booth-1',
        src: '/uploads/prezentacje/fotobudka/1.jpg',
        caption: 'Para młoda',
        durationSec: 8,
        takenAt: '2026-09-30T18:00:00.000Z',
    }, overrides);
}

const replaced = applyBoothPhotos(null, { photos: [photo()] });
assert.strictEqual(replaced.ok, true);
assert.strictEqual(replaced.contractVersion, CONTRACT_VERSION);
assert.strictEqual(replaced.mode, 'replace');
assert.strictEqual(replaced.config.name, 'fotobudka');
assert.strictEqual(replaced.config.slides.length, 1);
assert.deepStrictEqual(toImageSlide(replaced.accepted[0]), {
    type: 'image',
    src: '/uploads/prezentacje/fotobudka/1.jpg',
    source: 'imprezja-booth',
    duration: 8,
    caption: 'Para młoda',
    boothPhotoId: 'booth-1',
    takenAt: '2026-09-30T18:00:00.000Z',
});

const appended = applyBoothPhotos(
    { config: { name: 'wesele', slides: [{ type: 'text', text: 'Witamy' }], loop: true }, index: 0 },
    { mode: 'append', photos: [photo({ id: 'booth-2', src: '/uploads/a.webp', caption: '' })], show: true }
);
assert.strictEqual(appended.ok, true);
assert.strictEqual(appended.index, 1);
assert.strictEqual(appended.config.slides.length, 2);
assert.strictEqual(appended.config.slides[0].type, 'text');
assert.strictEqual(appended.config.slides[1].src, '/uploads/a.webp');
assert.strictEqual(appended.config.slides[1].caption, undefined);

const kept = applyBoothPhotos(
    { config: { name: 'wesele', slides: [{ type: 'text', text: 'x' }] }, index: 0 },
    { mode: 'append', show: false, photos: [photo()] }
);
assert.strictEqual(kept.index, 0);

const bad = applyBoothPhotos(null, {
    photos: [
        { src: 'https://evil.example/a.jpg' },
        { src: '/uploads/../secret.jpg' },
        { src: '/uploads/ok.png', durationSec: 999, caption: 'x'.repeat(500) },
    ],
});
assert.strictEqual(bad.ok, true);
assert.strictEqual(bad.accepted.length, 1);
assert.strictEqual(bad.rejected.length, 2);
assert.strictEqual(bad.config.slides[0].duration, 120);
assert.strictEqual(bad.config.slides[0].caption.length, 200);

assert.strictEqual(applyBoothPhotos(null, {}).ok, false);
assert.strictEqual(applyBoothPhotos(null, { photos: [] }).error, 'no_valid_photos');
assert.strictEqual(applyBoothPhotos(null, { photos: new Array(41).fill(photo()) }).error, 'too_many_photos');
assert.strictEqual(EVENTS.PRESENT, 'booth_photos_present');
assert.strictEqual(EVENTS.SHOWN, 'booth_photos_shown');

console.log('photo-presentation contract ok');
