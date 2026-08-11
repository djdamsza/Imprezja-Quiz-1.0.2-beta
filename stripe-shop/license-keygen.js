/**
 * Generator kluczy licencyjnych IMPREZJA (format RSA)
 * Używany przez stripe-shop do wysyłki klucza po płatności.
 *
 * Wymaga: IMPREZJA_LICENSE_PRIVATE_KEY (env)
 * Typy: LT (dożywotnia), 1M, 3M, 6M, 1Y
 */

const crypto = require('crypto');

const LICENSE_TYPES = {
    LT: null,
    '1M': 30 * 24 * 60 * 60 * 1000,
    '3M': 90 * 24 * 60 * 60 * 1000,
    '6M': 180 * 24 * 60 * 60 * 1000,
    '1Y': 365 * 24 * 60 * 60 * 1000
};

/** Dłuższa ważność kluczy z subskrypcji — nakładka na cykl rozliczeniowy + czas na wklejenie. */
const SUBSCRIPTION_LICENSE_TYPES = {
    LT: null,
    '1M': 45 * 24 * 60 * 60 * 1000,
    '3M': 90 * 24 * 60 * 60 * 1000,
    '6M': 180 * 24 * 60 * 60 * 1000,
    '1Y': 365 * 24 * 60 * 60 * 1000
};

function getPrivateKey() {
    const fromEnv = process.env.IMPREZJA_LICENSE_PRIVATE_KEY;
    if (fromEnv) return fromEnv.replace(/\\n/g, '\n');
    throw new Error('IMPREZJA_LICENSE_PRIVATE_KEY nie ustawiony');
}

function base64urlEncode(buf) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * @param {string} machineId - Machine ID z programu (16 znaków hex)
 * @param {string} type - LT, 1M, 3M, 6M, 1Y
 * @param {{ subscription?: boolean }} [opts] - subscription: true → dłuższa ważność (np. 45 dni dla 1M)
 * @returns {string} Klucz licencyjny IMPREZJA-RSA-...
 */
function generateLicenseKey(machineId, type = 'LT', opts = {}) {
    const id = String(machineId || '').trim();
    if (!id || id.length < 8) {
        throw new Error('Nieprawidłowy Machine ID');
    }
    const typeUpper = String(type).toUpperCase();
    if (!['LT', '1M', '3M', '6M', '1Y'].includes(typeUpper)) {
        throw new Error(`Nieznany typ: ${type}. Dozwolone: LT, 1M, 3M, 6M, 1Y`);
    }
    let expires = null;
    const durations = opts.subscription ? SUBSCRIPTION_LICENSE_TYPES : LICENSE_TYPES;
    const durationMs = durations[typeUpper];
    if (opts.expiresAt != null && Number.isFinite(opts.expiresAt)) {
        expires = opts.expiresAt;
    } else if (durationMs) {
        expires = Date.now() + durationMs;
    }
    const payload = { m: id, t: typeUpper, e: expires };
    const payloadStr = JSON.stringify(payload);
    const sign = crypto.createSign('SHA256');
    sign.update(payloadStr);
    sign.end();
    const signature = sign.sign(getPrivateKey());
    return `IMPREZJA-RSA-${base64urlEncode(Buffer.from(payloadStr))}.${base64urlEncode(signature)}`;
}

/** Mapowanie lookup_key Stripe → typ licencji */
const LOOKUP_TO_TYPE = {
    'imprezja-1m': '1M',
    'imprezja-3m': '3M',
    'imprezja-12m': '1Y',
    'imprezja-lifetime': 'LT',
    // Jednorazowe (BLIK-compatible) – bez automatycznego odnowienia
    'imprezja-1m-onetime': '1M',
    'imprezja-3m-onetime': '3M',
    'imprezja-12m-onetime': '1Y'
};

module.exports = { generateLicenseKey, LOOKUP_TO_TYPE, LICENSE_TYPES, SUBSCRIPTION_LICENSE_TYPES };
