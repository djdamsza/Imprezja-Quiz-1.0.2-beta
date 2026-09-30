'use strict';

/**
 * Kontrakt prezentacji zdjęć między Imprezja Booth (fotobudka) a Imprezja Quiz.
 *
 * Fotobudka wysyła gotowe ścieżki plików. Quiz pokazuje je jako slajdy
 * type:image w istniejącym ekranie prezentacji. Aplikacja fotobudki
 * nie jest częścią tego repozytorium.
 *
 * Zdarzenia Socket.IO:
 *   booth_photos_present  fotobudka → quiz
 *   booth_photos_shown    quiz → fotobudka (potwierdzenie)
 *
 * Zdjęcie musi leżeć już w /uploads/ (np. po POST /api/prezentacje/upload
 * albo POST /upload). Kontrakt nie pobiera URL-i z sieci.
 */

const CONTRACT_VERSION = 1;

const EVENTS = Object.freeze({
    PRESENT: 'booth_photos_present',
    SHOWN: 'booth_photos_shown',
});

const LIMITS = Object.freeze({
    maxPhotos: 40,
    captionMax: 200,
    idMax: 80,
    durationMin: 1,
    durationMax: 120,
    defaultDuration: 8,
});

const SRC_RE = /^\/uploads\/[A-Za-z0-9._/-]+$/;

function isSafeUploadSrc(src) {
    if (typeof src !== 'string') return false;
    if (src.includes('..') || src.includes('\\') || src.includes('//')) return false;
    return SRC_RE.test(src);
}

function presentationName(raw) {
    const s = String(raw || 'fotobudka')
        .trim()
        .replace(/[^a-zA-Z0-9_\-\sąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '')
        .replace(/\s+/g, '_');
    return s || 'fotobudka';
}

function normalizePhoto(raw, index) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { ok: false, reason: 'not_object', index };
    }
    const src = typeof raw.src === 'string' ? raw.src.trim() : '';
    if (!isSafeUploadSrc(src)) {
        return { ok: false, reason: 'src', index };
    }
    const photo = { src, source: 'imprezja-booth' };
    if (typeof raw.id === 'string' && raw.id.trim()) {
        const id = raw.id.trim().slice(0, LIMITS.idMax);
        if (!/^[A-Za-z0-9._:-]+$/.test(id)) return { ok: false, reason: 'id', index };
        photo.id = id;
    }
    if (typeof raw.caption === 'string' && raw.caption.trim()) {
        photo.caption = raw.caption.trim().slice(0, LIMITS.captionMax);
    }
    if (raw.durationSec != null && raw.durationSec !== '') {
        const n = Number(raw.durationSec);
        if (!Number.isFinite(n)) return { ok: false, reason: 'durationSec', index };
        photo.durationSec = Math.min(LIMITS.durationMax, Math.max(LIMITS.durationMin, Math.round(n)));
    }
    if (typeof raw.takenAt === 'string' && raw.takenAt.trim()) {
        const takenAt = raw.takenAt.trim().slice(0, 40);
        if (Number.isNaN(Date.parse(takenAt))) return { ok: false, reason: 'takenAt', index };
        photo.takenAt = takenAt;
    }
    return { ok: true, photo };
}

/** Slajd zgodny z public/prezentacja-screen.html (type, src, caption, duration). */
function toImageSlide(photo) {
    const slide = {
        type: 'image',
        src: photo.src,
        source: 'imprezja-booth',
        duration: photo.durationSec != null ? photo.durationSec : LIMITS.defaultDuration,
    };
    if (photo.caption) slide.caption = photo.caption;
    if (photo.id) slide.boothPhotoId = photo.id;
    if (photo.takenAt) slide.takenAt = photo.takenAt;
    return slide;
}

/**
 * @param {{ config?: { name?: string, slides?: object[], loop?: boolean } | null, index?: number } | null} current
 * @param {object | null} payload
 */
function applyBoothPhotos(current, payload) {
    const body = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
    if (!body || !Array.isArray(body.photos)) {
        return { ok: false, error: 'photos_required', accepted: [], rejected: [] };
    }
    if (body.photos.length > LIMITS.maxPhotos) {
        return { ok: false, error: 'too_many_photos', accepted: [], rejected: [] };
    }
    const accepted = [];
    const rejected = [];
    body.photos.forEach((raw, index) => {
        const normalized = normalizePhoto(raw, index);
        if (normalized.ok) accepted.push(normalized.photo);
        else rejected.push({ index, reason: normalized.reason });
    });
    if (!accepted.length) {
        return { ok: false, error: 'no_valid_photos', accepted: [], rejected };
    }

    const mode = body.mode === 'append' ? 'append' : 'replace';
    const name = presentationName(body.presentation);
    const slides = accepted.map(toImageSlide);
    const prev = current && current.config && Array.isArray(current.config.slides) ? current.config : null;
    let config;
    let firstNewIndex;
    if (mode === 'append' && prev) {
        firstNewIndex = prev.slides.length;
        config = {
            ...prev,
            name: prev.name || name,
            slides: prev.slides.concat(slides),
        };
    } else {
        firstNewIndex = 0;
        const transition = body.transition === 'slide' || body.transition === 'none' ? body.transition : 'fade';
        config = {
            name,
            slides,
            transition,
            loop: body.loop !== false,
            source: 'imprezja-booth',
        };
    }

    const show = body.show !== false;
    const previousIndex = current && Number.isInteger(current.index) ? current.index : 0;
    return {
        ok: true,
        contractVersion: CONTRACT_VERSION,
        mode,
        config,
        index: show ? firstNewIndex : previousIndex,
        playing: body.playing === true,
        accepted,
        rejected,
    };
}

module.exports = {
    CONTRACT_VERSION,
    EVENTS,
    LIMITS,
    isSafeUploadSrc,
    normalizePhoto,
    toImageSlide,
    applyBoothPhotos,
};
