#!/usr/bin/env node
/**
 * Test round-trip punktów złotej listy Familiady (POST → GET).
 * Uruchom przy działającym serwerze: node scripts/test-familiada-golden-points.js
 */
const http = require('http');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

const sample = [
    {
        question: 'Alkohol bez litery "W" w nazwie',
        answers: [
            { text: 'Bimber', points: 40 },
            { text: 'Rum', points: 0 },
            { text: 'Gin', points: 0 },
            { text: 'Tequila', points: 0 }
        ]
    },
    {
        question: 'Test złotej listy – punkty niestandardowe',
        answers: [
            { text: 'Odp A', points: 55 },
            { text: 'Odp B', points: 30 },
            { text: 'Odp C', points: 15 }
        ]
    }
];

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const req = http.request({
            hostname: HOST,
            port: PORT,
            path,
            method,
            headers: body ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            } : {}
        }, (res) => {
            let raw = '';
            res.on('data', (c) => { raw += c; });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, json: JSON.parse(raw || 'null') });
                } catch (e) {
                    reject(new Error('Invalid JSON: ' + raw.slice(0, 200)));
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

function pointsEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

async function main() {
    let backup = null;
    try {
        const get0 = await request('GET', '/api/familiada/golden');
        if (get0.status !== 200) throw new Error('GET golden failed: ' + get0.status);
        backup = get0.json;

        const post = await request('POST', '/api/familiada/golden', sample);
        if (post.status !== 200) throw new Error('POST golden failed: ' + post.status + ' ' + JSON.stringify(post.json));

        const get1 = await request('GET', '/api/familiada/golden?_=' + Date.now());
        if (get1.status !== 200) throw new Error('GET after POST failed');

        let ok = true;
        for (const expected of sample) {
            const found = get1.json.find(q => q.question === expected.question);
            if (!found) {
                console.error('❌ Brak pytania:', expected.question);
                ok = false;
                continue;
            }
            if (!pointsEqual(found.answers, expected.answers)) {
                console.error('❌ Punkty się zmieniły dla:', expected.question);
                console.error('   oczekiwano:', JSON.stringify(expected.answers));
                console.error('   otrzymano: ', JSON.stringify(found.answers));
                ok = false;
            } else {
                console.log('✅ Zachowano punkty:', expected.question);
            }
        }

        if (backup) {
            await request('POST', '/api/familiada/golden', backup);
            console.log('↩️  Przywrócono poprzednią złotą listę');
        }

        if (!ok) process.exit(1);
        console.log('\n✅ Test złotej listy: punkty przetrwały zapis i odczyt.');
    } catch (err) {
        console.error('❌', err.message);
        if (/ECONNREFUSED/.test(err.message)) {
            console.error('   Uruchom serwer: npm start');
        }
        process.exit(1);
    }
}

main();
