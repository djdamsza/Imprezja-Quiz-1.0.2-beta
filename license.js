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
const LICENSE_CACHE_FILE = path.join(os.homedir(), '.imprezja-license-cache');
/** Główny plik trialu – odinstalowanie aplikacji go nie usuwa. Usunięcie przez użytkownika jest wykrywane dzięki zapasowemu rekordowi. */
const TRIAL_START_FILE = path.join(os.homedir(), '.imprezja-trial-start');
const TRIAL_DAYS = 14;

/** Ścieżka do zapasowego rekordu trialu (najwcześniejsza data startu na tym komputerze). Trudniejsza do znalezienia – w podkatalogu aplikacji. */
function getTrialRecordPath() {
    const home = os.homedir();
    const platform = process.platform;
    if (platform === 'win32') {
        const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
        return path.join(appData, 'Imprezja', 'state.json');
    }
    if (platform === 'darwin') {
        return path.join(home, 'Library', 'Application Support', 'Imprezja', 'state.json');
    }
    return path.join(home, '.local', 'share', 'imprezja', 'state.json');
}

/** Odczyt zapasowego rekordu: { machineId, firstTrialStart }. Zwraca null przy błędzie lub braku pliku. */
function readTrialRecord() {
    try {
        const p = getTrialRecordPath();
        if (!fs.existsSync(p)) return null;
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        const first = typeof data.firstTrialStart === 'number' ? data.firstTrialStart : parseInt(data.firstTrialStart, 10);
        if (!data.machineId || !first || isNaN(first)) return null;
        return { machineId: data.machineId, firstTrialStart: first };
    } catch (_) {
        return null;
    }
}

/** Zapis zapasowego rekordu. Zapisuje tylko jeśli plik nie istnieje (first run) lub podana data jest wcześniejsza od zapisanej – żeby nie nadpisać starszej daty. */
function writeTrialRecordIfEarliest(machineId, trialStart) {
    try {
        const p = getTrialRecordPath();
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const existing = readTrialRecord();
        if (existing && existing.machineId === machineId && existing.firstTrialStart <= trialStart) return;
        const toWrite = existing && existing.machineId === machineId
            ? { machineId, firstTrialStart: Math.min(existing.firstTrialStart, trialStart) }
            : { machineId, firstTrialStart: trialStart };
        fs.writeFileSync(p, JSON.stringify(toWrite, null, 0), 'utf8');
    } catch (_) {}
}

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
    const hostname = require('os').hostname();
    const platform = process.platform;
    return crypto.createHash('sha256').update(`${hostname}-${platform}`).digest('hex').substring(0, 16);
}

/** Alternatywne ID – gdy hostname się zmienia (np. różne sieci), licencja może pasować do któregoś */
function getMachineIdAlternatives() {
    const ids = [getMachineId()];
    if (process.platform === 'darwin') {
        try {
            const { execSync } = require('child_process');
            const out = execSync('system_profiler SPHardwareDataType 2>/dev/null | grep "Hardware UUID"', { encoding: 'utf8', timeout: 3000 });
            const m = out.match(/Hardware UUID:\s*(.+)/);
            if (m && m[1].trim()) {
                const hwId = crypto.createHash('sha256').update(m[1].trim().toLowerCase()).digest('hex').substring(0, 16);
                if (!ids.includes(hwId)) ids.push(hwId);
            }
        } catch (_) {}
    } else if (process.platform === 'win32') {
        try {
            const { execSync } = require('child_process');
            const out = execSync('wmic csproduct get uuid', { encoding: 'utf8', timeout: 3000 });
            const m = out.match(/UUID\s+([a-fA-F0-9-]+)/);
            if (m && m[1]) {
                const hwId = crypto.createHash('sha256').update(m[1].trim().toLowerCase()).digest('hex').substring(0, 16);
                if (!ids.includes(hwId)) ids.push(hwId);
            }
        } catch (_) {}
    } else {
        try {
            const { execSync } = require('child_process');
            const machineId = '/etc/machine-id';
            if (fs.existsSync(machineId)) {
                const out = fs.readFileSync(machineId, 'utf8').trim();
                if (out) {
                    const hwId = crypto.createHash('sha256').update(out).digest('hex').substring(0, 16);
                    if (!ids.includes(hwId)) ids.push(hwId);
                }
            }
        } catch (_) {}
    }
    return ids;
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
    const backupRecord = readTrialRecord();

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
            /* Główny plik brak – sprawdź zapasowy rekord (wykrycie usunięcia pliku trialu) */
            if (backupRecord && backupRecord.machineId === currentMachineId) {
                trialStart = backupRecord.firstTrialStart;
                /* Nie tworzymy na nowo pliku – użytkownik usunął go celowo; liczymy od zapisanej daty */
            } else {
                trialStart = Date.now();
                storedMachineId = currentMachineId;
                fs.writeFileSync(TRIAL_START_FILE, JSON.stringify({ trialStart, machineId: currentMachineId, trialFormatVersion: TRIAL_FORMAT_VERSION }));
                writeTrialRecordIfEarliest(currentMachineId, trialStart);
            }
        } else if (storedMachineId && storedMachineId !== currentMachineId) {
            if (formatVersion < TRIAL_FORMAT_VERSION) {
                storedMachineId = currentMachineId;
                fs.writeFileSync(TRIAL_START_FILE, JSON.stringify({ trialStart, machineId: currentMachineId, trialFormatVersion: TRIAL_FORMAT_VERSION }));
            } else {
                return { valid: false, daysLeft: 0, reason: 'Okres testowy przypisany do innego komputera. Wykup licencję.' };
            }
        }

        /* Użyj najwcześniejszej znanej daty (zapasowy rekord chroni przed cofnięciem daty w głównym pliku) */
        if (backupRecord && backupRecord.machineId === currentMachineId && backupRecord.firstTrialStart < trialStart) {
            trialStart = backupRecord.firstTrialStart;
        }
        writeTrialRecordIfEarliest(currentMachineId, trialStart);
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

