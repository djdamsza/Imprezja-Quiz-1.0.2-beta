/**
 * Sufit liniowy wyjścia HTMLAudioElement (headroom cyfrowy).
 * Przeglądarka nie widzi głośności OS — to ogranicza maks. poziom z aplikacji.
 */
(function (global) {
    'use strict';
    var CAP = 0.85;
    function clampDigitalOutputLinear(v) {
        var n = Number(v);
        if (!isFinite(n) || n <= 0) return 0;
        return Math.min(CAP, n);
    }
    global.DIGITAL_OUTPUT_LINEAR_CAP = CAP;
    global.clampDigitalOutputLinear = clampDigitalOutputLinear;
})(typeof window !== 'undefined' ? window : globalThis);
