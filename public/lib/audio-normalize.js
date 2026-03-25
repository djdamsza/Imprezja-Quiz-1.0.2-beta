/**
 * Normalizacja głośności – analiza peak/RMS, cache, stosowanie mnożnika.
 * Dla plików uploadowanych i SFX (same-origin) – działa offline.
 */
(function (global) {
    'use strict';

    const TARGET_PEAK = 0.8;
    const MAX_GAIN = 2.5;
    const MIN_GAIN = 0.3;
    const CACHE_KEY = 'imprezja_audio_normalize';

    let cache = null;
    function getCache() {
        if (cache) return cache;
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            cache = raw ? JSON.parse(raw) : {};
        } catch (_) {
            cache = {};
        }
        return cache;
    }
    function saveCache() {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache || {}));
        } catch (_) {}
    }

    /**
     * Analizuje peak w AudioBuffer (wszystkie kanały).
     * @param {AudioBuffer} buffer
     * @returns {number} peak 0–1
     */
    function analyzePeak(buffer) {
        let peak = 0;
        const channels = buffer.numberOfChannels;
        const length = buffer.length;
        for (let c = 0; c < channels; c++) {
            const data = buffer.getChannelData(c);
            for (let i = 0; i < length; i++) {
                const v = Math.abs(data[i]);
                if (v > peak) peak = v;
            }
        }
        return peak;
    }

    /**
     * Oblicza mnożnik normalizacji: targetPeak / measuredPeak, z ograniczeniami.
     */
    function computeGain(peak) {
        if (!peak || peak < 0.0001) return 1;
        let g = TARGET_PEAK / peak;
        return Math.max(MIN_GAIN, Math.min(MAX_GAIN, g));
    }

    /**
     * Pobiera znormalizowany mnożnik dla URL (same-origin).
     * Dla /uploads/ i /api/ – fetch, decode, analiza, cache.
     * @param {string} url – pełny URL (np. origin + /uploads/xxx.mp3)
     * @returns {Promise<number>} gain (1 = brak korekcji)
     */
    async function getNormalizedGainForUrl(url) {
        if (!url || typeof url !== 'string') return 1;
        const c = getCache();
        const fullUrl = url.startsWith('/') ? (window.location.origin || '') + url : url;
        const key = fullUrl;
        if (typeof c[key] === 'number') return c[key];
        if (!fullUrl.startsWith(window.location.origin) && !fullUrl.startsWith('http://127.0.0.1') && !fullUrl.startsWith('http://localhost')) {
            return 1;
        }

        // decodeAudioData powoduje SIGSEGV w Electron — używamy cache lub pomijamy
        if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('Electron')) {
            return 1;
        }

        try {
            const res = await fetch(fullUrl);
            if (!res.ok) return 1;
            const arrayBuffer = await res.arrayBuffer();
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const buffer = await ctx.decodeAudioData(arrayBuffer);
            ctx.close();
            const peak = analyzePeak(buffer);
            const gain = computeGain(peak);
            c[key] = gain;
            saveCache();
            return gain;
        } catch (err) {
            return 1;
        }
    }

    /**
     * Pobiera gain z cache (synchronicznie). Zwraca 1 jeśli brak.
     */
    function getCachedGain(url) {
        if (!url) return 1;
        const fullUrl = url.startsWith('/') ? (window.location.origin || '') + url : url;
        const c = getCache();
        return typeof c[fullUrl] === 'number' ? c[fullUrl] : 1;
    }

    global.AudioNormalize = {
        getNormalizedGainForUrl,
        getCachedGain,
        analyzePeak,
        computeGain,
        clearCache: () => { cache = {}; saveCache(); }
    };
})(typeof window !== 'undefined' ? window : this);
