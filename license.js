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

function hashMachineSeed(seed) {
    return crypto.createHash('sha256').update(seed).digest('hex').substring(0, 16);
}

function getHostnameMachineId(hostname = os.hostname()) {
    return hashMachineSeed(`${hostname}-${process.platform}`);
}

function getHardwareMachineId() {
    if (process.platform === 'darwin') {
        try {
            const { execSync } = require('child_process');
            const out = execSync('system_profiler SPHardwareDataType 2>/dev/null | grep "Hardware UUID"', { encoding: 'utf8', timeout: 3000 });
            const m = out.match(/Hardware UUID:\s*(.+)/);
            if (m && m[1].trim()) {
                return hashMachineSeed(m[1].trim().toLowerCase());
            }
        } catch (_) {}
    } else if (process.platform === 'win32') {
        try {
            const { execSync } = require('child_process');
            const out = execSync('wmic csproduct get uuid', { encoding: 'utf8', timeout: 3000 });
            const m = out.match(/UUID\s+([a-fA-F0-9-]+)/);
            if (m && m[1]) {
                return hashMachineSeed(m[1].trim().toLowerCase());
            }
        } catch (_) {}
    } else {
        try {
            const machineIdPath = '/etc/machine-id';
            if (fs.existsSync(machineIdPath)) {
                const out = fs.readFileSync(machineIdPath, 'utf8').trim();
                if (out) return hashMachineSeed(out);
            }
        } catch (_) {}
    }
    return null;
}

/** Dodatkowe warianty hostname na macOS (LocalHostName vs ComputerName vs HostName). */
function getHostnameMachineIdVariants() {
    const ids = [];
    const add = (hostname) => {
        if (!hostname) return;
        const id = getHostnameMachineId(hostname);
        if (!ids.includes(id)) ids.push(id);
    };
    add(os.hostname());
    if (process.platform === 'darwin') {
        try {
            const { execSync } = require('child_process');
            const readScutil = (key) => {
                try {
                    return execSync(`scutil --get ${key} 2>/dev/null`, { encoding: 'utf8', timeout: 2000 }).trim();
                } catch (_) {
                    return '';
                }
            };
            const localHost = readScutil('LocalHostName');
            const computerName = readScutil('ComputerName');
            const hostName = readScutil('HostName');
            [localHost, `${localHost}.local`, computerName, hostName, `${hostName}.local`].forEach(add);
        } catch (_) {}
    }
    return ids;
}

function getMachineId() {
    const hwId = getHardwareMachineId();
    if (hwId) return hwId;
    return getHostnameMachineId();
}

/** Wszystkie akceptowalne ID tego komputera (HW UUID, hostname i warianty nazwy). */
function getMachineIdAlternatives() {
    const ids = [];
    const add = (id) => {
        if (id && !ids.includes(id)) ids.push(id);
    };
    add(getHardwareMachineId());
    getHostnameMachineIdVariants().forEach(add);
    add(getHostnameMachineId());
    return ids.length ? ids : [getHostnameMachineId()];
}

function normalizeMachineId(id) {
    return String(id || '').trim().toLowerCase();
}

function machineIdMatchesCurrent(storedId) {
    if (!storedId) return true;
    const stored = normalizeMachineId(storedId);
    return getMachineIdAlternatives().some((id) => normalizeMachineId(id) === stored);
}

function trialRecordMatchesCurrent(storedId, storedIds = []) {
    const allStored = [storedId, ...(Array.isArray(storedIds) ? storedIds : [])].filter(Boolean);
    return allStored.some((id) => machineIdMatchesCurrent(id));
}

const TRIAL_FORMAT_VERSION = 4; /* HW UUID + warianty hostname – trial i licencja na tych samych zasadach */

function persistTrialState(trialStart, machineId, formatVersion = TRIAL_FORMAT_VERSION) {
    fs.writeFileSync(
        TRIAL_START_FILE,
        JSON.stringify({
            trialStart,
            machineId,
            machineIds: getMachineIdAlternatives(),
            trialFormatVersion: formatVersion
        })
    );
    writeTrialRecordIfEarliest(machineId, trialStart);
}

