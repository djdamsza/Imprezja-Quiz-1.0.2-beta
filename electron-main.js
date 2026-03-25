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
    const { app, BrowserWindow, dialog, Menu, ipcMain, screen, session } = electron;

    /**
     * Prawy przycisk w polu tekstowym → Wklej / Kopiuj (bez tego w Electron nie ma domyślnego menu kontekstowego).
     */
    function attachWebContentsContextMenu(webContents) {
        if (!webContents || typeof webContents.on !== 'function') return;
        webContents.on('context-menu', (event, params) => {
            const template = [];
            if (params.isEditable) {
                template.push({ role: 'cut' });
                template.push({ role: 'copy' });
                template.push({ role: 'paste' });
                if (process.platform === 'darwin') {
                    template.push({ role: 'pasteAndMatchStyle' });
                }
                template.push({ type: 'separator' });
                template.push({ role: 'selectAll' });
            } else if (params.selectionText) {
                template.push({ role: 'copy' });
            }
            if (template.length === 0) return;
            try {
                const win = BrowserWindow.fromWebContents(webContents);
                Menu.buildFromTemplate(template).popup({ window: win || undefined });
            } catch (e) {
                logToFile('context-menu: ' + (e && e.message));
            }
        });
    }

    ipcMain.handle('imprezator-open-file', async (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showOpenDialog(win, {
            properties: ['openFile'],
            filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'] }]
        });
        if (result.canceled || !result.filePaths || !result.filePaths.length) return null;
        return result.filePaths[0];
    });
    ipcMain.handle('imprezator-open-directory', async (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showOpenDialog(win, {
            properties: ['openDirectory']
        });
        if (result.canceled || !result.filePaths || !result.filePaths.length) return null;
        return result.filePaths[0];
    });

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

    // Mostek IPC przez HTTP – pozwala serwerowi (i przeglądarce) wywołać natywny dialog pliku
    // MUSI być po const http = require('http') i po let mainWindow = null (dalej w kodzie)
    const ELECTRON_IPC_PORT = 3099;
    const ipcServer = http.createServer(async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
        // Odczytaj okno do dialogów (admin preferowane)
        const win = editorWindow || adminWindow || screenWindow || mainWindow || BrowserWindow.getAllWindows()[0] || undefined;
        try {
            if (req.url === '/open-file') {
                const opts = {
                    properties: ['openFile'],
                    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'] }]
                };
                const result = await (win ? dialog.showOpenDialog(win, opts) : dialog.showOpenDialog(opts));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ filePath: result.canceled ? null : (result.filePaths[0] || null) }));
            } else if (req.url === '/open-directory') {
                const opts = { properties: ['openDirectory'] };
                const result = await (win ? dialog.showOpenDialog(win, opts) : dialog.showOpenDialog(opts));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ dirPath: result.canceled ? null : (result.filePaths[0] || null) }));
            } else {
                res.writeHead(404); res.end();
            }
        } catch (e) {
            logToFile(`⚠️ IPC dialog error: ${e.message}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
    });
    ipcServer.listen(ELECTRON_IPC_PORT, '127.0.0.1', () => {
        logToFile(`✅ Electron IPC HTTP server on 127.0.0.1:${ELECTRON_IPC_PORT}`);
    });
    ipcServer.on('error', (e) => logToFile(`⚠️ Electron IPC server error: ${e.message}`));

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
    let mainWindow = null;      // okno startowe (start.html) – opcjonalne
    let screenWindow = null;   // okno ekranu prezentacji (screen-controller)
    let editorWindow = null;   // okno edytora prezentacji (editor-prezentacja)
    let adminWindow = null;    // okno admina (admin-pwa.html) – opcjonalne, po przycisku
    let loadingWindow = null;

    // Konfiguracja monitorów – zapis/odczyt
    const WINDOWS_CONFIG_FILE = path.join(app.getPath('userData'), 'imprezja-windows.json');
    function loadWindowsConfig() {
        try {
            if (fs.existsSync(WINDOWS_CONFIG_FILE)) {
                const raw = fs.readFileSync(WINDOWS_CONFIG_FILE, 'utf8');
                const cfg = JSON.parse(raw);
                return {
                    screenDisplayIndex: typeof cfg.screenDisplayIndex === 'number' ? cfg.screenDisplayIndex : 0,
                    adminDisplayIndex: typeof cfg.adminDisplayIndex === 'number' ? cfg.adminDisplayIndex : 0,
                    adminBounds: cfg.adminBounds && typeof cfg.adminBounds === 'object' ? cfg.adminBounds : null
                };
            }
        } catch (e) { logToFile('⚠️ loadWindowsConfig: ' + e.message); }
        return { screenDisplayIndex: 0, adminDisplayIndex: 0, adminBounds: null };
    }
    function saveWindowsConfig(cfg) {
        try {
            fs.writeFileSync(WINDOWS_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
        } catch (e) { logToFile('⚠️ saveWindowsConfig: ' + e.message); }
    }

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
            const focusWin = editorWindow || adminWindow || screenWindow || mainWindow;
            if (focusWin && !focusWin.isDestroyed()) {
                if (focusWin.isMinimized()) focusWin.restore();
                focusWin.focus();
            }
        });
    }
    
    logToFile('✅ Wszystkie moduły załadowane, czekam na app.whenReady()');

    app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

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
        // Windows: sprawdź typowe lokalizacje Node.js (fallbacki dla PROGRAMFILES)
        const pf = process.env.PROGRAMFILES || 'C:\\Program Files';
        const pf86 = process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES || 'C:\\Program Files (x86)';
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
        const candidates = [
            path.join(pf, 'nodejs', 'node.exe'),
            path.join(pf86, 'nodejs', 'node.exe'),
            path.join(localAppData, 'Programs', 'nodejs', 'node.exe'),
            path.join(appData, 'npm', 'node.exe'),
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
    if (screenWindow) screenWindow.close();
    if (editorWindow) editorWindow.close();
    if (adminWindow) adminWindow.close();
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

function resolvePreloadPath() {
    return resolvePreloadByName('preload-imprezator.js');
}
function resolvePreloadByName(name) {
    const candidates = [
        process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked', name) : null,
        path.join(APP_ROOT.replace(/app\.asar$/, 'app.asar.unpacked'), name),
        path.join(APP_ROOT, name),
        path.join(__dirname, name),
    ].filter(Boolean);
    for (const p of candidates) {
        try { if (fs.existsSync(p)) return p; } catch (_) {}
    }
    return undefined;
}

/** Tworzy okno ekranu prezentacji (screen-controller) na wybranym monitorze */
function createScreenWindow(displayIndex) {
    if (screenWindow && !screenWindow.isDestroyed()) return;
    const displays = screen.getAllDisplays();
    if (!displays || displays.length === 0) return;
    const idx = Math.max(0, Math.min(displayIndex, displays.length - 1));
    const display = displays[idx];
    const bounds = display.bounds;
    screenWindow = new BrowserWindow({
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        title: 'Imprezja – Ekran prezentacji',
        fullscreen: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    screenWindow.setMenuBarVisibility(false);
    attachWebContentsContextMenu(screenWindow.webContents);
    screenWindow.webContents.on('render-process-gone', (e, details) => { logToFile('[SCREEN-CRASH] render-process-gone: ' + JSON.stringify(details)); });
    screenWindow.webContents.on('crashed', () => { logToFile('[SCREEN-CRASH] webContents crashed'); });
    screenWindow.loadURL(`http://127.0.0.1:${PORT}/screen-controller.html?mode=prezentacja&fullscreen=1`);
    screenWindow.on('closed', () => { screenWindow = null; });
    logToFile('✅ Ekran prezentacji na monitorze ' + idx);
}

/** Tworzy okno edytora prezentacji (editor-prezentacja) na wybranym monitorze */
function createEditorWindow(displayIndex) {
    if (editorWindow && !editorWindow.isDestroyed()) return;
    const cfg = loadWindowsConfig();
    const displays = screen.getAllDisplays();
    if (!displays || displays.length === 0) return;
    const idx = Math.max(0, Math.min(displayIndex, displays.length - 1));
    const display = displays[idx];
    const bounds = display.bounds;
    let opts = { title: 'Imprezja – Wybór trybu', webPreferences: { nodeIntegration: false, contextIsolation: true } };
    if (cfg.adminBounds && typeof cfg.adminBounds.width === 'number' && typeof cfg.adminBounds.height === 'number') {
        opts = { ...opts, ...cfg.adminBounds };
    } else {
        const w = Math.min(480, Math.floor(bounds.width * 0.5));
        const h = Math.min(900, Math.floor(bounds.height * 0.9));
        opts.width = w;
        opts.height = h;
        opts.x = bounds.x + Math.floor((bounds.width - w) / 2);
        opts.y = bounds.y + Math.floor((bounds.height - h) / 2);
    }
    editorWindow = new BrowserWindow(opts);
    // macOS: menu aplikacji jest w pasku systemowym – pasek w oknie ukryty.
    // Windows/Linux: bez widocznego paska nie da się dostać do „Imprezja → Monitory”.
    if (process.platform === 'darwin') {
        editorWindow.setMenuBarVisibility(false);
    } else {
        editorWindow.setMenuBarVisibility(true);
    }
    buildElectronMenu();
    // Przycisk „Panel admin” – otwórz przez openAdminWindow zamiast nowej karty
    editorWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Tylko panel na komputerze (/admin-pwa.html) → okno Electron. Panel na telefonie (/admin-pwa-qr.html) → normalne okno z QR.
        if (url && url.includes('/admin-pwa.html') && !url.includes('admin-pwa-qr')) {
            openAdminWindow();
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
    attachWebContentsContextMenu(editorWindow.webContents);
    editorWindow.loadURL(`http://127.0.0.1:${PORT}/start.html`);
    editorWindow.on('close', () => {
        try {
            if (!editorWindow.isDestroyed()) {
                const b = editorWindow.getBounds();
                const c = loadWindowsConfig();
                saveWindowsConfig({ ...c, adminBounds: { x: b.x, y: b.y, width: b.width, height: b.height } });
            }
        } catch (_) {}
    });
    editorWindow.on('closed', () => { editorWindow = null; });
    mainWindow = editorWindow;
    logToFile('✅ Wybór trybu na monitorze ' + idx);
}

/** Otwiera panel admin PWA (opcjonalnie, po przycisku) */
function openAdminWindow() {
    if (adminWindow && !adminWindow.isDestroyed()) {
        adminWindow.focus();
        return;
    }
    const preloadPath = resolvePreloadPath();
    const cfg = loadWindowsConfig();
    const displays = screen.getAllDisplays();
    const idx = Math.max(0, Math.min(cfg.adminDisplayIndex || 0, (displays && displays.length) ? displays.length - 1 : 0));
    const bounds = displays && displays[idx] ? displays[idx].bounds : { x: 0, y: 0, width: 800, height: 600 };
    const w = Math.min(420, Math.floor(bounds.width * 0.4));
    const h = Math.min(800, Math.floor(bounds.height * 0.9));
    adminWindow = new BrowserWindow({
        width: w,
        height: h,
        x: bounds.x + Math.floor((bounds.width - w) / 2),
        y: bounds.y + Math.floor((bounds.height - h) / 2),
        title: 'Imprezja Admin',
        webPreferences: { nodeIntegration: false, contextIsolation: true, preload: preloadPath }
    });
    adminWindow.setMenuBarVisibility(false);
    attachWebContentsContextMenu(adminWindow.webContents);
    adminWindow.loadURL(`http://127.0.0.1:${PORT}/admin-pwa.html`);
    adminWindow.on('closed', () => { adminWindow = null; });
    logToFile('✅ Panel admin otwarty');
}

/** Menu Electron – wybór monitorów */
function buildElectronMenu() {
    const displays = screen.getAllDisplays();
    const cfg = loadWindowsConfig();
    const screenSubmenu = displays.map((d, i) => ({
        label: (d.bounds.width + '×' + d.bounds.height) + (i === 0 ? ' (główny)' : ''),
        type: 'radio',
        checked: cfg.screenDisplayIndex === i,
        click: () => {
            const c = loadWindowsConfig();
            saveWindowsConfig({ ...c, screenDisplayIndex: i });
            if (screenWindow && !screenWindow.isDestroyed()) {
                const b = displays[i].bounds;
                screenWindow.setFullScreen(false);
                screenWindow.setBounds(b);
                screenWindow.setFullScreen(true);
            }
            buildElectronMenu();
        }
    }));
    const editorSubmenu = displays.map((d, i) => ({
        label: (d.bounds.width + '×' + d.bounds.height) + (i === 0 ? ' (główny)' : ''),
        type: 'radio',
        checked: cfg.adminDisplayIndex === i,
        click: () => {
            const c = loadWindowsConfig();
            saveWindowsConfig({ ...c, adminDisplayIndex: i });
            if (editorWindow && !editorWindow.isDestroyed()) {
                const b = displays[i].bounds;
                editorWindow.setBounds({ x: b.x, y: b.y, width: editorWindow.getBounds().width, height: editorWindow.getBounds().height });
            }
            buildElectronMenu();
        }
    }));
    const template = [
        {
            label: 'Imprezja',
            submenu: [
                { label: 'Monitor ekranu prezentacji', submenu: screenSubmenu },
                { label: 'Monitor wyboru trybu', submenu: editorSubmenu },
                { type: 'separator' },
                { label: 'Otwórz panel admin', click: () => openAdminWindow() },
                { label: 'Otwórz DevTools (ekran)', accelerator: 'F12', click: () => {
                    const w = screenWindow || editorWindow;
                    if (w && !w.isDestroyed()) w.webContents.openDevTools();
                }},
                { label: 'Otwórz wybór trybu (start)', click: () => {
                    const w = editorWindow || screenWindow;
                    if (w && !w.isDestroyed()) w.loadURL(`http://127.0.0.1:${PORT}/start.html`);
                }},
                { label: 'Otwórz edytor prezentacji', click: () => {
                    if (editorWindow && !editorWindow.isDestroyed()) {
                        editorWindow.loadURL(`http://127.0.0.1:${PORT}/editor-prezentacja.html`);
                        editorWindow.focus();
                    }
                }},
                { type: 'separator' },
                { label: 'Zamknij', role: 'quit' }
            ]
        },
        // Bez tego na macOS nie działa Cmd+V / prawy przycisk „Wklej” w polach (brak roli systemowej).
        {
            label: 'Edycja',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(process.platform === 'darwin' ? [{ role: 'pasteAndMatchStyle' }] : []),
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' }
            ]
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
    if (loadingWindow) {
        loadingWindow.close();
        loadingWindow = null;
    }
    const cfg = loadWindowsConfig();
    createScreenWindow(cfg.screenDisplayIndex);
    createEditorWindow(cfg.adminDisplayIndex);
}

function createWindowWithRetry() {
    if (loadingWindow) {
        loadingWindow.close();
        loadingWindow = null;
    }

    const cfg = loadWindowsConfig();
    createScreenWindow(cfg.screenDisplayIndex);
    createEditorWindow(cfg.adminDisplayIndex);

    const urlScreen = `http://127.0.0.1:${PORT}/screen-controller.html?mode=prezentacja&fullscreen=1`;
    const urlEditor = `http://127.0.0.1:${PORT}/start.html`;
    let retryCount = 0;
    const maxRetries = 30;

    function tryLoad() {
        if (screenWindow && !screenWindow.isDestroyed()) screenWindow.loadURL(urlScreen).catch(() => {});
        if (editorWindow && !editorWindow.isDestroyed()) editorWindow.loadURL(urlEditor).catch(() => {});
    }

    function onFailLoad(win, label) {
        return (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
            if (!win || win.isDestroyed() || !isMainFrame) return;
            retryCount++;
            if (retryCount >= maxRetries) {
                logToFile('❌ Przekroczono limit retry ładowania ' + label);
                const w = editorWindow || screenWindow;
                if (w && !w.isDestroyed()) {
                    dialog.showMessageBoxSync(w, {
                        type: 'error',
                        title: 'Imprezja Quiz – błąd',
                        message: `Serwer nie wystartował w czasie.\n\nSprawdź log: ${logFile}`
                    });
                }
                return;
            }
            logToFile(`⏳ Retry ${retryCount}/${maxRetries} ładowania ${label}...`);
            setTimeout(tryLoad, 2000);
        };
    }

    if (screenWindow) {
        screenWindow.webContents.on('did-fail-load', onFailLoad(screenWindow, 'Ekran prezentacji'));
        screenWindow.webContents.on('did-finish-load', () => logToFile('✅ Ekran prezentacji załadowany'));
    }
    if (editorWindow) {
        editorWindow.webContents.on('did-fail-load', onFailLoad(editorWindow, 'Wybór trybu'));
        editorWindow.webContents.on('did-finish-load', () => {
            logToFile('✅ Wybór trybu załadowany');
            if (editorWindow && !editorWindow.isDestroyed()) editorWindow.focus();
        });
    }

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
                    try {
                        await session.defaultSession.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });
                        logToFile('✅ Service Workers i CacheStorage wyczyszczone');
                    } catch (e) { logToFile('⚠️ Czyszczenie SW/cache: ' + e.message); }
                    createWindow();
                } else {
                    logToFile('🚀 Uruchamiam nowy serwer...');
                    await startServer();
                    // SW nie jest potrzebny w Electron – czyścimy rejestracje i cache ze starej sesji
                    try {
                        await session.defaultSession.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });
                        logToFile('✅ Service Workers i CacheStorage wyczyszczone');
                    } catch (e) { logToFile('⚠️ Czyszczenie SW/cache: ' + e.message); }
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
                    if (screenWindow) screenWindow.close();
                    if (editorWindow) editorWindow.close();
                    if (adminWindow) adminWindow.close();
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
    const win = editorWindow || adminWindow || screenWindow || mainWindow;
    if (win && !win.isDestroyed()) {
        dialog.showMessageBoxSync(win, {
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