/** 16 znaków hex — jedyny poprawny format „m” w kluczu RSA (tak jak w UI programu). */
function isCanonicalHexMachineId(s) {
    return typeof s === 'string' && /^[a-fA-F0-9]{16}$/.test(s.trim());
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
        const machineIds = getMachineIdAlternatives();
        const payloadM = payload.m != null ? String(payload.m).trim() : '';
        const norm = (x) => String(x).trim().toLowerCase();
        const matches = machineIds.some((mid) => norm(mid) === norm(payloadM));
        if (!matches) {
            const localList = machineIds.join(', ');
            const badFormat = payloadM && !isCanonicalHexMachineId(payloadM);
            let reason = `Klucz został wygenerowany dla innego ID niż ten komputer. W programie: ${localList}. W kluczu zapisano: ${payloadM || '(brak)'}.`;
            if (badFormat) {
                reason += ' To ID w kluczu nie wygląda na poprawne (oczekiwane: dokładnie 16 znaków 0–9 i a–f z okna licencji). Przy zamówieniu wklej ID ze skrzynki programu — bez zmian.';
            } else {
                reason += ' Poproś wydawcę o nowy klucz wygenerowany dla powyższego ID z Twojego programu.';
            }
            return { valid: false, reason };
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

    if (key.startsWith('IMPREZJA-RSA-')) {
        return verifyRSAFormat(key);
    }

    const keyUpper = key.toUpperCase();
    const oldFormatMatch = keyUpper.match(/^IMPREZJA-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/);
    if (oldFormatMatch) {
        const keyParts = keyUpper.replace(/IMPREZJA-?/g, '').split('-').join('');
        const machineIds = getMachineIdAlternatives();
        const keyHash = keyParts.substring(0, 16);
        const matches = machineIds.some(mid => crypto.createHash('sha256').update(`IMPREZJA-${mid}`).digest('hex').substring(0, 16).toUpperCase() === keyHash);
        if (matches) {
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

        licenseCache = null;
        try { if (fs.existsSync(LICENSE_CACHE_FILE)) fs.unlinkSync(LICENSE_CACHE_FILE); } catch (_) {}
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

/** Cache wyniku walidacji – walidacja raz, działanie offline. Nie blokujemy przy braku internetu. */
let licenseCache = null;

function readLicenseCacheFromDisk() {
    try {
        if (!fs.existsSync(LICENSE_CACHE_FILE)) return null;
        const data = JSON.parse(fs.readFileSync(LICENSE_CACHE_FILE, 'utf8'));
        if (!data || !data.valid || data.type === 'trial') return null;
        return data;
    } catch (_) {
        return null;
    }
}

function writeLicenseCacheToDisk(status) {
    try {
        if (!status || status.type === 'trial') return;
        const toWrite = {
            valid: status.valid,
            type: status.type,
            typeLabel: status.typeLabel,
            expires: status.expires,
            cachedAt: Date.now()
        };
        fs.writeFileSync(LICENSE_CACHE_FILE, JSON.stringify(toWrite, null, 0), 'utf8');
    } catch (_) {}
}

function checkLicense() {
    const now = Date.now();

    /* 1. Użyj cache w pamięci jeśli mamy ważny wynik */
    if (licenseCache && licenseCache.valid) {
        const expires = licenseCache.expires;
        if (!expires) return licenseCache;
        if (now < expires) return licenseCache;
        licenseCache = null;
    }

    try {
        if (fs.existsSync(LICENSE_FILE)) {
            const data = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));
            const verification = verifyLicenseKey(data.key);

            if (verification.valid) {
                const expires = data.expires || verification.expires;
                if (expires && expires < now) {
                    return {
                        valid: false,
                        type: 'expired',
                        reason: 'Licencja wygasła',
                        trial: checkTrialPeriod()
                    };
                }
                const status = {
                    valid: true,
                    type: verification.type || data.type || 'full',
                    typeLabel: verification.typeLabel || data.typeLabel || 'pełna',
                    expires: data.expires || null,
                    activated: data.activated
                };
                if (status.type !== 'trial') {
                    licenseCache = status;
                    writeLicenseCacheToDisk(status);
                }
                return status;
            }
        }
        /* Plik nie istnieje lub weryfikacja nie przeszła – spróbuj cache z dysku */
        const diskCache = readLicenseCacheFromDisk();
        if (diskCache && diskCache.valid) {
            const expires = diskCache.expires;
            if (!expires || now < expires) {
                licenseCache = diskCache;
                return diskCache;
            }
        }
    } catch (err) {
        console.warn('⚠️ Błąd odczytu licencji:', err.message);
        /* Przy błędzie – użyj cache (pamięć lub dysk) */
        if (licenseCache && licenseCache.valid) {
            const expires = licenseCache.expires;
            if (!expires || now < expires) return licenseCache;
        }
        const diskCache = readLicenseCacheFromDisk();
        if (diskCache && diskCache.valid) {
            const expires = diskCache.expires;
            if (!expires || now < expires) {
                licenseCache = diskCache;
                return diskCache;
            }
        }
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
    getMachineIdAlternatives,
    TRIAL_DAYS,
    LICENSE_TYPES,
    LICENSE_TYPE_LABELS
};
