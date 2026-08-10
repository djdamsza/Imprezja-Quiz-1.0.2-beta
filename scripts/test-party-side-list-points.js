#!/usr/bin/env node
/**
 * Testy punktów Party Quiz — listy boczne (SL) vs lista główna.
 *
 * Uruchomienie (unit + integracja przy działającym serwerze):
 *   node scripts/test-party-side-list-points.js
 *   SMOKE_BASE=http://127.0.0.1:3000 node scripts/test-party-side-list-points.js
 *
 * Tylko unit (bez socket.io):
 *   PARTY_POINTS_UNIT_ONLY=1 node scripts/test-party-side-list-points.js
 */

'use strict';

const http = require('http');

// —— Lustrzana logika partyGetQuestionPoints (server.js) ——
function partyGetQuestionPoints(q, ctx) {
    if (!q) return 0;
    if (q.type === 'FAST_LIST') return 5;
    if (q.type === 'FAMILIADA') {
        return (Array.isArray(q.answers) ? q.answers : []).reduce(
            (s, a) => s + (a && typeof a.points === 'number' ? a.points : 0), 0
        ) || 0;
    }
    if (q.type === 'SHIPS') {
        return (typeof q.pointsPerHit === 'number' && q.pointsPerHit > 0) ? q.pointsPerHit : 5;
    }
    if (typeof q.points === 'number' && q.points > 0) return q.points;
    if (ctx.currentSideListId && ctx.currentSideListId !== 'golden') {
        const sideEntry = ctx.sideListsById[ctx.currentSideListId];
        if (sideEntry && typeof sideEntry.defaultPoints === 'number') return sideEntry.defaultPoints;
    }
    if (ctx.mainDefaultPoints != null) return ctx.mainDefaultPoints;
    return 10;
}

function assertEq(actual, expected, label) {
    if (actual !== expected) {
        throw new Error(`${label}: oczekiwano ${expected}, otrzymano ${actual}`);
    }
}

function runUnitTests() {
    const sideListsById = {
        'sl-ciekawostki': { defaultPoints: 5 },
        golden: { defaultPoints: 99 }
    };
    const baseCtx = {
        currentSideListId: null,
        sideListsById,
        mainDefaultPoints: 10
    };

    assertEq(partyGetQuestionPoints({ type: 'QUIZ' }, baseCtx), 10, 'QUIZ główna — default 10');
    assertEq(
        partyGetQuestionPoints({ type: 'QUIZ' }, Object.assign({}, baseCtx, { currentSideListId: 'sl-ciekawostki' })),
        5,
        'QUIZ na SL — defaultPoints pliku SL (5)'
    );
    assertEq(
        partyGetQuestionPoints({ type: 'QUIZ', points: 15 }, Object.assign({}, baseCtx, { currentSideListId: 'sl-ciekawostki' })),
        15,
        'QUIZ na SL — nadpisanie q.points'
    );
    assertEq(
        partyGetQuestionPoints({ type: 'LETTER' }, Object.assign({}, baseCtx, { currentSideListId: 'sl-ciekawostki' })),
        5,
        'LETTER na SL — defaultPoints pliku (nie stałe 10)'
    );
    assertEq(
        partyGetQuestionPoints({ type: 'LETTER' }, baseCtx),
        10,
        'LETTER główna — default quizu'
    );
    assertEq(partyGetQuestionPoints({ type: 'FAST_LIST' }, baseCtx), 5, 'FAST_LIST — zawsze 5');
    assertEq(partyGetQuestionPoints({ type: 'SHIPS', pointsPerHit: 7 }, baseCtx), 7, 'SHIPS — pointsPerHit');
    assertEq(
        partyGetQuestionPoints({
            type: 'FAMILIADA',
            answers: [{ text: 'A', points: 40 }, { text: 'B', points: 60 }]
        }, baseCtx),
        100,
        'FAMILIADA — suma puli'
    );
    assertEq(
        partyGetQuestionPoints({ type: 'QUIZ' }, Object.assign({}, baseCtx, { currentSideListId: 'golden' })),
        10,
        'Złota lista — default z głównego quizu (nie sideEntry golden)'
    );

    console.log('✅ Unit: partyGetQuestionPoints — ' + 9 + ' przypadków OK');
}

