/**
 * Automatyczne odświeżanie licencji subskrypcyjnej z serwera stripe-shop.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const license = require('./license.js');

const LICENSE_REFRESH_STATE_FILE = path.join(os.homedir(), '.imprezja-license-refresh.json');
const DEFAULT_LICENSE_API_URL = process.env.IMPREZJA_LICENSE_API_URL || 'https://imprezja-quiz-1-0-2-beta.onrender.com';
const REFRESH_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;
const EXPIRES_SOON_MS = 14 * 24 * 60 * 60 * 1000;
const HTTP_TIMEOUT_MS = 15000;

/**
 * @param {object|null|undefined} status - wynik checkLicense() / getLicenseStatus()
 * @returns {boolean}
 */
function shouldAttemptRefresh(status) {
    if (!status) return true;
    if (!status.valid) return true;
    if (status.gracePeriod) return true;
    if (status.type === 'trial' || status.type === 'expired') return status.type === 'expired';

    const now = Date.now();
    if (status.expires) {
        const expiresIn = status.expires - now;
        if (expiresIn <= EXPIRES_SOON_MS) return true;

        const type = status.type;
        const totalMs = type && license.LICENSE_TYPES ? license.LICENSE_TYPES[type] : null;
        if (totalMs) {
            const activated = status.activated || (status.expires - totalMs);
            const elapsed = now - activated;
            if (elapsed > totalMs / 2) return true;
        }
    }
    return false;
}

function readRefreshState() {
    try {
        if (!fs.existsSync(LICENSE_REFRESH_STATE_FILE)) return {};
        return JSON.parse(fs.readFileSync(LICENSE_REFRESH_STATE_FILE, 'utf8')) || {};
    } catch (_) {
        return {};
    }
}

function writeRefreshState(patch) {
    try {
        const prev = readRefreshState();
        const next = { ...prev, ...patch, updatedAt: Date.now() };
        fs.writeFileSync(LICENSE_REFRESH_STATE_FILE, JSON.stringify(next, null, 2));
        return next;
    } catch (err) {
        console.warn('⚠️ Nie udało się zapisać stanu odświeżania licencji:', err.message);
        return null;
    }
}

function postJson(url, body, timeoutMs = HTTP_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
    })
        .then(async (res) => {
            clearTimeout(timer);
            let data = {};
            try {
                data = await res.json();
            } catch (_) {}
            return { httpOk: res.ok, status: res.status, data };
        })
        .catch((err) => {
            clearTimeout(timer);
            throw err;
        });
}

/**
 * @param {string} [apiBaseUrl]
 * @param {{ force?: boolean, status?: object }} [opts]
 */
async function tryRefreshLicense(apiBaseUrl, opts = {}) {
    const base = String(apiBaseUrl || DEFAULT_LICENSE_API_URL).replace(/\/$/, '');
    const status = opts.status || license.checkLicense();
    const needsRefresh = shouldAttemptRefresh(status);
    const inGraceOrExpired = !status.valid || status.gracePeriod || status.type === 'expired';
    const force = opts.force === true || inGraceOrExpired;

    if (!force && !needsRefresh) {
        return { ok: false, reason: 'not_needed', skipped: true };
    }

    const state = readRefreshState();
    const now = Date.now();
    if (!force && state.lastRefreshAt && now - state.lastRefreshAt < REFRESH_MIN_INTERVAL_MS) {
        return { ok: false, reason: 'rate_limited', skipped: true, lastRefreshAt: state.lastRefreshAt };
    }

    const machineId = license.getMachineId();
    let response;
    try {
        response = await postJson(`${base}/api/license/refresh`, { machine_id: machineId, force });
    } catch (err) {
        const reason = err.name === 'AbortError' ? 'timeout' : 'network_error';
        return { ok: false, reason, message: err.message };
    }

    const { httpOk, data } = response;
    if (!httpOk && data && data.reason) {
        return { ok: false, ...data };
    }
    if (!data || !data.ok) {
        return { ok: false, reason: (data && data.reason) || 'refresh_failed', ...data };
    }

    if (!data.license_key || !license.saveLicenseKey(data.license_key)) {
        return { ok: false, reason: 'save_failed' };
    }

    writeRefreshState({
        lastRefreshAt: now,
        lastMachineId: machineId,
        lastType: data.type || null,
        lastExpires: data.expires || null,
    });

    return {
        ok: true,
        refreshed: data.refreshed !== false,
        type: data.type,
        expires: data.expires,
        subscription_status: data.subscription_status,
        current_period_end: data.current_period_end,
    };
}

module.exports = {
    LICENSE_REFRESH_STATE_FILE,
    DEFAULT_LICENSE_API_URL,
    REFRESH_MIN_INTERVAL_MS,
    shouldAttemptRefresh,
    tryRefreshLicense,
    readRefreshState,
    writeRefreshState,
};
