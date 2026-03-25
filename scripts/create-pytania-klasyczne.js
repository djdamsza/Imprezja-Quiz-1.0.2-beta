#!/usr/bin/env node
/**
 * Tworzy Pytania klasyczne.json z universal-bank.json – konwersja do formatu Familiady z punktami.
 */
const fs = require('fs');
const path = require('path');

const POINTS_PRESETS = {
    2: [60, 40],
    3: [50, 33, 17],
    4: [40, 30, 20, 10],
    5: [30, 25, 20, 15, 10],
    6: [25, 21, 18, 15, 12, 9],
    7: [22, 18, 15, 13, 12, 11, 9],
    8: [20, 17, 15, 13, 11, 10, 8, 6],
    9: [22, 18, 14, 12, 10, 9, 7, 5, 3],
    10: [20, 16, 13, 11, 10, 9, 8, 7, 5, 1]
};

function getAutoPoints(n) {
    if (POINTS_PRESETS[n]) return [...POINTS_PRESETS[n]];
    const base = [25, 20, 17, 14, 12, 10, 8, 6, 5, 4, 3, 2];
    const arr = base.slice(0, n).map((v, i) => Math.max(1, v - Math.floor(i / 3)));
    const sum = arr.reduce((a, b) => a + b, 0);
    const scaled = arr.map(v => Math.round(v * 100 / sum));
    const diff = 100 - scaled.reduce((a, b) => a + b, 0);
    if (diff !== 0) scaled[0] += diff;
    return scaled;
}

const root = path.join(__dirname, '..');
const bankPath = path.join(root, 'public', 'familiada', 'universal-bank.json');
// NIE nadpisuj Pytania klasyczne.json – to lista użytkownika. Skrypt zapisuje do osobnego pliku.
const outPath = path.join(root, 'public', 'familiada', 'Bank-universalny-konwertowany.json');

const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
const result = bank.map(q => {
    const ansArr = Array.isArray(q.answers) ? q.answers : [];
    const pts = getAutoPoints(ansArr.length);
    const answers = ansArr.map((a, i) => ({
        text: typeof a === 'string' ? a : (a.text || String(a)),
        points: pts[i] ?? 40
    }));
    return { question: q.question || '', answers };
});

fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
console.log('Utworzono Bank-universalny-konwertowany.json: ' + result.length + ' pytań (nie nadpisuje Pytania klasyczne.json)');
