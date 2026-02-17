/**
 * Prosty launcher - uruchamia serwer i otwiera przeglądarkę
 * Użyj: npm install -g pkg
 * Potem: pkg launcher.js --targets node18-win-x64
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PORT = 3000;
const APP_ROOT = __dirname;

function isServerReady() {
    return new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${PORT}/`, { timeout: 500 }, (res) => {
            resolve(true);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

function waitForServer(maxWaitMs = 15000) {
    const step = 300;
    return new Promise((resolve, reject) => {
        let elapsed = 0;
        const tick = async () => {
            if (await isServerReady()) {
                return resolve();
            }
            elapsed += step;
            if (elapsed >= maxWaitMs) {
                return reject(new Error('Serwer nie wystartował w czasie.'));
            }
            setTimeout(tick, step);
        };
        tick();
    });
}

function openBrowser(url) {
    const platform = os.platform();
    let command;
    
    if (platform === 'win32') {
        command = `start "" "${url}"`;
    } else if (platform === 'darwin') {
        command = `open "${url}"`;
    } else {
        command = `xdg-open "${url}"`;
    }
    
    spawn(command, [], { shell: true, stdio: 'ignore' });
}

function startServer() {
    return new Promise((resolve, reject) => {
        const serverPath = path.join(APP_ROOT, 'server.js');
        
        if (!fs.existsSync(serverPath)) {
            reject(new Error(`Plik server.js nie istnieje w: ${serverPath}`));
            return;
        }
        
        // Użyj node z PATH lub process.execPath jeśli jesteśmy w pkg
        const nodeBin = process.pkg ? process.execPath : 'node';
        
        const serverProcess = spawn(nodeBin, [serverPath], {
            cwd: APP_ROOT,
            stdio: 'inherit',
            env: { ...process.env, IMPREZJA_LAUNCHER: '1' }
        });
        
        serverProcess.on('error', (err) => {
            reject(err);
        });
        
        resolve();
    });
}

async function main() {
    console.log('🚀 IMPREZJA Launcher');
    console.log('📂 APP_ROOT:', APP_ROOT);
    
    try {
        // Sprawdź czy serwer już działa
        if (await isServerReady()) {
            console.log('✅ Serwer już działa');
        } else {
            console.log('🚀 Uruchamiam serwer...');
            await startServer();
            console.log('⏳ Czekam na serwer...');
            await waitForServer();
            console.log('✅ Serwer gotowy!');
        }
        
        const url = `http://127.0.0.1:${PORT}/start.html`;
        console.log('🌐 Otwieram przeglądarkę:', url);
        openBrowser(url);
        
        console.log('\n✅ IMPREZJA działa!');
        console.log('📺 Ekran startowy (Quiz / Familiada):', url);
        console.log('👨‍💼 Admin:', `http://127.0.0.1:${PORT}/admin.html`);
        console.log('\nNaciśnij Ctrl+C żeby zamknąć serwer.');
        
    } catch (err) {
        console.error('❌ Błąd:', err.message);
        process.exit(1);
    }
}

main();
