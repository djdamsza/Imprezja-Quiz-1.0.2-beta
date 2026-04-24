/**
 * Walidacja odpowiedzi „pytanie z literą”: słowa polskie / angielskie (łacina + polskie znaki diakrytyczne),
 * bez pełnego Unicode (cyrylica, emoji, znaki chińskie itd.).
 * Współdzielone: vote.html (przeglądarka) i server.js (Node).
 */
(function (g) {
    'use strict';

    var PL_MAP = {
        ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
        Ą: 'a', Ć: 'c', Ę: 'e', Ł: 'l', Ń: 'n', Ó: 'o', Ś: 's', Ź: 'z', Ż: 'z'
    };

    function fold(word) {
        var s = String(word || '');
        var out = '';
        for (var i = 0; i < s.length; i++) {
            var ch = s[i];
            out += Object.prototype.hasOwnProperty.call(PL_MAP, ch) ? PL_MAP[ch] : ch;
        }
        return out.toLowerCase();
    }

    /** Słowo musi zaczynać się na wylosowaną literę ASCII (a–z), z uwzględnieniem polskich odpowiedników (np. Ł → l). */
    function startsWithLetter(word, asciiLetter) {
        var req = String(asciiLetter || '').toLowerCase();
        if (!req) return false;
        var f = fold(word);
        return f.length >= req.length && f.slice(0, req.length) === req;
    }

    /** Litery PL+EN, opcjonalnie apostrof lub myślnik wewnątrz wyrazu (bez spacji, cyfr, emoji). */
    function onlyPlEnLetters(s) {
        if (typeof s !== 'string') return false;
        var t = s.trim();
        if (!t) return false;
        return /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ'\-]+$/.test(t);
    }

    g.ImprezjaLetterWord = {
        fold: fold,
        startsWithLetter: startsWithLetter,
        onlyPlEnLetters: onlyPlEnLetters
    };
})(typeof globalThis !== 'undefined' ? globalThis : this);
