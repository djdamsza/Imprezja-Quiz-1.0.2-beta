/**
 * Wspólna głośność ekranu muzycznych modułów (Sampler, Whitney, Śpiewaj Dalej, Bitwa).
 * tileVolume × gamesVolume × normalizedGain → jeden clamp na końcu.
 */
(function (global) {
    'use strict';

    function clamp(v) {
        return typeof global.clampDigitalOutputLinear === 'function'
            ? global.clampDigitalOutputLinear(v)
            : Math.min(0.708, Math.max(0, v));
    }

    function readPayloadVolumes(data) {
        const d = data && typeof data === 'object' ? data : {};
        let gamesVolume = d.gamesVolume;
        if (gamesVolume == null) gamesVolume = d.volume;
        if (gamesVolume == null) gamesVolume = 1;
        let tileVolume = d.tileVolume;
        if (tileVolume == null) tileVolume = 1;
        let gain = d.normalizedGain;
        if (typeof gain !== 'number' || !(gain > 0)) gain = 1;
        return {
            gamesVolume: Math.max(0, Math.min(1, Number(gamesVolume) || 0)),
            tileVolume: Math.max(0, Math.min(1, Number(tileVolume) || 0)),
            gain: gain
        };
    }

    function effectiveLinearVolume(data, channelGamesVolume) {
        const p = readPayloadVolumes(data);
        const gv = channelGamesVolume != null ? channelGamesVolume : p.gamesVolume;
        return clamp(Math.max(0, p.tileVolume * gv * p.gain));
    }

    function applyToElement(audioEl, data, channelGamesVolume) {
        if (!audioEl) return;
        audioEl.volume = effectiveLinearVolume(data, channelGamesVolume);
    }

    /** Sync: cache serwera + localStorage AudioNormalize. */
    function resolveGainSync(data) {
        const p = readPayloadVolumes(data);
        let gain = p.gain;
        if (typeof global.AudioNormalize !== 'undefined' && data && data.url) {
            const cached = global.AudioNormalize.getCachedGain(data.url);
            if (cached > 0) gain = Math.max(gain, cached);
        }
        return gain;
    }

    /** Async: max(gain serwera, analiza klienta) — w Electronie tylko serwer. */
    async function resolveGainAsync(data) {
        let gain = resolveGainSync(data);
        if (typeof global.AudioNormalize === 'undefined' || !data || !data.url) return gain;
        const url = data.url;
        const sameOrigin = url.startsWith('/') || (global.location && global.location.host && url.includes(global.location.host));
        if (!sameOrigin) return gain;
        if (global.navigator && global.navigator.userAgent && global.navigator.userAgent.includes('Electron')) {
            return gain;
        }
        try {
            const clientGain = await global.AudioNormalize.getNormalizedGainForUrl(url);
            if (clientGain > 0) gain = Math.max(gain, clientGain);
        } catch (_) {}
        return gain;
    }

    global.ImprezjaMusicScreenAudio = {
        readPayloadVolumes: readPayloadVolumes,
        effectiveLinearVolume: effectiveLinearVolume,
        applyToElement: applyToElement,
        resolveGainSync: resolveGainSync,
        resolveGainAsync: resolveGainAsync
    };
})(typeof window !== 'undefined' ? window : globalThis);