/** Zapis zapasowego rekordu. Zapisuje tylko jeśli plik nie istnieje (first run) lub podana data jest wcześniejsza od zapisanej – żeby nie nadpisać starszej daty. */
function writeTrialRecordIfEarliest(machineId, trialStart) {
    try {
        const p = getTrialRecordPath();
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const existing = readTrialRecord();
        if (existing && machineIdMatchesCurrent(existing.machineId) && machineIdMatchesCurrent(machineId) && existing.firstTrialStart <= trialStart) {
            return;
        }
        const sameMachine = existing && machineIdMatchesCurrent(existing.machineId) && machineIdMatchesCurrent(machineId);
        const toWrite = sameMachine
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
    let storedMachineIds = [];
    let formatVersion = TRIAL_FORMAT_VERSION;
    const backupRecord = readTrialRecord();

    try {
        if (fs.existsSync(TRIAL_START_FILE)) {
            const data = fs.readFileSync(TRIAL_START_FILE, 'utf8').trim();
            try {
                const parsed = JSON.parse(data);
                trialStart = typeof parsed.trialStart === 'number' ? parsed.trialStart : parseInt(parsed.trialStart, 10);
                storedMachineId = parsed.machineId || null;
                storedMachineIds = Array.isArray(parsed.machineIds) ? parsed.machineIds : [];
                formatVersion = parsed.trialFormatVersion || 1;
            } catch (_) {
                trialStart = parseInt(data, 10);
                storedMachineId = null;
                storedMachineIds = [];
                formatVersion = 1;
            }
            if (!trialStart || isNaN(trialStart)) trialStart = null;
        }

        const storedMatchesCurrent = trialRecordMatchesCurrent(storedMachineId, storedMachineIds);

        if (trialStart == null) {
            /* Główny plik brak – sprawdź zapasowy rekord (wykrycie usunięcia pliku trialu) */
            if (backupRecord && machineIdMatchesCurrent(backupRecord.machineId)) {
                trialStart = backupRecord.firstTrialStart;
                /* Nie tworzymy na nowo pliku – użytkownik usunął go celowo; liczymy od zapisanej daty */
            } else {
                trialStart = Date.now();
                storedMachineId = currentMachineId;
                persistTrialState(trialStart, currentMachineId);
            }
        } else if (storedMachineId && !storedMatchesCurrent) {
            const backupMatchesStored = backupRecord
                && normalizeMachineId(backupRecord.machineId) === normalizeMachineId(storedMachineId);
            if (formatVersion < 3 || backupMatchesStored) {
                /* Stary format (MAC/hostname v1–2) lub ten sam komputer po zmianie nazwy (zapasowy rekord) */
                persistTrialState(trialStart, currentMachineId);
            } else {
                return { valid: false, daysLeft: 0, reason: 'Okres testowy przypisany do innego komputera. Wykup licencję.' };
            }
        } else if (
            storedMachineId
            && storedMatchesCurrent
            && normalizeMachineId(storedMachineId) !== normalizeMachineId(currentMachineId)
        ) {
            /* ID pasuje do alternatywy – zaktualizuj plik do bieżącego primary (HW UUID) */
            persistTrialState(trialStart, currentMachineId);
        } else if (storedMatchesCurrent && formatVersion < TRIAL_FORMAT_VERSION) {
            persistTrialState(trialStart, currentMachineId);
        }

        /* Użyj najwcześniejszej znanej daty (zapasowy rekord chroni przed cofnięciem daty w głównym pliku) */
        if (backupRecord && machineIdMatchesCurrent(backupRecord.machineId) && backupRecord.firstTrialStart < trialStart) {
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

        invalidateLicenseCache();
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

function licenseKeyFingerprint(key) {
    if (!key || typeof key !== 'string') return null;
    return crypto.createHash('sha256').update(key.trim()).digest('hex').substring(0, 32);
}

function invalidateLicenseCache() {
    licenseCache = null;
    try {
        if (fs.existsSync(LICENSE_CACHE_FILE)) fs.unlinkSync(LICENSE_CACHE_FILE);
    } catch (_) {}
}

function readLicenseCacheFromDisk(expectedKey) {
    try {
        if (!fs.existsSync(LICENSE_CACHE_FILE)) return null;
        const data = JSON.parse(fs.readFileSync(LICENSE_CACHE_FILE, 'utf8'));
        if (!data || !data.valid || data.type === 'trial') return null;
        const machineIds = getMachineIdAlternatives().map((id) => id.toLowerCase());
        const cachedMid = (data.machineId || '').toLowerCase();
        if (!cachedMid || !machineIds.includes(cachedMid)) return null;
        const expectedFp = licenseKeyFingerprint(expectedKey);
        const cachedFp = (data.keyFingerprint || '').toLowerCase();
        if (expectedFp && cachedFp && expectedFp !== cachedFp) return null;
        if (!cachedFp) return null;
        if (expectedFp && !cachedFp) return null;
        return data;
    } catch (_) {
        return null;
    }
}

function writeLicenseCacheToDisk(status, licenseKey) {
    try {
        if (!status || status.type === 'trial') return;
        const toWrite = {
            valid: status.valid,
            type: status.type,
            typeLabel: status.typeLabel,
            expires: status.expires,
            machineId: getMachineId(),
            keyFingerprint: licenseKeyFingerprint(licenseKey),
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

    let licenseFileExists = false;
    let licenseKeyFromFile = null;
    try {
        if (fs.existsSync(LICENSE_FILE)) {
            licenseFileExists = true;
            const data = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));
            licenseKeyFromFile = (data.key || '').trim();
            const verification = verifyLicenseKey(data.key);

            if (verification.valid) {
                const expires = data.expires || verification.expires;
                if (expires && expires < now) {
                    invalidateLicenseCache();
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
                    writeLicenseCacheToDisk(status, licenseKeyFromFile);
                }
                return status;
            }
            /* Plik jest, ale klucz nieważny (inny komputer / zły klucz) – nie ufaj cache */
            invalidateLicenseCache();
        }
    } catch (err) {
        console.warn('⚠️ Błąd odczytu licencji:', err.message);
        /* Przy błędzie odczytu pliku – cache offline tylko dla tego samego klucza i komputera */
        if (licenseCache && licenseCache.valid) {
            const expires = licenseCache.expires;
            if (!expires || now < expires) return licenseCache;
        }
        const diskCache = readLicenseCacheFromDisk(licenseKeyFromFile);
        if (diskCache && diskCache.valid) {
            const expires = diskCache.expires;
            if (!expires || now < expires) {
                licenseCache = diskCache;
                return diskCache;
            }
        }
        if (licenseFileExists) invalidateLicenseCache();
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
