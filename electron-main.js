/**
 * Główny proces Electron – Imprezja Quiz / VoteBattle
 * Uruchamia serwer Node (server.js), czeka na nasłuch, otwiera okno z ekranem TV.
 */

// NAJPIERW - próbuj zapisać cokolwiek do stderr (zawsze dostępne)
try {
    process.stderr.write('Imprezja Quiz: Starting...\n');
    process.stderr.write('Imprezja Quiz: __dirname=' + __dirname + '\n');
    process.stderr.write('Imprezja Quiz: process.execPath=' + process.execPath + '\n');
} catch (e) {
    // Jeśli nawet to się nie powiedzie, aplikacja nie może działać
}

// Logowanie NA SAMYM POCZĄTKU - przed wszystkimi require
const path = require('path');
const fs = require('fs');
const os = require('os');

// Logi w folderze aplikacji (tam gdzie .exe) - tam powinny być uprawnienia
// W spakowanej aplikacji __dirname może wskazywać na resources/app, więc użyjemy process.execPath
let logDir = __dirname;
try {
    // W spakowanej aplikacji użyj folderu gdzie jest .exe
    if (process.execPath && process.execPath.endsWith('.exe')) {
        logDir = path.dirname(process.execPath);
    }
} catch (_) {}

let logFile = path.join(logDir, 'imprezja-electron.log');
// Fallback do wielu miejsc
const logCandidates = [
    logFile,
    path.join(__dirname, 'imprezja-electron.log'),
    path.join(os.homedir(), 'imprezja-electron.log'),
    path.join(os.tmpdir(), 'imprezja-electron.log')
];

for (const candidate of logCandidates) {
    try {
        fs.appendFileSync(candidate, '');
        logFile = candidate;
        break;
    } catch (_) {}
}

function logToFile(msg) {
    try {
        const msgStr = new Date().toISOString() + ' ' + String(msg) + '\n';
        fs.appendFileSync(logFile, msgStr);
        // Również do console jeśli dostępny
        if (typeof console !== 'undefined' && console.log) {
            console.log('[LOG]', msg);
        }
    } catch (err) {
        // Ostatnia deska ratunku - stderr
        try {
            process.stderr.write(new Date().toISOString() + ' ' + String(msg) + '\n');
        } catch (_) {}
    }
}

// Zapisz ścieżkę do logu w wielu miejscach
const locationFiles = [
    path.join(logDir, 'LOG-LOCATION.txt'),
    path.join(__dirname, 'LOG-LOCATION.txt'),
    path.join(os.homedir(), 'IMPREZJA-LOG-LOCATION.txt')
];
for (const locFile of locationFiles) {
    try {
        fs.writeFileSync(locFile, `Logi w: ${logFile}\nData: ${new Date().toISOString()}\n`);
    } catch (_) {}
}

logToFile('=== IMPREZJA Electron Start - PRZED require electron ===');
logToFile('Log file location: ' + logFile);
logToFile('Node version: ' + process.version);
logToFile('Platform: ' + process.platform);
logToFile('Arch: ' + process.arch);
logToFile('__dirname: ' + __dirname);
logToFile('process.execPath: ' + process.execPath);
logToFile('process.cwd(): ' + process.cwd());

// Sprawdź czy ten plik istnieje (czy jesteśmy w pakiecie)
try {
    const thisFile = __filename || path.join(__dirname, 'electron-main.js');
    logToFile('This file: ' + thisFile);
    logToFile('This file exists: ' + fs.existsSync(thisFile));
} catch (e) {
    logToFile('Error checking file: ' + e.message);
}

// Przechwyć WSZYSTKIE błędy na najwyższym poziomie
process.on('uncaughtException', (err) => {
    try {
        const errMsg = `FATAL: ${err.message}\nStack: ${err.stack || 'brak'}\n`;
        fs.appendFileSync(logFile, errMsg);
        fs.writeFileSync(path.join(__dirname, 'FATAL-ERROR.txt'), errMsg);
    } catch (_) {}
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    try {
        const errMsg = `UNHANDLED REJECTION: ${reason}\n`;
        fs.appendFileSync(logFile, errMsg);
    } catch (_) {}
});

