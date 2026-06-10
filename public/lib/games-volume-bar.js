/**
 * Dolny suwak głośności gier (gamesVolume) – wspólny dla paneli admina.
 */
(function (global) {
    const DOCK_ID = 'games-volume-dock';
    const SLIDER_ID = 'games-volume-bar-slider';
    const PCT_ID = 'games-volume-bar-pct';

    const STYLE = `
.games-volume-dock {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9000;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
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
`;

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
            dock.innerHTML =
                '<label for="' + SLIDER_ID + '">🎮 Gry</label>' +
                '<input type="range" id="' + SLIDER_ID + '" min="0" max="100" value="80" title="Quiz, Familiada, Party, Sampler, Śpiewaj Dalej, Bitwa, Statki">' +
                '<span class="games-volume-pct" id="' + PCT_ID + '">80%</span>';
            document.body.appendChild(dock);
            if (opts.bodyPadding !== false) {
                const extra = opts.paddingBottom || '52px';
                document.body.style.paddingBottom = 'calc(' + extra + ' + env(safe-area-inset-bottom))';
            }
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
            socket.on('master_volume', function (d) {
                if (d && typeof d.volume === 'number') apply(d.volume);
                else if (d && typeof d.percent === 'number') apply(d.percent / 100);
            });
            socket.emit('games_volume_request');
        }

        return { apply: apply, getVolume: getVolume, slider: slider };
    }

    global.ImprezjaGamesVolume = { mount: mountGamesVolumeBar };
})(typeof window !== 'undefined' ? window : global);