function httpGet(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? require('https') : http;
        lib.get(url, { timeout: 8000 }, (res) => {
            let raw = '';
            res.on('data', (c) => { raw += c; });
            res.on('end', () => resolve({ status: res.statusCode, raw }));
        }).on('error', reject);
    });
}

function waitPartyState(socket, predicate, timeoutMs) {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + (timeoutMs || 8000);
        function onState(st) {
            if (predicate(st)) {
                socket.off('party_state', onState);
                resolve(st);
            } else if (Date.now() > deadline) {
                socket.off('party_state', onState);
                reject(new Error('Timeout oczekiwania na party_state'));
            }
        }
        socket.on('party_state', onState);
    });
}

function emitAck(socket, event, payload) {
    return new Promise((resolve) => {
        socket.emit(event, payload);
        setTimeout(resolve, 120);
    });
}

async function runIntegrationTests(baseUrl) {
    let ioClient;
    try {
        ioClient = require('socket.io-client');
    } catch (_) {
        console.warn('⚠️  Pominięto test integracyjny — brak socket.io-client (npm i -D socket.io-client)');
        return;
    }

    const ping = await httpGet(`${baseUrl}/test-connection`).catch(() => ({ status: 0 }));
    if (ping.status !== 200) {
        console.warn('⚠️  Serwer nie działa na ' + baseUrl + ' — pominięto integrację');
        return;
    }

    const socket = ioClient(baseUrl, { transports: ['websocket'], timeout: 8000 });
    await new Promise((res, rej) => {
        socket.once('connect', res);
        socket.once('connect_error', rej);
        setTimeout(() => rej(new Error('Socket connect timeout')), 8000);
    });

    const mainFile = 'Party-Quiz-test-15.json';
    let sideLists = [];

    await new Promise((resolve) => {
        socket.once('party_side_lists', (lists) => {
            sideLists = lists || [];
            resolve();
        });
        setTimeout(resolve, 800);
    });

    socket.emit('party_load_quiz', mainFile);
    await waitPartyState(socket, (st) => st.active && st.activeFile === mainFile, 5000);

    socket.emit('party_reset_scores');
    await emitAck(socket, 'party_reset_scores');

    const slEntries = sideLists.filter((l) => l.type === 'quiz' && l.file && l.file.startsWith('SL -'));
    if (!slEntries.length) {
        console.warn('⚠️  Brak pliku SL na serwerze — pominięto integrację list bocznych');
        socket.disconnect();
        return;
    }

    let integrationCount = 0;

    for (const slEntry of slEntries) {
        console.log(`\n— SL: ${slEntry.label || slEntry.file} (defaultPoints=${slEntry.defaultPoints}) —`);

        const letterQ = (slEntry.questions || []).find((q) => q.type === 'LETTER');
        const quizQIdx = (slEntry.questions || []).findIndex((q) => q.type === 'QUIZ');
        const fastQIdx = (slEntry.questions || []).findIndex((q) => q.type === 'FAST_LIST');
        const shipsQIdx = (slEntry.questions || []).findIndex((q) => q.type === 'SHIPS' && Array.isArray(q.ships) && q.ships.length);

        if (quizQIdx >= 0) {
            socket.emit('party_reset_scores');
            await emitAck(socket, 'party_reset_scores');
            socket.emit('party_run_side_question', { listId: slEntry.id, index: quizQIdx });
            await waitPartyState(socket, (st) => st.currentSideListId === slEntry.id && st.currentSideListIndex === quizQIdx, 5000);
            const expected = typeof slEntry.defaultPoints === 'number' ? slEntry.defaultPoints : 10;
            socket.emit('party_award_points', { team: 'blue' });
            const st1 = await waitPartyState(socket, (st) => st.teams.blue.score === expected, 3000);
            assertEq(st1.teams.blue.score, expected, `Integracja SL QUIZ → blue +${expected}`);
            console.log(`✅ Integracja: SL QUIZ → niebiescy +${expected} pkt`);
            integrationCount++;
        }

        if (letterQ) {
            const letterIdx = slEntry.questions.indexOf(letterQ);
            socket.emit('party_reset_scores');
            socket.emit('party_run_side_question', { listId: slEntry.id, index: letterIdx });
            await waitPartyState(socket, (st) => st.currentSideListIndex === letterIdx, 5000);
            const expectedLetter = partyGetQuestionPoints(letterQ, {
                currentSideListId: slEntry.id,
                sideListsById: { [slEntry.id]: { defaultPoints: slEntry.defaultPoints } },
                mainDefaultPoints: 10
            });
            socket.emit('party_award_letter', { team: 'red' });
            const st2 = await waitPartyState(socket, (st) => st.teams.red.score === expectedLetter, 3000);
            assertEq(st2.teams.red.score, expectedLetter, `Integracja SL LETTER → red +${expectedLetter}`);
            console.log(`✅ Integracja: SL LETTER → czerwoni +${expectedLetter} pkt`);
            integrationCount++;
        }

        if (fastQIdx >= 0) {
            socket.emit('party_reset_scores');
            socket.emit('party_run_side_question', { listId: slEntry.id, index: fastQIdx });
            await waitPartyState(socket, (st) => st.currentSideListIndex === fastQIdx, 5000);
            socket.emit('party_award_fast_list', { team: 'blue', itemIndex: 0 });
            const st3 = await waitPartyState(socket, (st) => st.teams.blue.score === 5, 3000);
            assertEq(st3.teams.blue.score, 5, 'Integracja SL FAST_LIST → blue +5');
            console.log('✅ Integracja: SL FAST_LIST → niebiescy +5 pkt');
            integrationCount++;
        }

        if (shipsQIdx >= 0) {
            const shipsQ = slEntry.questions[shipsQIdx];
            const pph = (typeof shipsQ.pointsPerHit === 'number' && shipsQ.pointsPerHit > 0) ? shipsQ.pointsPerHit : 5;
            const ship = shipsQ.ships[0];
            socket.emit('party_reset_scores');
            socket.emit('party_run_side_question', { listId: slEntry.id, index: shipsQIdx });
            await waitPartyState(socket, (st) => st.currentSideListIndex === shipsQIdx, 5000);
            socket.emit('party_ships_shot', { row: ship.row, col: ship.col });
            const st4 = await waitPartyState(socket, (st) => st.teams.blue.score === pph, 3000);
            assertEq(st4.teams.blue.score, pph, `Integracja SL SHIPS hit → blue +${pph}`);
            console.log(`✅ Integracja: SL SHIPS trafienie → niebiescy +${pph} pkt`);
            integrationCount++;
        }
    }

    if (!integrationCount) {
        console.warn('⚠️  Pliki SL bez obsługiwanych typów pytań do testu integracji');
    }

    socket.disconnect();
    console.log('\n✅ Test integracyjny list bocznych: punkty trafiają do drużyn.');
}

async function main() {
    runUnitTests();
    if (process.env.PARTY_POINTS_UNIT_ONLY === '1') {
        console.log('\n✅ Tylko unit (PARTY_POINTS_UNIT_ONLY=1).');
        return;
    }
    const base = (process.env.SMOKE_BASE || 'http://127.0.0.1:3000').replace(/\/$/, '');
    await runIntegrationTests(base);
}

main().catch((err) => {
    console.error('❌', err.message);
    process.exit(1);
});