try {
    logToFile('Loading electron module...');
    
    // W głównym procesie Electron, require('electron') powinno zwracać obiekt z API
    const electron = require('electron');
    logToFile('require("electron") type: ' + typeof electron);
    logToFile('require("electron") value: ' + (typeof electron === 'string' ? electron.substring(0, 50) : JSON.stringify(Object.keys(electron).slice(0, 10))));
    
    // Sprawdź czy to jest obiekt z właściwościami
    if (typeof electron !== 'object' || electron === null) {
        throw new Error('require("electron") zwraca ' + typeof electron + ' zamiast obiektu');
    }
    
    // Spróbuj użyć destrukturyzacji
    const { app, BrowserWindow, dialog, Menu } = electron;
    
    if (!app) {
        logToFile('Electron keys: ' + Object.keys(electron).join(', '));
        throw new Error('app nie jest dostępne w electron module. Dostępne klucze: ' + Object.keys(electron).slice(0, 10).join(', '));
    }
    
    logToFile('Electron module loaded successfully');
    logToFile('app type: ' + typeof app);
    if (app && typeof app.isPackaged !== 'undefined') {
        logToFile('app.isPackaged: ' + app.isPackaged);
    }
    
    const { spawn } = require('child_process');
    const http = require('http');
    
    logToFile('All modules loaded');

    const PORT = 3000;

    // Wykryj poprawną ścieżkę do aplikacji (dev / unpacked / asar)
    function getAppRoot() {
        if (app && typeof app.isPackaged !== 'undefined' && !app.isPackaged) {
            return __dirname;
        }
        const resources = process.resourcesPath;
        const dirExec = path.dirname(process.execPath);
        // Gdy asar: true – kod jest w app.asar (jeden plik archiwum), serwer uruchamiamy ścieżką do pliku wewnątrz asar
        const asarApp = resources && path.join(resources, 'app.asar');
        if (asarApp && fs.existsSync(asarApp)) {
            const serverInAsar = path.join(asarApp, 'server.js');
            try {
                if (fs.existsSync(serverInAsar)) return asarApp;
            } catch (_) {}
        }
        const candidates = [
            __dirname,
            resources && path.join(resources, 'app'),
            path.join(dirExec, 'resources', 'app'),
            dirExec,
        ].filter(Boolean);
        for (const candidate of candidates) {
            const candidateResolved = path.resolve(candidate);
            const serverJs = path.join(candidateResolved, 'server.js');
            if (fs.existsSync(serverJs)) return candidateResolved;
        }
        return path.resolve(resources ? path.join(resources, 'app.asar') : __dirname);
    }

    const APP_ROOT = getAppRoot();
    let serverProcess = null;
    let mainWindow = null;
    let loadingWindow = null;

    logToFile(`isPackaged: ${app.isPackaged}`);
    logToFile(`process.resourcesPath: ${process.resourcesPath || 'undefined'}`);
    logToFile(`APP_ROOT: ${APP_ROOT}`);

console.log('📁 APP_ROOT:', APP_ROOT);
console.log('📦 isPackaged:', app.isPackaged);
console.log('🔧 __dirname:', __dirname);

    logToFile('🔒 Sprawdzam single instance lock...');
    // Single instance lock - jeśli aplikacja już działa, zamknij nową instancję
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
        logToFile('⚠️ Aplikacja już działa, zamykam tę instancję');
        app.quit();
        return; // Wyjdź wcześnie
    } else {
        logToFile('✅ Single instance lock uzyskany');
        app.on('second-instance', () => {
            logToFile('📱 Druga instancja próbuje się uruchomić');
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
            }
        });
    }
    
    logToFile('✅ Wszystkie moduły załadowane, czekam na app.whenReady()');

