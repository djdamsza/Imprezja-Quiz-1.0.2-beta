#!/usr/bin/env node
/**
 * Izolowane testy systemu licencji (nie dotyka ~/.imprezja-* poza opcjonalnym --live).
 * Uruchom: node scripts/test-license-system.js
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PRIVATE_KEY_PATH = path.join(ROOT, 'license-private.pem');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
    if (cond) {
        passed++;
        return;
    }
    failed++;
    console.error('FAIL:', msg);
}

function assertEq(a, b, msg) {
    assert(a === b, `${msg} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})`);
}

function loadLicenseModule(homeDir) {
    const prevHome = process.env.HOME;
    process.env.HOME = homeDir;
    if (process.platform === 'win32') {
        process.env.USERPROFILE = homeDir;
    }
    const modPath = path.join(ROOT, 'license.js');
    delete require.cache[require.resolve(modPath)];
    const license = require(modPath);
    process.env.HOME = prevHome;
    if (process.platform === 'win32') {
        process.env.USERPROFILE = prevHome;
    }
    return license;
}

function withIsolatedHome(fn) {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'imprezja-lic-test-'));
    try {
        const prevHome = process.env.HOME;
        process.env.HOME = home;
        if (process.platform === 'win32') process.env.USERPROFILE = home;
        delete require.cache[require.resolve(path.join(ROOT, 'license.js'))];
        const license = require(path.join(ROOT, 'license.js'));
        const result = fn(license, home);
        process.env.HOME = prevHome;
        if (process.platform === 'win32') process.env.USERPROFILE = prevHome;
        delete require.cache[require.resolve(path.join(ROOT, 'license.js'))];
        return result;
    } finally {
        fs.rmSync(home, { recursive: true, force: true });
    }
}

function base64urlEncode(buf) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signKey(privatePem, machineId, type = 'LT') {
    const LICENSE_TYPES = { LT: null, '1M': 30 * 86400000, '3M': 90 * 86400000, '6M': 180 * 86400000, '1Y': 365 * 86400000 };
    let expires = null;
    const durationMs = LICENSE_TYPES[type];
    if (durationMs) expires = Date.now() + durationMs;
    const payload = { m: machineId, t: type, e: expires };
    const payloadStr = JSON.stringify(payload);
    const sign = crypto.createSign('SHA256');
    sign.update(payloadStr);
    sign.end();
    const signature = sign.sign(privatePem);
    return `IMPREZJA-RSA-${base64urlEncode(Buffer.from(payloadStr))}.${base64urlEncode(signature)}`;
}

function oldFormatKey(machineId) {
    const hash = crypto.createHash('sha256').update(`IMPREZJA-${machineId}`).digest('hex').substring(0, 16).toUpperCase();
    return `IMPREZJA-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}`;
}

function writeJson(p, obj) {
    fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function licensePaths(home) {
    return {
        license: path.join(home, '.imprezja-license'),
        cache: path.join(home, '.imprezja-license-cache'),
        trial: path.join(home, '.imprezja-trial-start'),
        backup: path.join(home, 'Library', 'Application Support', 'Imprezja', 'state.json'),
    };
}

function main() {
    if (!fs.existsSync(PRIVATE_KEY_PATH)) {
        console.error('Brak license-private.pem – pomijam testy generowania RSA.');
        process.exit(1);
    }
    const privatePem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

    console.log('=== Testy systemu licencji Imprezja Quiz ===\n');

    withIsolatedHome((license, home) => {
        const paths = licensePaths(home);
        const alts = license.getMachineIdAlternatives();
        assert(alts.length >= 1, 'getMachineIdAlternatives zwraca co najmniej 1 ID');
        assert(alts.includes(license.getMachineId()), 'getMachineId() jest w alternatywach');

        console.log('Machine IDs na tym komputerze:', alts.join(', '));

        // 1. Klucz RSA dla każdego alternatywnego ID (symulacja klientów ze starymi UI)
        for (const mid of alts) {
            const key = signKey(privatePem, mid, 'LT');
            const v = license.verifyLicenseKey(key);
            assert(v.valid === true, `RSA LT dla ID ${mid}`);
        }

        // 2. Stary format IMPREZJA-XXXX dla każdego ID
        for (const mid of alts) {
            const key = oldFormatKey(mid);
            const v = license.verifyLicenseKey(key);
            assert(v.valid === true, `Stary format dla ID ${mid}`);
        }

        // 3. Klucz dla obcego komputera – odrzucony
        const foreignKey = signKey(privatePem, '0000000000000000', 'LT');
        assert(license.verifyLicenseKey(foreignKey).valid === false, 'Obcy Machine ID odrzucony');

        // 4. Ważna licencja w pliku → checkLicense valid, bez triala
        const primaryKey = signKey(privatePem, alts[0], 'LT');
        assert(license.saveLicenseKey(primaryKey) === true, 'saveLicenseKey');
        const status = license.checkLicense();
        assert(status.valid === true, 'checkLicense valid po zapisie');
        assert(status.type !== 'trial', 'checkLicense nie zwraca trialu przy pełnej licencji');
        assert(fs.existsSync(paths.cache), 'Cache zapisany po aktywacji');

        // 5. Stary cache bez fingerprint – ignorowany, plik licencji nadal działa
        writeJson(paths.cache, { valid: true, type: 'LT', typeLabel: 'dożywotnia', expires: null, cachedAt: Date.now() });
        delete require.cache[require.resolve(path.join(ROOT, 'license.js'))];
        process.env.HOME = home;
        const license2 = require(path.join(ROOT, 'license.js'));
        const s2 = license2.checkLicense();
        assert(s2.valid === true, 'Stary cache bez fingerprint – plik licencji nadal obowiązuje');
        const cacheAfter = JSON.parse(fs.readFileSync(paths.cache, 'utf8'));
        assert(!!cacheAfter.keyFingerprint, 'Cache przepisany z keyFingerprint');

        // 6. Fałszywy stary cache LT (bug sprzed poprawki) + nieważny klucz w pliku
        const wrongKey = signKey(privatePem, '0000000000000000', 'LT');
        writeJson(paths.license, { key: wrongKey, machineId: alts[0], type: 'LT', activated: Date.now() });
        writeJson(paths.cache, { valid: true, type: 'LT', typeLabel: 'dożywotnia', expires: null, cachedAt: Date.now() });
        delete require.cache[require.resolve(path.join(ROOT, 'license.js'))];
        const license3 = require(path.join(ROOT, 'license.js'));
        const s3 = license3.checkLicense();
        assert(s3.valid === false || s3.type === 'trial', 'Fałszywy cache + zły klucz nie daje pełnej licencji');
        assert(!fs.existsSync(paths.cache) || !JSON.parse(fs.readFileSync(paths.cache, 'utf8')).valid, 'Fałszywy cache usunięty/odrzucony');

        // 7. Klucz wygenerowany dla „starego” hostname ID (drugi w alternatywach) + zapis
        if (alts.length > 1) {
            const legacyHostnameId = alts.find((id) => id !== license3.getMachineId()) || alts[1];
            const legacyKey = signKey(privatePem, legacyHostnameId, 'LT');
            assert(license3.verifyLicenseKey(legacyKey).valid === true, 'Klucz dla legacy hostname ID weryfikuje się');
            assert(license3.saveLicenseKey(legacyKey) === true, 'saveLicenseKey dla legacy ID');
            const sLegacy = license3.checkLicense();
            assert(sLegacy.valid === true && sLegacy.type !== 'trial', 'Pełna licencja z kluczem legacy hostname ID');
        }

        // 8. Trial v3 z hostname ID – migracja
        if (alts.length > 1) {
            const hostnameId = alts.find((id) => id !== license3.getMachineId()) || alts[1];
            fs.writeFileSync(
                paths.trial,
                JSON.stringify({ trialStart: Date.now() - 86400000, machineId: hostnameId, trialFormatVersion: 3 })
            );
            fs.unlinkSync(paths.license);
            if (fs.existsSync(paths.cache)) fs.unlinkSync(paths.cache);
            delete require.cache[require.resolve(path.join(ROOT, 'license.js'))];
            const license4 = require(path.join(ROOT, 'license.js'));
            const trial = license4.checkTrialPeriod();
            assert(trial.valid === true, 'Trial v3 z hostname ID migruje i działa');
            const trialFile = JSON.parse(fs.readFileSync(paths.trial, 'utf8'));
            assert(trialFile.trialFormatVersion >= 4, 'Trial zmigrowany do v4');
            assert(Array.isArray(trialFile.machineIds), 'Trial zapisuje machineIds');
        }

        // 9. Trial obcego komputera – blokada
        fs.writeFileSync(
            paths.trial,
            JSON.stringify({ trialStart: Date.now(), machineId: 'deadbeefdeadbeef', trialFormatVersion: 3 })
        );
        delete require.cache[require.resolve(path.join(ROOT, 'license.js'))];
        const license5 = require(path.join(ROOT, 'license.js'));
        const blocked = license5.checkTrialPeriod();
        assert(blocked.valid === false, 'Trial obcego komputera zablokowany');
        assert(
            (blocked.reason || '').includes('innego komputera'),
            'Komunikat o innym komputerze'
        );

        // 10. Licencja czasowa 1M – niewygasła
        fs.unlinkSync(paths.trial);
        const key1m = signKey(privatePem, alts[0], '1M');
        assert(license5.saveLicenseKey(key1m) === true, 'saveLicenseKey 1M');
        const s1m = license5.checkLicense();
        assert(s1m.valid === true, 'Licencja 1M ważna');
        assert(s1m.type === '1M', 'Typ 1M');

        // 11. Offline cache z fingerprint – odzyskanie gdy plik licencji chwilowo nieczytelny
        const cacheData = JSON.parse(fs.readFileSync(paths.cache, 'utf8'));
        assert(!!cacheData.keyFingerprint, 'Cache ma fingerprint po aktywacji 1M');
        writeJson(paths.license, { corrupted: true }); // uszkodzony plik
        delete require.cache[require.resolve(path.join(ROOT, 'license.js'))];
        const license6 = require(path.join(ROOT, 'license.js'));
        // Symulacja: plik istnieje ale parse rzuca – ustawiamy ręcznie cache z poprawnym fp
        const goodLicense = { key: key1m, machineId: alts[0], activated: Date.now(), type: '1M', typeLabel: '1 miesiąc', expires: Date.now() + 86400000 };
        writeJson(paths.cache, {
            valid: true,
            type: '1M',
            typeLabel: '1 miesiąc',
            expires: goodLicense.expires,
            machineId: license6.getMachineId(),
            keyFingerprint: require('crypto').createHash('sha256').update(key1m.trim()).digest('hex').substring(0, 32),
            cachedAt: Date.now(),
        });
        // Przy uszkodzonym pliku checkLicense nie ma key – cache bez klucza nie powinien działać
        const sBroken = license6.checkLicense();
        assert(!(sBroken.valid && sBroken.type === '1M'), 'Uszkodzony plik + cache bez weryfikacji klucza – brak pełnej licencji');

        // Napraw plik – pełna licencja wraca
        writeJson(paths.license, goodLicense);
        delete require.cache[require.resolve(path.join(ROOT, 'license.js'))];
        const license7 = require(path.join(ROOT, 'license.js'));
        const sFixed = license7.checkLicense();
        assert(sFixed.valid === true && sFixed.type === '1M', 'Po naprawie pliku licencji – pełny dostęp');

        // 11b. Okres łaski po wygaśnięciu (7 dni) — impreza bez internetu
        const expiredAt = Date.now() - 2 * 86400000;
        writeJson(paths.license, {
            key: key1m,
            machineId: alts[0],
            activated: expiredAt - 30 * 86400000,
            type: '1M',
            typeLabel: '1 miesiąc',
            expires: expiredAt,
        });
        delete require.cache[require.resolve(path.join(ROOT, 'license.js'))];
        const licenseGrace = require(path.join(ROOT, 'license.js'));
        const sGrace = licenseGrace.checkLicense();
        assert(sGrace.valid === true && sGrace.gracePeriod === true, 'Wygasła licencja w okresie łaski — dostęp');
        assert(typeof sGrace.graceUntil === 'number', 'graceUntil ustawione');

        writeJson(paths.license, {
            key: key1m,
            machineId: alts[0],
            activated: Date.now() - 40 * 86400000,
            type: '1M',
            typeLabel: '1 miesiąc',
            expires: Date.now() - 10 * 86400000,
        });
        delete require.cache[require.resolve(path.join(ROOT, 'license.js'))];
        const licenseNoGrace = require(path.join(ROOT, 'license.js'));
        const sNoGrace = licenseNoGrace.checkLicense();
        assert(sNoGrace.valid === false && sNoGrace.type === 'expired', 'Po okresie łaski — blokada');

        // 12. Symulacja upgrade: klient kupił klucz dla „starego” ID z UI (hostname)
        if (alts.length > 1) {
            const hostnameId = alts[1];
            const purchasedKey = signKey(privatePem, hostnameId, 'LT');
            fs.unlinkSync(paths.license);
            if (fs.existsSync(paths.cache)) fs.unlinkSync(paths.cache);
            writeJson(paths.license, {
                key: purchasedKey,
                machineId: hostnameId,
                activated: Date.now() - 86400000 * 30,
                type: 'LT',
                typeLabel: 'dożywotnia',
                expires: null,
            });
            writeJson(paths.cache, { valid: true, type: 'LT', typeLabel: 'dożywotnia', expires: null, cachedAt: Date.now() });
            delete require.cache[require.resolve(path.join(ROOT, 'license.js'))];
            const license8 = require(path.join(ROOT, 'license.js'));
            const upgraded = license8.checkLicense();
            assert(upgraded.valid === true && upgraded.type !== 'trial', 'Upgrade: stary klucz hostname ID nadal działa');
            assert(!(upgraded.type === 'trial'), 'Upgrade: brak ekranu trialu przy ważnej licencji');
        }

        process.env.HOME = os.homedir();
    });

    // 13. Zgodność stripe-shop/license-keygen.js z license.js
    process.env.IMPREZJA_LICENSE_PRIVATE_KEY = privatePem.replace(/\n/g, '\\n');
    const stripeGen = require(path.join(ROOT, 'stripe-shop', 'license-keygen.js'));
    withIsolatedHome((license) => {
        const mid = license.getMachineIdAlternatives()[0];
        const stripeKey = stripeGen.generateLicenseKey(mid, 'LT');
        const cliKey = signKey(privatePem, mid, 'LT');
        const vStripe = license.verifyLicenseKey(stripeKey);
        const vCli = license.verifyLicenseKey(cliKey);
        assert(vStripe.valid === true, 'Klucz ze stripe-shop/license-keygen.js weryfikuje się');
        assert(vCli.valid === true, 'Klucz z lokalnego signKey weryfikuje się');
        // Payload m musi być identyczny – oba dla tego samego mid
        assert(
            stripeKey.startsWith('IMPREZJA-RSA-') && cliKey.startsWith('IMPREZJA-RSA-'),
            'Oba klucze w formacie RSA'
        );
    });
    delete process.env.IMPREZJA_LICENSE_PRIVATE_KEY;

    // 15. license-refresh — shouldAttemptRefresh
    const licenseRefresh = require(path.join(ROOT, 'license-refresh.js'));

    assert(licenseRefresh.shouldAttemptRefresh(null) === true, 'shouldAttemptRefresh: brak statusu');
    assert(licenseRefresh.shouldAttemptRefresh({ valid: false }) === true, 'shouldAttemptRefresh: nieważna');
    assert(licenseRefresh.shouldAttemptRefresh({ valid: true, gracePeriod: true, type: '1M' }) === true, 'shouldAttemptRefresh: łaska');
    assert(licenseRefresh.shouldAttemptRefresh({ valid: true, type: 'trial', daysLeft: 5 }) === false, 'shouldAttemptRefresh: trial pomijany');
    assert(
        licenseRefresh.shouldAttemptRefresh({ valid: true, type: '1M', expires: Date.now() + 5 * 86400000 }) === true,
        'shouldAttemptRefresh: wygasa za <14 dni'
    );
    assert(
        licenseRefresh.shouldAttemptRefresh({ valid: true, type: 'LT', expires: null }) === false,
        'shouldAttemptRefresh: LT bez expiry — nie wymaga'
    );
    const halfPast1m = {
        valid: true,
        type: '1M',
        activated: Date.now() - 20 * 86400000,
        expires: Date.now() + 10 * 86400000,
    };
    assert(licenseRefresh.shouldAttemptRefresh(halfPast1m) === true, 'shouldAttemptRefresh: połowę okresu 1M');

    // 16. license-refresh — stan pliku (read/write w izolowanym HOME)
    withIsolatedHome((_license, home) => {
        const modPath = path.join(ROOT, 'license-refresh.js');
        delete require.cache[require.resolve(modPath)];
        const prevHome = process.env.HOME;
        process.env.HOME = home;
        if (process.platform === 'win32') process.env.USERPROFILE = home;
        const lr = require(modPath);
        const statePath = path.join(home, '.imprezja-license-refresh.json');

        const s1 = lr.writeRefreshState({ lastRefreshAt: 1000, lastMachineId: 'abcd' });
        assert(!!s1 && s1.lastRefreshAt === 1000, 'writeRefreshState zapisuje lastRefreshAt');
        const s2 = lr.readRefreshState();
        assert(s2.lastMachineId === 'abcd', 'readRefreshState odczytuje dane');
        assert(fs.existsSync(statePath), 'plik stanu odświeżania istnieje');

        process.env.HOME = prevHome;
        if (process.platform === 'win32') process.env.USERPROFILE = prevHome;
        delete require.cache[require.resolve(modPath)];
    });

    // 14. Generator CLI (jeśli działa)
    try {
        const { execSync } = require('child_process');
        const out = execSync(`node "${path.join(ROOT, 'scripts/generate-license-key.js')}" ${withIsolatedHome((l) => l.getMachineIdAlternatives()[0])}`, {
            encoding: 'utf8',
            cwd: ROOT,
            env: { ...process.env, HOME: os.homedir() },
        });
        const m = out.match(/IMPREZJA-RSA-[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
        assert(!!m, 'generate-license-key.js produkuje klucz RSA');
        if (m) {
            const license = require(path.join(ROOT, 'license.js'));
            assert(license.verifyLicenseKey(m[0]).valid === true, 'Klucz z CLI weryfikuje się na tym PC');
        }
    } catch (e) {
        assert(false, `generate-license-key.js: ${e.message}`);
    }

    console.log(`\n=== Wynik: ${passed} OK, ${failed} FAIL ===`);
    if (failed > 0) process.exit(1);
    console.log('Wszystkie testy przeszły.\n');
}

main();
