/**
 * Wejścia napisów dla szybkiej listy (wybuchowa paczka, test wiedzy).
 * Nie dla Familiady ani quizu ABCD.
 * Wymaga globalnego Splitting (shshaw/Splitting, MIT).
 */
(function (global) {
    var EFFECTS = ['type', 'slide-up', 'zoom-in', 'slide-side', 'fade', 'zoom-out'];
    var LABELS = {
        type: 'Maszyna do pisania',
        'slide-up': 'Wsuwanie od dołu',
        'zoom-in': 'Zoom in',
        'slide-side': 'Wsuwanie z boków',
        fade: 'Stopniowe pojawianie',
        'zoom-out': 'Zoom out'
    };

    function stamp(el, by) {
        if (typeof global.Splitting !== 'function') return;
        try { delete el['\uD83C\uDF4C']; } catch (_) {}
        global.Splitting({ target: el, by: by, force: true });
        var chars = el.querySelectorAll('.char');
        chars.forEach(function (node, i) {
            node.style.setProperty('--i', String(i));
        });
        var words = el.querySelectorAll('.word');
        words.forEach(function (node, i) {
            node.style.setProperty('--w', String(i));
        });
        var n = Math.max(chars.length, words.length, 1);
        var step = n > 70 ? 22 : 42;
        el.style.setProperty('--flc-step', step + 'ms');
    }

    function paint(el, text, effect) {
        if (!el) return;
        var fx = EFFECTS.indexOf(effect) >= 0 ? effect : EFFECTS[0];
        var by = (fx === 'type') ? 'chars' : 'words';
        var whole = (fx === 'zoom-in' || fx === 'zoom-out');
        el.textContent = text == null ? '' : String(text);
        el.classList.add('flc-line', 'flc-arm');
        EFFECTS.concat(['pop', 'go']).forEach(function (name) {
            el.classList.remove('flc-' + name);
        });
        if (!whole) stamp(el, by);
        el.classList.add('flc-' + fx);
        requestAnimationFrame(function () {
            el.classList.add('flc-go');
        });
        return fx;
    }

    global.FastListCaption = {
        EFFECTS: EFFECTS,
        LABELS: LABELS,
        effectAt: function (index) {
            var i = ((index % EFFECTS.length) + EFFECTS.length) % EFFECTS.length;
            return EFFECTS[i];
        },
        label: function (effect) {
            return LABELS[effect] || effect;
        },
        showQuestion: function (el, text, effect) {
            return paint(el, text, effect);
        },
        showAnswer: function (el, text) {
            return paint(el, text, 'pop');
        }
    };
})(window);