/** Konfiguruje autoUpdater i ustawia global.imprezjaCheckForUpdates – wywołać PRZED startServer */
function setupAutoUpdater() {
    global.imprezjaUpdateStatus = global.imprezjaUpdateStatus || { status: 'idle' };
    if (!app.isPackaged) {
        global.imprezjaCheckForUpdates = async () => ({ available: false, message: 'Sprawdzanie aktualizacji tylko w wersji spakowanej.' });
        global.imprezjaQuitAndInstall = () => {};
        return;
    }
    try {
        const { autoUpdater } = require('electron-updater');
        autoUpdater.setFeedURL({
            provider: 'github',
            owner: 'djdamsza',
            repo: 'Imprezja-Quiz-1.0.2-beta'
        });
        autoUpdater.autoDownload = true;
        autoUpdater.allowDowngrade = false;
        autoUpdater.allowPrerelease = true;
        autoUpdater.logger = {
            info: (msg) => logToFile('[updater] ' + msg),
            warn: (msg) => logToFile('[updater] ' + msg),
            error: (msg) => logToFile('[updater] ' + msg)
        };
        autoUpdater.on('update-available', (info) => {
            global.imprezjaUpdateStatus = { status: 'downloading', version: info.version };
            logToFile('[updater] update-available: ' + info.version);
        });
        autoUpdater.on('update-downloaded', (info) => {
            global.imprezjaUpdateStatus = { status: 'ready', version: info.version };
            logToFile('[updater] update-downloaded: ' + info.version);
        });
        const MANUAL_DOWNLOAD_URL = 'https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/latest';
        global.imprezjaQuitAndInstall = () => {
            if (global.imprezjaUpdateStatus && global.imprezjaUpdateStatus.status === 'ready') {
                autoUpdater.quitAndInstall(false);
            }
        };
        global.imprezjaCheckForUpdates = async () => {
            try {
                global.imprezjaUpdateStatus = { status: 'idle' };
                const result = await autoUpdater.checkForUpdates();
                if (!result || !result.updateInfo) {
                    return { available: false, message: 'Masz najnowszą wersję.' };
                }
                const version = result.updateInfo.version;
                return { available: true, version, message: `Dostępna wersja ${version}` };
            } catch (err) {
                const msg = err && err.message ? err.message : String(err);
                logToFile('[updater] checkForUpdates error: ' + msg);
                return {
                    available: false,
                    error: `Nie można sprawdzić aktualizacji. Pobierz najnowszą wersję ręcznie: ${MANUAL_DOWNLOAD_URL}`,
                    manualUrl: MANUAL_DOWNLOAD_URL,
                    detail: process.platform === 'darwin' ? msg : undefined
                };
            }
        };
        logToFile('✅ AutoUpdater skonfigurowany (autoDownload=true)');
    } catch (err) {
        logToFile('⚠️ Błąd autoUpdater: ' + err.message);
        global.imprezjaCheckForUpdates = async () => ({ available: false, error: err.message });
        global.imprezjaQuitAndInstall = () => {};
    }
}

/** Szukamy Node.js w typowych miejscach (macOS/Windows) – przy uruchomieniu z aplikacji PATH może być ubogi */
function getNodePath() {
    if (process.platform === 'darwin') {
        const candidates = [
            '/opt/homebrew/bin/node',  // Apple Silicon Homebrew
            '/usr/local/bin/node',     // Intel Homebrew
        ];
        for (const p of candidates) {
            try {
                if (fs.existsSync(p)) return p;
            } catch (_) {}
        }
    } else if (process.platform === 'win32') {
        // Windows: sprawdź typowe lokalizacje Node.js
        const candidates = [
            path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'nodejs', 'node.exe'),
            path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'nodejs', 'node.exe'),
            path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs', 'node.exe'),
            path.join(process.env.APPDATA || '', 'npm', 'node.exe'),
        ];
        for (const p of candidates) {
            try {
                if (fs.existsSync(p)) {
                    console.log('✅ Znaleziono Node.js:', p);
                    return p;
                }
            } catch (_) {}
        }
    }
    console.log('⚠️ Node.js nie znaleziony w typowych miejscach, używam "node" z PATH');
    return 'node';
}

