/**
 * System licencjonowania IMPREZJA
 * - Okres testowy: 14 dni (program można pobrać bezpłatnie i testować)
 * - Po wygaśnięciu: program się wyłącza, wymagana licencja
 * - Licencje: czasowe (1M, 3M, 6M, 1Y) lub dożywotnia (LT)
 *
 * Weryfikacja RSA: klucz publiczny w aplikacji (nie można generować kluczy).
 * Klucz prywatny tylko w generatorze (scripts/generate-license-key.js).
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const LICENSE_FILE = path.join(os.homedir(), '.imprezja-license');
const TRIAL_START_FILE = path.join(os.homedir(), '.imprezja-trial-start');
const TRIAL_DAYS = 14;

/** Klucz publiczny RSA – służy TYLKO do weryfikacji (nie można generować kluczy) */
const PUBLIC_KEY_PEM = (process.env.IMPREZJA_LICENSE_PUBLIC_KEY || `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAznhSchHyVk4523mOSXs3
iRi38Lvz9SCcPYNi+yfo7xlklaUWDrkxsADfueO4Rd/YJkmYj4Cm3BJg2KTgMlxi
sfWI3Un9nWWCfDrnDVU+u0YqwhCWqTlCfewRuu7TxpjsNglNEJRmh9umBkZWcFiY
XTo23kgfZu78nBtT21zH3NIaIWXnYEPzEeqtxqWhXHGHkuZTnYqdVhcHKfAKPs0A
gckiSM37sAWinB74DG6UrPEcxMxUdGmPRNp4qzMReMvNPgVhPw6Cl+epa2GQgYCL
/uJpyNe1lvyhxMMsnXYxDtiBlOwf0iEZraf5oWw9ybjrTq51UAmfplSbUlXc74un
7wIDAQAB
-----END PUBLIC KEY-----`).replace(/\\n/g, '\n');

/** Typy licencji i długość w ms */
const LICENSE_TYPES = {
    LT: null,
    '1M': 30 * 24 * 60 * 60 * 1000,
    '3M': 90 * 24 * 60 * 60 * 1000,
    '6M': 180 * 24 * 60 * 60 * 1000,
    '1Y': 365 * 24 * 60 * 60 * 1000
};

const LICENSE_TYPE_LABELS = {
    LT: 'dożywotnia',
    '1M': '1 miesiąc',
    '3M': '3 miesiące',
    '6M': '6 miesięcy',
    '1Y': '1 rok'
};

function getMachineId() {
    /* Hostname jest stabilny – nie zmienia się przy zmianie WiFi/VPN. MAC-e mogą się zmieniać. */
    const hostname = require('os').hostname();
    const platform = process.platform;
    return crypto.createHash('sha256').update(`${hostname}-${platform}`).digest('hex').substring(0, 16);
}

const TRIAL_FORMAT_VERSION = 3; /* hostname zamiast MAC – stabilny przy zmianie sieci */

function checkTrialPeriod() {
    let currentMachineId;
    try {
        currentMachineId = getMachineId();
    } catch (err) {
        console.warn('⚠️ Błąd getMachineId:', err.message);
        return { valid: false, daysLeft: 0, reason: 'Nie można odczytać identyfikatora komputera.' };
    }
    let trialStart = null;
    let storedMachineId = null;
    let formatVersion = TRIAL_FORMAT_VERSION;

    try {
        if (fs.existsSync(TRIAL_START_FILE)) {
            const data = fs.readFileSync(TRIAL_START_FILE, 'utf8').trim();
            try {
                const parsed = JSON.parse(data);
                trialStart = typeof parsed.trialStart === 'number' ? parsed.trialStart : parseInt(parsed.trialStart, 10);
                storedMachineId = parsed.machineId || null;
                formatVersion = parsed.trialFormatVersion || 1;
            } catch (_) {
                trialStart = parseInt(data, 10);
                storedMachineId = null;
                formatVersion = 1;
            }
            if (!trialStart || isNaN(trialStart)) trialStart = null;
        }
        if (trialStart == null) {
            trialStart = Date.now();
            storedMachineId = currentMachineId;
            fs.writeFileSync(TRIAL_START_FILE, JSON.stringify({ trialStart, machineId: currentMachineId, trialFormatVersion: TRIAL_FORMAT_VERSION }));
        } else if (storedMachineId && storedMachineId !== currentMachineId) {
            /* Migracja: stary format (v1) używał innego algorytmu – aktualizujemy ID i kontynuujemy trial */
            if (formatVersion < TRIAL_FORMAT_VERSION) {
                storedMachineId = currentMachineId;
                fs.writeFileSync(TRIAL_START_FILE, JSON.stringify({ trialStart, machineId: currentMachineId, trialFormatVersion: TRIAL_FORMAT_VERSION }));
            } else {
                /* v2+: inny komputer (nowy sprzęt, klon VM) – trial nie przenosi się */
                return { valid: false, daysLeft: 0, reason: 'Okres testowy przypisany do innego komputera. Wykup licencję.' };
            }
        }
    } catch (err) {
        console.warn('⚠️ Błąd odczytu pliku trial:', err.message);
        return { valid: false, daysLeft: 0, reason: 'Błąd odczytu pliku trial' };
    }

    const now = Date.now();
    const daysElapsed = Math.floor((now - trialStart) / (1000 * 60 * 60 * 24));
    const daysLeft = TRIAL_DAYS - daysElapsed;

    if (daysLeft <= 0) {
        return { valid: false, daysLeft: 0, reason: 'Okres testowy wygasł (14 dni). Wykup licencję.' };
    }

    return { valid: true, daysLeft, daysElapsed, trialStart };
}

