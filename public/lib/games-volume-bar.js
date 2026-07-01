/**
 * Dolny suwak głośności gier (gamesVolume) – wspólny dla paneli admina.
 * Opcjonalnie: mała ikona pełnego ekranu w prawym dolnym rogu docka.
 */
(function (global) {
    const DOCK_ID = 'games-volume-dock';
    const SLIDER_ID = 'games-volume-bar-slider';
    const PCT_ID = 'games-volume-bar-pct';
    const FS_BTN_ID = 'games-volume-fs-btn';

    const STYLE = `
.games-volume-dock {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10050;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    padding-bottom: max(10px, env(safe-area-inset-bottom));
    background: rgba(8, 12, 24, 0.96);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.35);
    font-family: system-ui, -apple-system, sans-serif;
    color: #e2e8f0;
}
.games-volume-dock label {
    font-size: 0.82rem;
    font-weight: 700;
    white-space: nowrap;
    color: #94a3b8;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}
.games-volume-dock input[type="range"] {
    flex: 1;
    min-width: 0;
    height: 8px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.18);
    border-radius: 4px;
    outline: none;
}
.games-volume-dock input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 22px;
    height: 22px;
    background: #667eea;
    border-radius: 50%;
    cursor: pointer;
}
.games-volume-dock .games-volume-pct {
    min-width: 42px;
    text-align: right;
    font-size: 0.85rem;
    font-weight: 600;
    color: #cbd5e1;
}
.games-volume-dock .games-volume-fs-btn {
    flex: 0 0 auto;
    width: 38px;
    height: 38px;
    margin-left: 2px;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    color: #e2e8f0;
    font-size: 1.15rem;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, border-color 0.15s;
}
.games-volume-dock .games-volume-fs-btn:hover {
    background: rgba(102, 126, 234, 0.35);
    border-color: rgba(102, 126, 234, 0.6);
}
.games-volume-dock .games-volume-fs-btn[aria-pressed="true"] {
    background: rgba(102, 126, 234, 0.45);
    border-color: #667eea;
}
`;

    function fullscreenElement() {
        return document.fullscreenElement || document.webkitFullscreenElement ||
            document.mozFullScreenElement || document.msFullscreenElement;
    }

    function toggleFullscreen() {
        const el = document.documentElement;
        if (!fullscreenElement()) {
            const req = el.requestFullscreen || el.webkitRequestFullscreen ||
                el.mozRequestFullScreen || el.msRequestFullscreen;
            if (req) {
                try {
                    const p = req.call(el);
                    if (p && typeof p.catch === 'function') p.catch(function () {});
                } catch (e) {}
            }
        } else {
            const exit = document.exitFullscreen || document.webkitExitFullscreen ||
                document.mozCancelFullScreen || document.msExitFullscreen;
            if (exit) {
                try {
                    const p = exit.call(document);
                    if (p && typeof p.catch === 'function') p.catch(function () {});
                } catch (e) {}
            }
        }
    }

    function syncFsBtn(btn) {
        if (!btn) return;
        const fs = !!fullscreenElement();
        btn.setAttribute('aria-pressed', fs ? 'true' : 'false');
        btn.title = fs ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran';
        btn.textContent = '⊞';
    }

    function bindFullscreenButton(btn) {
        if (!btn || btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', toggleFullscreen);
        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(function (ev) {
            document.addEventListener(ev, function () { syncFsBtn(btn); });
        });
        syncFsBtn(btn);
    }

    function mountGamesVolumeBar(socket, opts) {
        opts = opts || {};
        if (!socket) return null;
        if (!document.getElementById(DOCK_ID)) {
            if (!document.getElementById('games-volume-bar-style')) {
                const style = document.createElement('style');
                style.id = 'games-volume-bar-style';
                style.textContent = STYLE;
                document.head.appendChild(style);
            }
            const dock = document.createElement('div');
            dock.id = DOCK_ID;
            dock.className = 'games-volume-dock';
            dock.setAttribute('aria-label', 'Głośność gier');
            const showFs = opts.fullscreen !== false;
            dock.innerHTML =
                '<label for="' + SLIDER_ID + '">🎮 Gry</label>' +
                '<input type="range" id="' + SLIDER_ID + '" min="0" max="100" value="80" title="Quiz, Familiada, Party, Sampler, Śpiewaj Dalej, Bitwa, Statki">' +
                '<span class="games-volume-pct" id="' + PCT_ID + '">80%</span>' +
                (showFs ? '<button type="button" class="games-volume-fs-btn" id="' + FS_BTN_ID + '" aria-label="Pełny ekran" title="Pełny ekran">⊞</button>' : '');
            document.body.appendChild(dock);
            if (opts.bodyPadding !== false) {
                const extra = opts.paddingBottom || '52px';
                document.body.style.paddingBottom = 'calc(' + extra + ' + env(safe-area-inset-bottom))';
            }
            if (showFs) bindFullscreenButton(document.getElementById(FS_BTN_ID));
        }

        const slider = document.getElementById(SLIDER_ID);
        const pct = document.getElementById(PCT_ID);
        if (!slider || !pct) return null;

        function apply(v) {
            const p = Math.round(Math.max(0, Math.min(1, v)) * 100);
            slider.value = p;
            pct.textContent = p + '%';
            return p / 100;
        }

        function getVolume() {
            return parseFloat(slider.value) / 100;
        }

        if (!slider.dataset.bound) {
            slider.dataset.bound = '1';
            slider.addEventListener('input', function () {
                const v = apply(parseFloat(slider.value) / 100);
                socket.emit('games_volume', { volume: v });
            });
            socket.on('games_volume', function (d) {
                apply(d && typeof d.volume === 'number' ? d.volume : 1);
            });
            socket.on('volumes_all', function (d) {
                if (d && typeof d.games === 'number') apply(d.games);
            });
            socket.emit('games_volume_request');
        }

        return { apply: apply, getVolume: getVolume, slider: slider, toggleFullscreen: toggleFullscreen };
    }

    global.ImprezjaGamesVolume = { mount: mountGamesVolumeBar, toggleFullscreen: toggleFullscreen };
})(typeof window !== 'undefined' ? window : global);
