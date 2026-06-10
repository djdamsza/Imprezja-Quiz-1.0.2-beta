/**
 * Wysyła błędy JS do POST /api/client-diagnostics (plik NDJSON w katalogu danych Imprezji).
 * Bez alertów — nie przeszkadza podczas imprezy.
 */
(function () {
    'use strict';
    var ENDPOINT = '/api/client-diagnostics';
    var MAX_PER_MINUTE = 50;
    var DEDUPE_MS = 4000;
    var minuteStart = Date.now();
    var minuteCount = 0;
    var recentKeys = {};

    function trim(s, n) {
        if (s == null) return '';
        s = String(s);
        return s.length > n ? s.slice(0, n) + '…' : s;
    }

    function allowMinute() {
        var now = Date.now();
        if (now - minuteStart > 60000) {
            minuteStart = now;
            minuteCount = 0;
        }
        if (minuteCount >= MAX_PER_MINUTE) return false;
        minuteCount++;
        return true;
    }

    function dedupeKey(parts) {
        return parts.join('|').slice(0, 300);
    }

    function isDup(key) {
        var now = Date.now();
        var t = recentKeys[key];
        if (t && now - t < DEDUPE_MS) return true;
        recentKeys[key] = now;
        for (var k in recentKeys) {
            if (recentKeys.hasOwnProperty(k) && now - recentKeys[k] > 15000) delete recentKeys[k];
        }
        return false;
    }

    function report(payload) {
        if (!payload || typeof payload !== 'object') return;
        var kind = payload.kind || 'event';
        var message = String(payload.message || '');
        var source = String(payload.source || '');
        var key = dedupeKey([kind, message, source]);
        if (isDup(key)) return;
        if (!allowMinute()) return;
        var body = JSON.stringify({
            clientTs: new Date().toISOString(),
            page: location.pathname + location.search,
            ua: trim(navigator.userAgent, 350),
            kind: trim(kind, 64),
            message: trim(message, 4000),
            stack: trim(payload.stack, 12000),
            source: trim(source, 500),
            extra: payload.extra && typeof payload.extra === 'object' ? payload.extra : undefined
        });
        try {
            if (navigator.sendBeacon) {
                var blob = new Blob([body], { type: 'application/json' });
                if (navigator.sendBeacon(ENDPOINT, blob)) return;
            }
        } catch (_) {}
        fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
            keepalive: true,
            credentials: 'same-origin'
        }).catch(function () {});
    }

    window.ImprezjaClientDiagnostics = {
        report: report,
        reportRuntimeError: function (msg, url, line, col, err) {
            report({
                kind: 'error',
                message: String(msg || ''),
                source: [url, line, col].filter(function (x) { return x != null; }).join(':'),
                stack: err && err.stack ? String(err.stack) : ''
            });
        }
    };

    window.addEventListener('error', function (ev) {
        if (!ev) return;
        var err = ev.error;
        report({
            kind: 'error',
            message: err && err.message ? String(err.message) : String(ev.message || 'error'),
            source: trim(String(ev.filename || '') + ':' + (ev.lineno || '') + ':' + (ev.colno || ''), 500),
            stack: err && err.stack ? String(err.stack) : ''
        });
    });

    window.addEventListener('unhandledrejection', function (ev) {
        var r = ev && ev.reason;
        report({
            kind: 'unhandledrejection',
            message: r && r.message ? String(r.message) : String(r),
            stack: r && r.stack ? String(r.stack) : ''
        });
    });
})();