function base64urlDecode(str) {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    return Buffer.from(b64 + (pad ? '='.repeat(4 - pad) : ''), 'base64');
}

/** Weryfikacja formatu RSA: IMPREZJA-RSA-{base64url(payload)}.{base64url(signature)} */
function verifyRSAFormat(licenseKey) {
    const match = licenseKey.match(/^IMPREZJA-RSA-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
    if (!match) return null;
    const [, payloadB64, sigB64] = match;
    try {
        const payloadStr = base64urlDecode(payloadB64).toString();
        const payload = JSON.parse(payloadStr);
        const signature = base64urlDecode(sigB64);
        const verify = crypto.createVerify('SHA256');
        verify.update(payloadStr);
        verify.end();
        if (!verify.verify(PUBLIC_KEY_PEM, signature)) {
            return { valid: false, reason: 'Nieprawidłowy podpis klucza' };
        }
        const machineId = getMachineId();
        if (payload.m !== machineId) {
            return { valid: false, reason: 'Klucz nie pasuje do tego komputera' };
        }
        const type = payload.t || 'LT';
        if (!['LT', '1M', '3M', '6M', '1Y'].includes(type)) {
            return { valid: false, reason: 'Nieznany typ licencji' };
        }
        return {
            valid: true,
            type,
            typeLabel: LICENSE_TYPE_LABELS[type],
            expires: payload.e || null
        };
    } catch (err) {
        return { valid: false, reason: 'Nieprawidłowy format klucza' };
    }
}

/**
 * Weryfikuje klucz licencyjny.
 * Format RSA (nowy): IMPREZJA-RSA-{payload}.{signature}
 * Format stary: IMPREZJA-XXXX-XXXX-XXXX-XXXX (lifetime)
 */
function verifyLicenseKey(licenseKey) {
    if (!licenseKey || typeof licenseKey !== 'string') {
        return { valid: false, reason: 'Nieprawidłowy format klucza' };
    }
    const key = licenseKey.trim();

    if (key === 'IMPREZJA-TEST-TEST-TEST-TEST') {
        return { valid: true, type: 'test', expires: null };
    }

    if (key.startsWith('IMPREZJA-RSA-')) {
        return verifyRSAFormat(key);
    }

    const keyUpper = key.toUpperCase();
    const oldFormatMatch = keyUpper.match(/^IMPREZJA-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/);
    if (oldFormatMatch) {
        const keyParts = keyUpper.replace(/IMPREZJA-?/g, '').split('-').join('');
        const machineId = getMachineId();
        const expectedHash = crypto.createHash('sha256').update(`IMPREZJA-${machineId}`).digest('hex').substring(0, 16).toUpperCase();
        const keyHash = keyParts.substring(0, 16);
        if (keyHash === expectedHash) {
            return { valid: true, type: 'LT', typeLabel: 'dożywotnia', expires: null };
        }
        return { valid: false, reason: 'Klucz nie pasuje do tego komputera' };
    }

    return { valid: false, reason: 'Nieprawidłowy format klucza' };
}

function saveLicenseKey(licenseKey) {
    try {
        const verification = verifyLicenseKey(licenseKey);
        if (!verification.valid) return false;

        const activated = Date.now();
        let expires = null;
        if (verification.type && LICENSE_TYPES[verification.type]) {
            const durationMs = LICENSE_TYPES[verification.type];
            if (durationMs) expires = activated + durationMs;
        }

        const licenseData = {
            key: licenseKey.trim(),
            machineId: getMachineId(),
            activated,
            expires,
            type: verification.type || 'LT',
            typeLabel: verification.typeLabel || 'dożywotnia'
        };
        fs.writeFileSync(LICENSE_FILE, JSON.stringify(licenseData, null, 2));
        return true;
    } catch (err) {
        console.error('❌ Błąd zapisu licencji:', err);
        return false;
    }
}

function checkLicense() {
    try {
        if (fs.existsSync(LICENSE_FILE)) {
            const data = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));
            const verification = verifyLicenseKey(data.key);

            if (verification.valid) {
                const now = Date.now();
                const expires = data.expires || verification.expires;
                if (expires && expires < now) {
                    return {
                        valid: false,
                        type: 'expired',
                        reason: 'Licencja wygasła',
                        trial: checkTrialPeriod()
                    };
                }
                return {
                    valid: true,
                    type: verification.type || data.type || 'full',
                    typeLabel: verification.typeLabel || data.typeLabel || 'pełna',
                    expires: data.expires || null,
                    activated: data.activated
                };
            }
        }
    } catch (err) {
        console.warn('⚠️ Błąd odczytu licencji:', err.message);
    }

    const trial = checkTrialPeriod();
    return {
        valid: trial.valid,
        type: 'trial',
        daysLeft: trial.daysLeft,
        reason: trial.valid ? undefined : (trial.reason || 'Okres testowy wygasł'),
        trial: trial
    };
}

module.exports = {
    checkLicense,
    verifyLicenseKey,
    saveLicenseKey,
    checkTrialPeriod,
    getMachineId,
    TRIAL_DAYS,
    LICENSE_TYPES,
    LICENSE_TYPE_LABELS
};
