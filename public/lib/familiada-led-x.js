/**
 * Oryginalny znacznik błędu z tablicy żarówkowej Familiady
 * (skrzydła góra/dół + klepsydra). Nie litera X z czcionki.
 * fill = currentColor — kolory i aktywacja zostają w CSS ekranu.
 */
(function (root) {
    const X_MAP = [
        '#####       #####',
        '######     ######',
        ' #####     ##### ',
        '  ####     ####  ',
        '   ##  # #  ##   ',
        '                 ',
        '                 ',
        '      #####      ',
        '       ###       ',
        '        #        ',
        '       ###       ',
        '      #####      ',
        '                 ',
        '                 ',
        '   ##  # #  ##   ',
        '  ####     ####  ',
        ' #####     ##### ',
        '######     ######',
        '#####       #####'
    ];

    const CELL = 10;
    const PAD = 8;
    const R = 3.15;
    const COLS = X_MAP[0].length;
    const ROWS = X_MAP.length;
    const VB_W = COLS * CELL + PAD * 2;
    const VB_H = ROWS * CELL + PAD * 2;

    let dots = '';
    X_MAP.forEach(function (line, y) {
        for (let x = 0; x < line.length; x++) {
            if (line.charAt(x) !== '#') continue;
            const cx = PAD + x * CELL + CELL / 2;
            const cy = PAD + y * CELL + CELL / 2;
            dots += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '"/>';
        }
    });

    function familiadaLedXSvg(className, opts) {
        const cls = className ? String(className) : 'x-pixel';
        const box = opts && opts.box;
        const housing = box
            ? '<rect x="1" y="1" width="' + (VB_W - 2) + '" height="' + (VB_H - 2) +
              '" rx="10" ry="10" fill="#0b0d12" stroke="#1a1e28" stroke-width="2"/>'
            : '';
        return '<svg class="' + cls + ' fam-led-x" viewBox="0 0 ' + VB_W + ' ' + VB_H +
            '" aria-hidden="true" focusable="false">' +
            housing +
            '<g fill="currentColor">' + dots + '</g>' +
            '</svg>';
    }

    root.familiadaLedXSvg = familiadaLedXSvg;
})(typeof window !== 'undefined' ? window : globalThis);
