#!/usr/bin/env node
/**
 * Pobiera tmole.exe (Tunnelmole dla Windows) przed buildem.
 * Uruchamiane automatycznie przez npm run build:win – zero ręcznych kroków.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const URL = 'https://tunnelmole.com/downloads/tmole.exe';
const root = path.join(__dirname, '..');
const dir = path.join(root, 'resources', 'tunnelmole-windows');
const file = path.join(dir, 'tmole.exe');

if (fs.existsSync(file)) {
    const stat = fs.statSync(file);
    if (stat.size > 100000) {
        console.log('✅ tmole.exe już istnieje (' + Math.round(stat.size / 1024) + ' KB) – pomijam pobieranie');
        process.exit(0);
        return;
    }
}

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

console.log('📥 Pobieram tmole.exe (Tunnelmole dla Windows)...');
https.get(URL, { timeout: 60000 }, (res) => {
    if (res.statusCode !== 200) {
        console.error('❌ Błąd pobierania: HTTP ' + res.statusCode);
        process.exit(1);
    }
    const stream = fs.createWriteStream(file);
    res.pipe(stream);
    stream.on('finish', () => {
        stream.close();
        const size = fs.statSync(file).size;
        if (size < 100000) {
            fs.unlinkSync(file);
            console.error('❌ Pobrany plik jest za mały – prawdopodobnie błąd');
            process.exit(1);
        }
        console.log('✅ Pobrano tmole.exe (' + Math.round(size / 1024) + ' KB)');
        process.exit(0);
    });
}).on('error', (err) => {
    console.error('❌ Błąd pobierania:', err.message);
    process.exit(1);
});