function isServerReady() {
    return new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${PORT}/`, { timeout: 2000 }, (res) => {
            resolve(true);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

function waitForServer(maxWaitMs = 60000) {
    const step = 300;
    const initialDelay = 800; // pierwsze sprawdzenie po 0,8 s – serwer może startować wolno (licencja, sieć)
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
        setTimeout(tick, initialDelay);
    });
}

function startServer() {
    return new Promise((resolve, reject) => {
        const serverPath = path.join(APP_ROOT, 'server.js');
        logToFile('🚀 Uruchamianie serwera: ' + serverPath);
        logToFile('📂 APP_ROOT: ' + APP_ROOT);
        logToFile('📂 CWD: ' + process.cwd());

        const userDataDir = app && typeof app.getPath === 'function' ? app.getPath('userData') : '';
        if (userDataDir) process.env.IMPREZJA_DATA_DIR = userDataDir;
        process.env.IMPREZJA_APP_PATH = APP_ROOT;
        logToFile('🔧 IMPREZJA_DATA_DIR: ' + (userDataDir || '(nie ustawiony)'));
        logToFile('🔧 IMPREZJA_APP_PATH: ' + APP_ROOT);

        // W spakowanej aplikacji (DMG, setup.exe) uruchamiamy serwer w tym samym procesie – bez spawn.
        // Na macOS spawn drugiego procesu (nawet Electron jako node) powodował dialog z prośbą o hasło.
        if (app.isPackaged) {
            process.env.IMPREZJA_ELECTRON = '1';
            try {
                const serverModule = require(serverPath);
                if (typeof serverModule.startServer === 'function') {
                    logToFile('🔧 Uruchamiam serwer w procesie (in-process, bez spawn)');
                    serverModule.startServer(() => {
                        logToFile('✅ Serwer nasłuchuje (in-process)');
                        resolve();
                    });
                    return;
                }
            } catch (inProcessErr) {
                logToFile('⚠️ In-process start nie powiódł się, używam spawn: ' + inProcessErr.message);
            }
        }

        // Fallback: spawn (dev lub gdy in-process niedostępny)
        if (!fs.existsSync(serverPath)) {
            const err = new Error(`Plik server.js nie istnieje w: ${serverPath}`);
            logToFile('❌ ' + err.message);
            console.error('❌', err.message);
            reject(err);
            return;
        }

        const electronPath = process.execPath;
        logToFile('🔧 Używam Electron jako runtime (spawn): ' + electronPath);
        const isAsar = APP_ROOT && APP_ROOT.endsWith('.asar');
        const scriptArg = isAsar ? serverPath : (process.platform === 'win32' ? 'server.js' : serverPath);
        const spawnCwd = isAsar && process.resourcesPath ? process.resourcesPath : path.resolve(APP_ROOT);
        // NIE ustawiaj IMPREZJA_ELECTRON przy spawn – wtedy server.js wywołuje doListen() i startuje.
        // IMPREZJA_ELECTRON jest tylko dla trybu in-process (spakowana aplikacja).
        const spawnEnv = { ...process.env, ELECTRON_RUN_AS_NODE: '1', IMPREZJA_NO_BROWSER: '1' };
        delete spawnEnv.IMPREZJA_ELECTRON;
        if (userDataDir) spawnEnv.IMPREZJA_DATA_DIR = userDataDir;
        spawnEnv.IMPREZJA_APP_PATH = APP_ROOT;

        serverProcess = spawn(electronPath, [scriptArg], {
            cwd: spawnCwd,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: spawnEnv
        });
        serverProcess.stdout.on('data', (data) => {
            logToFile('[SERVER] ' + data.toString().trim());
            console.log('[SERVER]', data.toString().trim());
        });
        serverProcess.stderr.on('data', (data) => {
            logToFile('[SERVER ERROR] ' + data.toString().trim());
            console.error('[SERVER ERROR]', data.toString().trim());
        });
        serverProcess.on('error', (err) => {
            logToFile('❌ Błąd uruchomienia serwera: ' + err.message);
            serverProcess = null;
            reject(err);
        });
        serverProcess.on('exit', (code, signal) => {
            if (code !== null && code !== 0) {
                logToFile('❌ Serwer zakończył się z kodem: ' + code + ' signal: ' + signal);
            }
            serverProcess = null;
        });
        logToFile('✅ Proces serwera uruchomiony (PID: ' + serverProcess.pid + ')');
        resolve();
    });
}

function showErrorAndQuit(title, message) {
    if (mainWindow) mainWindow.close();
    if (loadingWindow) loadingWindow.close();
    dialog.showMessageBoxSync({
        type: 'error',
        title: title || 'Imprezja Quiz – błąd',
        message: message || 'Wystąpił błąd.'
    });
    app.quit();
}

function showLoadingWindow() {
    try {
        if (loadingWindow) return;
        loadingWindow = new BrowserWindow({
            width: 360,
            height: 120,
            title: 'Imprezja Quiz',
            resizable: false,
            show: true,
            webPreferences: { nodeIntegration: false, contextIsolation: true }
        });
        loadingWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
            <!DOCTYPE html><html><head><meta charset="utf-8"><style>
              body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #1a1a2e; color: #eee; }
            </style></head><body><p>Uruchamianie Imprezja Quiz…</p></body></html>
        `));
        loadingWindow.on('closed', () => {
            loadingWindow = null;
        });
        logToFile('✅ Loading window created');
    } catch (err) {
        logToFile(`❌ Błąd tworzenia loading window: ${err.message}`);
        console.error('❌ Błąd tworzenia loading window:', err);
    }
}

