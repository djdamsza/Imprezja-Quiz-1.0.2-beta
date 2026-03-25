#!/usr/bin/env node
/**
 * Cross-platform: zabija proces nasłuchujący na porcie 3000.
 * Działa na Windows (netstat + taskkill) i Mac/Linux (lsof).
 */
const { execSync } = require('child_process');
const PORT = process.argv[2] || '3000';

function killPort() {
    try {
        if (process.platform === 'win32') {
            const out = execSync(`netstat -ano | findstr :${PORT}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
            const pids = new Set();
            for (const line of out.split('\r\n')) {
                const m = line.trim().split(/\s+/).pop();
                if (m && /^\d+$/.test(m)) pids.add(m);
            }
            for (const pid of pids) {
                try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' }); } catch (_) {}
            }
        } else {
            execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`, { stdio: 'pipe', shell: true });
        }
    } catch (_) {}
}

killPort();