function createWindow() {
    if (loadingWindow) {
        loadingWindow.close();
        loadingWindow = null;
    }
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'Imprezja Quiz – Ekran TV',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        show: true
    });

    Menu.setApplicationMenu(null);
    mainWindow.loadURL(`http://127.0.0.1:${PORT}/start.html`);

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('❌ Błąd ładowania strony:', errorCode, errorDescription);
        dialog.showMessageBoxSync(mainWindow, {
            type: 'error',
            title: 'Imprezja Quiz – błąd',
            message: `Nie można załadować strony.\n\nKod błędu: ${errorCode}\nOpis: ${errorDescription}\n\nSprawdź czy serwer działa na porcie ${PORT}.`
        });
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.focus();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createWindowWithRetry() {
    if (loadingWindow) {
        loadingWindow.close();
        loadingWindow = null;
    }
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'Imprezja Quiz – Ekran TV',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        show: true
    });

    Menu.setApplicationMenu(null);

    const url = `http://127.0.0.1:${PORT}/start.html`;
    let retryCount = 0;
    const maxRetries = 30;

    function tryLoad() {
        mainWindow.loadURL(url).catch(() => {});
    }

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (mainWindow.isDestroyed() || !isMainFrame) return;
        retryCount++;
        if (retryCount >= maxRetries) {
            logToFile('❌ Przekroczono limit retry ładowania strony');
            dialog.showMessageBoxSync(mainWindow, {
                type: 'error',
                title: 'Imprezja Quiz – błąd',
                message: `Serwer nie wystartował w czasie.\n\nSprawdź log: ${logFile}`
            });
            return;
        }
        logToFile(`⏳ Retry ${retryCount}/${maxRetries} ładowania strony...`);
        setTimeout(tryLoad, 2000);
    });

    mainWindow.webContents.on('did-finish-load', () => {
        logToFile('✅ Strona załadowana');
        mainWindow.focus();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    tryLoad();
}

    app.whenReady().then(async () => {
        logToFile('✅ Electron app ready');
        console.log('✅ Electron app ready');
        
        // NAJPIERW: Pokaż okno loading - żeby użytkownik widział że coś się dzieje
        try {
            showLoadingWindow();
            logToFile('📱 Loading window shown');
            console.log('📱 Loading window shown');
        } catch (err) {
            logToFile('❌ Błąd pokazania loading window: ' + err.message);
        }
        
        // TEST: Najpierw spróbuj tylko pokazać okno z komunikatem (bez serwera)
        // To pozwoli sprawdzić czy Electron w ogóle działa
        setTimeout(async () => {
            try {
                setupAutoUpdater();
                logToFile('🔍 Sprawdzam czy serwer już działa...');
                const serverAlreadyRunning = await isServerReady();
                if (serverAlreadyRunning) {
                    logToFile('✅ Serwer już działa na porcie 3000');
                    createWindow();
                } else {
                    logToFile('🚀 Uruchamiam nowy serwer...');
                    await startServer();
                    logToFile('📺 Tworzę okno – strona załaduje się gdy serwer będzie gotowy');
                    createWindowWithRetry();
                }
            } catch (err) {
                const errMsg = err.message || String(err);
                logToFile(`❌ BŁĄD: ${errMsg}`);
                logToFile(`Stack: ${err.stack || 'brak'}`);
                console.error('❌ Błąd:', err);
                
                // Pobierz ostatnie linie z logu, żeby pokazać przyczynę (np. brak modułu, port zajęty)
                let logSnippet = '';
                try {
                    if (fs.existsSync(logFile)) {
                        const content = fs.readFileSync(logFile, 'utf8');
                        const lines = content.trim().split(/\r?\n/).filter(Boolean);
                        const tail = lines.slice(-18);
                        logSnippet = tail.length ? '\n\nOstatnie linie z logu:\n' + tail.join('\n') : '';
                    }
                } catch (_) {}
                
                // Pokaż okno z błędem
                try {
                    if (mainWindow) mainWindow.close();
                    if (loadingWindow) loadingWindow.close();
                    const errorWindow = new BrowserWindow({
                        width: 640,
                        height: 480,
                        title: 'Imprezja Quiz – błąd',
                        webPreferences: { nodeIntegration: false, contextIsolation: true }
                    });
                    const isNodeMissing = err.code === 'ENOENT' || (err.message && err.message.includes('node'));
                    let message = isNodeMissing
                        ? 'Nie znaleziono Node.js. Zainstaluj Node.js z https://nodejs.org'
                        : `Błąd: ${errMsg}\n\nLogi w:\n${logFile}${logSnippet}`;
                    message = message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
                    errorWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
                        <!DOCTYPE html><html><head><meta charset="utf-8"><style>
                        body { font-family: system-ui; padding: 20px; background: #1a1a2e; color: #eee; font-size: 13px; }
                        h1 { color: #ff6b6b; font-size: 1.2rem; }
                        .log { background: rgba(0,0,0,0.3); padding: 10px; margin-top: 10px; font-size: 11px; overflow: auto; max-height: 200px; white-space: pre-wrap; word-break: break-all; }
                        </style></head><body>
                        <h1>Imprezja Quiz – błąd uruchomienia</h1>
                        <p>${message}</p>
                        </body></html>
                    `));
                } catch (_) {}
            }
        }, 80); // Krótkie opóźnienie żeby loading window się pokazało (80ms wystarczy)
    }).catch((err) => {
        logToFile('❌ BŁĄD w app.whenReady(): ' + err.message);
        logToFile('Stack: ' + (err.stack || 'brak'));
    });

    // Event handlery dla zamknięcia aplikacji
    app.on('window-all-closed', () => {
        if (serverProcess) {
            serverProcess.kill('SIGTERM');
            serverProcess = null;
        }
        app.quit();
    });

    app.on('before-quit', () => {
        if (serverProcess) {
            serverProcess.kill('SIGTERM');
            serverProcess = null;
        }
    });

// Przechwyć nieobsłużone błędy
process.on('uncaughtException', (err) => {
    logToFile(`❌ UNCAUGHT EXCEPTION: ${err.message}`);
    logToFile(`Stack: ${err.stack || 'brak'}`);
    console.error('❌ Uncaught Exception:', err);
    if (mainWindow) {
        dialog.showMessageBoxSync(mainWindow, {
            type: 'error',
            title: 'Imprezja Quiz – błąd krytyczny',
            message: `Wystąpił błąd: ${err.message}\n\nLogi w: ${logFile}`
        });
    }
});

    process.on('unhandledRejection', (reason) => {
        logToFile(`❌ UNHANDLED REJECTION: ${reason}`);
        console.error('❌ Unhandled Rejection:', reason);
    });

} catch (err) {
    // Jeśli nawet require('electron') się nie powiedzie
    logToFile('❌ FATAL ERROR loading modules: ' + err.message);
    logToFile('Stack: ' + (err.stack || 'brak'));
    // Spróbuj pokazać okno błędu jeśli Electron już załadowany
    try {
        const { app, dialog } = require('electron');
        app.whenReady().then(() => {
            dialog.showMessageBoxSync({
                type: 'error',
                title: 'Imprezja Quiz – błąd krytyczny',
                message: `Błąd ładowania modułów:\n${err.message}\n\nLogi w: ${logFile}`
            });
            app.quit();
        });
    } catch (_) {
        // Jeśli nawet to się nie powiedzie, przynajmniej mamy logi
    }
    throw err;
}
