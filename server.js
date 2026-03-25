// Wczytaj zmienne z .env (jeśli plik istnieje) — bez zewnętrznych zależności
try {
    const _fs = require('fs'), _path = require('path');
    const _envPath = _path.join(__dirname, '.env');
    if (_fs.existsSync(_envPath)) {
        _fs.readFileSync(_envPath, 'utf8').split('\n').forEach(line => {
            const m = line.match(/^([^#=]+)=(.*)$/);
            if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
        });
    }
} catch (_) {}

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const QRCode = require('qrcode');
const os = require('os');
const https = require('https'); // Potrzebne do importu z URL
const crypto = require('crypto');
const license = require('./license.js');
const { spawn } = require('child_process');

// Sharp - opcjonalne (jeśli się nie załaduje, użyjemy jimp jako fallback)
let sharp = null;
let jimp = null;

try {
    sharp = require('sharp');
    console.log('✅ Moduł sharp załadowany - szybka optymalizacja obrazów włączona');
} catch (err) {
    console.warn('⚠️ Moduł sharp nie jest dostępny - próbuję jimp jako alternatywa...');
    try {
        jimp = require('jimp');
        console.log('✅ Moduł jimp załadowany - optymalizacja obrazów włączona (wolniejsza ale działa wszędzie)');
    } catch (err2) {
        console.warn('⚠️ Ani sharp ani jimp nie są dostępne - obrazy nie będą optymalizowane');
        console.warn('   Aby włączyć optymalizację, zainstaluj: npm install sharp (lub npm install jimp)');
    }
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 2e6 // 2 MB – ramki kamery (JPEG) mogą być duże
});

const PORT = 3000;
const PORT_HTTPS = 3443;

// Certyfikaty HTTPS – dla Wake Lock (niegasnący ekran) w Familiada admin i przyciski
let httpsOptions = null;
const certsDir = path.join(__dirname, 'certs');
const keyPath = path.join(certsDir, 'key.pem');
const certPath = path.join(certsDir, 'cert.pem');
function loadHttpsCerts() {
    try {
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            httpsOptions = {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath)
            };
            console.log('✅ Certyfikaty HTTPS załadowane z', certsDir);
            return;
        }
        if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });
        if (process.platform !== 'win32') {
            const { execSync } = require('child_process');
            execSync(`openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' -keyout "${keyPath}" -out "${certPath}" -days 365`, { stdio: 'pipe' });
        } else {
            const selfsigned = require('selfsigned');
            const attrs = [{ name: 'commonName', value: 'localhost' }];
            const pems = selfsigned.generate(attrs, { algorithm: 'sha256', days: 365, keySize: 2048 });
            fs.writeFileSync(keyPath, pems.private);
            fs.writeFileSync(certPath, pems.cert);
        }
        httpsOptions = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
        console.log('✅ Wygenerowano certyfikaty HTTPS w', certsDir);
    } catch (err) {
        console.warn('⚠️ HTTPS niedostępny:', err.message);
        console.warn('   Wake Lock w Familiada admin/przyciski wymaga HTTPS. Użyj tunelu (działa) lub: openssl req -x509 -newkey rsa:2048 -nodes -subj "/CN=localhost" -keyout certs/key.pem -out certs/cert.pem');
    }
}
loadHttpsCerts();

let httpsServer = null;
if (httpsOptions) {
    httpsServer = https.createServer(httpsOptions, app);
    io.attach(httpsServer);
}

// Wersja deweloperska – symulacje licencji:
// IMPREZJA_SIMULATE_TRIAL=1 – symulacja aktywnego trialu (valid, type: 'trial', np. 5 dni)
// IMPREZJA_SIMULATE_LICENSE_EXPIRED=1 – wymusza ekran „Licencja wymagana” (wygasły trial / brak licencji)
function getLicenseStatus() {
    if (process.env.IMPREZJA_SIMULATE_LICENSE_EXPIRED === '1') {
        return { valid: false, reason: 'Symulacja: okres testowy zakończony (dev). Aby wyłączyć: odznacz IMPREZJA_SIMULATE_LICENSE_EXPIRED.', trial: { valid: false }, type: null };
    }
    if (process.env.IMPREZJA_SIMULATE_TRIAL === '1') {
        const daysLeft = parseInt(process.env.IMPREZJA_SIMULATE_TRIAL_DAYS || '5', 10) || 5;
        return {
            valid: true,
            type: 'trial',
            daysLeft,
            reason: undefined,
            trial: { valid: true, daysLeft, daysElapsed: 14 - daysLeft, reason: undefined }
        };
    }
    return license.checkLicense();
}
let licenseStatus = getLicenseStatus();
console.log('\n🔐 ═══════════════════════════════════════════════════');
console.log('   STATUS LICENCJI');
console.log('   ═══════════════════════════════════════════════════');
if (process.env.IMPREZJA_SIMULATE_LICENSE_EXPIRED === '1') {
    console.log('   ⚠️  Symulacja wygasłej licencji (dev) – widoczny ekran „Licencja wymagana”');
} else if (process.env.IMPREZJA_SIMULATE_TRIAL === '1') {
    console.log('   ⚠️  Symulacja aktywnego trialu (dev) – aplikacja działa jak w okresie testowym');
}
if (licenseStatus.valid) {
    if (licenseStatus.type === 'trial') {
        console.log(`   ✅ Okres testowy aktywny`);
        console.log(`   📅 Pozostało dni: ${licenseStatus.daysLeft}`);
        console.log(`   ⚠️  Po wygaśnięciu wymagana będzie pełna licencja`);
    } else {
        console.log(`   ✅ Pełna licencja aktywna`);
        if (licenseStatus.expires) {
            const expiresDate = new Date(licenseStatus.expires);
            console.log(`   📅 Wygasa: ${expiresDate.toLocaleDateString()}`);
        } else {
            console.log(`   📅 Licencja bezterminowa`);
        }
    }
} else {
    console.log(`   ❌ Licencja nieważna: ${licenseStatus.reason || 'Nieznany błąd'}`);
    if (licenseStatus.trial && !licenseStatus.trial.valid) {
        console.log(`   ⚠️  Okres testowy wygasł`);
    }
}
console.log('   ═══════════════════════════════════════════════════\n');
// W aplikacji spakowanej (asar) __dirname jest tylko do odczytu – quizy i uploady w katalogu danych
// Gdy IMPREZJA_DATA_DIR nie jest ustawiony (npm start), używamy tego samego katalogu co Electron,
// żeby NJR Sampler i Śpiewaj Dalej nie traciły list przy przełączaniu trybów.
function getDefaultDataDir() {
    const home = os.homedir();
    if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'Imprezja Quiz');
    if (process.platform === 'win32') return path.join(process.env.APPDATA || home, 'Imprezja Quiz');
    return path.join(home, '.config', 'Imprezja Quiz');
}
const dataDir = process.env.IMPREZJA_DATA_DIR || getDefaultDataDir();
const VOLUMES_FILE = path.join(dataDir, 'imprezja-volumes.json');
const quizzesDir = path.join(dataDir, 'quizzes');
const uploadsDir = path.join(dataDir, 'uploads');
const vdjRecordingsBank = process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Application Support', 'VirtualDJ', 'Sampler', 'Recordings.bank')
    : (process.platform === 'win32' ? path.join(process.env.APPDATA || os.homedir(), 'VirtualDJ', 'Sampler', 'Recordings.bank') : '');
console.log('   📂 Katalog danych (quizy, uploady, sampler, śpiewaj dalej):', dataDir);

// === DEV-SYNC ===
// Gdy serwer działa w trybie deweloperskim (bez IMPREZJA_APP_PATH = nie spakowana aplikacja),
// zmiany dokonane w aplikacji są automatycznie lustrzane do katalogu projektu.
// Dzięki temu to co DODASZ w Electron trafi do kolejnego builda,
// a to co USUNIESZ zniknie z builda. Imprezator jest wyjątkiem – zawsze prywatny.
const isDevMode = !process.env.IMPREZJA_APP_PATH;
const devProjectRoot = isDevMode ? __dirname : null;

function devSyncWrite(projectRelPath, srcFilePath) {
    if (!devProjectRoot) return;
    try {
        const dst = path.join(devProjectRoot, projectRelPath);
        const dstDir = path.dirname(dst);
        if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
        fs.copyFileSync(srcFilePath, dst);
        console.log('🔄 Dev-sync +', projectRelPath);
    } catch (e) { console.warn('⚠️ Dev-sync write error:', e.message); }
}
function devSyncWriteData(projectRelPath, data) {
    if (!devProjectRoot) return;
    try {
        const dst = path.join(devProjectRoot, projectRelPath);
        const dstDir = path.dirname(dst);
        if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
        fs.writeFileSync(dst, data, 'utf8');
        console.log('🔄 Dev-sync +', projectRelPath);
    } catch (e) { console.warn('⚠️ Dev-sync write error:', e.message); }
}
function devSyncDelete(projectRelPath) {
    if (!devProjectRoot) return;
    try {
        const dst = path.join(devProjectRoot, projectRelPath);
        if (fs.existsSync(dst)) { fs.unlinkSync(dst); console.log('🔄 Dev-sync -', projectRelPath); }
    } catch (e) { console.warn('⚠️ Dev-sync delete error:', e.message); }
}
function devSyncRename(oldRel, newRel) {
    if (!devProjectRoot) return;
    try {
        const oldDst = path.join(devProjectRoot, oldRel);
        const newDst = path.join(devProjectRoot, newRel);
        if (fs.existsSync(oldDst)) { fs.renameSync(oldDst, newDst); console.log('🔄 Dev-sync rename', oldRel, '->', newRel); }
    } catch (e) { console.warn('⚠️ Dev-sync rename error:', e.message); }
}

const tunnelLogPath = dataDir ? path.join(dataDir, 'tunnel.log') : '';
function appendTunnelLog(line) {
    if (!tunnelLogPath) return;
    try { fs.appendFileSync(tunnelLogPath, (typeof line === 'string' ? line : JSON.stringify(line)) + '\n', 'utf8'); } catch (_) {}
}
function emitTunnelError(socket, payload) {
    const msg = payload.message || 'Błąd tunelu.';
    appendTunnelLog(new Date().toISOString() + ' ' + msg);
    const out = { message: msg, logPath: tunnelLogPath || undefined };
    socket.emit('tunnel_error', out);
    io.to(ADMIN_ROOM).emit('tunnel_error', out);
}

// Przechowywanie aktualnej nazwy sieci WiFi
let currentWiFiSSID = null;
// URL tunelu Pinggy – gdy ustawiony, QR „do gry” prowadzi przez sieć komórkową (zawsze tylko origin, bez ścieżki)
let currentPinggyUrl = null;
// Skrócony URL (TinyURL) i 4-cyfrowy kod sesji — alternatywa dla skanera QR
let currentShortUrl = null;
let currentSessionCode = null;

function generateSessionCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
}
async function shortenUrl(longUrl) {
    // Próbuje kolejno: is.gd, tinyurl — pierwszy który odpowie wygrywa
    const services = [
        { url: 'https://is.gd/create.php?format=simple&url=' + encodeURIComponent(longUrl), validate: u => u.startsWith('https://is.gd/') },
        { url: 'https://tinyurl.com/api-create.php?url=' + encodeURIComponent(longUrl), validate: u => u.startsWith('https://tinyurl.com/') },
    ];
    for (const svc of services) {
        try {
            const result = await new Promise((resolve) => {
                const req = require('https').get(svc.url, (res) => {
                    let data = '';
                    res.on('data', c => data += c);
                    res.on('end', () => {
                        const u = data.trim();
                        resolve(svc.validate(u) ? u : null);
                    });
                });
                req.on('error', () => resolve(null));
                req.setTimeout(6000, () => { req.destroy(); resolve(null); });
            });
            if (result) { console.log('✂️ Skrócony URL:', result); return result; }
        } catch (_) {}
    }
    return null;
}

/** Normalizuje URL tunelu: tylko origin, https; odrzuca dashboard i localhost. Pinggy (Mac) i Tunnelmole (Windows). */
function normalizePinggyUrl(input) {
    if (typeof input !== 'string' || !input.trim()) return null;
    let s = input.trim().replace(/\/$/, '').replace(/#.*$/, '');
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    try {
        const u = new URL(s);
        const origin = u.origin;
        if (/dashboard|localhost|127\.0\.0\.1/i.test(origin)) return null;
        const host = origin.replace(/^https?:\/\//i, '');
        const isPinggy = /\.(a\.)?(free\.)?pinggy\.(io|link)$/i.test(host) || host.endsWith('.pinggy.io') || host.endsWith('.pinggy.link');
        const isTunnelmole = /\.tunnelmole\.(net|com)$/i.test(host);
        const isLocaltunnel = /\.(localtunnel\.(me|app)|loca\.lt)$/i.test(host);
        const isCloudflare = /\.trycloudflare\.com$/i.test(host);
        if (!isPinggy && !isTunnelmole && !isLocaltunnel && !isCloudflare) return null;
        return origin.toLowerCase().startsWith('https://') ? origin : ('https://' + host);
    } catch (_) {
        return null;
    }
}
// Proces SSH tunelu Pinggy
let tunnelProcess = null;
// Czy pokazywać na ekranie QR do gry w sieci lokalnej (Wi‑Fi)
let showLocalGameQR = false;
// Czy panel admina został już otwarty (np. z telefonu) – wtedy ukrywamy QR do admina na ekranie
let adminHasBeenOpened = false;
// Pokój Socket.IO dla admina – priorytet przy broadcast (aktualizacje od razu, bez throttle)
const ADMIN_ROOM = 'admin_room';

// Screen controller – stan ekranu głównego (sterowany z Admin PWA)
let screenControllerMode = 'welcome';
let welcomeScreenData = { imageUrl: '', text: '', logoVisible: true, textPosition: 'center', fontSize: 'medium', textColor: '#ffffff' };
let musicModeGraphicUrl = '';

// Prezentacja – stan odtwarzania
let prezentacjaConfig = null;      // { name, slides, transition, loop }
let prezentacjaIndex = 0;
let prezentacjaPlaying = false;
let prezentacjaLoop = true;
const PREZENTACJE_LAST_FILE = path.join(path.dirname(quizzesDir), 'prezentacje-last.json');

// Model miksera: Master (globalny mnożnik) + kanały (per-tryb). Wyjście = kanał × master.
// Kanały zapamiętywane – ostatnie ustawienie przywracane przy starcie trybu.
let masterVolume = 1;
let quizVolume = 1;
let familiadaVolume = 1;
let statkiVolume = 1;
let prezentacjaVolume = 1;
// njrSamplerVolume, whitneyVolume, spiewajDalejVolume, bitwaWokalnaVolume, imprezatorVolume – poniżej

function loadVolumes() {
    try {
        if (fs.existsSync(VOLUMES_FILE)) {
            const raw = fs.readFileSync(VOLUMES_FILE, 'utf8');
            const v = JSON.parse(raw);
            if (typeof v.master === 'number') masterVolume = Math.max(0, Math.min(1, v.master));
            if (typeof v.quiz === 'number') quizVolume = Math.max(0, Math.min(1, v.quiz));
            if (typeof v.familiada === 'number') familiadaVolume = Math.max(0, Math.min(1, v.familiada));
            if (typeof v.statki === 'number') statkiVolume = Math.max(0, Math.min(1, v.statki));
            if (typeof v.prezentacja === 'number') prezentacjaVolume = Math.max(0, Math.min(1, v.prezentacja));
            if (typeof v.sampler === 'number') njrSamplerVolume = Math.max(0, Math.min(1, v.sampler));
            if (typeof v.whitney === 'number') whitneyVolume = Math.max(0, Math.min(1, v.whitney));
            if (typeof v.spiewaj === 'number') spiewajDalejVolume = Math.max(0, Math.min(1, v.spiewaj));
            if (typeof v.bitwa === 'number') bitwaWokalnaVolume = Math.max(0, Math.min(1, v.bitwa));
            if (typeof v.imprezator === 'number') imprezatorVolume = Math.max(0, Math.min(1, v.imprezator));
            console.log('   🔊 Głośności załadowane z', VOLUMES_FILE);
        }
    } catch (e) { console.warn('⚠️ loadVolumes:', e.message); }
}
function saveVolumes() {
    try {
        const dir = path.dirname(VOLUMES_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(VOLUMES_FILE, JSON.stringify({
            master: masterVolume, quiz: quizVolume, familiada: familiadaVolume, statki: statkiVolume,
            prezentacja: prezentacjaVolume, sampler: njrSamplerVolume, whitney: whitneyVolume,
            spiewaj: spiewajDalejVolume, bitwa: bitwaWokalnaVolume, imprezator: imprezatorVolume
        }, null, 2), 'utf8');
    } catch (e) { console.warn('⚠️ saveVolumes:', e.message); }
}
function broadcastEffectiveVolumes() {
    io.emit('quiz_volume', { volume: quizVolume });
    io.to('familiada').emit('familiada_volume', familiadaVolume);
    io.emit('ships_solo_volume', { volume: statkiVolume });
    io.emit('prezentacja_volume', { volume: prezentacjaVolume });
    const eff = (ch) => Math.min(1, ch * masterVolume);
    io.to('njr_sampler_screen').emit('njr_sampler_volume', eff(njrSamplerVolume));
    io.to('njr_sampler_phone').emit('njr_sampler_volume_sync', njrSamplerVolume);
    io.to('whitney_screen').emit('whitney_volume', eff(whitneyVolume));
    io.to('whitney_phone').emit('whitney_volume_sync', whitneyVolume);
    io.to('spiewaj_dalej_screen').emit('spiewaj_dalej_volume', eff(spiewajDalejVolume));
    io.to('spiewaj_dalej_phone').emit('spiewaj_dalej_volume_sync', spiewajDalejVolume);
    io.to('bitwa_wokalna_screen').emit('bitwa_wokalna_volume', eff(bitwaWokalnaVolume));
    io.to('bitwa_wokalna_phone').emit('bitwa_wokalna_volume_sync', bitwaWokalnaVolume);
    io.to('imprezator_screen').emit('imprezator_volume', eff(imprezatorVolume));
    io.to('imprezator_phone').emit('imprezator_volume_sync', imprezatorVolume);
}

// Tryb gry: null | 'quiz' | 'familiada' – gdy 'familiada', wstrzymujemy broadcast do telefonów
let gameMode = null;
// Stan Familiady
let familiadaQuestions = [];
let familiadaTeam1Score = 0;
let familiadaTeam2Score = 0;
let familiadaTeam1Name = 'Niebiescy';
let familiadaTeam2Name = 'Czerwoni';
let familiadaRoundAwardedTo = null;
let familiadaShowStartScreenOnConnect = false;
let familiadaButtonUsedThisRound = false;
let familiadaQuestionActive = false;
let familiadaCurrentQuestionIndex = null;
let familiadaCurrentGoldenIndex = null;
const FAMILIADA_DATA_FILE = 'familiada-data.json';
const familiadaDataPath = path.join(path.dirname(quizzesDir), FAMILIADA_DATA_FILE);
const familiadaDir = path.join(path.dirname(quizzesDir), 'familiada');
const FAMILIADA_GOLDEN_FILE = 'familiada-golden.json';
const familiadaGoldenPath = path.join(familiadaDir, FAMILIADA_GOLDEN_FILE);
let familiadaGoldenQuestions = [];

const GOLDEN_LIST_DEFAULT = [
    { question: 'Co zabieramy ze sobą do szkoły?', answers: [{ text: 'Plecak', points: 40 }, { text: 'Książki', points: 20 }, { text: 'Kanapki', points: 20 }, { text: 'Zeszyty', points: 10 }] },
    { question: 'Podaj tytuły kultowych polskich komedii', answers: [{ text: 'Sami Swoi', points: 30 }, { text: 'Seksmisja', points: 24 }, { text: 'Miś', points: 20 }] },
    { question: 'Europejskie państwo większe od Polski', answers: [{ text: 'Niemcy', points: 31 }, { text: 'Francja', points: 29 }, { text: 'Wielka Brytania', points: 18 }] }
];

function loadFamiliadaGoldenData() {
    try {
        const appPathForGolden = process.env.IMPREZJA_APP_PATH || __dirname;
        const publicGolden = path.join(appPathForGolden, 'public', 'familiada', FAMILIADA_GOLDEN_FILE);
        if (fs.existsSync(familiadaGoldenPath)) {
            const raw = fs.readFileSync(familiadaGoldenPath, 'utf8');
            familiadaGoldenQuestions = JSON.parse(raw);
            if (!Array.isArray(familiadaGoldenQuestions)) familiadaGoldenQuestions = [];
            familiadaGoldenQuestions = familiadaGoldenQuestions.slice(0, 10);
            console.log(`✅ Familiada Złota Lista: załadowano ${familiadaGoldenQuestions.length} pytań z ${familiadaGoldenPath}`);
        } else if (fs.existsSync(publicGolden)) {
            const raw = fs.readFileSync(publicGolden, 'utf8');
            familiadaGoldenQuestions = JSON.parse(raw);
            if (!Array.isArray(familiadaGoldenQuestions)) familiadaGoldenQuestions = [];
            familiadaGoldenQuestions = familiadaGoldenQuestions.slice(0, 10);
            if (!fs.existsSync(familiadaDir)) fs.mkdirSync(familiadaDir, { recursive: true });
            fs.writeFileSync(familiadaGoldenPath, JSON.stringify(familiadaGoldenQuestions, null, 2), 'utf8');
            console.log(`✅ Familiada Złota Lista: skopiowano ${familiadaGoldenQuestions.length} pytań z public`);
        } else {
            familiadaGoldenQuestions = [...GOLDEN_LIST_DEFAULT];
            if (!fs.existsSync(familiadaDir)) fs.mkdirSync(familiadaDir, { recursive: true });
            fs.writeFileSync(familiadaGoldenPath, JSON.stringify(familiadaGoldenQuestions, null, 2), 'utf8');
            console.log(`✅ Familiada Złota Lista: utworzono z 3 przykładowymi pytaniami`);
        }
    } catch (err) {
        console.warn('⚠️ Familiada Złota Lista: błąd ładowania:', err.message);
        familiadaGoldenQuestions = [...GOLDEN_LIST_DEFAULT];
    }
}
loadFamiliadaGoldenData();

function loadFamiliadaData() {
    try {
        if (fs.existsSync(familiadaDataPath)) {
            const raw = fs.readFileSync(familiadaDataPath, 'utf8');
            familiadaQuestions = JSON.parse(raw);
            console.log(`✅ Familiada: załadowano ${familiadaQuestions.length} pytań`);
        } else {
            const appPathForData = process.env.IMPREZJA_APP_PATH || __dirname;
            const fallback = path.join(appPathForData, 'public', 'familiada', 'data.json');
            if (fs.existsSync(fallback)) {
                familiadaQuestions = JSON.parse(fs.readFileSync(fallback, 'utf8'));
                console.log(`✅ Familiada: załadowano ${familiadaQuestions.length} pytań z data.json`);
            }
        }
    } catch (err) {
        console.warn('⚠️ Familiada: błąd ładowania pytań:', err.message);
    }
}
loadFamiliadaData();

// NJR Sampler i Śpiewaj Dalej – konfiguracje
const NJR_SAMPLER_CONFIGS_DIR = path.join(path.dirname(quizzesDir), 'njr-sampler-configs');
const NJR_SAMPLER_LAST_FILE = path.join(path.dirname(quizzesDir), 'njr-sampler-last.json');
const NJR_SAMPLER_BANK_ASSIGNMENT_FILE = path.join(path.dirname(quizzesDir), 'njr-sampler-bank-assignment.json');
const SPIEWAJ_DALEJ_CONFIGS_DIR = path.join(path.dirname(quizzesDir), 'spiewaj-dalej-configs');
const SPIEWAJ_DALEJ_LAST_FILE = path.join(path.dirname(quizzesDir), 'spiewaj-dalej-last.json');
const BITWA_WOKALNA_CONFIGS_DIR = path.join(path.dirname(quizzesDir), 'bitwa-wokalna-configs');
const BITWA_WOKALNA_LAST_FILE = path.join(path.dirname(quizzesDir), 'bitwa-wokalna-last.json');
const IMPREZATOR_CONFIGS_DIR = path.join(path.dirname(quizzesDir), 'imprezator-configs');
const IMPREZATOR_LAST_FILE = path.join(path.dirname(quizzesDir), 'imprezator-last.json');
const IMPREZATOR_SETTINGS_FILE = path.join(path.dirname(quizzesDir), 'imprezator-settings.json');
const PREZENTACJE_CONFIGS_DIR = path.join(path.dirname(quizzesDir), 'prezentacje');
let njrSamplerConfig = { tileCount: 8, tiles: [] };
let njrSamplerActive = false;
let njrSamplerPlayingTile = null; // one-shot (oklaski itd.)
let njrSamplerPlayingBankIndex = null; // bank aktualnie granego kafelka foreground
let njrSamplerPlayingBackgroundTile = null; // tło muzyczne – gra do wyłączenia lub końca
let njrSamplerPlayingBackgroundBankIndex = null; // bank aktualnie granego kafelka background
let njrSamplerPlayingImprezatorTrack = null; // imprezator track odtwarzany przez sampler
let njrSamplerVolume = 1; // 0–1, master z telefonu
let imprezatorCurrentlyPlaying = false;    // standalone imprezator odtwarza utwór
let audioMonitorLast = null;               // ostatnio odtwarzane: { type, ...data } – dla play-last

// ===== DODATEK WYBORCZY – stan sesji =====
let wyborczySession = null;
let wyborczyVoters = new Set();    // socket.id voterów (vote.html)
let wyborczyVotedThis = new Set(); // socket.id którzy zagłosowali w tej rundzie

// === HOT OR NOT CHAMPION ===
let hncPhotos = [];
let hncBracket = [];      // [{photoA, photoB, winner, votesA, votesB}, ...][]
let hncQuestionText = '';
let hncCurrentRound = 0;
let hncCurrentMatch = 0;
let hncPhase = 'setup';   // 'setup'|'ready'|'voting'|'tiebreak'|'match_result'|'champion'
let hncVoters = new Set();
let hncVotedThis = new Set();
let hncVotesA = new Set();
let hncVotesB = new Set();
let hncTimerInt = null;
let hncVoteGraceTimer = null;
let hncTimeLeft = 0;
let hncMatchTime = 15;

function hncRoundName(roundIndex, totalRounds) {
    const fromEnd = totalRounds - 1 - roundIndex;
    if (fromEnd === 0) return 'FINAŁ';
    if (fromEnd === 1) return 'PÓŁFINAŁ';
    if (fromEnd === 2) return 'ĆWIERĆFINAŁ';
    if (fromEnd === 3) return 'ELIMINACJE';
    return `1/${Math.pow(2, fromEnd)} FINAŁU`;
}

function hncBuildBracket(photos) {
    const shuffled = [...photos].sort(() => Math.random() - 0.5);
    const round0 = [];
    for (let i = 0; i < shuffled.length; i += 2) {
        round0.push({ photoA: shuffled[i], photoB: shuffled[i+1], winner: null, votesA: 0, votesB: 0 });
    }
    hncBracket = [round0];
    let count = shuffled.length / 2;
    while (count > 1) {
        count = Math.ceil(count / 2);
        hncBracket.push(Array.from({length: count}, () => ({ photoA: null, photoB: null, winner: null, votesA: 0, votesB: 0 })));
    }
}

function hncSerializeBracket() {
    const slim = (p) => p ? { id: p.id, url: p.url, desc: p.desc } : null;
    return hncBracket.map(round => round.map(m => ({
        photoA: slim(m.photoA), photoB: slim(m.photoB), winner: slim(m.winner),
        votesA: m.votesA, votesB: m.votesB
    })));
}

function hncGetState() {
    const total = hncBracket.length;
    const m = hncBracket[hncCurrentRound]?.[hncCurrentMatch];
    const completedRoundName = (hncPhase === 'round_complete' && hncCurrentRound > 0)
        ? hncRoundName(hncCurrentRound - 1, total) : null;
    return {
        phase: hncPhase,
        currentRound: hncCurrentRound,
        currentMatch: hncCurrentMatch,
        totalRounds: total,
        matchName: total > 0 ? hncRoundName(hncCurrentRound, total) : '',
        completedRoundName,
        matchesInRound: hncBracket[hncCurrentRound]?.length || 0,
        match: m ? {
            photoA: m.photoA, photoB: m.photoB, winner: m.winner,
            votesA: hncVotesA.size, votesB: hncVotesB.size
        } : null,
        bracket: hncSerializeBracket(),
        timeLeft: hncTimeLeft,
        voterCount: hncVoters.size,
        votedCount: hncVotedThis.size,
        questionText: hncQuestionText
    };
}

function hncBroadcast() { io.emit('hnc_state', hncGetState()); }

function hncStopTimer() {
    if (hncTimerInt) { clearInterval(hncTimerInt); hncTimerInt = null; }
    if (hncVoteGraceTimer) { clearTimeout(hncVoteGraceTimer); hncVoteGraceTimer = null; }
}

function hncEndVoting() {
    hncStopTimer();
    const m = hncBracket[hncCurrentRound]?.[hncCurrentMatch];
    if (!m) return;
    m.votesA = hncVotesA.size;
    m.votesB = hncVotesB.size;
    if (m.votesA === m.votesB) {
        hncPhase = 'tiebreak';
    } else {
        m.winner = m.votesA > m.votesB ? m.photoA : m.photoB;
        hncPhase = 'match_result';
    }
    // Preload next match photos on all clients while result is shown
    const nextM = hncBracket[hncCurrentRound]?.[hncCurrentMatch + 1];
    if (nextM?.photoA && nextM?.photoB) {
        io.emit('hnc_preload', [nextM.photoA.url, nextM.photoB.url]);
    }
    hncBroadcast();
}

function calcAvg(arr) {
    if (!arr || arr.length === 0) return 0;
    return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
}

function buildWyborczyState() {
    if (!wyborczySession) return { phase: 'idle', photos: [], currentIndex: -1, ranking: [], voteSummary: [] };
    const { photos, currentIndex, votes, phase } = wyborczySession;

    const voteSummary = photos.map((p, i) => ({
        index: i, url: p.url, label: p.label,
        avg: calcAvg(votes[i]),
        count: (votes[i] || []).length
    }));

    const ranking = [...voteSummary]
        .filter(p => p.count > 0)
        .sort((a, b) => b.avg - a.avg || b.count - a.count)
        .map((p, rank) => ({ ...p, place: rank + 1 }));

    return {
        phase,
        photos,
        currentIndex,
        total: photos.length,
        photo: currentIndex >= 0 ? photos[currentIndex] : null,
        currentVotes: currentIndex >= 0 ? (votes[currentIndex] || []).length : 0,
        currentAvg: currentIndex >= 0 ? calcAvg(votes[currentIndex]) : 0,
        ranking,
        voteSummary,
        voterCount: wyborczyVoters.size
    };
}

function checkWyborczyAllVoted() {
    if (!wyborczySession || wyborczySession.phase !== 'voting') return;
    if (wyborczyVoters.size === 0) return;
    const allVoted = [...wyborczyVoters].every(id => wyborczyVotedThis.has(id));
    if (allVoted) {
        io.emit('wyborczy_all_voted');
    }
}
// Wyborczy per-photo countdown timer
let wyborczyPhotoTimer = null;
let wyborczyPhotoTimeLeft = 0;

function startWyborczyPhotoTimer(duration) {
    if (wyborczyPhotoTimer) { clearInterval(wyborczyPhotoTimer); wyborczyPhotoTimer = null; }
    if (!duration || duration <= 0) return;
    wyborczyPhotoTimeLeft = duration;
    wyborczyPhotoTimer = setInterval(() => {
        wyborczyPhotoTimeLeft = Math.max(0, wyborczyPhotoTimeLeft - 1);
        io.emit('wyborczy_timer', { timeLeft: wyborczyPhotoTimeLeft, duration });
        if (wyborczyPhotoTimeLeft <= 0) {
            clearInterval(wyborczyPhotoTimer);
            wyborczyPhotoTimer = null;
            io.emit('wyborczy_all_voted'); // czas minął – informuj admina
        }
    }, 1000);
}

function stopWyborczyPhotoTimer() {
    if (wyborczyPhotoTimer) { clearInterval(wyborczyPhotoTimer); wyborczyPhotoTimer = null; }
    wyborczyPhotoTimeLeft = 0;
}

/** Sesja Wyborczego na serwerze + sygnał do TV, by zatrzymać muzykę tła gdy pytanie nie jest już aktywne. */
function stopWyborczyQuestionOnServer() {
    stopWyborczyPhotoTimer();
    wyborczySession = null;
    io.emit('wyborczy_question_media_stop');
}

function getWyborczyTies(ranking) {
    if (!ranking || ranking.length < 2) return [];
    const podiumPlaces = ranking.filter(r => r.place <= 3);
    const ties = [];
    for (let i = 0; i < podiumPlaces.length; i++) {
        for (let j = i + 1; j < podiumPlaces.length; j++) {
            if (podiumPlaces[i].avg === podiumPlaces[j].avg) {
                if (!ties.includes(podiumPlaces[i].index)) ties.push(podiumPlaces[i].index);
                if (!ties.includes(podiumPlaces[j].index)) ties.push(podiumPlaces[j].index);
            }
        }
    }
    return ties;
}
// ===== /DODATEK WYBORCZY =====

function emitAudioMonitorState() {
    const isPlaying = !!(njrSamplerPlayingTile || njrSamplerPlayingBackgroundTile || njrSamplerPlayingImprezatorTrack || imprezatorCurrentlyPlaying);
    io.to('audio_monitor').emit('audio_monitor_state', { isPlaying, hasLast: !!audioMonitorLast });
}

function buildNjrSamplerStateForPhone() {
    const cfg = JSON.parse(JSON.stringify(njrSamplerConfig));
    if (!cfg.banks || !cfg.banks.length) {
        cfg.banks = [{ id: 'b1', name: 'Kafelki', tiles: cfg.tiles || [] }];
    }
    cfg.banks = cfg.banks.filter(b => b.id !== '__imprezator__');
    const tracks = [];
    if (imprezatorConfig && imprezatorConfig.banks && Array.isArray(imprezatorConfig.banks)) {
        for (const b of imprezatorConfig.banks) for (const t of (b.tracks || [])) tracks.push(t);
    } else if (imprezatorConfig) {
        (imprezatorConfig.tracks || []).forEach(t => tracks.push(t));
    }
    if (tracks.length > 0) {
        cfg.banks.push({ id: '__imprezator__', name: '🎵 Imprezator', type: 'imprezator', tracks });
    }
    return cfg;
}

function safeConfigName(name) {
    const s = String(name || '').trim().replace(/[^a-zA-Z0-9_\-\sąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '').replace(/\s+/g, '_');
    return s || 'domyslna';
}

function getNjrSamplerConfigPath(name) {
    return path.join(NJR_SAMPLER_CONFIGS_DIR, safeConfigName(name) + '.json');
}

function loadNjrSamplerConfig() {
    try {
        if (!fs.existsSync(NJR_SAMPLER_CONFIGS_DIR)) fs.mkdirSync(NJR_SAMPLER_CONFIGS_DIR, { recursive: true });
        let toLoad = 'domyslna';
        if (fs.existsSync(NJR_SAMPLER_LAST_FILE)) {
            try {
                const last = JSON.parse(fs.readFileSync(NJR_SAMPLER_LAST_FILE, 'utf8'));
                if (last && last.name) toLoad = last.name;
            } catch (_) {}
        }
        const cfgPath = getNjrSamplerConfigPath(toLoad);
        if (fs.existsSync(cfgPath)) {
            const raw = fs.readFileSync(cfgPath, 'utf8');
            const data = JSON.parse(raw);
            const tileCount = data.tileCount || 8;
            const baseName = (toLoad && typeof toLoad === 'string' ? toLoad.replace(/\.json$/i, '') : '').replace(/_/g, ' ') || 'Kafelki';
            if (data.banks && Array.isArray(data.banks) && data.banks.length > 0) {
                njrSamplerConfig = { tileCount, banks: data.banks };
                njrSamplerConfig.banks.forEach((b, i) => {
                    if (!b.name || /^Bank\s*\d+$/i.test(b.name)) b.name = njrSamplerConfig.banks.length > 1 ? baseName + ' ' + (i + 1) : baseName;
                });
            } else {
                const tiles = data.tiles || [];
                const slice = tiles.slice(0, tileCount);
                for (let i = slice.length; i < tileCount; i++) slice.push({ id: 't' + i, color: '#3498db', label: '', image: '', audio: '', volume: 100, isBackground: false });
                njrSamplerConfig = { tileCount, banks: [{ id: 'b1', name: baseName, tiles: slice }] };
            }
            njrSamplerConfig.banks.forEach(b => {
                if (!b.tiles) b.tiles = [];
                const n = b.tiles.length;
                const tc = njrSamplerConfig.tileCount || 8;
                if (n < tc) { for (let i = n; i < tc; i++) b.tiles.push({ id: 't' + i, color: '#3498db', label: '', image: '', audio: '', volume: 100, isBackground: false }); }
                else if (n > tc) b.tiles = b.tiles.slice(0, tc);
                b.tiles.forEach(t => {
                    if (t.volume == null) t.volume = 100;
                    if (t.isBackground == null) t.isBackground = false;
                    if (t.loop == null) t.loop = false;
                    if (t.fadeOut == null) t.fadeOut = false;
                });
            });
        } else {
            const tiles = [];
            for (let i = 0; i < 8; i++) tiles.push({ id: 't' + i, color: '#3498db', label: '', image: '', audio: '', volume: 100, isBackground: false, loop: false, fadeOut: false });
            njrSamplerConfig = { tileCount: 8, banks: [{ id: 'b1', name: 'Kafelki', tiles }] };
        }
    } catch (err) {
        console.warn('⚠️ NJR Sampler: błąd ładowania config:', err.message);
    }
}

function saveNjrSamplerConfig(name) {
    try {
        const cfgName = name ? safeConfigName(name) : 'domyslna';
        const cfgPath = getNjrSamplerConfigPath(cfgName);
        const data = JSON.stringify(njrSamplerConfig, null, 2);
        fs.writeFileSync(cfgPath, data, 'utf8');
        fs.writeFileSync(NJR_SAMPLER_LAST_FILE, JSON.stringify({ name: cfgName }), 'utf8');
        devSyncWriteData(`public/njr-sampler-configs/${cfgName}.json`, data);
    } catch (err) {
        console.warn('⚠️ NJR Sampler: błąd zapisu config:', err.message);
    }
}

function loadNjrSamplerBankAssignment() {
    try {
        if (fs.existsSync(NJR_SAMPLER_BANK_ASSIGNMENT_FILE)) {
            const raw = fs.readFileSync(NJR_SAMPLER_BANK_ASSIGNMENT_FILE, 'utf8');
            const data = JSON.parse(raw);
            return Array.isArray(data.bankAssignments) && data.bankAssignments.length > 0 ? data.bankAssignments : ['domyslna'];
        }
    } catch (_) {}
    return ['domyslna'];
}

function loadNjrSamplerConfigByName(name) {
    const cfgPath = getNjrSamplerConfigPath(name);
    if (!fs.existsSync(cfgPath)) return null;
    try {
        const data = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        const tileCount = data.tileCount || 8;
        const normalizeTiles = (tiles) => {
            const t = (tiles || []).slice(0, tileCount);
            for (let i = t.length; i < tileCount; i++) {
                t.push({ id: 't' + i, color: '#3498db', label: '', image: '', audio: '', volume: 100, isBackground: false });
            }
            t.forEach(tile => {
                if (tile.volume == null) tile.volume = 100;
                if (tile.isBackground == null) tile.isBackground = false;
                if (tile.loop == null) tile.loop = false;
                if (tile.fadeOut == null) tile.fadeOut = false;
            });
            return t.slice(0, tileCount);
        };
        if (data.banks && Array.isArray(data.banks) && data.banks.length > 0) {
            return { tileCount, banks: data.banks.map((b, idx) => ({
                id: 'b' + (idx + 1),
                name: (!b.name || /^Bank\s*\d+$/i.test(b.name)) ? (data.banks.length > 1 ? name + ' ' + (idx + 1) : name) : b.name,
                tiles: normalizeTiles(b.tiles)
            })) };
        }
        const tiles = normalizeTiles(Array.isArray(data.tiles) ? data.tiles : []);
        return { tileCount, tiles };
    } catch (_) { return null; }
}

function buildNjrSamplerConfigFromBankAssignments(bankAssignments) {
    const banks = [];
    const tc = 8;
    for (let i = 0; i < bankAssignments.length; i++) {
        const name = String(bankAssignments[i] || 'domyslna').trim() || 'domyslna';
        const cfg = loadNjrSamplerConfigByName(name);
        if (cfg && cfg.banks && cfg.banks.length > 0) {
            cfg.banks.forEach((b, j) => {
                banks.push({ id: 'b' + (banks.length + 1), name: b.name, tiles: b.tiles || [] });
            });
        } else if (cfg && cfg.tiles) {
            banks.push({ id: 'b' + (i + 1), name, tiles: cfg.tiles });
        } else {
            const tiles = [];
            for (let k = 0; k < tc; k++) tiles.push({ id: 't' + k, color: '#3498db', label: '', image: '', audio: '', volume: 100, isBackground: false });
            banks.push({ id: 'b' + (i + 1), name, tiles });
        }
    }
    return { tileCount: tc, banks };
}

loadNjrSamplerConfig();

// Whitney – gotowy setup 8 kafelków (bez banków), osobna gra obok Samplera
const WHITNEY_CONFIG_FILE = path.join(path.dirname(quizzesDir), 'whitney-config.json');
// W buildzie (asar) __dirname może nie wskazywać na aplikację – używamy IMPREZJA_APP_PATH (ustawiane przez Electron)
const appRootForDefaults = process.env.IMPREZJA_APP_PATH || __dirname;
const WHITNEY_DEFAULT_PATH = path.join(appRootForDefaults, 'public', 'njr-sampler-configs', 'Whitney.json');
let whitneyConfig = { tileCount: 8, tiles: [] };
let whitneyActive = false;
let whitneyPlayingTile = null;
let whitneyPlayingBackgroundTile = null;
let whitneyVolume = 1;

function loadWhitneyConfig() {
    try {
        if (fs.existsSync(WHITNEY_CONFIG_FILE)) {
            const raw = fs.readFileSync(WHITNEY_CONFIG_FILE, 'utf8');
            const data = JSON.parse(raw);
            const tiles = data.tiles || [];
            const slice = tiles.slice(0, 8);
            for (let i = slice.length; i < 8; i++) slice.push({ id: 't' + i, color: '#3498db', label: '', image: '', audio: '', volume: 100, isBackground: false });
            whitneyConfig = { tileCount: 8, tiles: slice, screenGraphic: data.screenGraphic || '' };
        } else if (fs.existsSync(WHITNEY_DEFAULT_PATH)) {
            const raw = fs.readFileSync(WHITNEY_DEFAULT_PATH, 'utf8');
            const data = JSON.parse(raw);
            const tiles = (data.tiles || []).slice(0, 8);
            for (let i = tiles.length; i < 8; i++) tiles.push({ id: 't' + i, color: '#3498db', label: '', image: '', audio: '', volume: 100, isBackground: false });
            whitneyConfig = { tileCount: 8, tiles, screenGraphic: data.screenGraphic || '' };
            fs.writeFileSync(WHITNEY_CONFIG_FILE, JSON.stringify(whitneyConfig, null, 2), 'utf8');
            console.log('   📋 Whitney: utworzono config z Whitney.json');
        } else {
            const tiles = [];
            for (let i = 0; i < 8; i++) tiles.push({ id: 't' + i, color: '#3498db', label: '', image: '', audio: '', volume: 100, isBackground: false });
            whitneyConfig = { tileCount: 8, tiles, screenGraphic: '' };
        }
        whitneyConfig.tiles.forEach(t => {
            if (t.volume == null) t.volume = 100;
            if (t.isBackground == null) t.isBackground = false;
            if (t.loop == null) t.loop = false;
            if (t.fadeOut == null) t.fadeOut = false;
        });
    } catch (err) {
        console.warn('⚠️ Whitney: błąd ładowania:', err.message);
    }
}

// Stwórz foldery jeśli nie istnieją
if (!fs.existsSync(quizzesDir)) fs.mkdirSync(quizzesDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(familiadaDir)) fs.mkdirSync(familiadaDir, { recursive: true });
if (!fs.existsSync(PREZENTACJE_CONFIGS_DIR)) fs.mkdirSync(PREZENTACJE_CONFIGS_DIR, { recursive: true });
// Wersja aplikacji (z package.json) – przy nowej wersji nadpisujemy configi Śpiewaj Dalej/NJR/Bitwa z builda, żeby build miał te same banki co dev. Aby wymusić odświeżenie bez zmiany wersji, usuń plik .configs-synced-version w katalogu danych.
let appVersionForSync = '';
try {
    const pkgPath = path.join(process.env.IMPREZJA_APP_PATH || __dirname, 'package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        appVersionForSync = (pkg.version || '').trim();
    }
} catch (_) {}
const CONFIGS_SYNCED_VERSION_FILE = dataDir ? path.join(dataDir, '.configs-synced-version') : '';
const shouldSyncConfigsFromApp = dataDir && appVersionForSync && (() => {
    if (!CONFIGS_SYNCED_VERSION_FILE) return true;
    try {
        if (!fs.existsSync(CONFIGS_SYNCED_VERSION_FILE)) return true;
        const last = fs.readFileSync(CONFIGS_SYNCED_VERSION_FILE, 'utf8').trim();
        return last !== appVersionForSync;
    } catch (_) { return true; }
})();

// Przy uruchomieniu z katalogu danych: skopiuj brakujące quizy z aplikacji (także nowe dodane do projektu)
if (dataDir) {
    try {
        const appPathForQuizzes = process.env.IMPREZJA_APP_PATH || __dirname;
        const appQuizzes = path.join(appPathForQuizzes, 'public', 'quizzes');
        if (fs.existsSync(appQuizzes)) {
            const toCopy = fs.readdirSync(appQuizzes).filter(f => f.toLowerCase().endsWith('.json'));
            for (const name of toCopy) {
                const src = path.join(appQuizzes, name);
                const dest = path.join(quizzesDir, name);
                if (!fs.existsSync(dest)) {
                    fs.copyFileSync(src, dest);
                    console.log('   📋 Skopiowano quiz z aplikacji:', name);
                }
            }
        }
        const appPathForCopy = process.env.IMPREZJA_APP_PATH || __dirname;
        const appFamiliada = path.join(appPathForCopy, 'public', 'familiada');
        if (fs.existsSync(appFamiliada) && fs.existsSync(familiadaDir)) {
            const appFiles = fs.readdirSync(appFamiliada).filter(f => f.toLowerCase().endsWith('.json') && f.toLowerCase() !== FAMILIADA_GOLDEN_FILE.toLowerCase());
            for (const name of appFiles) {
                const src = path.join(appFamiliada, name);
                const dest = path.join(familiadaDir, name);
                if (!fs.existsSync(dest)) {
                    fs.copyFileSync(src, dest);
                    console.log('   📋 Skopiowano listę Familiady:', name);
                }
            }
        }
        // Zasada: nie nadpisuj plików użytkownika. Nowe pliki z builda kopiowane tylko jeśli nie istnieją.
        const overwriteConfigs = false; // nigdy nie nadpisujemy – użytkownik jest właścicielem swoich danych
        const appSpiewajDalej = path.join(appPathForCopy, 'public', 'spiewaj-dalej-configs');
        if (fs.existsSync(appSpiewajDalej)) {
            if (!fs.existsSync(SPIEWAJ_DALEJ_CONFIGS_DIR)) fs.mkdirSync(SPIEWAJ_DALEJ_CONFIGS_DIR, { recursive: true });
            const appFiles = fs.readdirSync(appSpiewajDalej).filter(f => f.toLowerCase().endsWith('.json'));
            for (const name of appFiles) {
                const src = path.join(appSpiewajDalej, name);
                const dest = path.join(SPIEWAJ_DALEJ_CONFIGS_DIR, name);
                const missing = !fs.existsSync(dest);
                const refillEmpty = shouldSyncConfigsFromApp && spiewajConfigFileIsEffectivelyEmpty(dest);
                if (missing || refillEmpty) {
                    try {
                        fs.copyFileSync(src, dest);
                        console.log(missing ? '   📋 Skopiowano listę Śpiewaj Dalej (nowy plik):' : '   📋 Uzupełniono pustą konfigurację Śpiewaj Dalej z builda:', name);
                    } catch (e) {
                        console.warn('   ⚠️ Śpiewaj Dalej – nie skopiowano', name, e.message);
                    }
                }
            }
        }
        const appSpiewajLast = path.join(appPathForCopy, 'public', 'spiewaj-dalej-last.json');
        if (fs.existsSync(appSpiewajLast) && !fs.existsSync(SPIEWAJ_DALEJ_LAST_FILE)) {
            try {
                fs.copyFileSync(appSpiewajLast, SPIEWAJ_DALEJ_LAST_FILE);
                console.log('   📋 Skopiowano domyślny wybór banku Śpiewaj Dalej');
            } catch (_) {}
        }
        const appNjrSampler = path.join(appPathForCopy, 'public', 'njr-sampler-configs');
        if (fs.existsSync(appNjrSampler)) {
            if (!fs.existsSync(NJR_SAMPLER_CONFIGS_DIR)) fs.mkdirSync(NJR_SAMPLER_CONFIGS_DIR, { recursive: true });
            const appFiles = fs.readdirSync(appNjrSampler).filter(f => f.toLowerCase().endsWith('.json'));
            for (const name of appFiles) {
                const src = path.join(appNjrSampler, name);
                const dest = path.join(NJR_SAMPLER_CONFIGS_DIR, name);
                if (!fs.existsSync(dest)) {
                    fs.copyFileSync(src, dest);
                    console.log('   📋 Skopiowano konfigurację NJR Sampler (nowy plik):', name);
                }
            }
        }
        const appBitwaWokalna = path.join(appPathForCopy, 'public', 'bitwa-wokalna-configs');
        if (fs.existsSync(appBitwaWokalna)) {
            if (!fs.existsSync(BITWA_WOKALNA_CONFIGS_DIR)) fs.mkdirSync(BITWA_WOKALNA_CONFIGS_DIR, { recursive: true });
            const appFiles = fs.readdirSync(appBitwaWokalna).filter(f => f.toLowerCase().endsWith('.json'));
            for (const name of appFiles) {
                const src = path.join(appBitwaWokalna, name);
                const dest = path.join(BITWA_WOKALNA_CONFIGS_DIR, name);
                if (!fs.existsSync(dest)) {
                    fs.copyFileSync(src, dest);
                    console.log('   📋 Skopiowano listę Bitwy wokalnej (nowy plik):', name);
                }
            }
        }
        const appImprezator = path.join(appPathForCopy, 'public', 'imprezator-configs');
        if (fs.existsSync(appImprezator)) {
            if (!fs.existsSync(IMPREZATOR_CONFIGS_DIR)) fs.mkdirSync(IMPREZATOR_CONFIGS_DIR, { recursive: true });
            const appFiles = fs.readdirSync(appImprezator).filter(f => f.toLowerCase().endsWith('.json'));
            for (const name of appFiles) {
                const src = path.join(appImprezator, name);
                const dest = path.join(IMPREZATOR_CONFIGS_DIR, name);
                if (!fs.existsSync(dest)) {
                    fs.copyFileSync(src, dest);
                    console.log('   📋 Skopiowano listę Imprezator (nowy plik):', name);
                }
            }
        }
        const appPrezentacje = path.join(appPathForCopy, 'public', 'prezentacje');
        if (fs.existsSync(appPrezentacje)) {
            if (!fs.existsSync(PREZENTACJE_CONFIGS_DIR)) fs.mkdirSync(PREZENTACJE_CONFIGS_DIR, { recursive: true });
            const appFiles = fs.readdirSync(appPrezentacje).filter(f => f.toLowerCase().endsWith('.json'));
            for (const name of appFiles) {
                const src = path.join(appPrezentacje, name);
                const dest = path.join(PREZENTACJE_CONFIGS_DIR, name);
                if (!fs.existsSync(dest)) {
                    fs.copyFileSync(src, dest);
                    console.log('   📋 Skopiowano prezentację (nowy plik):', name);
                }
            }
        }
        // Domyślna konfiguracja banków samplerów – tylko jeśli plik jeszcze nie istnieje w danych
        const appDefaultBankAssignment = path.join(appPathForCopy, 'public', 'njr-sampler-bank-assignment.json');
        if (fs.existsSync(appDefaultBankAssignment) && !fs.existsSync(NJR_SAMPLER_BANK_ASSIGNMENT_FILE)) {
            try {
                fs.copyFileSync(appDefaultBankAssignment, NJR_SAMPLER_BANK_ASSIGNMENT_FILE);
                console.log('   📋 Skopiowano domyślne przypisanie banków NJR Sampler');
            } catch (_) {}
        }
        if (shouldSyncConfigsFromApp && CONFIGS_SYNCED_VERSION_FILE && appVersionForSync) {
            try {
                fs.writeFileSync(CONFIGS_SYNCED_VERSION_FILE, appVersionForSync, 'utf8');
                console.log('   📋 Nowa wersja aplikacji:', appVersionForSync, '– dane użytkownika zachowane, dodano tylko nowe pliki');
            } catch (_) {}
        }
        // Gry muzyczne – skopiuj pliki audio z configów z aplikacji do userData/uploads
        const appUploads = path.join(appPathForCopy, 'public', 'uploads');
        if (fs.existsSync(appUploads) && fs.existsSync(uploadsDir)) {
            const configDirs = [
                path.join(appPathForCopy, 'public', 'njr-sampler-configs'),
                path.join(appPathForCopy, 'public', 'spiewaj-dalej-configs'),
                path.join(appPathForCopy, 'public', 'bitwa-wokalna-configs'),
                path.join(appPathForCopy, 'public', 'imprezator-configs')
            ];
            const collected = new Set();
            function addUploadRef(str) {
                if (typeof str !== 'string' || (!str.startsWith('/uploads/') && !str.startsWith('uploads/'))) return;
                const name = path.basename(str.replace(/^\/+/, ''));
                if (name) collected.add(name);
            }
            function extractUploadPaths(obj) {
                if (!obj) return;
                if (Array.isArray(obj)) { obj.forEach(extractUploadPaths); return; }
                if (typeof obj === 'object') {
                    if (typeof obj.audio === 'string') addUploadRef(obj.audio);
                    if (typeof obj.screenGraphic === 'string') addUploadRef(obj.screenGraphic);
                    if (typeof obj.image === 'string') addUploadRef(obj.image);
                    Object.values(obj).forEach(extractUploadPaths);
                }
            }
            for (const dir of configDirs) {
                if (!fs.existsSync(dir)) continue;
                const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.json'));
                for (const name of files) {
                    try {
                        const raw = fs.readFileSync(path.join(dir, name), 'utf8');
                        const data = JSON.parse(raw);
                        extractUploadPaths(data);
                    } catch (_) {}
                }
            }
            for (const fileName of collected) {
                const src = path.join(appUploads, fileName);
                const dest = path.join(uploadsDir, fileName);
                if (fs.existsSync(src) && !fs.existsSync(dest)) {
                    try {
                        fs.copyFileSync(src, dest);
                        console.log('   📋 Skopiowano plik do banków (nowy):', fileName);
                    } catch (e) { console.warn('   ⚠️ Nie skopiowano', fileName, e.message); }
                }
            }
        }
    } catch (err) {
        console.warn('   ⚠️ Nie udało się skopiować plików z aplikacji:', err.message);
    }
}
loadWhitneyConfig();

// Middleware
app.use(express.json());

// === HELPERS: referencje plików w quizach (używane przez REST i socket) ===
function _extractFilePath(url) {
    if (!url) return null;
    const match = url.match(/\/uploads\/([^\/]+)$/);
    if (match) return match[1];
    if (!url.includes('/') && !url.includes('http')) return url;
    return null;
}
function _getThumbnailPath(filePath) {
    if (!filePath) return null;
    return filePath.replace(/\.[^.]+$/, '-thumb.webp');
}
function getAllFilesReferencedByQuizzes(excludeFilename) {
    const used = new Set();

    // --- Quizy ---
    let quizFiles = [];
    try { quizFiles = fs.readdirSync(quizzesDir).filter(f => f.toLowerCase().endsWith('.json')); } catch (_) {}
    for (const qf of quizFiles) {
        if (excludeFilename && qf === excludeFilename) continue;
        try {
            const data = JSON.parse(fs.readFileSync(path.join(quizzesDir, qf), 'utf8'));
            const questions = Array.isArray(data) ? data : (data.questions || []);
            questions.forEach(q => {
                for (const field of ['media', 'image', 'imageSmall', 'audio', 'imageA', 'imageB', 'imageSmallA', 'imageSmallB', 'bgMusic']) {
                    const fp = _extractFilePath(q[field]);
                    if (fp) { used.add(fp); const t = _getThumbnailPath(fp); if (t) used.add(t); }
                }
                if (Array.isArray(q.photos)) {
                    q.photos.forEach(p => {
                        const fp = _extractFilePath(p.url);
                        if (fp) { used.add(fp); const t = _getThumbnailPath(fp); if (t) used.add(t); }
                    });
                }
            });
            if (data.options && data.options.bgMusic) {
                const fp = _extractFilePath(data.options.bgMusic); if (fp) used.add(fp);
            }
        } catch (_) {}
    }

    // --- Inne konfiguracje (sampler, śpiewaj dalej, bitwa wokalna) ---
    const extraDirs = [
        path.join(dataDir, 'njr-sampler-configs'),
        path.join(dataDir, 'spiewaj-dalej-configs'),
        path.join(dataDir, 'bitwa-wokalna-configs'),
    ];
    function addFromStr(str) {
        // Wyciągnij wszystkie ścieżki /uploads/... z JSON stringa
        const matches = str.matchAll(/\/uploads\/([^"'\s,\]\\]+)/g);
        for (const m of matches) { used.add(m[1]); }
        // Pliki bez ścieżki (np. w samplerkonfigach przechowywane jako czysta nazwa)
        const bare = str.matchAll(/"file"\s*:\s*"([^"]+\.(mp3|wav|ogg|vdjsample|flac|aac|m4a|webp|jpg|jpeg|png|gif))"/gi);
        for (const m of bare) { used.add(m[1]); }
    }
    for (const dir of extraDirs) {
        if (!fs.existsSync(dir)) continue;
        try {
            for (const cf of fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.json'))) {
                try { addFromStr(fs.readFileSync(path.join(dir, cf), 'utf8')); } catch (_) {}
            }
        } catch (_) {}
    }

    used.delete(null); used.delete(undefined); used.delete('');
    return used;
}

// DELETE /api/upload/:filename — usuwa plik z uploads jeśli nie jest referencjonowany przez żaden quiz
app.delete('/api/upload/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        if (!filename || filename.includes('..') || filename.includes('/')) {
            return res.status(400).json({ error: 'Nieprawidłowa nazwa pliku' });
        }
        const filePath = path.join(uploadsDir, filename);
        if (!fs.existsSync(filePath)) {
            return res.json({ deleted: false, reason: 'not_found' });
        }
        const usedFiles = getAllFilesReferencedByQuizzes();
        if (usedFiles.has(filename)) {
            return res.json({ deleted: false, reason: 'in_use', usedBy: 'quiz' });
        }
        fs.unlinkSync(filePath);
        removeFileFromIndex(filename);
        devSyncDelete(`public/uploads/${filename}`);
        // Usuń też thumbnail jeśli istnieje i nie jest używany
        const thumbName = _getThumbnailPath(filename);
        if (thumbName && !usedFiles.has(thumbName)) {
            const thumbPath = path.join(uploadsDir, thumbName);
            if (fs.existsSync(thumbPath)) {
                fs.unlinkSync(thumbPath);
                removeFileFromIndex(thumbName);
                devSyncDelete(`public/uploads/${thumbName}`);
            }
        }
        console.log(`🗑️ Usunięto plik z uploads: ${filename}`);
        res.json({ deleted: true, filename, thumbDeleted: !!(thumbName && !usedFiles.has(thumbName)) });
    } catch (err) {
        console.error('❌ Błąd usuwania pliku:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/uploads/orphans — zwraca listę plików niereferensjowanych przez żaden quiz
app.get('/api/uploads/orphans', (req, res) => {
    try {
        const usedFiles = getAllFilesReferencedByQuizzes();
        const allFiles = fs.readdirSync(uploadsDir).filter(f => {
            if (f.startsWith('.')) return false;
            return fs.statSync(path.join(uploadsDir, f)).isFile();
        });
        const orphans = allFiles.filter(f => !usedFiles.has(f));
        const totalSize = orphans.reduce((sum, f) => {
            try { return sum + fs.statSync(path.join(uploadsDir, f)).size; } catch (_) { return sum; }
        }, 0);
        res.json({ orphans, count: orphans.length, totalSize });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/uploads/orphans — usuwa wszystkie osierocone pliki
app.delete('/api/uploads/orphans', (req, res) => {
    try {
        const usedFiles = getAllFilesReferencedByQuizzes();
        const allFiles = fs.readdirSync(uploadsDir).filter(f => {
            if (f.startsWith('.')) return false;
            return fs.statSync(path.join(uploadsDir, f)).isFile();
        });
        const orphans = allFiles.filter(f => !usedFiles.has(f));
        let deleted = [], errors = [];
        for (const f of orphans) {
            try {
                fs.unlinkSync(path.join(uploadsDir, f));
                removeFileFromIndex(f);
                devSyncDelete(`public/uploads/${f}`);
                deleted.push(f);
            } catch (e) { errors.push(f); }
        }
        console.log(`🗑️ Usunięto ${deleted.length} osieroconych plików`);
        res.json({ deleted: deleted.length, errors: errors.length, files: deleted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === UPLOADS LIST (dla Dodatku Wyborczego i innych) ===
app.get('/api/uploads-list', (req, res) => {
    try {
        const imgExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.JPG', '.JPEG', '.PNG', '.WEBP'];
        const dir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(dir)) return res.json({ files: [] });
        const files = fs.readdirSync(dir)
            .filter(f => imgExts.includes(path.extname(f)) && !f.includes('thumb'))
            .sort((a, b) => b.localeCompare(a));
        res.json({ files });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// === ENDPOINTY LICENCJI ===
app.get('/api/license/status', (req, res) => {
    const status = getLicenseStatus();
    res.json(status);
});

app.post('/api/license/activate', (req, res) => {
    const { key } = req.body;
    if (!key) {
        return res.status(400).json({ error: 'Brak klucza licencyjnego' });
    }
    
    const verification = license.verifyLicenseKey(key);
    if (!verification.valid) {
        return res.status(400).json({ error: verification.reason || 'Nieprawidłowy klucz' });
    }
    
    if (license.saveLicenseKey(key)) {
        licenseStatus = getLicenseStatus();
        res.json({ success: true, status: licenseStatus });
    } else {
        res.status(500).json({ error: 'Błąd zapisu licencji' });
    }
});

app.get('/api/license/machine-id', (req, res) => {
    const machineIds = license.getMachineIdAlternatives();
    res.json({
        machineId: machineIds[0],
        machineIds,
    });
});

app.get('/api/admin-pwa-qr', async (req, res) => {
    try {
        const data = await generateAdminPWAQR();
        if (data) res.json(data);
        else res.status(500).json({ error: 'Nie udało się wygenerować QR' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin-status', (req, res) => {
    const room = io.sockets.adapter.rooms.get(ADMIN_ROOM);
    const connected = room ? room.size > 0 : false;
    res.json({ connected });
});

// === API NJR SAMPLER ===
app.get('/api/njr-sampler/configs', (req, res) => {
    try {
        if (!fs.existsSync(NJR_SAMPLER_CONFIGS_DIR)) {
            return res.json({ configs: [], current: 'domyslna' });
        }
        const files = fs.readdirSync(NJR_SAMPLER_CONFIGS_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace(/\.json$/, ''));
        let current = 'domyslna';
        if (fs.existsSync(NJR_SAMPLER_LAST_FILE)) {
            try {
                const last = JSON.parse(fs.readFileSync(NJR_SAMPLER_LAST_FILE, 'utf8'));
                if (last && last.name && files.includes(last.name)) current = last.name;
            } catch (_) {}
        }
        res.json({ configs: files.sort(), current });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/njr-sampler/config', (req, res) => {
    const name = req.query.name;
    if (name) {
        const cfgPath = getNjrSamplerConfigPath(name);
        if (fs.existsSync(cfgPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
                const tileCount = data.tileCount || 8;
                if (data.banks && Array.isArray(data.banks) && data.banks.length > 0) {
                    njrSamplerConfig = { tileCount, banks: data.banks };
                } else {
                    const tiles = data.tiles || [];
                    const slice = tiles.slice(0, tileCount);
                    for (let i = slice.length; i < tileCount; i++) slice.push({ id: 't' + i, color: '#3498db', label: '', image: '', audio: '', volume: 100, isBackground: false });
                    njrSamplerConfig = { tileCount, banks: [{ id: 'b1', name: 'Kafelki', tiles: slice }] };
                }
                fs.writeFileSync(NJR_SAMPLER_LAST_FILE, JSON.stringify({ name: safeConfigName(name) }), 'utf8');
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        }
    }
    res.json({ config: njrSamplerConfig, active: njrSamplerActive });
});

app.post('/api/njr-sampler/config', (req, res) => {
    const { config, name } = req.body || {};
    if (!config || typeof config.tileCount !== 'number') return res.status(400).json({ error: 'Nieprawidłowa konfiguracja' });
    if (config.banks && Array.isArray(config.banks) && config.banks.length > 0) {
        njrSamplerConfig = config;
    } else if (Array.isArray(config.tiles)) {
        njrSamplerConfig = { tileCount: config.tileCount, banks: [{ id: 'b1', name: 'Kafelki', tiles: config.tiles }] };
    } else return res.status(400).json({ error: 'Nieprawidłowa konfiguracja' });
    saveNjrSamplerConfig(name);
    res.json({ success: true });
});

app.patch('/api/njr-sampler/config', (req, res) => {
    const { oldName, newName, config: bodyConfig } = req.body || {};
    if (!oldName || !newName) return res.status(400).json({ error: 'Brak oldName lub newName' });
    const safeNew = safeConfigName(newName);
    if (!safeNew) return res.status(400).json({ error: 'Nieprawidłowa nazwa' });
    const oldPath = getNjrSamplerConfigPath(oldName);
    const newPath = getNjrSamplerConfigPath(newName);
    if (fs.existsSync(newPath) && newPath !== oldPath) return res.status(400).json({ error: 'Konfiguracja o tej nazwie już istnieje' });
    try {
        if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
            devSyncRename(`public/njr-sampler-configs/${safeConfigName(oldName)}.json`, `public/njr-sampler-configs/${safeNew}.json`);
        } else {
            if (!fs.existsSync(NJR_SAMPLER_CONFIGS_DIR)) fs.mkdirSync(NJR_SAMPLER_CONFIGS_DIR, { recursive: true });
            const hasBanks = bodyConfig && bodyConfig.banks && Array.isArray(bodyConfig.banks) && bodyConfig.banks.length > 0;
            const hasTiles = bodyConfig && Array.isArray(bodyConfig.tiles);
            const cfgToSave = (bodyConfig && typeof bodyConfig.tileCount === 'number' && (hasBanks || hasTiles))
                ? (hasBanks ? bodyConfig : { tileCount: bodyConfig.tileCount, banks: [{ id: 'b1', name: 'Kafelki', tiles: bodyConfig.tiles }] })
                : njrSamplerConfig;
            const cfgData = JSON.stringify(cfgToSave, null, 2);
            fs.writeFileSync(newPath, cfgData, 'utf8');
            devSyncWriteData(`public/njr-sampler-configs/${safeNew}.json`, cfgData);
        }
        try {
            fs.writeFileSync(NJR_SAMPLER_LAST_FILE, JSON.stringify({ name: safeConfigName(newName) }), 'utf8');
        } catch (_) {}
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/njr-sampler/config', (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Brak nazwy' });
    const cfgPath = getNjrSamplerConfigPath(name);
    if (fs.existsSync(cfgPath)) {
        try {
            fs.unlinkSync(cfgPath);
            devSyncDelete(`public/njr-sampler-configs/${safeConfigName(name)}.json`);
            let current = 'domyslna';
            if (fs.existsSync(NJR_SAMPLER_LAST_FILE)) {
                try {
                    const last = JSON.parse(fs.readFileSync(NJR_SAMPLER_LAST_FILE, 'utf8'));
                    if (last && last.name === safeConfigName(name)) {
                        fs.writeFileSync(NJR_SAMPLER_LAST_FILE, JSON.stringify({ name: 'domyslna' }), 'utf8');
                        loadNjrSamplerConfig();
                    }
                } catch (_) {}
            }
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    } else {
        res.status(404).json({ error: 'Nie znaleziono' });
    }
});

app.get('/api/njr-sampler/audio-files', (req, res) => {
    try {
        const q = (req.query.q || '').toLowerCase().trim();
        const exts = ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac', '.vdjsample'];
        const files = [];
        const dirs = [uploadsDir, path.join(__dirname, 'public', 'uploads')];
        if (vdjRecordingsBank) dirs.push(vdjRecordingsBank);
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) continue;
            try {
                for (const f of fs.readdirSync(dir)) {
                    const ext = path.extname(f).toLowerCase();
                    if (!exts.includes(ext)) continue;
                    const name = f.toLowerCase();
                    if (q && !name.includes(q)) continue;
                    const filepath = '/uploads/' + f;
                    if (!files.some(x => x.path === filepath)) {
                        files.push({ path: filepath, name: f });
                    }
                }
            } catch (_) {}
        }
        files.sort((a, b) => a.name.localeCompare(b.name));
        res.json({ files: files.slice(0, 100) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Tylko jedna gra muzyczna aktywna naraz – przy starcie jednej zatrzymaj pozostałe
function stopOtherMusicGames(except) {
    // NJR Sampler i Imprezator grają niezależnie – nie przerywamy ich przy starcie innych trybów
    if (except !== 'whitney' && whitneyActive) {
        whitneyActive = false;
        whitneyPlayingTile = null;
        whitneyPlayingBackgroundTile = null;
        io.to('whitney_screen').emit('whitney_state', { active: false });
        io.to('whitney_phone').emit('whitney_state', { active: false });
        io.to('whitney_screen').emit('whitney_stop');
    }
    if (except !== 'spiewaj' && spiewajDalejActive) {
        spiewajDalejActive = false;
        spiewajDalejUsedIds.clear();
        io.to('spiewaj_dalej_screen').emit('spiewaj_dalej_state', { active: false });
        io.to('spiewaj_dalej_phone').emit('spiewaj_dalej_state', { active: false });
        io.to('spiewaj_dalej_screen').emit('spiewaj_dalej_stop');
    }
    if (except !== 'bitwa' && bitwaWokalnaActive) {
        bitwaWokalnaActive = false;
        bitwaWokalnaUsedIds.clear();
        io.to('bitwa_wokalna_screen').emit('bitwa_wokalna_state', { active: false });
        io.to('bitwa_wokalna_phone').emit('bitwa_wokalna_state', { active: false });
        io.to('bitwa_wokalna_screen').emit('bitwa_wokalna_stop');
    }
}

app.post('/api/njr-sampler/start', (req, res) => {
    stopOtherMusicGames('njr');
    const { bankAssignments } = req.body || {};
    let toUse = [];
    if (Array.isArray(bankAssignments) && bankAssignments.length > 0) {
        toUse = bankAssignments;
        try {
            const dir = path.dirname(NJR_SAMPLER_BANK_ASSIGNMENT_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(NJR_SAMPLER_BANK_ASSIGNMENT_FILE, JSON.stringify({ bankAssignments: toUse }, null, 2), 'utf8');
        } catch (err) { console.warn('NJR Sampler: nie udało się zapisać bank-assignment:', err.message); }
    } else {
        toUse = loadNjrSamplerBankAssignment();
    }
    if (toUse.length > 0) {
        njrSamplerConfig = buildNjrSamplerConfigFromBankAssignments(toUse);
    }
    njrSamplerActive = true;
    njrSamplerPlayingTile = null;
    njrSamplerPlayingBankIndex = null;
    njrSamplerPlayingBackgroundTile = null;
    njrSamplerPlayingBackgroundBankIndex = null;
    njrSamplerPlayingImprezatorTrack = null;
    io.to('njr_sampler_screen').emit('njr_sampler_state', { active: true, config: njrSamplerConfig });
    io.to('njr_sampler_phone').emit('njr_sampler_state', { active: true, config: buildNjrSamplerStateForPhone() });
    res.json({ success: true });
});
app.post('/api/njr-sampler/stop', (req, res) => {
    njrSamplerActive = false;
    njrSamplerPlayingTile = null;
    njrSamplerPlayingBankIndex = null;
    njrSamplerPlayingBackgroundTile = null;
    njrSamplerPlayingBackgroundBankIndex = null;
    io.to('njr_sampler_screen').emit('njr_sampler_state', { active: false });
    io.to('njr_sampler_phone').emit('njr_sampler_state', { active: false });
    io.to('njr_sampler_screen').emit('njr_sampler_stop');
    res.json({ success: true });
});
app.get('/api/njr-sampler/phone-qr', async (req, res) => {
    try {
        const mode = (req.query.mode || '').toLowerCase();
        let baseUrl;
        if (mode === 'local') {
            baseUrl = httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`;
        } else if (mode === 'pinggy') {
            const pinggyOrigin = currentPinggyUrl
                ? (normalizePinggyUrl(currentPinggyUrl) || (() => { try { return new URL(currentPinggyUrl).origin; } catch (_) { return currentPinggyUrl.replace(/\/$/, '').replace(/\/[^/].*$/, ''); } })())
                : null;
            if (!pinggyOrigin) {
                return res.status(400).json({ error: 'Tunel Pinggy nie jest uruchomiony. Uruchom tunel w panelu admina (Imprezja Quiz → Admin → Tunel Pinggy).' });
            }
            baseUrl = pinggyOrigin;
        } else {
            baseUrl = currentPinggyUrl
                ? (normalizePinggyUrl(currentPinggyUrl) || (() => { try { return new URL(currentPinggyUrl).origin; } catch (_) { return currentPinggyUrl.replace(/\/$/, '').replace(/\/[^/].*$/, ''); } })())
                : (httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`);
        }
        const phoneUrl = `${baseUrl.replace(/\/$/, '')}/njr-sampler/phone.html`;
        const qrCode = await QRCode.toDataURL(phoneUrl, { width: 280, margin: 2 });
        res.json({ url: phoneUrl, qrCode, mode: mode || (currentPinggyUrl ? 'pinggy' : 'local') });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/njr-sampler/connection-info', (req, res) => {
    res.json({
        pinggyAvailable: !!currentPinggyUrl,
        localUrl: (httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`) + '/njr-sampler/phone.html'
    });
});

app.get('/api/njr-sampler/bank-assignment', (req, res) => {
    try {
        const bankAssignments = loadNjrSamplerBankAssignment();
        res.json({ bankAssignments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/njr-sampler/bank-assignment', (req, res) => {
    const { bankAssignments } = req.body || {};
    if (!Array.isArray(bankAssignments) || bankAssignments.length === 0) {
        return res.status(400).json({ error: 'bankAssignments musi być niepustą tablicą' });
    }
    try {
        const dir = path.dirname(NJR_SAMPLER_BANK_ASSIGNMENT_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(NJR_SAMPLER_BANK_ASSIGNMENT_FILE, JSON.stringify({ bankAssignments }, null, 2), 'utf8');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === WHITNEY – gotowy setup 8 kafelków ===
app.get('/api/whitney/config', (req, res) => {
    loadWhitneyConfig();
    res.json({ config: whitneyConfig });
});
app.post('/api/whitney/config', (req, res) => {
    try {
        const data = req.body;
        const tiles = (data.config && data.config.tiles) || [];
        const slice = tiles.slice(0, 8);
        for (let i = slice.length; i < 8; i++) slice.push({ id: 't' + i, color: '#3498db', label: '', image: '', audio: '', volume: 100, isBackground: false });
        whitneyConfig = { tileCount: 8, tiles: slice, screenGraphic: (whitneyConfig && whitneyConfig.screenGraphic) || (data.config && data.config.screenGraphic) || '' };
        const whitneyData = JSON.stringify(whitneyConfig, null, 2);
        fs.writeFileSync(WHITNEY_CONFIG_FILE, whitneyData, 'utf8');
        devSyncWriteData('public/njr-sampler-configs/Whitney.json', whitneyData);
        if (whitneyActive) {
            io.to('whitney_screen').emit('whitney_state', { active: true, config: whitneyConfig });
            io.to('whitney_phone').emit('whitney_state', { active: true, config: whitneyConfig });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/whitney/start', (req, res) => {
    stopOtherMusicGames('whitney');
    whitneyActive = true;
    whitneyPlayingTile = null;
    whitneyPlayingBackgroundTile = null;
    io.to('whitney_screen').emit('whitney_state', { active: true, config: whitneyConfig });
    io.to('whitney_phone').emit('whitney_state', { active: true, config: whitneyConfig });
    res.json({ success: true });
});
app.post('/api/whitney/stop', (req, res) => {
    whitneyActive = false;
    whitneyPlayingTile = null;
    whitneyPlayingBackgroundTile = null;
    io.to('whitney_screen').emit('whitney_state', { active: false });
    io.to('whitney_phone').emit('whitney_state', { active: false });
    io.to('whitney_screen').emit('whitney_stop');
    res.json({ success: true });
});
app.get('/api/whitney/screen-graphic', (req, res) => {
    const url = (whitneyConfig && whitneyConfig.screenGraphic) || '';
    res.json({ screenGraphic: url });
});
app.patch('/api/whitney/screen-graphic', (req, res) => {
    const url = (req.body && typeof req.body.screenGraphic === 'string') ? req.body.screenGraphic.trim() : '';
    if (!whitneyConfig) whitneyConfig = { tileCount: 8, tiles: [] };
    whitneyConfig.screenGraphic = url || '';
    try {
        const whitneyData = JSON.stringify(whitneyConfig, null, 2);
        fs.writeFileSync(WHITNEY_CONFIG_FILE, whitneyData, 'utf8');
        devSyncWriteData('public/njr-sampler-configs/Whitney.json', whitneyData);
        res.json({ success: true, screenGraphic: url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/whitney/connection-info', (req, res) => {
    res.json({
        pinggyAvailable: !!currentPinggyUrl,
        localUrl: (httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`) + '/whitney/phone.html'
    });
});
app.get('/api/whitney/phone-qr', async (req, res) => {
    try {
        const mode = (req.query.mode || '').toLowerCase();
        let baseUrl;
        if (mode === 'local') {
            baseUrl = httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`;
        } else if (mode === 'pinggy') {
            const pinggyOrigin = currentPinggyUrl ? (normalizePinggyUrl(currentPinggyUrl) || (() => { try { return new URL(currentPinggyUrl).origin; } catch (_) { return currentPinggyUrl.replace(/\/$/, '').replace(/\/[^/].*$/, ''); } })()) : null;
            if (!pinggyOrigin) return res.status(400).json({ error: 'Tunel Pinggy nie jest uruchomiony.' });
            baseUrl = pinggyOrigin;
        } else {
            baseUrl = currentPinggyUrl ? (normalizePinggyUrl(currentPinggyUrl) || (() => { try { return new URL(currentPinggyUrl).origin; } catch (_) { return currentPinggyUrl.replace(/\/$/, '').replace(/\/[^/].*$/, ''); } })()) : (httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`);
        }
        const phoneUrl = `${baseUrl.replace(/\/$/, '')}/whitney/phone.html`;
        const qrCode = await QRCode.toDataURL(phoneUrl, { width: 280, margin: 2 });
        res.json({ url: phoneUrl, qrCode, mode: mode || (currentPinggyUrl ? 'pinggy' : 'local') });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/whitney/audio-files', (req, res) => {
    try {
        const q = (req.query.q || '').toLowerCase().trim();
        const exts = ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac', '.vdjsample'];
        const files = [];
        for (const dir of [uploadsDir, path.join(__dirname, 'public', 'uploads'), vdjRecordingsBank]) {
            if (!fs.existsSync(dir)) continue;
            try {
                for (const f of fs.readdirSync(dir)) {
                    const ext = path.extname(f).toLowerCase();
                    if (!exts.includes(ext)) continue;
                    const name = f.toLowerCase();
                    if (q && !name.includes(q)) continue;
                    const filepath = '/uploads/' + f;
                    if (!files.some(x => x.path === filepath)) files.push({ path: filepath, name: f });
                }
            } catch (_) {}
        }
        files.sort((a, b) => a.name.localeCompare(b.name));
        res.json({ files: files.slice(0, 100) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === ŚPIEWAJ DALEJ – listy fragmentów muzycznych ===
let spiewajDalejConfig = { tracks: [] };
let spiewajDalejActive = false;
let spiewajDalejVolume = 1;
let spiewajDalejUsedIds = new Set();

/** Czy plik konfiguracji Śpiewaj Dalej nie zawiera żadnych utworów (pusty bank / uszkodzony JSON). */
function spiewajConfigFileIsEffectivelyEmpty(filePath) {
    try {
        if (!fs.existsSync(filePath)) return true;
        if (fs.statSync(filePath).size < 30) return true;
        const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (d.banks && Array.isArray(d.banks)) {
            const n = d.banks.reduce((acc, b) => acc + (Array.isArray(b.tracks) ? b.tracks.length : 0), 0);
            return n === 0;
        }
        return !Array.isArray(d.tracks) || d.tracks.length === 0;
    } catch (_) {
        return true;
    }
}

function getSpiewajDalejConfigPath(name) {
    return path.join(SPIEWAJ_DALEJ_CONFIGS_DIR, safeConfigName(name) + '.json');
}

app.get('/api/spiewaj-dalej/configs', (req, res) => {
    try {
        if (!fs.existsSync(SPIEWAJ_DALEJ_CONFIGS_DIR)) {
            return res.json({ configs: [], current: 'domyslna' });
        }
        const files = fs.readdirSync(SPIEWAJ_DALEJ_CONFIGS_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace(/\.json$/, ''));
        const configs = [...new Set(['domyslna', ...files])].sort();
        let current = 'domyslna';
        if (fs.existsSync(SPIEWAJ_DALEJ_LAST_FILE)) {
            try {
                const last = JSON.parse(fs.readFileSync(SPIEWAJ_DALEJ_LAST_FILE, 'utf8'));
                if (last && last.name && configs.includes(last.name)) current = last.name;
            } catch (_) {}
        }
        res.json({ configs, current });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/spiewaj-dalej/config', (req, res) => {
    const name = req.query.name;
    if (name) {
        const cfgPath = getSpiewajDalejConfigPath(name);
        if (fs.existsSync(cfgPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
                spiewajDalejConfig = data.banks ? data : { tracks: data.tracks || [], screenGraphic: data.screenGraphic };
                fs.writeFileSync(SPIEWAJ_DALEJ_LAST_FILE, JSON.stringify({ name: safeConfigName(name) }), 'utf8');
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        }
    }
    res.json({ config: spiewajDalejConfig, active: spiewajDalejActive });
});

app.post('/api/spiewaj-dalej/config', (req, res) => {
    const { config, name } = req.body || {};
    const hasTracks = config && Array.isArray(config.tracks);
    const hasBanks = config && Array.isArray(config.banks) && config.banks.length > 0;
    if (config && (hasTracks || hasBanks)) {
        spiewajDalejConfig = config;
        const cfgName = name ? safeConfigName(name) : 'domyslna';
        if (!fs.existsSync(SPIEWAJ_DALEJ_CONFIGS_DIR)) fs.mkdirSync(SPIEWAJ_DALEJ_CONFIGS_DIR, { recursive: true });
        const sdData = JSON.stringify(spiewajDalejConfig, null, 2);
        fs.writeFileSync(getSpiewajDalejConfigPath(cfgName), sdData, 'utf8');
        fs.writeFileSync(SPIEWAJ_DALEJ_LAST_FILE, JSON.stringify({ name: cfgName }), 'utf8');
        devSyncWriteData(`public/spiewaj-dalej-configs/${cfgName}.json`, sdData);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Nieprawidłowa konfiguracja' });
    }
});

app.get('/api/spiewaj-dalej/audio-files', (req, res) => {
    try {
        const q = (req.query.q || '').toLowerCase().trim();
        const exts = ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac', '.vdjsample'];
        const files = [];
        const dirs = [uploadsDir, path.join(__dirname, 'public', 'uploads')];
        if (vdjRecordingsBank) dirs.push(vdjRecordingsBank);
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) continue;
            try {
                for (const f of fs.readdirSync(dir)) {
                    const ext = path.extname(f).toLowerCase();
                    if (!exts.includes(ext)) continue;
                    const name = f.toLowerCase();
                    if (q && !name.includes(q)) continue;
                    const filepath = '/uploads/' + f;
                    if (!files.some(x => x.path === filepath)) files.push({ path: filepath, name: f });
                }
            } catch (_) {}
        }
        files.sort((a, b) => a.name.localeCompare(b.name));
        res.json({ files: files.slice(0, 100) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/spiewaj-dalej/start', (req, res) => {
    stopOtherMusicGames('spiewaj');
    spiewajDalejActive = true;
    spiewajDalejUsedIds.clear();
    io.to('spiewaj_dalej_screen').emit('spiewaj_dalej_state', { active: true, config: spiewajDalejConfig });
    io.to('spiewaj_dalej_phone').emit('spiewaj_dalej_state', { active: true, config: spiewajDalejConfig });
    res.json({ success: true });
});

app.post('/api/spiewaj-dalej/stop', (req, res) => {
    spiewajDalejActive = false;
    spiewajDalejUsedIds.clear();
    io.to('spiewaj_dalej_screen').emit('spiewaj_dalej_state', { active: false });
    io.to('spiewaj_dalej_phone').emit('spiewaj_dalej_state', { active: false });
    io.to('spiewaj_dalej_screen').emit('spiewaj_dalej_stop');
    res.json({ success: true });
});

app.get('/api/spiewaj-dalej/phone-qr', async (req, res) => {
    try {
        const mode = (req.query.mode || '').toLowerCase();
        let baseUrl;
        if (mode === 'local') {
            baseUrl = httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`;
        } else if (mode === 'pinggy') {
            const pinggyOrigin = currentPinggyUrl ? (normalizePinggyUrl(currentPinggyUrl) || currentPinggyUrl.replace(/\/$/, '').replace(/\/[^/].*$/, '')) : null;
            if (!pinggyOrigin) return res.status(400).json({ error: 'Tunel Pinggy nie jest uruchomiony.' });
            baseUrl = pinggyOrigin;
        } else {
            baseUrl = currentPinggyUrl ? (normalizePinggyUrl(currentPinggyUrl) || currentPinggyUrl.replace(/\/$/, '').replace(/\/[^/].*$/, '')) : (httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`);
        }
        const phoneUrl = `${baseUrl.replace(/\/$/, '')}/spiewaj-dalej/phone.html`;
        const qrCode = await QRCode.toDataURL(phoneUrl, { width: 280, margin: 2 });
        res.json({ url: phoneUrl, qrCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/spiewaj-dalej/connection-info', (req, res) => {
    res.json({
        pinggyAvailable: !!currentPinggyUrl,
        localUrl: (httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`) + '/spiewaj-dalej/phone.html'
    });
});

app.patch('/api/spiewaj-dalej/config', (req, res) => {
    const { oldName, newName, config: bodyConfig } = req.body || {};
    if (!oldName || !newName) return res.status(400).json({ error: 'Brak oldName lub newName' });
    const safeNew = safeConfigName(newName);
    if (!safeNew) return res.status(400).json({ error: 'Nieprawidłowa nazwa' });
    const oldPath = getSpiewajDalejConfigPath(oldName);
    const newPath = getSpiewajDalejConfigPath(newName);
    try {
        if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
            if (bodyConfig && Array.isArray(bodyConfig.tracks)) {
                spiewajDalejConfig = bodyConfig;
                fs.writeFileSync(newPath, JSON.stringify(spiewajDalejConfig, null, 2), 'utf8');
            }
            try {
                const last = JSON.parse(fs.readFileSync(SPIEWAJ_DALEJ_LAST_FILE, 'utf8'));
                if (last && last.name === safeConfigName(oldName)) {
                    fs.writeFileSync(SPIEWAJ_DALEJ_LAST_FILE, JSON.stringify({ name: safeConfigName(newName) }), 'utf8');
                }
            } catch (_) {}
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/spiewaj-dalej/screen-graphic', (req, res) => {
    const url = (spiewajDalejConfig && spiewajDalejConfig.screenGraphic) || '';
    res.json({ screenGraphic: url });
});
app.patch('/api/spiewaj-dalej/screen-graphic', (req, res) => {
    const url = (req.body && typeof req.body.screenGraphic === 'string') ? req.body.screenGraphic.trim() : '';
    if (!spiewajDalejConfig) spiewajDalejConfig = { tracks: [] };
    spiewajDalejConfig.screenGraphic = url || undefined;
    try {
        let cfgName = 'domyslna';
        if (fs.existsSync(SPIEWAJ_DALEJ_LAST_FILE)) {
            const last = JSON.parse(fs.readFileSync(SPIEWAJ_DALEJ_LAST_FILE, 'utf8'));
            if (last && last.name) cfgName = last.name;
        }
        const cfgPath = getSpiewajDalejConfigPath(cfgName);
        if (fs.existsSync(cfgPath)) {
            fs.writeFileSync(cfgPath, JSON.stringify(spiewajDalejConfig, null, 2), 'utf8');
            devSyncWriteData(`public/spiewaj-dalej-configs/${safeConfigName(cfgName)}.json`, JSON.stringify(spiewajDalejConfig, null, 2));
        }
        res.json({ success: true, screenGraphic: url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/spiewaj-dalej/config', (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Brak nazwy' });
    try {
        const cfgPath = getSpiewajDalejConfigPath(name);
        if (fs.existsSync(cfgPath)) {
            fs.unlinkSync(cfgPath);
            devSyncDelete(`public/spiewaj-dalej-configs/${safeConfigName(name)}.json`);
            try {
                const last = JSON.parse(fs.readFileSync(SPIEWAJ_DALEJ_LAST_FILE, 'utf8'));
                if (last && last.name === safeConfigName(name)) {
                    fs.writeFileSync(SPIEWAJ_DALEJ_LAST_FILE, JSON.stringify({ name: 'domyslna' }), 'utf8');
                    spiewajDalejConfig = { tracks: [] };
                }
            } catch (_) {}
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === BITWA WOKALNA – klon Śpiewaj Dalej ===
let bitwaWokalnaConfig = { tracks: [] };
let bitwaWokalnaActive = false;
let bitwaWokalnaVolume = 1;
let bitwaWokalnaUsedIds = new Set();

function getBitwaWokalnaConfigPath(name) {
    return path.join(BITWA_WOKALNA_CONFIGS_DIR, safeConfigName(name) + '.json');
}

app.get('/api/bitwa-wokalna/configs', (req, res) => {
    try {
        if (!fs.existsSync(BITWA_WOKALNA_CONFIGS_DIR)) {
            return res.json({ configs: [], current: 'domyslna' });
        }
        const files = fs.readdirSync(BITWA_WOKALNA_CONFIGS_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace(/\.json$/, ''));
        const configs = [...new Set(['domyslna', ...files])].sort();
        let current = null;
        if (fs.existsSync(BITWA_WOKALNA_LAST_FILE)) {
            try {
                const last = JSON.parse(fs.readFileSync(BITWA_WOKALNA_LAST_FILE, 'utf8'));
                if (last && last.name && configs.includes(last.name)) {
                    // Honoruj last tylko jeśli plik configa faktycznie istnieje na dysku
                    // (wirtualny wpis 'domyslna' bez pliku traktujemy jak brak wyboru)
                    const lastCfgPath = getBitwaWokalnaConfigPath(last.name);
                    if (fs.existsSync(lastCfgPath)) {
                        current = last.name;
                    }
                }
            } catch (_) {}
        }
        // Brak zapisanego configa (lub wskazywał na nieistniejący plik): preferuj gotowy preset
        if (!current) {
            if (files.includes('Panie_VS_Panowie')) current = 'Panie_VS_Panowie';
            else if (files.length > 0) current = files[0];
            else current = 'domyslna';
        }
        res.json({ configs, current });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/bitwa-wokalna/config', (req, res) => {
    const name = req.query.name;
    if (name) {
        const cfgPath = getBitwaWokalnaConfigPath(name);
        if (fs.existsSync(cfgPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
                bitwaWokalnaConfig = data.banks ? data : { tracks: data.tracks || [], screenGraphic: data.screenGraphic };
                fs.writeFileSync(BITWA_WOKALNA_LAST_FILE, JSON.stringify({ name: safeConfigName(name) }), 'utf8');
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        } else {
            // Plik configa nie istnieje – spróbuj załadować domyślny preset Panie_VS_Panowie
            const fallbackPath = getBitwaWokalnaConfigPath('Panie_VS_Panowie');
            if (fs.existsSync(fallbackPath)) {
                try {
                    const data = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
                    bitwaWokalnaConfig = data.banks ? data : { tracks: data.tracks || [], screenGraphic: data.screenGraphic };
                } catch (_) {}
            }
        }
    }
    res.json({ config: bitwaWokalnaConfig, active: bitwaWokalnaActive });
});

app.post('/api/bitwa-wokalna/config', (req, res) => {
    const { config, name } = req.body || {};
    const hasTracks = config && Array.isArray(config.tracks);
    const hasBanks = config && Array.isArray(config.banks) && config.banks.length > 0;
    if (config && (hasTracks || hasBanks)) {
        bitwaWokalnaConfig = config;
        const cfgName = name ? safeConfigName(name) : 'domyslna';
        if (!fs.existsSync(BITWA_WOKALNA_CONFIGS_DIR)) fs.mkdirSync(BITWA_WOKALNA_CONFIGS_DIR, { recursive: true });
        const bwData = JSON.stringify(bitwaWokalnaConfig, null, 2);
        fs.writeFileSync(getBitwaWokalnaConfigPath(cfgName), bwData, 'utf8');
        fs.writeFileSync(BITWA_WOKALNA_LAST_FILE, JSON.stringify({ name: cfgName }), 'utf8');
        devSyncWriteData(`public/bitwa-wokalna-configs/${cfgName}.json`, bwData);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Nieprawidłowa konfiguracja' });
    }
});

app.get('/api/bitwa-wokalna/screen-graphic', (req, res) => {
    const url = (bitwaWokalnaConfig && bitwaWokalnaConfig.screenGraphic) || '';
    res.json({ screenGraphic: url });
});
app.patch('/api/bitwa-wokalna/screen-graphic', (req, res) => {
    const url = (req.body && typeof req.body.screenGraphic === 'string') ? req.body.screenGraphic.trim() : '';
    if (!bitwaWokalnaConfig) bitwaWokalnaConfig = { tracks: [] };
    bitwaWokalnaConfig.screenGraphic = url || undefined;
    try {
        let cfgName = 'domyslna';
        if (fs.existsSync(BITWA_WOKALNA_LAST_FILE)) {
            const last = JSON.parse(fs.readFileSync(BITWA_WOKALNA_LAST_FILE, 'utf8'));
            if (last && last.name) cfgName = last.name;
        }
        const cfgPath = getBitwaWokalnaConfigPath(cfgName);
        if (fs.existsSync(cfgPath)) {
            fs.writeFileSync(cfgPath, JSON.stringify(bitwaWokalnaConfig, null, 2), 'utf8');
            devSyncWriteData(`public/bitwa-wokalna-configs/${safeConfigName(cfgName)}.json`, JSON.stringify(bitwaWokalnaConfig, null, 2));
        }
        res.json({ success: true, screenGraphic: url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/bitwa-wokalna/audio-files', (req, res) => {
    try {
        const q = (req.query.q || '').toLowerCase().trim();
        const exts = ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac', '.vdjsample'];
        const files = [];
        const dirs = [uploadsDir, path.join(__dirname, 'public', 'uploads')];
        if (vdjRecordingsBank) dirs.push(vdjRecordingsBank);
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) continue;
            try {
                for (const f of fs.readdirSync(dir)) {
                    const ext = path.extname(f).toLowerCase();
                    if (!exts.includes(ext)) continue;
                    const name = f.toLowerCase();
                    if (q && !name.includes(q)) continue;
                    const filepath = '/uploads/' + f;
                    if (!files.some(x => x.path === filepath)) files.push({ path: filepath, name: f });
                }
            } catch (_) {}
        }
        files.sort((a, b) => a.name.localeCompare(b.name));
        res.json({ files: files.slice(0, 100) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bitwa-wokalna/start', (req, res) => {
    stopOtherMusicGames('bitwa');
    bitwaWokalnaActive = true;
    bitwaWokalnaUsedIds.clear();
    io.to('bitwa_wokalna_screen').emit('bitwa_wokalna_state', { active: true, config: bitwaWokalnaConfig });
    io.to('bitwa_wokalna_phone').emit('bitwa_wokalna_state', { active: true, config: bitwaWokalnaConfig });
    res.json({ success: true });
});

app.post('/api/bitwa-wokalna/stop', (req, res) => {
    bitwaWokalnaActive = false;
    bitwaWokalnaUsedIds.clear();
    io.to('bitwa_wokalna_screen').emit('bitwa_wokalna_state', { active: false });
    io.to('bitwa_wokalna_phone').emit('bitwa_wokalna_state', { active: false });
    io.to('bitwa_wokalna_screen').emit('bitwa_wokalna_stop');
    res.json({ success: true });
});

app.get('/api/bitwa-wokalna/phone-qr', async (req, res) => {
    try {
        const mode = (req.query.mode || '').toLowerCase();
        let baseUrl;
        if (mode === 'local') {
            baseUrl = httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`;
        } else if (mode === 'pinggy') {
            const pinggyOrigin = currentPinggyUrl ? (normalizePinggyUrl(currentPinggyUrl) || currentPinggyUrl.replace(/\/$/, '').replace(/\/[^/].*$/, '')) : null;
            if (!pinggyOrigin) return res.status(400).json({ error: 'Tunel Pinggy nie jest uruchomiony.' });
            baseUrl = pinggyOrigin;
        } else {
            baseUrl = currentPinggyUrl ? (normalizePinggyUrl(currentPinggyUrl) || currentPinggyUrl.replace(/\/$/, '').replace(/\/[^/].*$/, '')) : (httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`);
        }
        const phoneUrl = `${baseUrl.replace(/\/$/, '')}/bitwa-wokalna/phone.html`;
        const qrCode = await QRCode.toDataURL(phoneUrl, { width: 280, margin: 2 });
        res.json({ url: phoneUrl, qrCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/bitwa-wokalna/connection-info', (req, res) => {
    res.json({
        pinggyAvailable: !!currentPinggyUrl,
        localUrl: (httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`) + '/bitwa-wokalna/phone.html'
    });
});

app.patch('/api/bitwa-wokalna/config', (req, res) => {
    const { oldName, newName, config: bodyConfig } = req.body || {};
    if (!oldName || !newName) return res.status(400).json({ error: 'Brak oldName lub newName' });
    const safeNew = safeConfigName(newName);
    if (!safeNew) return res.status(400).json({ error: 'Nieprawidłowa nazwa' });
    const oldPath = getBitwaWokalnaConfigPath(oldName);
    const newPath = getBitwaWokalnaConfigPath(newName);
    try {
        if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
            if (bodyConfig && Array.isArray(bodyConfig.tracks)) {
                bitwaWokalnaConfig = bodyConfig;
                fs.writeFileSync(newPath, JSON.stringify(bitwaWokalnaConfig, null, 2), 'utf8');
            }
            try {
                const last = JSON.parse(fs.readFileSync(BITWA_WOKALNA_LAST_FILE, 'utf8'));
                if (last && last.name === safeConfigName(oldName)) {
                    fs.writeFileSync(BITWA_WOKALNA_LAST_FILE, JSON.stringify({ name: safeConfigName(newName) }), 'utf8');
                }
            } catch (_) {}
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/bitwa-wokalna/config', (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Brak nazwy' });
    try {
        const cfgPath = getBitwaWokalnaConfigPath(name);
        if (fs.existsSync(cfgPath)) {
            fs.unlinkSync(cfgPath);
            devSyncDelete(`public/bitwa-wokalna-configs/${safeConfigName(name)}.json`);
            try {
                const last = JSON.parse(fs.readFileSync(BITWA_WOKALNA_LAST_FILE, 'utf8'));
                if (last && last.name === safeConfigName(name)) {
                    fs.writeFileSync(BITWA_WOKALNA_LAST_FILE, JSON.stringify({ name: 'domyslna' }), 'utf8');
                    bitwaWokalnaConfig = { tracks: [] };
                }
            } catch (_) {}
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === IMPREZATOR – muzyka do tańca dla animatorów ===
let imprezatorConfig = { tracks: [] };
let imprezatorActive = false;
let imprezatorVolume = 1;

function getImprezatorConfigPath(name) {
    return path.join(IMPREZATOR_CONFIGS_DIR, safeConfigName(name) + '.json');
}

app.get('/api/imprezator/configs', (req, res) => {
    try {
        if (!fs.existsSync(IMPREZATOR_CONFIGS_DIR)) {
            return res.json({ configs: [], current: 'domyslna' });
        }
        const files = fs.readdirSync(IMPREZATOR_CONFIGS_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace(/\.json$/, ''));
        const configs = [...new Set(['domyslna', ...files])].sort();
        let current = 'domyslna';
        if (fs.existsSync(IMPREZATOR_LAST_FILE)) {
            try {
                const last = JSON.parse(fs.readFileSync(IMPREZATOR_LAST_FILE, 'utf8'));
                if (last && last.name && configs.includes(last.name)) {
                    const lastCfgPath = getImprezatorConfigPath(last.name);
                    if (fs.existsSync(lastCfgPath)) current = last.name;
                }
            } catch (_) {}
        }
        res.json({ configs, current });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/imprezator/config', (req, res) => {
    const name = req.query.name;
    if (name) {
        const cfgPath = getImprezatorConfigPath(name);
        if (fs.existsSync(cfgPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
                imprezatorConfig = data.banks ? data : { tracks: data.tracks || [] };
                fs.writeFileSync(IMPREZATOR_LAST_FILE, JSON.stringify({ name: safeConfigName(name) }), 'utf8');
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        }
    }
    res.json({ config: imprezatorConfig, active: imprezatorActive });
});

app.post('/api/imprezator/config', async (req, res) => {
    const { config, name } = req.body || {};
    const hasTracks = config && Array.isArray(config.tracks);
    const hasBanks = config && Array.isArray(config.banks) && config.banks.length > 0;
    if (config && (hasTracks || hasBanks)) {
        const tracks = hasBanks
            ? (config.banks || []).flatMap(b => b.tracks || [])
            : (config.tracks || []);
        for (const t of tracks) {
            if (t.audio && (t.audio.startsWith('http://') || t.audio.startsWith('https://')) && typeof t.normalizedGain !== 'number') {
                t.normalizedGain = await analyzeLoudnessForUrl(t.audio);
            }
        }
        imprezatorConfig = config;
        const cfgName = name ? safeConfigName(name) : 'domyslna';
        if (!fs.existsSync(IMPREZATOR_CONFIGS_DIR)) fs.mkdirSync(IMPREZATOR_CONFIGS_DIR, { recursive: true });
        fs.writeFileSync(getImprezatorConfigPath(cfgName), JSON.stringify(imprezatorConfig, null, 2), 'utf8');
        fs.writeFileSync(IMPREZATOR_LAST_FILE, JSON.stringify({ name: cfgName }), 'utf8');
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Nieprawidłowa konfiguracja' });
    }
});

function getImprezatorMusicFolder() {
    try {
        if (process.env.IMPREZATOR_MUSIC_DIR) return process.env.IMPREZATOR_MUSIC_DIR.trim() || null;
        if (fs.existsSync(IMPREZATOR_SETTINGS_FILE)) {
            const d = JSON.parse(fs.readFileSync(IMPREZATOR_SETTINGS_FILE, 'utf8'));
            const p = (d && d.musicFolder) ? String(d.musicFolder).trim() : null;
            if (p && fs.existsSync(p)) return p;
        }
        const home = os.homedir();
        const defaults = [
            path.join(home, 'Music', 'Imprezja'),
            path.join(home, 'Music'),
            path.join(home, 'Muzyka')
        ];
        for (const d of defaults) {
            if (fs.existsSync(d) && fs.statSync(d).isDirectory()) return d;
        }
    } catch (_) {}
    return null;
}

function getImprezatorMusicFolders() {
    const primary = getImprezatorMusicFolder();
    const folders = primary ? [primary] : [];
    try {
        if (fs.existsSync(IMPREZATOR_SETTINGS_FILE)) {
            const d = JSON.parse(fs.readFileSync(IMPREZATOR_SETTINGS_FILE, 'utf8'));
            const arr = d && Array.isArray(d.musicFolders) ? d.musicFolders : [];
            for (const p of arr) {
                const p2 = String(p).trim();
                if (p2 && fs.existsSync(p2) && fs.statSync(p2).isDirectory() && !folders.includes(p2)) {
                    folders.push(p2);
                }
            }
        }
    } catch (_) {}
    return folders;
}

function scanFolderForAudio(dir, exts, q, prefix = '', returnFullPaths = false) {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    try {
        for (const name of fs.readdirSync(dir)) {
            const full = path.join(dir, name);
            const rel = prefix ? prefix + '/' + name : name;
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
                files.push(...scanFolderForAudio(full, exts, q, rel, returnFullPaths));
            } else {
                const ext = path.extname(name).toLowerCase();
                if (!exts.includes(ext)) continue;
                if (q && !name.toLowerCase().includes(q)) continue;
                files.push({ path: returnFullPaths ? full : rel, name });
            }
        }
    } catch (_) {}
    return files;
}

function isImprezatorPathAllowed(filePath) {
    try {
        const normalized = path.resolve(filePath);
        const home = os.homedir();
        if (normalized.startsWith(home)) return true;
        if (process.platform === 'darwin' && normalized.startsWith('/Volumes')) return true;
        return false;
    } catch (_) { return false; }
}

app.get('/api/imprezator/settings', (req, res) => {
    try {
        const musicFolder = getImprezatorMusicFolder() || '';
        const musicFolders = getImprezatorMusicFolders();
        res.json({ musicFolder, musicFolders });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/imprezator/settings', (req, res) => {
    try {
        const { musicFolder, musicFolders } = req.body || {};
        const p = typeof musicFolder === 'string' ? musicFolder.trim() : '';
        const arr = Array.isArray(musicFolders) ? musicFolders.map(x => String(x).trim()).filter(Boolean) : [];
        const dir = path.dirname(IMPREZATOR_SETTINGS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(IMPREZATOR_SETTINGS_FILE, JSON.stringify({ musicFolder: p, musicFolders: arr }, null, 2), 'utf8');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/imprezator/stream', (req, res) => {
    const rawPath = (req.query.path || '').trim();
    if (!rawPath) return res.status(400).json({ error: 'Brak ścieżki' });
    let full;
    if (path.isAbsolute(rawPath) || (process.platform === 'win32' && /^[a-zA-Z]:[\\/]/.test(rawPath))) {
        if (!isImprezatorPathAllowed(rawPath)) return res.status(403).json({ error: 'Ścieżka niedozwolona' });
        full = path.resolve(rawPath);
    } else {
        const musicFolder = getImprezatorMusicFolder();
        if (!musicFolder) return res.status(404).json({ error: 'Folder muzyki nie skonfigurowany' });
        const rel = rawPath.replace(/^[/\\]+/, '').split(/[/\\]/).filter(s => s !== '..' && s !== '').join(path.sep);
        if (!rel) return res.status(400).json({ error: 'Brak ścieżki' });
        full = path.join(musicFolder, rel);
        const relCheck = path.relative(musicFolder, full);
        if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) return res.status(403).json({ error: 'Nieprawidłowa ścieżka' });
    }
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return res.status(404).json({ error: 'Plik nie istnieje' });
    res.sendFile(full);
});

app.get('/api/imprezator/audio-files', (req, res) => {
    try {
        const q = (req.query.q || '').toLowerCase().trim();
        const folderParam = (req.query.folder || '').trim();
        const exts = ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac', '.vdjsample'];
        const files = [];
        if (folderParam) {
            const absFolder = path.resolve(folderParam);
            if (!isImprezatorPathAllowed(absFolder)) return res.status(403).json({ error: 'Folder niedozwolony (tylko ~ lub /Volumes)' });
            if (!fs.existsSync(absFolder) || !fs.statSync(absFolder).isDirectory()) return res.status(404).json({ error: 'Folder nie istnieje' });
            const scanned = scanFolderForAudio(absFolder, exts, q, '', true);
            for (const f of scanned) {
                files.push({ path: f.path, name: path.basename(f.path) });
            }
        } else {
            const folders = getImprezatorMusicFolders();
            for (const dir of folders) {
                const scanned = scanFolderForAudio(dir, exts, q, '', true);
                for (const f of scanned) {
                    files.push({ path: f.path, name: path.basename(f.path) });
                }
            }
        }
        files.sort((a, b) => (a.name || a.path).localeCompare(b.name || b.path));
        res.json({ files: files.slice(0, 300) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === PREZENTACJE ===
function getPrezentacjaPath(name) {
    const safe = safeConfigName(name).replace(/\.json$/i, '');
    return path.join(PREZENTACJE_CONFIGS_DIR, safe + '.json');
}
function getPrezentacjaMediaDir(name) {
    const safe = safeConfigName(name).replace(/\.json$/i, '');
    return path.join(uploadsDir, 'prezentacje', safe);
}
app.get('/api/prezentacje/list', (req, res) => {
    try {
        if (!fs.existsSync(PREZENTACJE_CONFIGS_DIR)) return res.json({ list: [] });
        const list = fs.readdirSync(PREZENTACJE_CONFIGS_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace(/\.json$/, ''));
        res.json({ list: list.sort() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/prezentacje/config', (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Brak nazwy' });
    const fp = getPrezentacjaPath(name);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Nie znaleziono' });
    try {
        const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
async function downloadToPrezentacjaMedia(url, name, hint) {
    if (!url || !url.startsWith('http://') && !url.startsWith('https://')) return url;
    try {
        const mediaDir = getPrezentacjaMediaDir(name);
        if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
        const ext = path.extname(new URL(url).pathname) || (hint === 'video' ? '.mp4' : '.jpg');
        const filename = Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext;
        const dest = path.join(mediaDir, filename);
        await new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : require('http');
            protocol.get(url, { timeout: 30000 }, (response) => {
                if (response.statusCode !== 200) return reject(new Error('HTTP ' + response.statusCode));
                const chunks = [];
                response.on('data', c => chunks.push(c));
                response.on('end', () => {
                    fs.writeFileSync(dest, Buffer.concat(chunks));
                    resolve();
                });
                response.on('error', reject);
            }).on('error', reject);
        });
        const safe = safeConfigName(name).replace(/\.json$/i, '');
        return '/uploads/prezentacje/' + safe + '/' + filename;
    } catch (e) {
        console.warn('Nie udało się pobrać zewnętrznego pliku:', url, e.message);
        return url;
    }
}

app.post('/api/prezentacje/save', async (req, res) => {
    const { name, config } = req.body || {};
    if (!name || !config) return res.status(400).json({ error: 'Brak name lub config' });
    try {
        if (!fs.existsSync(PREZENTACJE_CONFIGS_DIR)) fs.mkdirSync(PREZENTACJE_CONFIGS_DIR, { recursive: true });
        const slides = config.slides || [];
        for (const s of slides) {
            if (s.src && (s.src.startsWith('http://') || s.src.startsWith('https://'))) {
                s.src = await downloadToPrezentacjaMedia(s.src, name, s.type || 'image');
            }
        }
        if (config.backgroundMusic && (config.backgroundMusic.startsWith('http://') || config.backgroundMusic.startsWith('https://'))) {
            config.backgroundMusic = await downloadToPrezentacjaMedia(config.backgroundMusic, name, 'audio');
        }
        const fp = getPrezentacjaPath(name);
        fs.writeFileSync(fp, JSON.stringify(config, null, 2), 'utf8');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/prezentacje/config', (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Brak nazwy' });
    const fp = getPrezentacjaPath(name);
    if (fs.existsSync(fp)) {
        try { fs.unlinkSync(fp); } catch (_) {}
    }
    const mediaDir = getPrezentacjaMediaDir(name);
    if (fs.existsSync(mediaDir) && fs.statSync(mediaDir).isDirectory()) {
        try {
            fs.readdirSync(mediaDir).forEach(f => {
                fs.unlinkSync(path.join(mediaDir, f));
            });
            fs.rmdirSync(mediaDir);
            console.log('🗑️ Usunięto folder mediów prezentacji:', name);
        } catch (e) { console.warn('Nie udało się usunąć folderu mediów:', e.message); }
    }
    res.json({ success: true });
});

const uploadPrez = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
app.post('/api/prezentacje/upload', uploadPrez.single('file'), async (req, res) => {
    const name = (req.body && req.body.name) || '';
    if (!name) return res.status(400).json({ error: 'Brak nazwy prezentacji' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Brak pliku' });
    try {
        const mediaDir = getPrezentacjaMediaDir(name);
        if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
        const ext = path.extname(req.file.originalname) || '.bin';
        const safeName = (req.file.originalname || 'file').replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filename = Date.now() + '-' + safeName;
        const dest = path.join(mediaDir, filename);
        fs.writeFileSync(dest, req.file.buffer);
        const safe = safeConfigName(name).replace(/\.json$/i, '');
        const relPath = '/uploads/prezentacje/' + safe + '/' + filename;
        res.json({ filepath: relPath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/prezentacje/uploads', (req, res) => {
    try {
        if (!fs.existsSync(uploadsDir)) return res.json({ files: [] });
        const imgExt = ['.jpg','.jpeg','.png','.webp','.gif'];
        const vidExt = ['.mp4','.webm','.ogg'];
        const all = fs.readdirSync(uploadsDir).filter(f => {
            const ext = path.extname(f).toLowerCase();
            return (imgExt.includes(ext) || vidExt.includes(ext)) && !f.includes('-thumb');
        });
        res.json({ files: all.map(n => ({ name: n, type: vidExt.includes(path.extname(n).toLowerCase()) ? 'video' : 'image' })) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Proxy do natywnego dialogu Electrona (port 3099 – tylko localhost)
const ELECTRON_IPC_PORT = 3099;
async function callElectronIpc(endpoint) {
    return new Promise((resolve, reject) => {
        const req = require('http').request(
            { hostname: '127.0.0.1', port: ELECTRON_IPC_PORT, path: endpoint, method: 'POST', timeout: 30000 },
            (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { resolve({}); } });
            }
        );
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}
app.post('/api/imprezator/native-open-file', async (req, res) => {
    try {
        const d = await callElectronIpc('/open-file');
        res.json({ filePath: d.filePath || null });
    } catch (e) {
        res.json({ filePath: null, error: 'Electron IPC nie dostępne' });
    }
});
app.post('/api/imprezator/native-open-directory', async (req, res) => {
    try {
        const d = await callElectronIpc('/open-directory');
        res.json({ dirPath: d.dirPath || null });
    } catch (e) {
        res.json({ dirPath: null, error: 'Electron IPC nie dostępne' });
    }
});

app.post('/api/imprezator/start', (req, res) => {
    stopOtherMusicGames('imprezator');
    imprezatorActive = true;
    io.to('imprezator_screen').emit('imprezator_state', { active: true, config: imprezatorConfig });
    io.to('imprezator_phone').emit('imprezator_state', { active: true, config: imprezatorConfig });
    res.json({ success: true });
});

app.post('/api/imprezator/stop', (req, res) => {
    imprezatorActive = false;
    io.to('imprezator_screen').emit('imprezator_state', { active: false });
    io.to('imprezator_phone').emit('imprezator_state', { active: false });
    io.to('imprezator_screen').emit('imprezator_stop');
    res.json({ success: true });
});

app.get('/api/imprezator/phone-qr', async (req, res) => {
    try {
        const mode = (req.query.mode || '').toLowerCase();
        let baseUrl;
        if (mode === 'local') {
            baseUrl = httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`;
        } else if (mode === 'pinggy') {
            const pinggyOrigin = currentPinggyUrl ? (normalizePinggyUrl(currentPinggyUrl) || currentPinggyUrl.replace(/\/$/, '').replace(/\/[^/].*$/, '')) : null;
            if (!pinggyOrigin) return res.status(400).json({ error: 'Tunel Pinggy nie jest uruchomiony.' });
            baseUrl = pinggyOrigin;
        } else {
            baseUrl = currentPinggyUrl ? (normalizePinggyUrl(currentPinggyUrl) || currentPinggyUrl.replace(/\/$/, '').replace(/\/[^/].*$/, '')) : (httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`);
        }
        const phoneUrl = `${baseUrl.replace(/\/$/, '')}/imprezator/phone.html`;
        const qrCode = await QRCode.toDataURL(phoneUrl, { width: 280, margin: 2 });
        res.json({ url: phoneUrl, qrCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/imprezator/connection-info', (req, res) => {
    res.json({
        pinggyAvailable: !!currentPinggyUrl,
        localUrl: (httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`) + '/imprezator/phone.html'
    });
});

app.patch('/api/imprezator/config', (req, res) => {
    const { oldName, newName, config: bodyConfig } = req.body || {};
    if (!oldName || !newName) return res.status(400).json({ error: 'Brak oldName lub newName' });
    const safeNew = safeConfigName(newName);
    if (!safeNew) return res.status(400).json({ error: 'Nieprawidłowa nazwa' });
    const oldPath = getImprezatorConfigPath(oldName);
    const newPath = getImprezatorConfigPath(newName);
    try {
        if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
            if (bodyConfig && (bodyConfig.banks || bodyConfig.tracks)) {
                imprezatorConfig = bodyConfig;
                fs.writeFileSync(newPath, JSON.stringify(imprezatorConfig, null, 2), 'utf8');
            }
            try {
                const last = JSON.parse(fs.readFileSync(IMPREZATOR_LAST_FILE, 'utf8'));
                if (last && last.name === safeConfigName(oldName)) {
                    fs.writeFileSync(IMPREZATOR_LAST_FILE, JSON.stringify({ name: safeConfigName(newName) }), 'utf8');
                }
            } catch (_) {}
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/imprezator/config', (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Brak nazwy' });
    try {
        const cfgPath = getImprezatorConfigPath(name);
        if (fs.existsSync(cfgPath)) {
            fs.unlinkSync(cfgPath);
            try {
                const last = JSON.parse(fs.readFileSync(IMPREZATOR_LAST_FILE, 'utf8'));
                if (last && last.name === safeConfigName(name)) {
                    fs.writeFileSync(IMPREZATOR_LAST_FILE, JSON.stringify({ name: 'domyslna' }), 'utf8');
                    imprezatorConfig = { tracks: [] };
                }
            } catch (_) {}
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === API FAMILIADA ===
const appPath = path.resolve(process.env.IMPREZJA_APP_PATH || __dirname);
const familiadaPublicDir = path.join(__dirname, 'public', 'familiada');
const familiadaFromAppPath = path.join(appPath, 'public', 'familiada');
function getFamiliadaDirs() {
    const dirs = [
        familiadaFromAppPath,
        familiadaPublicDir,
        familiadaDir,
        path.join(process.cwd(), 'public', 'familiada')
    ];
    const seen = new Set();
    const result = [];
    for (const d of dirs) {
        if (!d || seen.has(d)) continue;
        seen.add(d);
        try {
            if (fs.existsSync(d)) result.push(d);
        } catch (_) {}
    }
    return result;
}

function getFamiliadaFiles() {
    try {
        const dirs = getFamiliadaDirs();
        const seen = new Set();
        const result = [];
        for (const dir of dirs) {
            const files = fs.readdirSync(dir)
                .filter(f => f.toLowerCase().endsWith('.json') && f.toLowerCase() !== FAMILIADA_GOLDEN_FILE.toLowerCase());
            for (const f of files) {
                if (!seen.has(f)) { seen.add(f); result.push(f); }
            }
        }
        result.sort();
        if (!result.includes(FAMILIADA_GOLDEN_FILE)) result.push(FAMILIADA_GOLDEN_FILE);
        return result;
    } catch (err) {
        return [];
    }
}

app.get('/api/familiada/files', (req, res) => {
    try {
        res.json(getFamiliadaFiles());
    } catch (err) {
        console.error('Familiada files błąd:', err.message);
        res.status(500).json({ error: err.message });
    }
});

function resolveFamiliadaFilePath(filename) {
    const name = (filename && typeof filename === 'string') ? filename.trim() : '';
    if (!name || name.includes('..') || name.includes('/') || !name.toLowerCase().endsWith('.json')) return null;
    const nameLower = name.toLowerCase();
    if (nameLower === FAMILIADA_GOLDEN_FILE.toLowerCase()) return familiadaGoldenPath;
    const dirs = getFamiliadaDirs();
    const availableFiles = getFamiliadaFiles().filter(f => f.toLowerCase() !== FAMILIADA_GOLDEN_FILE.toLowerCase());
    const match = availableFiles.find(f => f.toLowerCase() === nameLower);
    if (match) {
        for (const dir of dirs) {
            const p = path.join(dir, match);
            if (fs.existsSync(p)) return p;
        }
    }
    for (const dir of dirs) {
        const p = path.join(dir, name);
        if (fs.existsSync(p)) return p;
    }
    return null;
}
app.get('/api/familiada/data', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
        let file = req.query.file;
        if (file && typeof file === 'string') file = file.trim();
        if (file && file.toLowerCase() === FAMILIADA_GOLDEN_FILE.toLowerCase()) {
            loadFamiliadaGoldenData();
            return res.json(familiadaGoldenQuestions);
        }
        const filePath = file ? resolveFamiliadaFilePath(file) : null;
        if (filePath) {
            const raw = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(raw);
            return res.json(Array.isArray(data) ? data : []);
        }
        loadFamiliadaData();
        res.json(familiadaQuestions);
    } catch (err) {
        console.error('Familiada data błąd:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/familiada/save', (req, res) => {
    try {
        let data, filename;
        if (Array.isArray(req.body)) {
            data = req.body;
            filename = null;
        } else if (req.body && typeof req.body.data !== 'undefined' && req.body.filename) {
            data = req.body.data;
            filename = req.body.filename.replace(/\.json$/i, '') + '.json';
        } else {
            return res.status(400).json({ error: 'Oczekiwana tablica pytań lub { filename, data }' });
        }
        if (!Array.isArray(data)) {
            return res.status(400).json({ error: 'Oczekiwana tablica pytań' });
        }
        const valid = data.filter(q => q && (q.question || '').trim());
        const isGolden = filename && filename.toLowerCase() === FAMILIADA_GOLDEN_FILE.toLowerCase();
        if (isGolden) {
            const goldenValid = valid.slice(0, 10);
            familiadaGoldenQuestions = goldenValid;
            if (!fs.existsSync(familiadaDir)) fs.mkdirSync(familiadaDir, { recursive: true });
            fs.writeFileSync(familiadaGoldenPath, JSON.stringify(familiadaGoldenQuestions, null, 2), 'utf8');
            io.to('familiada').emit('familiada_golden_updated', familiadaGoldenQuestions);
            return res.json({ success: true, count: familiadaGoldenQuestions.length });
        }
        if (filename) {
            const filePath = path.join(familiadaDir, filename);
            if (!fs.existsSync(familiadaDir)) fs.mkdirSync(familiadaDir, { recursive: true });
            const jsonData = JSON.stringify(valid, null, 2);
            fs.writeFileSync(filePath, jsonData, 'utf8');
            devSyncWriteData(`public/familiada/${filename}`, jsonData);
        }
        const dir = path.dirname(familiadaDataPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(familiadaDataPath, JSON.stringify(valid, null, 2), 'utf8');
        familiadaQuestions = valid;
        io.to('familiada').emit('familiada_data_updated', valid);
        res.json({ success: true, count: valid.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/familiada/file/:filename', (req, res) => {
    try {
        const name = decodeURIComponent(req.params.filename || '');
        if (!name || name.includes('..') || name.includes('/') || !name.toLowerCase().endsWith('.json')) {
            return res.status(400).json({ error: 'Nieprawidłowa nazwa pliku' });
        }
        if (name.toLowerCase() === FAMILIADA_GOLDEN_FILE.toLowerCase()) {
            return res.status(400).json({ error: 'Złotej listy nie można usunąć' });
        }
        const filePath = path.join(familiadaDir, name);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Plik nie istnieje' });
        }
        fs.unlinkSync(filePath);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/familiada/golden', (req, res) => {
    try {
        loadFamiliadaGoldenData();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(familiadaGoldenQuestions);
    } catch (err) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/familiada/golden', (req, res) => {
    try {
        const data = req.body;
        if (!Array.isArray(data)) {
            return res.status(400).json({ error: 'Oczekiwana tablica pytań' });
        }
        const valid = data.slice(0, 10).filter(q => q && (q.question || '').trim());
        familiadaGoldenQuestions = valid;
        if (!fs.existsSync(familiadaDir)) fs.mkdirSync(familiadaDir, { recursive: true });
        fs.writeFileSync(familiadaGoldenPath, JSON.stringify(familiadaGoldenQuestions, null, 2), 'utf8');
        io.to('familiada').emit('familiada_golden_updated', familiadaGoldenQuestions);
        res.json({ success: true, count: familiadaGoldenQuestions.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── STATKI SOLO – zapis i odczyt konfiguracji planszy ─────────────────────
const STATKI_SOLO_CONFIG_FILE = path.join(__dirname, 'statki-solo-config.json');

app.get('/api/statki-solo/config', (req, res) => {
    try {
        if (!require('fs').existsSync(STATKI_SOLO_CONFIG_FILE)) {
            return res.json({ boardSize: 8, ships: [], rewards: {}, soundtrack: '' });
        }
        const data = JSON.parse(require('fs').readFileSync(STATKI_SOLO_CONFIG_FILE, 'utf8'));
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/statki-solo/config', express.json(), (req, res) => {
    try {
        require('fs').writeFileSync(STATKI_SOLO_CONFIG_FILE, JSON.stringify(req.body, null, 2));
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/statki-solo/connection-info', (req, res) => {
    res.json({
        pinggyAvailable: !!currentPinggyUrl,
        localUrl: (httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`) + '/statki-solo/admin.html'
    });
});

app.get('/api/statki-solo/phone-qr', async (req, res) => {
    try {
        const mode = (req.query.mode || '').toLowerCase();
        const path = req.query.path || '/statki-solo/admin.html';
        let baseUrl;
        if (mode === 'local') {
            baseUrl = httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`;
        } else if (mode === 'pinggy') {
            const pinggyOrigin = currentPinggyUrl
                ? (normalizePinggyUrl(currentPinggyUrl) || (() => { try { return new URL(currentPinggyUrl).origin; } catch (_) { return currentPinggyUrl.replace(/\/$/, '').replace(/\/[^/].*$/, ''); } })())
                : null;
            if (!pinggyOrigin) return res.status(400).json({ error: 'Tunel Pinggy nie jest uruchomiony.' });
            baseUrl = pinggyOrigin;
        } else {
            baseUrl = currentPinggyUrl
                ? (normalizePinggyUrl(currentPinggyUrl) || (() => { try { return new URL(currentPinggyUrl).origin; } catch (_) { return currentPinggyUrl.replace(/\/$/, '').replace(/\/[^/].*$/, ''); } })())
                : (httpsServer ? `https://${IP}:${PORT_HTTPS}` : `http://${IP}:${PORT}`);
        }
        const phoneUrl = `${baseUrl.replace(/\/$/, '')}${path}`;
        const qrCode = await QRCode.toDataURL(phoneUrl, { width: 280, margin: 2 });
        res.json({ url: phoneUrl, qrCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sprawdź aktualizacje (tylko w aplikacji Electron – in-process)
app.get('/api/version', (req, res) => {
    try {
        const pkg = require('./package.json');
        res.json({ version: pkg.version || '1.0.0' });
    } catch (e) {
        res.json({ version: '1.0.0' });
    }
});

app.post('/api/check-updates', async (req, res) => {
    const fn = typeof global.imprezjaCheckForUpdates === 'function' ? global.imprezjaCheckForUpdates : null;
    if (!fn) {
        return res.json({ available: false, message: 'Sprawdzanie aktualizacji działa tylko w aplikacji desktop (uruchom z launchera).' });
    }
    try {
        const result = await fn();
        res.json(result);
    } catch (err) {
        res.json({ available: false, error: err.message || 'Błąd sprawdzania aktualizacji' });
    }
});

app.get('/api/update-status', (req, res) => {
    const status = global.imprezjaUpdateStatus || { status: 'idle' };
    res.json(status);
});

app.post('/api/install-update', (req, res) => {
    const fn = typeof global.imprezjaQuitAndInstall === 'function' ? global.imprezjaQuitAndInstall : null;
    if (!fn) {
        return res.json({ ok: false, error: 'Dostępne tylko w aplikacji desktop.' });
    }
    fn();
    res.json({ ok: true });
});

// Blokada gdy licencja nieważna – główne strony i wszystkie tryby gry serwują license-required.html
/* Ścieżki wymagające jakiejkolwiek ważnej licencji (w tym trial): Quiz, Familiada, start, admin, edytory */
const BLOCKED_PATHS = [
    '/', '/admin.html', '/Screen.html', '/vote.html', '/index.html', '/start.html',
    '/editor.html', '/editor-standalone.html'
];
const BLOCKED_PREFIXES = ['/familiada/'];

/* Nowe tryby gry – wymagają wykupionej licencji (trial nie wystarczy) */
const NEW_MODE_PATHS = ['/njr-sampler.html', '/whitney.html', '/spiewaj-dalej.html', '/bitwa-wokalna.html', '/imprezator.html'];
const NEW_MODE_PREFIXES = ['/njr-sampler/', '/whitney/', '/spiewaj-dalej/', '/bitwa-wokalna/', '/imprezator/'];

function hasFullLicense(status) {
    return status.valid && status.type !== 'trial';
}

app.use((req, res, next) => {
    const isNewModePath = NEW_MODE_PATHS.some(p => req.path === p || req.path === p.replace(/^\//, ''));
    const isNewModePrefix = NEW_MODE_PREFIXES.some(prefix => req.path.startsWith(prefix));
    const isNewMode = isNewModePath || isNewModePrefix;

    const isBlockedPath = BLOCKED_PATHS.some(p => req.path === p || req.path === p.replace(/^\//, ''));
    const isBlockedPrefix = BLOCKED_PREFIXES.some(prefix => req.path.startsWith(prefix));
    const isBlocked = isBlockedPath || isBlockedPrefix;

    if (!isBlocked && !isNewMode) return next();

    const status = getLicenseStatus();
    if (isNewMode) {
        if (hasFullLicense(status)) return next();
        return res.sendFile(path.join(__dirname, 'public', 'license-required.html'));
    }
    if (status.valid) return next();
    res.sendFile(path.join(__dirname, 'public', 'license-required.html'));
});

// Logowanie wszystkich żądań (do debugowania)
app.use((req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    
    // Szczegółowe logowanie dla diagnostyki sieci
    console.log(`📥 ${req.method} ${req.url} od IP: ${clientIP} (${userAgent.substring(0, 50)})`);
    if (forwardedFor) console.log(`   🔄 X-Forwarded-For: ${forwardedFor}`);
    if (realIP) console.log(`   🔄 X-Real-IP: ${realIP}`);
    if (clientIP === '127.0.0.1' && userAgent.includes('Android')) {
        console.log(`   ⚠️ UWAGA: Telefon łączy się przez localhost - może używać tunelu Pinggy zamiast WiFi!`);
    }
    
    next();
});

// Middleware do logowania błędów połączenia
server.on('connection', (socket) => {
    const clientIP = socket.remoteAddress;
    // Loguj tylko pierwsze połączenie z danego IP (żeby nie spamować)
    if (!server._loggedConnections) server._loggedConnections = new Set();
    if (!server._loggedConnections.has(clientIP)) {
        console.log(`🔌 Nowe połączenie TCP od: ${clientIP}`);
        server._loggedConnections.add(clientIP);
    }
    socket.on('error', (err) => {
        // ECONNRESET i ECONNABORTED to normalne - klient zamyka połączenie
        if (err.code !== 'ECONNRESET' && err.code !== 'ECONNABORTED') {
            console.error(`❌ Błąd połączenia z ${clientIP}:`, err.message);
        }
    });
});

server.on('error', (err) => {
    console.error(`❌ Błąd serwera HTTP:`, err);
});

// Test endpoint - sprawdź czy serwer jest dostępny z sieci
app.get('/test-connection', (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    
    console.log(`✅ Test połączenia od IP: ${clientIP}`);
    if (forwardedFor) console.log(`   🔄 X-Forwarded-For: ${forwardedFor}`);
    if (realIP) console.log(`   🔄 X-Real-IP: ${realIP}`);
    
    const isLocalhost = clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === 'localhost';
    
    res.json({
        success: true,
        message: isLocalhost ? 'Serwer działa, ale połączenie przez localhost!' : 'Serwer działa i jest dostępny z sieci!',
        clientIP: clientIP,
        forwardedFor: forwardedFor,
        realIP: realIP,
        serverIP: IP,
        serverPort: PORT,
        timestamp: new Date().toISOString(),
        warning: isLocalhost ? 'UWAGA: Połączenie przez localhost (127.0.0.1) - telefon może używać tunelu Pinggy zamiast WiFi! Wyłącz tunel Pinggy w panelu admina i sprawdź firewall macOS.' : null,
        recommendation: isLocalhost ? '1. Wyłącz tunel Pinggy w panelu admina\n2. Sprawdź firewall macOS (System Preferences → Security & Privacy → Firewall)\n3. Sprawdź czy router nie ma włączonej funkcji AP Isolation' : 'Połączenie wygląda poprawnie - powinno działać przez WiFi'
    });
});

// Główna strona i vote – jawnie, żeby działało przez tunel (telefon nie dostaje 404)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'vote.html'));
});
app.get('/vote.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'vote.html'));
});
app.get('/njr-sampler.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'njr-sampler', 'index.html'));
});
app.get('/whitney.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'whitney', 'index.html'));
});
app.get('/spiewaj-dalej.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'spiewaj-dalej', 'index.html'));
});
app.get('/bitwa-wokalna.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bitwa-wokalna', 'index.html'));
});

app.get('/imprezator.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'imprezator', 'index.html'));
});

// .vdjsample i .ogg z VDJ: nagłówek zmiennej długości (zawiera ścieżkę do oryginału), potem Ogg Opus
// Szukamy sygnatury OggS w pierwszych 512 bajtach – stream od tej pozycji
const VDJSAMPLE_OGGS_SEARCH_LIMIT = 512;
function findOggsOffset(filePath) {
    const fd = fs.openSync(filePath, 'r');
    try {
        const buf = Buffer.alloc(VDJSAMPLE_OGGS_SEARCH_LIMIT);
        const read = fs.readSync(fd, buf, 0, VDJSAMPLE_OGGS_SEARCH_LIMIT, 0);
        const idx = buf.slice(0, read).indexOf('OggS');
        return idx >= 0 ? idx : 128;
    } finally {
        fs.closeSync(fd);
    }
}
function isVdjOrOggPath(p) {
    const lower = (p || '').toLowerCase().trim();
    return lower && (lower.endsWith('.vdjsample') || lower.endsWith(' .vdjsample') || lower.endsWith('.ogg') || lower.endsWith(' .ogg'));
}

function sanitizeAudioPath(p) {
    return (p || '').replace(/^\/+/, '').split('/').filter(seg => seg !== '..').join('/');
}

app.get('/api/audio/check', (req, res) => {
    const p = sanitizeAudioPath(req.query.path || '');
    if (!p || !isVdjOrOggPath(p)) {
        return res.json({ ok: false, error: 'Nieprawidłowa ścieżka (wymagane .vdjsample lub .ogg)' });
    }
    const name = path.basename(p);
    const dirs = [uploadsDir, path.join(__dirname, 'public', 'uploads')];
    if (vdjRecordingsBank) dirs.push(vdjRecordingsBank);
    let filePath = null;
    for (const d of dirs) {
        const fp = path.join(d, name);
        if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
            filePath = fp;
            break;
        }
    }
    if (!filePath) return res.json({ ok: false, error: 'Plik nie istnieje' });
    try {
        const stat = fs.statSync(filePath);
        if (stat.size <= 128) return res.json({ ok: false, error: 'Plik za krótki' });
        const oggsOffset = findOggsOffset(filePath);
        if (stat.size <= oggsOffset) return res.json({ ok: false, error: 'Plik za krótki (brak danych Ogg)' });
        res.json({ ok: true });
    } catch (err) {
        res.json({ ok: false, error: err.message || 'Błąd odczytu pliku' });
    }
});

app.get('/api/audio/stream', (req, res) => {
    const p = sanitizeAudioPath(req.query.path || '');
    if (!p || !isVdjOrOggPath(p)) {
        return res.status(400).json({ error: 'Nieprawidłowa ścieżka (wymagane .vdjsample lub .ogg)' });
    }
    const name = path.basename(p);
    const dirs = [uploadsDir, path.join(__dirname, 'public', 'uploads')];
    if (vdjRecordingsBank) dirs.push(vdjRecordingsBank);
    let filePath = null;
    for (const d of dirs) {
        const fp = path.join(d, name);
        if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
            filePath = fp;
            break;
        }
    }
    if (!filePath) return res.status(404).json({ error: 'Plik nie istnieje' });
    const stat = fs.statSync(filePath);
    if (stat.size <= 128) return res.status(400).json({ error: 'Plik za krótki' });
    const oggsOffset = findOggsOffset(filePath);
    if (stat.size <= oggsOffset) return res.status(400).json({ error: 'Plik za krótki (brak danych Ogg)' });
    const totalSize = stat.size - oggsOffset;
    res.setHeader('Content-Type', 'audio/ogg; codecs=opus');
    res.setHeader('Accept-Ranges', 'bytes');
    const rangeHeader = req.headers.range;
    if (rangeHeader && /^bytes=/.test(rangeHeader)) {
        const parts = rangeHeader.replace(/^bytes=/, '').split('-');
        const start = parts[0] ? parseInt(parts[0], 10) : 0;
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
        const reqStart = Math.max(0, start);
        const reqEnd = Math.min(totalSize - 1, end);
        if (reqStart <= reqEnd) {
            const chunkSize = reqEnd - reqStart + 1;
            res.status(206);
            res.setHeader('Content-Range', `bytes ${reqStart}-${reqEnd}/${totalSize}`);
            res.setHeader('Content-Length', chunkSize);
            const stream = fs.createReadStream(filePath, { start: oggsOffset + reqStart, end: oggsOffset + reqEnd });
            stream.pipe(res);
            return;
        }
    }
    res.setHeader('Content-Length', totalSize);
    const stream = fs.createReadStream(filePath, { start: oggsOffset });
    stream.pipe(res);
});

// /uploads: najpierw katalog danych (zapis użytkownika), potem fallback na pliki z aplikacji (asar) – żeby w DMG/setup były dźwięki i grafika z pytań
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/fonts/pixelify-sans', express.static(path.join(__dirname, 'node_modules', '@fontsource', 'pixelify-sans')));
app.use('/reveal', express.static(path.join(__dirname, 'node_modules', 'reveal.js', 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

// Obsługa favicon.ico (aby uniknąć błędów 404)
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No Content - pusty favicon
});

// === API: aktualna sieć WiFi (tylko nazwa – hasła nie da się pobrać) ===
app.get('/api/current-wifi-ssid', (req, res) => {
    let ssid = null;
    try {
        const { execSync } = require('child_process');
        const isWin = process.platform === 'win32';
        if (isWin) {
            const out = execSync('netsh wlan show interfaces', { encoding: 'utf8', timeout: 3000 });
            const m = out.match(/SSID\s*:\s*(.+)/);
            if (m) ssid = m[1].trim();
        } else {
            for (const iface of ['en0', 'en1', 'en2', 'wlan0']) {
                try {
                    const out = execSync(`networksetup -getairportnetwork ${iface}`, { encoding: 'utf8', timeout: 2000 });
                    const m = out.match(/Current Wi-Fi Network:\s*(.+)/);
                    if (m && m[1].trim()) {
                        ssid = m[1].trim();
                        break;
                    }
                } catch (_) {}
            }
            if (!ssid) {
                try {
                    const out = execSync('iwgetid -r', { encoding: 'utf8', timeout: 2000 });
                    if (out && out.trim()) ssid = out.trim();
                } catch (_) {}
            }
            if (!ssid) {
                try {
                    const out = execSync('system_profiler SPAirPortDataType', { encoding: 'utf8', timeout: 5000 });
                    const m = out.match(/Current Network:\s*(.+)/);
                    if (m && m[1].trim()) ssid = m[1].trim();
                } catch (_) {}
            }
            if (!ssid) {
                try {
                    const airportPath = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';
                    const out = execSync(airportPath + ' -I', { encoding: 'utf8', timeout: 2000 });
                    const m = out.match(/^\s*SSID:\s*(.+)$/m);
                    if (m && m[1].trim()) ssid = m[1].trim();
                } catch (_) {}
            }
        }
    } catch (err) {
        console.warn('⚠️ Nie można pobrać SSID:', err.message);
    }
    res.json({ ssid: ssid || null });
});

// === API: skan WiFi 2,4 GHz – siła sygnału i zajętość pasm (dla WiFi Analyzer) ===
function parseSystemProfilerWifi(stdout) {
    const networks = [];
    const channelCount = {};
    for (let ch = 1; ch <= 13; ch++) channelCount[ch] = 0;
    const seen = new Set();
    const propKeys = ['PHY Mode', 'Channel', 'Network Type', 'Security', 'Signal', 'Country Code', 'MAC Address', 'Transmit Rate', 'MCS Index'];

    const lines = stdout.split('\n');
    let inSection = false;
    let curSsid = null;
    let curChannel = null;
    let curRssi = -70;

    function flush() {
        if (curSsid && curChannel !== null) {
            const key = curSsid + '|' + curChannel;
            if (!seen.has(key)) {
                seen.add(key);
                networks.push({ ssid: curSsid, bssid: '', rssi: curRssi, channel: curChannel });
                channelCount[curChannel] = (channelCount[curChannel] || 0) + 1;
            }
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('Current Network Information:') || line.includes('Other Local Wi-Fi Networks:')) {
            flush();
            inSection = true;
            curSsid = null;
            curChannel = null;
            curRssi = -70;
            continue;
        }
        if (!inSection) continue;
        const nameMatch = line.match(/^\s{10,}([^:]+):\s*$/);
        if (nameMatch) {
            const key = nameMatch[1].trim();
            if (!propKeys.some(p => key.startsWith(p))) {
                flush();
                curSsid = key;
                curChannel = null;
                curRssi = -70;
            }
            continue;
        }
        if (curSsid) {
            const chM = line.match(/Channel:\s*(\d+)\s*\(2GHz/i);
            if (chM) {
                const ch = parseInt(chM[1], 10);
                if (ch >= 1 && ch <= 13) curChannel = ch;
            }
            const sigM = line.match(/Signal\s*\/\s*Noise:\s*(-?\d+)\s*dBm/i);
            if (sigM) curRssi = parseInt(sigM[1], 10);
        }
    }
    flush();
    return { networks, channelCount };
}

function parseWifiScan(stdout, platform, source) {
    const networks = [];
    const channelCount = {};
    for (let ch = 1; ch <= 13; ch++) channelCount[ch] = 0;

    if (platform === 'darwin' && source === 'system_profiler') {
        return parseSystemProfilerWifi(stdout);
    }
    if (platform === 'darwin') {
        // airport -s (przestarzały od macOS 14.4): SSID BSSID RSSI CHANNEL
        const lines = stdout.split('\n').slice(1);
        const bssidRe = /([0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2})/i;
        for (const line of lines) {
            const bssidMatch = line.match(bssidRe);
            if (!bssidMatch) continue;
            const idx = line.indexOf(bssidMatch[1]);
            const ssid = line.substring(0, idx).trim();
            const rest = line.substring(idx + bssidMatch[1].length).trim();
            const numParts = rest.split(/\s+/);
            const rssi = parseInt(numParts[0], 10);
            const channel = parseInt(numParts[1], 10);
            if (isNaN(rssi) || isNaN(channel) || channel < 1 || channel > 13) continue;
            networks.push({ ssid, bssid: bssidMatch[1], rssi, channel });
            channelCount[channel] = (channelCount[channel] || 0) + 1;
        }
    } else if (platform === 'win32') {
        // netsh wlan show networks mode=bssid – bloki z BSSID, Signal, Channel
        let curSsid = '';
        const lines = stdout.split(/\r?\n/);
        for (let j = 0; j < lines.length; j++) {
            const line = lines[j];
            const ssidM = line.match(/^\s*SSID\s+\d+\s*:\s*(.+)/);
            if (ssidM) { curSsid = ssidM[1].trim(); continue; }
            const bssidM = line.match(/^\s*BSSID\s+\d+\s*:\s*(.+)/);
            if (bssidM) {
                const bssid = bssidM[1].trim();
                let rssi = -70, channel = 0;
                for (let i = 0; i < 8 && j + i < lines.length; i++) {
                    const l = lines[j + i];
                    const sigM = l.match(/Signal\s*:\s*(\d+)%/);
                    const chM = l.match(/Channel\s*:\s*(\d+)/);
                    if (sigM) rssi = Math.round(-95 + (parseInt(sigM[1], 10) / 100) * 45);
                    if (chM) channel = parseInt(chM[1], 10);
                }
                if (channel >= 1 && channel <= 13) {
                    networks.push({ ssid: curSsid, bssid, rssi, channel });
                    channelCount[channel] = (channelCount[channel] || 0) + 1;
                }
            }
        }
    } else {
        // Linux: nmcli -t -f SSID,BSSID,CHAN,RATE,SIGNAL (SSID:BSSID1:...:BSSID6:CHAN:RATE:SIGNAL)
        const lines = stdout.split('\n').filter(Boolean);
        for (const line of lines) {
            const parts = line.split(':');
            if (parts.length < 10) continue;
            const ssid = parts[0];
            const bssid = parts.slice(1, 7).join(':');
            const channel = parseInt(parts[7], 10);
            const signalPct = parseInt(parts[9], 10);
            const rssi = isNaN(signalPct) ? -70 : Math.round(-95 + (signalPct / 100) * 45);
            if (channel < 1 || channel > 13) continue;
            networks.push({ ssid, bssid, rssi, channel });
            channelCount[channel] = (channelCount[channel] || 0) + 1;
        }
    }

    return { networks, channelCount };
}

app.get('/api/wifi-scan', (req, res) => {
    let cmd, args, platform = process.platform;
    let source = null; // 'system_profiler' | 'airport' | null
    if (platform === 'darwin') {
        // macOS Sonoma 14.4+: airport -s przestarzały (nie zwraca skanów). Używamy system_profiler.
        cmd = 'system_profiler';
        args = ['SPAirPortDataType'];
        source = 'system_profiler';
    } else if (platform === 'win32') {
        cmd = 'netsh';
        args = ['wlan', 'show', 'networks', 'mode=bssid'];
    } else {
        cmd = 'nmcli';
        args = ['-t', '-e', 'no', '-f', 'SSID,BSSID,CHAN,RATE,SIGNAL', 'dev', 'wifi', 'list'];
    }

    const spawnOpts = { encoding: 'utf8', timeout: 15000 };
    if (platform === 'win32') spawnOpts.shell = true;
    const proc = spawn(cmd, args, spawnOpts);
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => { stdout += d; });
    proc.stderr?.on('data', (d) => { stderr += d; });
    proc.on('close', (code) => {
        if (code !== 0 && platform !== 'win32') {
            return res.status(500).json({ error: 'Skan nieudany', detail: stderr || stdout });
        }
        try {
            const { networks, channelCount } = parseWifiScan(stdout, platform, source);
            res.json({ networks, channelCount });
        } catch (err) {
            res.status(500).json({ error: 'Błąd parsowania', detail: err.message });
        }
    });
    proc.on('error', (err) => {
        res.status(500).json({ error: 'Nie można uruchomić skanu', detail: err.message });
    });
});

// === QR 2.0: Strona /join – maksymalny komfort: wyświetl na TV, skanuj telefonem ===
app.get('/join', async (req, res) => {
    const ssid = (req.query.ssid || '').trim();
    const pass = (req.query.pass || req.query.password || '').trim();
    const baseUrl = `${req.protocol}://${req.get('host')}`.replace(/\/$/, '');
    const localGameUrl = `http://${IP}:${PORT}/vote.html`;
    const tunnelOrigin = currentPinggyUrl ? (normalizePinggyUrl(currentPinggyUrl) || currentPinggyUrl.replace(/\/$/, '')) : null;
    const tunnelGameUrl = tunnelOrigin ? `${tunnelOrigin}/vote.html` : null;
    const hasTunnel = !!tunnelGameUrl;
    const gameQRUrl = hasTunnel ? tunnelGameUrl : localGameUrl;
    let wifiQRDataUrl = '';
    if (ssid) {
        const wifiData = await generateWiFiQR(ssid, pass || null, 'WPA2');
        if (wifiData && wifiData.qrCode) wifiQRDataUrl = wifiData.qrCode;
    }
    const gameQRDataUrl = await (async () => {
        try {
            return await QRCode.toDataURL(gameQRUrl, { width: 220, margin: 2 });
        } catch (_) { return ''; }
    })();
    const wifiSectionHtml = ssid ? `
        <p style="margin-bottom: 16px; font-weight: 600;">Wyświetl tę stronę na ekranie TV – gracze skanują telefonem:</p>
        <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px;">
            ${wifiQRDataUrl ? `<div><p style="font-size: 0.85rem; margin-bottom: 6px;">1. WiFi</p><img src="${wifiQRDataUrl}" alt="QR WiFi" style="width: 140px; height: 140px; background: #fff; padding: 6px; border-radius: 8px;"></div>` : ''}
            ${gameQRDataUrl ? `<div><p style="font-size: 0.85rem; margin-bottom: 6px;">${wifiQRDataUrl ? '2. Gra' : 'Wejdź'}</p><img src="${gameQRDataUrl}" alt="QR Gra" style="width: 140px; height: 140px; background: #fff; padding: 6px; border-radius: 8px;"></div>` : ''}
        </div>
        <p style="font-size: 0.8rem; color: rgba(255,255,255,0.7); margin-bottom: 12px;">Na telefonie? Skopiuj dane WiFi:</p>
        <button type="button" class="btn btn-wifi" id="btn-connect">📋 Skopiuj sieć i hasło</button>
    ` : (gameQRDataUrl ? `
        <p style="margin-bottom: 12px;">Zeskanuj i wejdź do gry:</p>
        <img src="${gameQRDataUrl}" alt="QR Gra" style="width: 180px; height: 180px; background: #fff; padding: 8px; border-radius: 8px;">
    ` : '');
    const html = `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dołącz do gry – Imprezja Quiz</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%); min-height: 100vh; color: #fff; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .card { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 28px; max-width: 360px; width: 100%; text-align: center; }
        h1 { font-size: 1.4rem; margin-bottom: 24px; color: #f1c40f; }
        .btn { display: block; width: 100%; margin: 12px 0; padding: 16px 24px; font-weight: 700; font-size: 1rem; text-decoration: none; border-radius: 10px; border: none; cursor: pointer; transition: transform 0.2s; text-align: center; }
        .btn:active { transform: scale(0.98); }
        .btn-wifi { background: linear-gradient(135deg, #3498db, #2980b9); color: #fff; }
        .btn-game { background: linear-gradient(135deg, #f1c40f, #e67e22); color: #000; }
        .btn-lte { background: linear-gradient(135deg, #9b59b6, #8e44ad); color: #fff; }
        .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: rgba(46,204,113,0.95); color: #000; padding: 12px 20px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
        .toast.show { opacity: 1; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🎮 Imprezja Quiz</h1>
        ${wifiSectionHtml}
        <div style="margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 20px;">
            <p style="font-size: 0.85rem; margin-bottom: 12px; color: rgba(255,255,255,0.8);">Jesteś na telefonie? Kliknij:</p>
            ${hasTunnel ? `
            <a href="${escapeHtml(tunnelGameUrl)}" class="btn btn-lte">Wejdź do gry (LTE) – od razu</a>
            <a href="${escapeHtml(localGameUrl)}" class="btn btn-game">Wejdź do gry (WiFi)</a>
            <p style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 8px;">LTE = bez WiFi, WiFi = gdy jesteś w sieci</p>
            ` : `
            <a href="${escapeHtml(localGameUrl)}" class="btn btn-game">Wejdź do gry</a>
            `}
        </div>
    </div>
    <div class="toast" id="toast">Skopiowano!</div>
    ${ssid ? `
    <script>
        (function(){
            var ssid = ${JSON.stringify(ssid)};
            var pass = ${JSON.stringify(pass)};
            var text = pass ? ssid + '\\n' + pass : ssid;
            var btn = document.getElementById('btn-connect');
            if (btn) btn.onclick = function(){
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(function(){
                        var t = document.getElementById('toast');
                        t.textContent = 'Skopiowano – połącz się w WiFi';
                        t.classList.add('show');
                        setTimeout(function(){ t.classList.remove('show'); }, 2500);
                    });
                } else {
                    var ta = document.createElement('textarea');
                    ta.value = text;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    var t = document.getElementById('toast');
                    t.textContent = 'Skopiowano – połącz się w WiFi';
                    t.classList.add('show');
                    setTimeout(function(){ t.classList.remove('show'); }, 2500);
                }
            };
        })();
    </script>
    ` : ''}
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});
function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Indeks hash oryginalnych plików → nazwa zapisanego pliku
// Klucz: MD5 ORYGINALNEGO bufora (przed optymalizacją), wartość: nazwa pliku na dysku
const HASH_INDEX_FILE = () => path.join(uploadsDir, '.hash-index.json');
let fileHashIndex = {};

function loadHashIndex() {
    try {
        const p = HASH_INDEX_FILE();
        if (fs.existsSync(p)) {
            fileHashIndex = JSON.parse(fs.readFileSync(p, 'utf8'));
        }
    } catch (_) { fileHashIndex = {}; }
}

function saveHashIndex() {
    try { fs.writeFileSync(HASH_INDEX_FILE(), JSON.stringify(fileHashIndex), 'utf8'); } catch (_) {}
}

function calculateFileHash(buffer) {
    return crypto.createHash('md5').update(buffer).digest('hex');
}

// Sprawdza czy plik o danym hash (oryginał przed optymalizacją) już istnieje
function findExistingFile(hash) {
    const saved = fileHashIndex[hash];
    if (saved) {
        if (fs.existsSync(path.join(uploadsDir, saved))) return saved;
        // Plik usunięty - wyczyść indeks
        delete fileHashIndex[hash];
        saveHashIndex();
    }
    return null;
}

// Rejestruje nowy plik w indeksie (originalHash = MD5 bufora przed opt.)
function registerFileInIndex(originalHash, savedFilename) {
    fileHashIndex[originalHash] = savedFilename;
    saveHashIndex();
}

// Usuwa plik z indeksu po skasowaniu
function removeFileFromIndex(savedFilename) {
    let changed = false;
    for (const [hash, name] of Object.entries(fileHashIndex)) {
        if (name === savedFilename) { delete fileHashIndex[hash]; changed = true; }
    }
    if (changed) saveHashIndex();
}

// Wczytaj indeks przy starcie
loadHashIndex();

// Funkcja zachowana dla kompatybilności wstecznej
function refreshFileHashCache() {
    console.log('📦 Hash-index gotowy:', Object.keys(fileHashIndex).length, 'wpisów');
}

// Cache odświeżany asynchronicznie po starcie – nie blokuje 
// ── /dolacz — strona dla gości bez skanera QR ────────────────
app.get('/dolacz', (req, res) => {
    const redirect = currentPinggyUrl ? currentPinggyUrl + '/vote.html' : null;
    const code = currentSessionCode;
    let btnHtml = redirect
        ? '<a href="' + redirect + '" class="btn">&#9654; Dołącz do gry</a>'
        : '<div style="color:#ef4444;padding:16px;background:rgba(239,68,68,.1);border-radius:10px">Gra nie jest aktywna.<br>Poczekaj na organizatora.</div>';
    let codeHtml = (code && !currentShortUrl)
        ? '<div class="info">Kod sesji: <strong style="color:#7dd3fc;font-size:1.3rem;letter-spacing:.1em">' + code + '</strong></div>'
        : '';
    res.send('<!DOCTYPE html><html lang="pl"><head>' +
        '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<title>Dołącz do gry</title>' +
        '<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000c1a;color:#fff;font-family:-apple-system,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.12);border-radius:20px;padding:36px 28px;max-width:400px;width:100%;text-align:center}.logo{font-size:2.4rem;margin-bottom:8px}h1{font-size:1.4rem;color:#7dd3fc;margin-bottom:6px}p{color:rgba(255,255,255,.6);font-size:.9rem;margin-bottom:28px}.btn{display:block;width:100%;padding:16px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;border:none;border-radius:12px;font-size:1.1rem;font-weight:800;cursor:pointer;text-decoration:none;margin-bottom:12px}.btn:hover{opacity:.9}.info{color:rgba(255,255,255,.4);font-size:.85rem;margin-top:16px}</style>' +
        '</head><body><div class="card"><div class="logo">&#127918;</div><h1>Imprezja Quiz</h1>' +
        '<p>Kliknij poniżej aby dołączyć do gry</p>' +
        btnHtml + codeHtml +
        '</div></body></html>');
});

function scheduleRefreshFileHashCache() {
    setImmediate(() => {
        try {
            refreshFileHashCache();
        } catch (err) {
            console.warn('⚠️ Odświeżenie cache hash:', err.message);
        }
    });
}

// Upload konfiguracja - użyj memory storage aby móc sprawdzić hash przed zapisem
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Optymalizuje obrazek dla Screen.html (TV): zmniejsza do max 1920px szerokości, kompresuje do WebP.
 * @param {Buffer} imageBuffer - Bufor obrazka
 * @param {number} maxWidth - Maksymalna szerokość (domyślnie 1920px dla 2K)
 * @param {number} quality - Jakość WebP 0-100 (domyślnie 85)
 * @returns {Promise<Buffer>} - Zoptymalizowany obrazek
 */
async function optimizeImageForScreen(imageBuffer, maxWidth = 1920, quality = 85) {
    // Priorytet: użyj sharp (szybszy), fallback: jimp (działa wszędzie)
    if (sharp) {
        try {
            const image = sharp(imageBuffer);
            const metadata = await image.metadata();
            
            // rotate() bez argumentów – stosuje orientację EXIF (np. zdjęcia z telefonu)
            let pipeline = image.rotate();
            
            // Jeśli obrazek jest mniejszy niż maxWidth, tylko kompresuj (bez zmniejszania)
            if (metadata.width <= maxWidth) {
                return await pipeline
                    .webp({ quality, effort: 6 })
                    .toBuffer();
            }
            
            // Zmniejsz do maxWidth (zachowując proporcje) i kompresuj do WebP
            return await pipeline
                .resize(maxWidth, null, {
                    withoutEnlargement: true,
                    fit: 'inside'
                })
                .webp({ quality, effort: 6 })
                .toBuffer();
        } catch (err) {
            console.warn('⚠️ Sharp nie zadziałał, próbuję jimp...', err.message);
            // Fallback do jimp
        }
    }
    
    // Fallback: użyj jimp (działa wszędzie, ale wolniejszy)
    if (jimp) {
        try {
            const image = await jimp.read(imageBuffer);
            const width = image.getWidth();
            const height = image.getHeight();
            
            // Zmniejsz tylko jeśli większe niż maxWidth
            if (width > maxWidth) {
                const ratio = maxWidth / width;
                const newHeight = Math.round(height * ratio);
                image.resize(maxWidth, newHeight);
            }
            
            // Kompresuj do JPEG (jimp nie ma WebP, ale JPEG jest uniwersalny)
            const buffer = await image.quality(Math.round(quality * 100)).getBufferAsync(jimp.MIME_JPEG);
            return buffer;
        } catch (err) {
            console.error('❌ Błąd optymalizacji obrazka (jimp):', err);
            return imageBuffer;
        }
    }
    
    // Jeśli ani sharp ani jimp nie są dostępne, zwróć oryginał
    return imageBuffer;
}

// --- MODYFIKACJA UPLOADU (Oryginał + Miniatura) z sprawdzaniem duplikatów ---
app.post('/upload', upload.fields([{ name: 'file' }, { name: 'thumbnail' }]), async (req, res) => {
    const response = {};
    
    try {
        // Obsługa głównego pliku
        if (req.files['file'] && req.files['file'][0]) {
            const file = req.files['file'][0];
            const fileHash = calculateFileHash(file.buffer);
            const existingFile = findExistingFile(fileHash);
            
            if (existingFile) {
                // Plik już istnieje - użyj istniejącego (deduplikacja)
                console.log(`✅ Plik już istnieje (dedup), używam: ${existingFile}`);
                response.filepath = `/uploads/${existingFile}`;
                
                // Sprawdź czy istnieje miniatura dla tego pliku
                const thumbName = existingFile.replace(/\.[^.]+$/, '-thumb.webp');
                const thumbPath = path.join(uploadsDir, thumbName);
                if (fs.existsSync(thumbPath)) {
                    response.thumbnailpath = `/uploads/${thumbName}`;
                }
            } else {
                // Nowy plik - optymalizuj jeśli to obrazek
                let finalBuffer = file.buffer;
                let finalFilename = file.originalname;
                
                // Sprawdź czy to obrazek (nie audio)
                const isImage = file.mimetype && file.mimetype.startsWith('image/');
                if (isImage) {
                    try {
                        const originalSize = file.buffer.length;
                        console.log(`🖼️ Optymalizacja obrazka dla Screen.html (1920px)...`);
                        finalBuffer = await optimizeImageForScreen(file.buffer, 1920, 85);
                        const optimizedSize = finalBuffer.length;
                        const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
                        console.log(`✅ Obrazek zoptymalizowany: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(optimizedSize / 1024 / 1024).toFixed(2)}MB (oszczędność: ${savings}%)`);
                        finalFilename = file.originalname.replace(/\.[^.]+$/, '.webp');
                    } catch (err) {
                        console.error('❌ Błąd optymalizacji obrazka, używam oryginału:', err);
                    }
                }
                
                // Zapisz plik
                const timestamp = Date.now();
                const sanitized = finalFilename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const filename = `${timestamp}-${sanitized}`;
                const filePath = path.join(uploadsDir, filename);
                
                fs.writeFileSync(filePath, finalBuffer);
                response.filepath = `/uploads/${filename}`;
                // Zarejestruj ORYGINALNY hash → nazwa zapisanego pliku
                registerFileInIndex(fileHash, filename);
                console.log(`✅ Zapisano nowy plik: ${filename}`);
                devSyncWrite(`public/uploads/${filename}`, filePath);
            }
        }
        
        // Obsługa miniatury (tylko jeśli główny plik nie miał istniejącej miniatury)
        if (req.files['thumbnail'] && req.files['thumbnail'][0] && !response.thumbnailpath) {
            const thumb = req.files['thumbnail'][0];
            const thumbHash = calculateFileHash(thumb.buffer);
            
            // Sprawdź czy miniatura już istnieje
            const existingThumb = findExistingFile(thumbHash);
            
            if (existingThumb) {
                console.log(`✅ Miniatura już istnieje (dedup): ${existingThumb}`);
                response.thumbnailpath = `/uploads/${existingThumb}`;
            } else {
                // Zapisz nową miniaturę
                // Jeśli mamy główny plik, użyj jego nazwy jako podstawy dla miniatury
                let thumbFilename;
                if (response.filepath) {
                    const mainFilename = path.basename(response.filepath);
                    thumbFilename = mainFilename.replace(/\.[^.]+$/, '-thumb.webp');
                } else {
                    const timestamp = Date.now();
                    thumbFilename = `${timestamp}-thumb.webp`;
                }
                
                const thumbPath = path.join(uploadsDir, thumbFilename);
                fs.writeFileSync(thumbPath, thumb.buffer);
                response.thumbnailpath = `/uploads/${thumbFilename}`;
                registerFileInIndex(thumbHash, thumbFilename);
                console.log(`✅ Zapisano nową miniaturę: ${thumbFilename}`);
                devSyncWrite(`public/uploads/${thumbFilename}`, thumbPath);
            }
        }
        
        // Fallback dla starego edytora (pojedynczy plik 'file')
        if (!response.filepath && !response.thumbnailpath) {
            if (req.file) {
                const file = req.file;
                const fileHash = calculateFileHash(file.buffer);
                const existingFile = findExistingFile(fileHash);
                
                if (existingFile) {
                    return res.json({ filepath: `/uploads/${existingFile}` });
                } else {
                    // Fallback: optymalizuj jeśli to obrazek
                    let finalBuffer = file.buffer;
                    let finalFilename = file.originalname;
                    
                    const isImage = file.mimetype && file.mimetype.startsWith('image/');
                    if (isImage) {
                        try {
                            const originalSize = file.buffer.length;
                            finalBuffer = await optimizeImageForScreen(file.buffer, 1920, 85);
                            const optimizedSize = finalBuffer.length;
                            console.log(`✅ Fallback - obrazek zoptymalizowany: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(optimizedSize / 1024 / 1024).toFixed(2)}MB`);
                            finalFilename = file.originalname.replace(/\.[^.]+$/, '.webp');
                        } catch (err) {
                            console.error('❌ Błąd optymalizacji (fallback):', err);
                        }
                    }
                    
                    const timestamp = Date.now();
                    const sanitized = finalFilename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                    const filename = `${timestamp}-${sanitized}`;
                    const filePath = path.join(uploadsDir, filename);
                    fs.writeFileSync(filePath, finalBuffer);
                    registerFileInIndex(fileHash, filename);
                    return res.json({ filepath: `/uploads/${filename}` });
                }
            }
            return res.status(400).json({ error: 'Brak plików' });
        }
        
        res.json(response);
    } catch (error) {
        console.error('❌ Błąd podczas uploadu:', error);
        res.status(500).json({ error: 'Błąd podczas zapisywania pliku' });
    }
});

// --- IMPORT Z URL (Dla edytora) z sprawdzaniem duplikatów i optymalizacją ---
app.post('/import-url', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Brak URL' });

    const protocol = url.startsWith('https') ? https : http;
    const chunks = [];

    protocol.get(url, async (response) => {
        if (response.statusCode !== 200) {
            return res.status(500).json({ error: 'Nie udało się pobrać pliku' });
        }
        
        response.on('data', (chunk) => {
            chunks.push(chunk);
        });
        
        response.on('end', async () => {
            try {
                const buffer = Buffer.concat(chunks);
                const fileHash = calculateFileHash(buffer);
                const existingFile = findExistingFile(fileHash, 'imported.jpg');
                
                if (existingFile) {
                    // Plik już istnieje - użyj istniejącego
                    console.log(`✅ Importowany plik już istnieje, używam istniejącego: ${existingFile}`);
                    return res.json({ filepath: `/uploads/${existingFile}` });
                } else {
                    // Nowy plik - optymalizuj jeśli to obrazek
                    let finalBuffer = buffer;
                    let finalFilename = `${Date.now()}-imported.webp`;
                    
                    // Sprawdź czy to obrazek (sprawdź Content-Type lub rozszerzenie z URL)
                    const contentType = response.headers['content-type'] || '';
                    const isImage = url.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) || 
                                   contentType.startsWith('image/');
                    
                    if (isImage) {
                        try {
                            const originalSize = buffer.length;
                            console.log(`🖼️ Optymalizacja importowanego obrazka (1920px)...`);
                            finalBuffer = await optimizeImageForScreen(buffer, 1920, 85);
                            const optimizedSize = finalBuffer.length;
                            const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
                            console.log(`✅ Importowany obrazek zoptymalizowany: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(optimizedSize / 1024 / 1024).toFixed(2)}MB (oszczędność: ${savings}%)`);
                        } catch (err) {
                            console.error('❌ Błąd optymalizacji importowanego obrazka:', err);
                            finalFilename = `${Date.now()}-imported.jpg`;
                        }
                    } else {
                        finalFilename = `${Date.now()}-imported.jpg`;
                    }
                    
                    const filepath = path.join(uploadsDir, finalFilename);
                    fs.writeFileSync(filepath, finalBuffer);
                    console.log(`✅ Zapisano nowy importowany plik: ${finalFilename}`);
                    res.json({ filepath: `/uploads/${finalFilename}` });
                }
            } catch (err) {
                console.error('❌ Błąd podczas zapisywania importowanego pliku:', err);
                res.status(500).json({ error: err.message });
            }
        });
    }).on('error', (err) => {
        console.error('❌ Błąd podczas pobierania pliku z URL:', err);
        res.status(500).json({ error: err.message });
    });
});

// --- ANALIZA GŁOŚNOŚCI (dla linkowanych URL – ffmpeg volumedetect) ---
async function analyzeLoudnessForUrl(url) {
    if (!url || typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) return 1;
    let tmpPath = null;
    try {
        const chunks = [];
        const protocol = url.startsWith('https') ? https : http;
        const buf = await new Promise((resolve, reject) => {
            protocol.get(url, { timeout: 15000 }, (r) => {
                if (r.statusCode !== 200) { reject(new Error('HTTP ' + r.statusCode)); return; }
                r.on('data', c => chunks.push(c));
                r.on('end', () => resolve(Buffer.concat(chunks)));
                r.on('error', reject);
            }).on('error', reject);
        });
        const ext = (url.match(/\.(mp3|wav|m4a|ogg|aac|flac)(\?|$)/i) || ['', 'mp3'])[1] || 'mp3';
        tmpPath = path.join(os.tmpdir(), `imprezja-loudness-${Date.now()}.${ext}`);
        fs.writeFileSync(tmpPath, buf);
        const proc = spawn('ffmpeg', ['-i', tmpPath, '-af', 'volumedetect', '-f', 'null', '-'], { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';
        proc.stderr.on('data', d => { stderr += d.toString(); });
        await new Promise((resolve, reject) => {
            proc.on('close', (code) => resolve(code));
            proc.on('error', (e) => reject(e));
        });
        const m = stderr.match(/max_volume:\s*([-\d.]+)\s*dB/);
        let gain = 1;
        if (m) {
            const maxDb = parseFloat(m[1]);
            const targetDb = -3;
            gain = Math.pow(10, (targetDb - maxDb) / 20);
            gain = Math.max(0.3, Math.min(2.5, gain));
        }
        return gain;
    } catch (err) {
        console.warn('⚠️ analyze-loudness:', err.message);
        return 1;
    } finally {
        if (tmpPath && fs.existsSync(tmpPath)) try { fs.unlinkSync(tmpPath); } catch (_) {}
    }
}

app.post('/api/audio/analyze-loudness', async (req, res) => {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        return res.status(400).json({ error: 'Brak lub nieprawidłowy URL', gain: 1 });
    }
    const gain = await analyzeLoudnessForUrl(url);
    res.json({ gain });
});

// --- EKSPORT / IMPORT PAKIETU (quiz + powiązane pliki) ---
function extractFilePathsFromPayload(payload) {
    const paths = new Set();
    function add(pathOrUrl) {
        if (!pathOrUrl) return;
        const m = String(pathOrUrl).match(/\/uploads\/([^\/]+)$/);
        if (m) paths.add(m[1]);
    }
    const qList = Array.isArray(payload) ? payload : (payload.questions || []);
    qList.forEach(q => {
        add(q.media); add(q.image); add(q.imageSmall); add(q.audio);
        add(q.imageA); add(q.imageB); add(q.imageSmallA); add(q.imageSmallB);
    });
    if (payload.thanksScreen && payload.thanksScreen.image) {
        add(payload.thanksScreen.image);
    }
    return Array.from(paths);
}

app.post('/api/editor/export-package', async (req, res) => {
    try {
        const archiver = require('archiver');
        const payload = req.body;
        if (!payload || !(payload.questions || Array.isArray(payload))) {
            return res.status(400).json({ error: 'Brak danych quizu' });
        }
        const filePaths = extractFilePathsFromPayload(payload);
        const archive = archiver('zip', { zlib: { level: 6 } });
        const qList = Array.isArray(payload) ? payload : (payload.questions || []);
        const firstQ = qList[0];
        const baseName = (firstQ && firstQ.question) ? 
            (String(firstQ.question).substring(0, 30).replace(/[^a-zA-Z0-9-_]/g, '_') + '-pakiet.zip') : 'quiz-pakiet.zip';
        res.attachment(baseName);
        res.setHeader('Content-Type', 'application/zip');
        archive.pipe(res);
        archive.append(JSON.stringify(payload, null, 2), { name: 'quiz.json' });
        for (const f of filePaths) {
            const fullPath = path.join(uploadsDir, f);
            if (fs.existsSync(fullPath)) {
                archive.file(fullPath, { name: `uploads/${f}` });
            }
        }
        await archive.finalize();
    } catch (err) {
        console.error('❌ Błąd eksportu pakietu:', err);
        res.status(500).json({ error: err.message });
    }
});

const uploadZip = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
app.post('/api/editor/import-package', uploadZip.single('file'), async (req, res) => {
    try {
        const AdmZip = require('adm-zip');
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ error: 'Brak pliku ZIP' });
        }
        const zip = new AdmZip(req.file.buffer);
        const entries = zip.getEntries();
        const quizEntry = entries.find(e => e.entryName === 'quiz.json' || e.entryName.endsWith('/quiz.json'));
        if (!quizEntry) {
            return res.status(400).json({ error: 'Brak quiz.json w archiwum' });
        }
        const payload = JSON.parse(quizEntry.getData().toString('utf8'));
        for (const e of entries) {
            if (e.isDirectory) continue;
            const idx = e.entryName.indexOf('uploads/');
            if (idx === -1) continue;
            const relPath = e.entryName.slice(idx + 8);
            const destPath = path.join(uploadsDir, relPath);
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.writeFileSync(destPath, e.getData());
        }
        res.json({ success: true, data: payload });
    } catch (err) {
        console.error('❌ Błąd importu pakietu:', err);
        res.status(500).json({ error: err.message });
    }
});

// Stan gry
let gameState = {
    type: 'IDLE',
    quizTitle: 'Imprezja Quiz',
    questions: [],
    activeQuestionIndex: -1,
    activeQuestion: null,
    showStats: false,
    showCorrect: false,
    stats: {},
    timeLeft: 0,
    duration: 30,
    winners: [],
    podiumStep: 0,
    leaderboard: [],
    questionStartTime: null,  // czas startu pytania
    quizOptions: { disableTimePoints: false }, // Opcje quizu
    teamBattleMode: false,
    showQROnPhones: false,
    showPlayersWithQR: false,  // ekran TV: QR + latające nicki zalogowanych graczy
    showZarazZaczynamy: false, // ekran TV + telefony: "ZARAZ ZACZYNAMY" + nazwa quizu
    sendImagesToPhones: true,  // false = nie ładuj obrazków na telefonach (zalecane przy wielu graczach)
    teams: {
        A: { name: "", score: 0 },
        B: { name: "", score: 0 }
    },
    speedrunQueue: [],  // { socketId, responseTime } – kolejność poprawnych odpowiedzi w trybie speedrun
    playoff: null,       // { active: true, word, question, options: ['TAK','NIE'], stats: { A: 0, B: 0 } } – dogrywka TAK/NIE bez punktów
    shipsGame: null,     // { questionId, boardSize, ships, shots: {}, currentTurn, playersShot: Set, gameEnded } – gra w statki
    shipsSoloGame: null, // { questionId, boardSize, ships, rewards, shots: {}, aimRow, aimCol, phase, lastShot, gameEnded } – gra solo
    letterGame: null,    // { questionId, letterCount, playerLetters: { socketId: ['a', 'b'] } } – gra z literami
    thanksScreen: null   // { text: string, image: string } – ekran końcowy z podziękowaniami
};

let players = new Map();
// Map dla graczy w trakcie rozłączenia (grace period) - socketId -> { player, disconnectTime }
let pendingDisconnects = new Map();
// Map dla graczy którzy stracili połączenie ale mają punkty - nick -> player (zachowani do końca gry)
let disconnectedPlayersWithScore = new Map();
const DISCONNECT_GRACE_PERIOD = 60000; // 60 sekund grace period

// Timer dla automatycznego pokazywania statystyk po upływie czasu pytania
let questionTimer = null;

/** Balansowanie drużyn: mnożnik proporcjonalny do dysproporcji. Ratio 1.1 (10% więcej) = 1.1×, ratio 2 (2:1) = 2× dla mniejszej drużyny */
function getTeamBalanceMultiplier(team) {
    if (!gameState.teamBattleMode || !team) return 1;
    let countA = 0, countB = 0;
    players.forEach((p) => {
        if (p.team === 'A') countA++;
        else if (p.team === 'B') countB++;
    });
    const smaller = Math.min(countA, countB);
    const larger = Math.max(countA, countB);
    if (larger === 0 || smaller === 0) return 1;
    const ratio = larger / smaller;
    if (ratio <= 1) return 1; // równe drużyny
    const weakerTeam = countA <= countB ? 'A' : 'B';
    return team === weakerTeam ? ratio : 1;
}

// === FUNKCJE POMOCNICZE ===

function getLocalIP() {
    const verbose = process.env.IMPREZJA_VERBOSE_NETWORK === '1';
    try {
        const interfaces = os.networkInterfaces();
        if (verbose) console.log('🔍 Sprawdzam interfejsy sieciowe...');
        
        const foundIPs = [];
        
        // Przejdź przez WSZYSTKIE interfejsy i zbierz wszystkie IP
        for (const name of Object.keys(interfaces)) {
            const lowerName = name.toLowerCase();
            
            // Pomiń tylko wyraźnie wirtualne interfejsy
            if (lowerName.includes('docker') || lowerName.includes('wsl') || 
                lowerName.includes('veth') || lowerName.includes('br-') ||
                lowerName.includes('virtualbox') || lowerName.includes('vmware') ||
                lowerName.includes('hyper-v') || lowerName.includes('loopback') ||
                lowerName.includes('teredo') || lowerName.includes('isatap')) {
                if (verbose) console.log(`⏭️  Pomijam wirtualny interfejs: ${name}`);
                continue;
            }
            
            for (const iface of interfaces[name]) {
                const isIPv4 = iface.family === 'IPv4' || iface.family === 4;
                if (verbose) console.log(`   - ${iface.family} ${iface.address} (internal: ${iface.internal})`);
                
                if (isIPv4 && !iface.internal) {
                    const ipParts = iface.address.split('.');
                    const isLinkLocal = ipParts[0] === '169' && ipParts[1] === '254';
                    
                    if (!isLinkLocal) {
                        foundIPs.push({ name, address: iface.address, internal: iface.internal });
                        if (verbose) console.log(`   ✅ DODANO: ${iface.address} z interfejsu ${name}`);
                    }
                }
            }
        }
        
        // Priorytet: preferuj interfejsy WiFi/Ethernet
        const wifiKeywords = ['wi-fi', 'wifi', 'wireless', 'wlan', 'ethernet', 'lan'];
        const wifiIPs = foundIPs.filter(ip => 
            wifiKeywords.some(keyword => ip.name.toLowerCase().includes(keyword))
        );
        
        if (wifiIPs.length > 0) {
            const selected = wifiIPs[0];
            console.log(`✅ IP sieciowe: ${selected.address} (${selected.name})`);
            return selected.address;
        }
        
        if (foundIPs.length > 0) {
            const selected = foundIPs[0];
            console.log(`✅ IP sieciowe: ${selected.address} (${selected.name})`);
            return selected.address;
        }
        
        console.warn('⚠️ Nie znaleziono IP sieciowego – sprawdź połączenie WiFi/Ethernet');
    } catch (error) {
        console.warn('⚠️ Nie można pobrać adresów IP:', error.message);
        console.warn('   Stack:', error.stack);
    }
    return 'localhost';
}

let IP = getLocalIP();

// Jeśli nie znaleziono IP, spróbuj alternatywną metodę (dla Windows – działa przy LAN i przy różnych językach systemu)
if (IP === 'localhost' && process.platform === 'win32') {
    console.log('🔄 Próbuję alternatywną metodę wykrywania IP na Windows (ipconfig)...');
    try {
        const { execSync } = require('child_process');
        const result = execSync('ipconfig', { encoding: 'utf8', timeout: 5000, maxBuffer: 2 * 1024 * 1024 });
        const lines = result.split(/\r?\n/);
        // Szukaj dowolnej linii z adresem IPv4 (EN: "IPv4 Address", PL: "Adres IPv4", inne: często "IPv4")
        const ipv4LabelPattern = /IPv4|Adres IPv4|IPv4 Address/i;
        for (const line of lines) {
            if (!ipv4LabelPattern.test(line)) continue;
            const match = line.match(/(\d+\.\d+\.\d+\.\d+)/);
            if (match && !match[1].startsWith('169.254')) {
                IP = match[1];
                console.log(`✅ Znaleziono IP przez ipconfig: ${IP}`);
                break;
            }
        }
    } catch (err) {
        console.warn('⚠️ Alternatywna metoda ipconfig nie zadziałała:', err.message);
    }
}

// Finalna weryfikacja
if (IP === 'localhost' || IP === '127.0.0.1') {
    console.error('❌ NIE ZNALEZIONO IP SIECIOWEGO!');
    console.error('   Komputer musi być połączony z siecią WiFi/Ethernet');
    console.error('   Telefon NIE będzie mógł się połączyć z serwerem');
}

// === FUNKCJA GENERUJĄCA QR WIFI ===
async function generateWiFiQR(ssid, password = null, wifiTypeParam = null) {
    try {
        console.log('📶 Generuję QR dla sieci:', ssid, password ? '(z hasłem)' : '(bez hasła)', wifiTypeParam ? `(typ: ${wifiTypeParam})` : '');
        
        // Format QR kodu WiFi zgodny ze standardem ZXing:
        // WIFI:T:TYPE;S:SSID;P:PASSWORD;;
        // TYPE: WPA (dla WPA/WPA2/WPA3), WPA2 (dla WPA2-Personal), WEP (dla WEP), nopass (dla otwartej sieci)
        // Escapowanie zgodnie ze standardem ZXing: ; : \ , (NIE escapuj cudzysłowów!)
        // WAŻNE: Niektóre urządzenia (iPad/Android) wymagają escapowania spacji jako \ (backslash+spacja)
        function escapeWiFiString(str, escapeSpaces = true) {
            if (!str) return '';
            // Escapuj tylko wymagane znaki specjalne w odpowiedniej kolejności (najpierw backslash!)
            // UWAGA: Cudzysłowy NIE są escapowane - zgodnie ze standardem ZXing nie mają specjalnego znaczenia
            let escaped = String(str)
                     .replace(/\\/g, '\\\\')  // Najpierw escapuj backslash
                     .replace(/;/g, '\\;')   // Escapuj średnik
                     .replace(/,/g, '\\,')   // Escapuj przecinek
                     .replace(/:/g, '\\:');  // Escapuj dwukropek
            
            // Escapuj spacje jako \ (backslash+spacja) - niektóre urządzenia tego wymagają
            if (escapeSpaces) {
                escaped = escaped.replace(/ /g, '\\ ');
            }
            
            return escaped;
        }
        
        // Normalizuj password: null, undefined, pusty string -> brak hasła
        const passwordNormalized = password && String(password).trim() !== '' ? String(password).trim() : null;
        const hasPassword = passwordNormalized !== null;
        // Użyj podanego typu lub domyślnego WPA2 (niektóre telefony wymagają dokładnego typu)
        // WPA2 jest akceptowany przez ZXing i działa dla WPA2-Personal
        const wifiType = hasPassword ? (wifiTypeParam || 'WPA2') : 'nopass';
        
        // Trim SSID i password
        const ssidTrimmed = String(ssid).trim();
        const passwordTrimmed = passwordNormalized || '';
        
        // Sprawdź czy zawiera specjalne znaki (w tym spacje - niektóre urządzenia wymagają escapowania!)
        const needsEscaping = (str) => /[\\;,: ]/.test(str);
        // Escapuj SSID z uwzględnieniem spacji (niektóre urządzenia wymagają tego)
        const escapedSSID = needsEscaping(ssidTrimmed) ? escapeWiFiString(ssidTrimmed, true) : ssidTrimmed;
        // Password też escapuj ze spacjami
        const escapedPassword = hasPassword ? (needsEscaping(passwordTrimmed) ? escapeWiFiString(passwordTrimmed, true) : passwordTrimmed) : '';
        
        // Buduj string WiFi - format zgodny ze standardem ZXing
        // Format: WIFI:T:WPA2;S:SSID;P:PASSWORD;;
        // WAŻNE: Podwójny średnik na końcu jest wymagany
        // WAŻNE: Kolejność parametrów: T (typ), S (SSID), P (hasło)
        // WAŻNE: NIE dodawaj cudzysłowów do SSID - mogą powodować problemy na iPad/Android
        // WAŻNE: Spacje w SSID są escapowane jako \ (backslash+spacja) dla kompatybilności z niektórymi urządzeniami
        let wifiString;
        if (hasPassword) {
            wifiString = `WIFI:T:${wifiType};S:${escapedSSID};P:${escapedPassword};;`;
        } else {
            wifiString = `WIFI:T:${wifiType};S:${escapedSSID};;`;
        }
        
        // Sprawdź czy nie ma żadnych niewidocznych znaków lub problemów z formatowaniem
        const wifiStringBytes = Buffer.from(wifiString, 'utf8');
        const hasInvalidChars = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(wifiString);
        
        console.log('📶 Wygenerowany string WiFi QR:', wifiString.replace(/P:[^;]+/, 'P:***'));
        console.log('📶 Szczegóły debugowania:', {
            ssid: ssidTrimmed,
            ssidEscaped: escapedSSID,
            ssidHasSpaces: /\s/.test(ssidTrimmed),
            ssidNeedsEscaping: needsEscaping(ssidTrimmed),
            spacesEscaped: escapedSSID.includes('\\ '),
            hasPassword: hasPassword,
            passwordLength: hasPassword ? passwordTrimmed.length : 0,
            passwordNeedsEscaping: hasPassword ? needsEscaping(passwordTrimmed) : false,
            wifiType: wifiType,
            stringLength: wifiString.length,
            stringBytesLength: wifiStringBytes.length,
            fullString: wifiString,
            hasInvalidChars: hasInvalidChars,
            // Sprawdź czy format jest poprawny
            startsWithWIFI: wifiString.startsWith('WIFI:'),
            endsWithDoubleSemicolon: wifiString.endsWith(';;'),
            hasT: wifiString.includes('T:'),
            hasS: wifiString.includes('S:'),
            hasP: hasPassword ? wifiString.includes('P:') : true,
            // Sprawdź każdy segment
            segments: wifiString.split(';').filter(s => s.length > 0),
            // Sprawdź czy nie ma cudzysłowów w SSID (nie powinno być!)
            hasQuotesInSSID: wifiString.includes('S:"') || wifiString.includes('S:\"')
        });
        
        const qrCode = await QRCode.toDataURL(wifiString, {
            width: 300, 
            margin: 4, // Zwiększony margines dla lepszej czytelności
            color: { dark: '#000000', light: '#FFFFFF' },
            errorCorrectionLevel: 'H' // Wysoki poziom korekty błędów dla większej niezawodności
        });
        currentWiFiSSID = ssid;
        return { qrCode: qrCode, ssid: ssid, hasPassword: hasPassword };
    } catch (err) {
        console.error('❌ Błąd generowania QR WiFi:', err);
        return null;
    }
}

// === QR DO GRY – tunel (Pinggy) lub główny adres ===
async function generateGameQR() {
    try {
        let baseUrl = currentPinggyUrl
            ? (normalizePinggyUrl(currentPinggyUrl) || (() => { try { return new URL(currentPinggyUrl).origin; } catch (_) { return currentPinggyUrl.replace(/\/$/, '').replace(/\/[^/].*$/, ''); } })())
            : `http://${IP}:${PORT}`;
        const gameUrl = `${baseUrl.replace(/\/$/, '')}/vote.html`;
        const qrCode = await QRCode.toDataURL(gameUrl, {
            width: 300, margin: 2, color: { dark: '#000000', light: '#FFFFFF' }
        });
        return { qrCode: qrCode, url: gameUrl };
    } catch (err) {
        console.error('❌ Błąd generowania QR do gry:', err);
        return null;
    }
}

// Adres panelu admina – z telefonu/tabletu musi być osiągalny (nie localhost)
function getAdminHost() {
    if (IP !== 'localhost') return IP;
    try {
        const hostname = os.hostname();
        return hostname ? `${hostname}.local` : 'localhost';
    } catch (_) { return 'localhost'; }
}

// === QR DO PANELU ADMINA – HTTPS gdy dostępny (niegasnący ekran), inaczej HTTP ===
async function generateAdminQR() {
    try {
        const proto = httpsServer ? 'https' : 'http';
        const port = httpsServer ? PORT_HTTPS : PORT;
        const adminHost = httpsServer ? IP : getAdminHost();
        const adminUrl = `${proto}://${adminHost}:${port}/admin.html`;
        console.log('📱 Generuję QR admina:', adminUrl);
        console.log('📱 IP:', IP);
        console.log('📱 adminHost:', adminHost);
        
        const qrCode = await QRCode.toDataURL(adminUrl, {
            width: 300, margin: 2, color: { dark: '#000000', light: '#FFFFFF' }
        });
        console.log('✅ QR admin wygenerowany, długość:', qrCode ? qrCode.length : 0);
        return { qrCode: qrCode, url: adminUrl };
    } catch (err) {
        console.error('❌ Błąd generowania QR admin:', err);
        console.error('Stack:', err.stack);
        return null;
    }
}

// === QR DO PANELU ADMIN PWA – ten sam host, ścieżka /admin-pwa.html (instalacja lub połączenie) ===
async function generateAdminPWAQR() {
    try {
        const proto = httpsServer ? 'https' : 'http';
        const port = httpsServer ? PORT_HTTPS : PORT;
        const adminHost = httpsServer ? IP : getAdminHost();
        const adminPwaUrl = `${proto}://${adminHost}:${port}/admin-pwa.html`;
        console.log('📱 Generuję QR admin PWA:', adminPwaUrl);
        const qrCode = await QRCode.toDataURL(adminPwaUrl, {
            width: 300, margin: 2, color: { dark: '#000000', light: '#FFFFFF' }
        });
        return { qrCode: qrCode, url: adminPwaUrl };
    } catch (err) {
        console.error('❌ Błąd generowania QR admin PWA:', err);
        return null;
    }
}

// === QR DO GRY W SIECI LOKALNEJ (zawsze http://IP:PORT/vote.html) ===
async function generateLocalGameQR() {
    try {
        const gameUrl = `http://${IP}:${PORT}/vote.html`;
        const qrCode = await QRCode.toDataURL(gameUrl, {
            width: 300, margin: 2, color: { dark: '#000000', light: '#FFFFFF' }
        });
        return { qrCode: qrCode, url: gameUrl };
    } catch (err) {
        console.error('❌ Błąd generowania QR lokalnego:', err);
        return null;
    }
}

// === SPEEDRUN: przyznaj punkty według kolejności (1. = 1000, 2. = 900, ..., 10. = 100, 11+ = 50 pocieszenia) ===
function applySpeedrunScoring() {
    if (!gameState.speedrunQueue || gameState.speedrunQueue.length === 0) return;
    const pointsByPosition = [1000, 900, 800, 700, 600, 500, 400, 300, 200, 100];
    const sorted = [...gameState.speedrunQueue].sort((a, b) => a.responseTime - b.responseTime);
    sorted.forEach((entry, i) => {
        const player = players.get(entry.socketId);
        if (player) {
            const pts = i < 10 ? pointsByPosition[i] : 50; // top 10 wg pozycji, reszta 50 pkt pocieszenia
            player.score += pts;
            player.correctAnswersCount++;
            if (gameState.teamBattleMode && player.team && gameState.teams[player.team]) {
                gameState.teams[player.team].score += pts * getTeamBalanceMultiplier(player.team);
            }
            const socket = io.sockets.sockets.get(entry.socketId);
            if (socket) sendPlayerScore(socket, player);
        }
    });
    gameState.speedrunQueue = [];
    io.emit('update_team_scores', gameState.teams);
}

// === SZACOWANIE: punkty wg względnej odległości od poprawnej wartości (100 za trafienie, 0 przy ≥50% odchyleniu) ===
function applyEstimationScoring() {
    const question = gameState.activeQuestion;
    if (!question || question.type !== 'ESTIMATION') return;
    const qId = question.id;
    const correctValue = Number(question.correctValue);
    if (Number.isNaN(correctValue)) return;
    // Skala: wartość bezwzględna poprawnej odpowiedzi (min 1 by uniknąć dzielenia przez 0)
    // 100 pkt za dokładne trafienie, 0 pkt gdy odległość ≥ 50% poprawnej wartości
    const scale = Math.max(Math.abs(correctValue), 1);
    players.forEach((player, socketId) => {
        const raw = player.answers[qId];
        if (raw === undefined || raw === null) return;
        const value = Number(raw);
        if (Number.isNaN(value)) return;
        const distance = Math.abs(value - correctValue);
        const points = Math.max(0, Math.round(100 * (1 - 2 * distance / scale)));
        player.score += points;
        if (points > 0) player.correctAnswersCount++;
        if (gameState.teamBattleMode && player.team && gameState.teams[player.team]) {
            gameState.teams[player.team].score += points * getTeamBalanceMultiplier(player.team);
        }
        const socket = io.sockets.sockets.get(socketId);
        if (socket) sendPlayerScore(socket, player);
    });
    io.emit('update_team_scores', gameState.teams);
}

// === ELIMINACJA: sprawdź graczy którzy nie odpowiedzieli na pytanie eliminacyjne ===
// WAŻNE: Eliminacja następuje TYLKO gdy czas się skończy (timeLeft === 0)
// Jeśli admin kliknie przycisk przed czasem, gracze nie są eliminowani
function checkEliminationNoAnswer() {
    const question = gameState.activeQuestion;
    if (!question || !question.elimination) return;
    
    // WAŻNE: Sprawdź czy czas się skończył - eliminacja tylko gdy timeLeft === 0
    if (gameState.timeLeft > 0) {
        console.log(`⏰ Pomijam eliminację - czas jeszcze nie minął (timeLeft: ${gameState.timeLeft})`);
        return;
    }
    
    const qId = question.id;
    if (!qId) return;
    
    let eliminatedCount = 0;
    
    players.forEach((player, socketId) => {
        // Pomiń graczy już wyeliminowanych
        if (player.eliminated) return;
        
        // Sprawdź czy gracz odpowiedział na pytanie
        if (player.answers[qId] === undefined || player.answers[qId] === null) {
            // Gracz nie odpowiedział - wyeliminuj go (tylko gdy czas się skończył)
            player.eliminated = true;
            player.score = 0;
            eliminatedCount++;
            console.log(`💀 Gracz ${player.nick} wyeliminowany za brak odpowiedzi na pytanie eliminacyjne (czas minął)`);
        }
    });
    
    if (eliminatedCount > 0) {
        console.log(`💀 Wyeliminowano ${eliminatedCount} graczy za brak odpowiedzi na pytanie eliminacyjne`);
        io.emit('update_team_scores', gameState.teams);
    }
}

// === WSZYSCY ODPOWIEDZIELI: zakończ odliczanie i pokaż wyniki ===
function haveAllParticipatingPlayersAnswered() {
    const q = gameState.activeQuestion;
    if (!q || !q.id) return false;
    const qId = q.id;
    // Dla LETTER tylko gracze, którzy dostali litery (gra rozpoczęta)
    if (q.type === 'LETTER') {
        if (!gameState.letterGame || !gameState.letterGame.gameStarted || !gameState.letterGame.playerLetters) return false;
        const participantIds = Object.keys(gameState.letterGame.playerLetters);
        if (participantIds.length === 0) return false;
        for (const socketId of participantIds) {
            const p = players.get(socketId);
            if (p && (p.answers[qId] === undefined || p.answers[qId] === null)) return false;
        }
        return true;
    }
    // Dla pozostałych typów: wszyscy podłączeni gracze
    if (players.size === 0) return false;
    for (const [, p] of players) {
        if (p.answers[qId] === undefined || p.answers[qId] === null) return false;
    }
    return true;
}

function endQuestionAndShowStats() {
    if (questionTimer) {
        clearTimeout(questionTimer);
        questionTimer = null;
    }
    gameState.timeLeft = 0;
    applySpeedrunScoring();
    applyEstimationScoring();
    checkEliminationNoAnswer();
    gameState.showStats = true;
    gameState.type = 'GAME_STATS';
    broadcastState();
    console.log('✅ Pokaż wyniki pytania');
}

// === FUNKCJA OBLICZANIA PUNKTÓW ===
function calculatePoints(question, answerIndex, responseTime) {
    const questionType = question.type;
    let correctAnswers = question.correct;
    
    if (correctAnswers === undefined || correctAnswers === null || correctAnswers === -1) {
        correctAnswers = [];
    } else if (!Array.isArray(correctAnswers)) {
        correctAnswers = [correctAnswers];
    }
    
    const isCorrect = correctAnswers.includes(answerIndex);
    
    // SPEEDRUN – punkty przyznawane później według kolejności (tylko 10 pierwszych)
    if (question.speedrun) {
        return { points: 0, isCorrect };
    }
    
    // HOT_OR_NOT – ankieta (brak poprawnej) daje 100 pkt za udział; quiz (poprawna) daje bonus za czas
    if (questionType === 'HOT_OR_NOT') {
        if (correctAnswers.length === 0) {
            return { points: 100, isCorrect: true };
        }
        if (!isCorrect) {
            return { points: 0, isCorrect: false };
        }
        return { points: 100 + calcTimeBonus(question, responseTime), isCorrect: true };
    }
    
    // VOTE / VOTE_IMG – bez poprawnej: 100 pkt za udział; z poprawną: jak QUIZ
    if (questionType === 'VOTE' || questionType === 'VOTE_IMG') {
        if (question.speedrun) return { points: 0, isCorrect: true };
        if (correctAnswers.length === 0) {
            return { points: 100, isCorrect: true };
        }
        if (!isCorrect) return { points: 0, isCorrect: false };
        return { points: 100 + calcTimeBonus(question, responseTime), isCorrect: true };
    }
    
    // QUIZ / MUSIC
    if (!isCorrect) {
        return { points: 0, isCorrect: false };
    }
    return { points: 100 + calcTimeBonus(question, responseTime), isCorrect: true };
}

/**
 * Bonus za szybką odpowiedź: proporcjonalny do czasu, max 100 pkt.
 * Zakres całkowity: 100 (odpowiedź na ostatnią sekundę) – 200 (natychmiastowa).
 * Proporcja najszybszy:najwolniejszy = 2:1.
 */
function calcTimeBonus(question, responseTime) {
    if (gameState.quizOptions.disableTimePoints) return 0;
    const maxTime = question.time || 30;
    const timeBonus = Math.max(0, maxTime - responseTime);
    return Math.floor(timeBonus / maxTime * 100); // proporcjonalne, max 100
}

// Wczytaj pytania
function loadQuestions(filename) {
    try {
        const filePath = path.join(quizzesDir, filename);
        if (!fs.existsSync(filePath)) return { questions: [], options: {} };

        const rawData = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(rawData);
        
        let questions = [];
        let options = { disableTimePoints: false };

        if (Array.isArray(data)) {
            questions = data;
        } else if (data.questions && Array.isArray(data.questions)) {
            questions = data.questions;
            if (data.disableTimePoints) options.disableTimePoints = true;
        } else {
            return { questions: [], options: {} };
        }
        
        // DODAJ ID DO PYTAŃ
        questions.forEach((q, index) => {
            if (!q.id) q.id = `q_${Date.now()}_${index}`;
        });
        
        return { questions, options };
    } catch (err) {
        console.error(`❌ Błąd wczytywania ${filename}:`, err.message);
        return { questions: [], options: {} };
    }
}

function getQuizFiles() {
    try {
        const files = fs.readdirSync(quizzesDir).filter(f => f.toLowerCase().endsWith('.json'));
        return files;
    } catch (err) {
        return [];
    }
}

function getStateForBroadcast() {
    // Konwertuj Set na Array dla shipsGame.playersShot (jeśli istnieje)
    // Dodaj również statystyki trafień graczy
    let shipsGameForBroadcast = null;
    if (gameState.shipsGame) {
        const playerStats = {};
        const shots = gameState.shipsGame.shots || {};
        
        // Zbierz statystyki trafień dla każdego gracza
        Object.keys(shots).forEach(key => {
            const shot = shots[key];
            if (shot.players) {
                shot.players.forEach(playerSocketId => {
                    if (!playerStats[playerSocketId]) {
                        const p = players.get(playerSocketId);
                        playerStats[playerSocketId] = {
                            nick: p ? p.nick : 'Nieznany',
                            hits: 0,
                            misses: 0
                        };
                    }
                    if (shot.hit) {
                        playerStats[playerSocketId].hits++;
                    } else {
                        playerStats[playerSocketId].misses++;
                    }
                });
            }
        });
        
        shipsGameForBroadcast = {
            ...gameState.shipsGame,
            playersShot: Array.from(gameState.shipsGame.playersShot || []),
            playerStats: playerStats
        };
    }
    const eliminatedMap = Object.fromEntries(
        [...players.entries()].map(([id, p]) => [id, !!p.eliminated])
    );
    let openCloud = null;
    let estimationCorrectValue = null;
    let estimationStats = null;
    const q = gameState.activeQuestion;
    const qId = q && q.id;
    // WAŻNE: Generuj chmurę słów dla OPEN/LETTER gdy showStats jest true (niezależnie od showCorrect)
    // To pozwoli pokazać chmurę słów po kliknięciu "Statystyki" w admin.html
    if (q && (q.type === 'OPEN' || q.type === 'LETTER') && qId && gameState.showStats) {
        const map = new Map(); // key = lowercase, value = { word: display, count }
        players.forEach((p) => {
            const raw = p.answers[qId];
            if (raw === undefined || raw === null) return;
            
            // Dla typu LETTER z 2 literami, odpowiedź może być tablicą
            let words = [];
            if (Array.isArray(raw)) {
                words = raw.map(w => String(w).trim()).filter(w => w);
            } else {
                const t = String(raw).trim();
                if (!t) return;
                words = [t];
            }
            
            // Dodaj każde słowo do chmury
            words.forEach(word => {
                const key = word.toLowerCase();
                if (!map.has(key)) map.set(key, { word: word, count: 0 });
                map.get(key).count++;
            });
        });
        openCloud = [...map.values()].sort((a, b) => b.count - a.count);
    }
    if (q && q.type === 'ESTIMATION' && qId && (gameState.showStats || gameState.showCorrect)) {
        const correctVal = Number(q.correctValue);
        if (!Number.isNaN(correctVal)) estimationCorrectValue = correctVal;
        const dist = new Map(); // value -> count
        players.forEach((p) => {
            const raw = p.answers[qId];
            if (raw === undefined || raw === null) return;
            const val = Number(raw);
            if (Number.isNaN(val)) return;
            const key = Math.round(val);
            if (!dist.has(key)) dist.set(key, 0);
            dist.set(key, dist.get(key) + 1);
        });
        estimationStats = [...dist.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => a.value - b.value);
    }
    
    // Policz graczy w drużynach (tylko aktywni gracze, bez rozłączeń)
    let teamACount = 0;
    let teamBCount = 0;
    if (gameState.teamBattleMode) {
        players.forEach((player) => {
            if (player.team === 'A') teamACount++;
            else if (player.team === 'B') teamBCount++;
        });
    }
    
    return { 
        ...gameState, 
        eliminatedMap, 
        openCloud, 
        estimationCorrectValue, 
        estimationStats, 
        playersCount: players.size,
        teams: gameState.teamBattleMode ? {
            A: { ...gameState.teams.A, playerCount: teamACount },
            B: { ...gameState.teams.B, playerCount: teamBCount }
        } : gameState.teams,
        shipsGame: shipsGameForBroadcast,
        shipsSoloGame: gameState.shipsSoloGame || null,
        letterGame: gameState.letterGame,
        thanksScreen: gameState.thanksScreen,
        hasWifi: !!currentWiFiSSID,
        tunnelUrl: currentPinggyUrl || null,
        shortUrl: currentShortUrl || null,
        sessionCode: currentSessionCode || null,
        renderDolaczUrl: (() => { const b = process.env.RENDER_EXTERNAL_URL || process.env.STRIPE_DOMAIN || ''; return b ? b.replace(/\/$/, '') + '/dolacz' : null; })(),
        showLocalGameQR: showLocalGameQR,
        localGameUrl: `http://${IP}:${PORT}/vote.html`,
        showAdminQR: !(io.sockets.adapter.rooms.get(ADMIN_ROOM)?.size > 0),
        adminUrl: httpsServer ? `https://${IP}:${PORT_HTTPS}/admin.html` : `http://${getAdminHost()}:${PORT}/admin.html`,
        showPlayersWithQR: gameState.showPlayersWithQR,
        showZarazZaczynamy: gameState.showZarazZaczynamy,
        playerNicks: Array.from(players.values()).map(p => p.nick || '').filter(Boolean),
        wyborczyState: (wyborczySession && q && q.type === 'WYBORCZY') ? (function() {
            const ws = buildWyborczyState();
            ws.photoTimeLeft = wyborczyPhotoTimeLeft;
            ws.photoDuration = q.time || 15;
            ws.tiedIndices = getWyborczyTies(ws.ranking);
            return ws;
        })() : null,
        hncState: (q && q.type === 'HNC') ? hncGetState() : null
    };
}

// Funkcja do wysłania indywidualnego wyniku gracza
function sendPlayerScore(socket, player) {
    if (player) {
        socket.emit('player_score_update', { score: player.score, correctCount: player.correctAnswersCount });
    }
}

// Throttle broadcast – przy 10+ telefonach wiele odpowiedzi w krótkim czasie powodowało przeciążenie sieci
let broadcastTimer = null;
const BROADCAST_DEBOUNCE_MS = parseInt(process.env.IMPREZJA_BROADCAST_DEBOUNCE_MS, 10) || 250;

// Slim state dla telefonów — usuwa dane potrzebne tylko adminowi (playerNicks, playerStats w shipsGame).
// eliminatedMap pozostaje bo vote.html używa state.eliminatedMap[socket.id].
function getPhoneState(fullState) {
    const s = { ...fullState };
    // Telefony nie wyświetlają listy nicków wszystkich graczy — to widok admina
    // Wyjątek: gdy showPlayersWithQR, screen.html (TV) potrzebuje playerNicks do latających nicków
    if (!s.showPlayersWithQR) delete s.playerNicks;
    // playerStats zostaje – Screen.html (TV) też go potrzebuje do tabeli trafień
    return s;
}

function broadcastState() {
    if (gameMode === 'familiada') return;
    // Admin ma priorytet – dostaje pełny update od razu (bez throttle), żeby panel się nie zawieszał
    io.to(ADMIN_ROOM).emit('update_state', getStateForBroadcast());
    if (broadcastTimer) clearTimeout(broadcastTimer);
    broadcastTimer = setTimeout(() => {
        broadcastTimer = null;
        // Telefony dostają odchudzony payload (bez playerNicks i playerStats z shipsGame)
        io.except(ADMIN_ROOM).emit('update_state', getPhoneState(getStateForBroadcast()));
    }, BROADCAST_DEBOUNCE_MS);
}

function broadcastStateImmediate() {
    if (gameMode === 'familiada') return;
    if (broadcastTimer) {
        clearTimeout(broadcastTimer);
        broadcastTimer = null;
    }
    const full = getStateForBroadcast();
    io.to(ADMIN_ROOM).emit('update_state', full);
    io.except(ADMIN_ROOM).emit('update_state', getPhoneState(full));
}

function updateUsersCount() {
    io.emit('users_count', players.size);
}

function calculateLeaderboard() {
    const totalScoredQuestions = gameState.questions.filter(q => q.type === 'QUIZ' || q.type === 'MUSIC').length;
    
    // Zbierz wszystkich graczy: aktywnych + tych w grace period + rozłączeni z punktami
    const allPlayers = Array.from(players.values());
    
    // Dodaj graczy z pendingDisconnects (którzy stracili połączenie ale jeszcze nie zostali usunięci - grace period)
    for (const [socketId, pending] of pendingDisconnects.entries()) {
        allPlayers.push(pending.player);
    }
    
    // Dodaj graczy którzy stracili połączenie ale mają punkty (zachowani do końca gry)
    for (const [nick, player] of disconnectedPlayersWithScore.entries()) {
        // Sprawdź czy gracz nie jest już aktywny (może się ponownie połączył)
        const isActive = Array.from(players.values()).some(p => p.nick === nick);
        if (!isActive) {
            allPlayers.push(player);
        }
    }
    
    // Usuń duplikaty (jeśli gracz jest jednocześnie w players i innych mapach - użyj tego z players)
    const uniquePlayers = new Map();
    allPlayers.forEach(p => {
        // Użyj nick jako klucza unikalności - preferuj aktywnych graczy
        if (!uniquePlayers.has(p.nick)) {
            uniquePlayers.set(p.nick, p);
        } else {
            // Jeśli już istnieje, sprawdź czy nowy ma wyższy wynik lub jest aktywny
            const existing = uniquePlayers.get(p.nick);
            const isNewActive = players.has(p.socketId);
            const isExistingActive = players.has(existing.socketId);
            
            // Preferuj aktywnych graczy, lub tych z wyższym wynikiem
            if ((isNewActive && !isExistingActive) || 
                (!isNewActive && !isExistingActive && p.score > existing.score) ||
                (isNewActive && isExistingActive && p.score > existing.score)) {
                uniquePlayers.set(p.nick, p);
            }
        }
    });
    
    return Array.from(uniquePlayers.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(p => ({ 
            nick: p.nick, 
            score: p.score,
            correctCount: p.correctAnswersCount,
            totalQuestions: totalScoredQuestions
        }));
}

// === SOCKET.IO ===

/** Reset do IDLE gdy gra jest "osierocona" – pytania wyświetlane, ale brak graczy i admina (np. po restarcie aplikacji przy działającym serwerze) */
function resetOrphanedGameState() {
    const isGameActive = gameState.type === 'GAME' || gameState.type === 'GAME_STATS';
    const hasQuestions = gameState.questions && gameState.questions.length > 0;
    const noPlayers = players.size === 0;
    const hasPendingReconnects = pendingDisconnects.size > 0;
    if (isGameActive && hasQuestions && noPlayers && !hasPendingReconnects) {
        console.log('🔄 Wykryto osierocony stan gry (pytania bez graczy) – reset do ekranu startowego');
        if (gameState.activeQuestion && gameState.activeQuestion.type === 'WYBORCZY') stopWyborczyQuestionOnServer();
        gameState.type = 'IDLE';
        gameState.activeQuestionIndex = -1;
        gameState.activeQuestion = null;
        gameState.showStats = false;
        gameState.showCorrect = false;
        gameState.stats = {};
        gameState.questions = [];
        gameState.leaderboard = [];
        gameState.podiumStep = 0;
        gameState.winners = [];
        gameState.teams = { A: { name: '', score: 0 }, B: { name: '', score: 0 } };
        gameState.playoff = null;
        gameState.shipsGame = null;
        gameState.letterGame = null;
        if (questionTimer) {
            clearInterval(questionTimer);
            questionTimer = null;
        }
        broadcastState();
    }
}

io.on('connection', (socket) => {
    resetOrphanedGameState();
    socket.emit('master_volume', { volume: masterVolume });
    socket.emit('quiz_volume', { volume: quizVolume });
    socket.emit('ships_solo_volume', { volume: statkiVolume });

    // === SCREEN CONTROLLER (ekran główny sterowany z Admin PWA) ===
    socket.on('screen_join', () => {
        socket.join('screen_controller');
        socket.emit('screen_state', {
            mode: screenControllerMode,
            welcome: welcomeScreenData
        });
        if (musicModeGraphicUrl) socket.emit('music_mode_screen', { graphicUrl: musicModeGraphicUrl });
    });
    socket.on('admin_join', () => {
        socket.join(ADMIN_ROOM);
        adminHasBeenOpened = true;
        socket.emit('screen_state', {
            mode: screenControllerMode,
            welcome: welcomeScreenData
        });
        if (musicModeGraphicUrl) socket.emit('music_mode_screen', { graphicUrl: musicModeGraphicUrl });
    });
    const MUSIC_MODES_WITH_GRAPHIC = ['sampler', 'spiewaj', 'bitwa', 'whitney', 'imprezator'];
    socket.on('screen_switch', (data) => {
        const mode = (data && data.mode) || 'welcome';
        const allowed = ['welcome', 'quiz', 'familiada', 'statki', 'prezentacja', 'camera', 'stream', 'sampler', 'spiewaj', 'bitwa', 'whitney', 'imprezator'];
        if (allowed.includes(mode)) {
            screenControllerMode = mode;
            if (!MUSIC_MODES_WITH_GRAPHIC.includes(mode)) {
                musicModeGraphicUrl = '';
                io.emit('music_mode_screen', { graphicUrl: '' });
            }
            if (mode === 'quiz') {
                gameState.showZarazZaczynamy = false;
                gameState.showPlayersWithQR = true;
            }
            if (mode === 'familiada') {
                familiadaShowStartScreenOnConnect = true;
                io.to('familiada').emit('familiada_show_start_screen');
            }
            io.emit('screen_switch', { mode });
            if (mode === 'quiz') broadcastStateImmediate();
        }
    });
    socket.on('welcome_update', (data) => {
        if (data && typeof data === 'object') {
            if (typeof data.imageUrl === 'string') welcomeScreenData.imageUrl = data.imageUrl;
            if (typeof data.text === 'string') welcomeScreenData.text = data.text;
            if (typeof data.logoVisible === 'boolean') welcomeScreenData.logoVisible = data.logoVisible;
            if (data.textPosition === 'top' || data.textPosition === 'center' || data.textPosition === 'bottom') welcomeScreenData.textPosition = data.textPosition;
            if (data.fontSize === 'small' || data.fontSize === 'medium' || data.fontSize === 'large') welcomeScreenData.fontSize = data.fontSize;
            if (typeof data.textColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(data.textColor)) welcomeScreenData.textColor = data.textColor;
            io.emit('welcome_update', { ...welcomeScreenData });
        }
    });
    socket.on('camera_frame', (data) => {
        if (!data || data.image == null) return;
        // Wysyłamy tylko do ekranu TV – nie do admina/telefonów (oszczędność pasma)
        io.to('screen_controller').emit('camera_frame', { image: data.image });
    });
    socket.on('music_mode_screen', (data) => {
        if (data && typeof data === 'object') {
            musicModeGraphicUrl = data.graphicUrl || '';
            io.emit('music_mode_screen', { graphicUrl: musicModeGraphicUrl });
        }
    });

    // === PREZENTACJA ===
    socket.on('prezentacja_join', () => {
        socket.emit('prezentacja_volume', { volume: prezentacjaVolume });
        socket.emit('prezentacja_state', {
            config: prezentacjaConfig,
            index: prezentacjaIndex,
            playing: prezentacjaPlaying,
            loop: prezentacjaLoop,
            liveOverlay: { type: liveOverlayType, countdownMinutes: liveOverlayCountdownMinutes, text: liveOverlayText, textPosition: liveOverlayTextPosition }
        });
    });
    socket.on('prezentacja_load', (data) => {
        const name = (data && data.name) || '';
        if (!name) return;
        const fp = getPrezentacjaPath(name);
        if (!fs.existsSync(fp)) return;
        try {
            prezentacjaConfig = JSON.parse(fs.readFileSync(fp, 'utf8'));
            prezentacjaIndex = 0;
            prezentacjaPlaying = false;
            if (PREZENTACJE_LAST_FILE) fs.writeFileSync(PREZENTACJE_LAST_FILE, JSON.stringify({ name }), 'utf8');
            io.emit('prezentacja_loaded', { config: prezentacjaConfig, index: 0 });
        } catch (_) {}
    });
    socket.on('prezentacja_next', () => {
        if (!prezentacjaConfig || !prezentacjaConfig.slides || prezentacjaConfig.slides.length === 0) return;
        const slide = prezentacjaConfig.slides[prezentacjaIndex];
        const preset = String(slide && slide.preset || '').toLowerCase();
        const isWinamp = slide && slide.type === 'visualization' && (preset === 'winamp' || preset === 'tunnel');
        const isWebvs = slide && slide.type === 'visualization' && preset === 'webvs';
        const isMilkdrop = slide && slide.type === 'visualization' && preset === 'milkdrop';
        if (isWinamp || isWebvs || isMilkdrop) {
            io.emit('prezentacja_winamp_mode', { delta: 1 });
            return;
        }
        prezentacjaIndex = (prezentacjaIndex + 1) % prezentacjaConfig.slides.length;
        if (!prezentacjaLoop && prezentacjaIndex === 0) prezentacjaPlaying = false;
        io.emit('prezentacja_slide', { index: prezentacjaIndex, playing: prezentacjaPlaying });
    });
    socket.on('prezentacja_prev', () => {
        if (!prezentacjaConfig || !prezentacjaConfig.slides || prezentacjaConfig.slides.length === 0) return;
        const slide = prezentacjaConfig.slides[prezentacjaIndex];
        const preset = String(slide && slide.preset || '').toLowerCase();
        const isWinamp = slide && slide.type === 'visualization' && (preset === 'winamp' || preset === 'tunnel');
        const isWebvs = slide && slide.type === 'visualization' && preset === 'webvs';
        const isMilkdrop = slide && slide.type === 'visualization' && preset === 'milkdrop';
        if (isWinamp || isWebvs || isMilkdrop) {
            io.emit('prezentacja_winamp_mode', { delta: -1 });
            return;
        }
        prezentacjaIndex = prezentacjaIndex <= 0 ? prezentacjaConfig.slides.length - 1 : prezentacjaIndex - 1;
        io.emit('prezentacja_slide', { index: prezentacjaIndex, playing: prezentacjaPlaying });
    });
    socket.on('prezentacja_go', (data) => {
        const idx = parseInt(data && data.index, 10);
        if (isNaN(idx) || !prezentacjaConfig || !prezentacjaConfig.slides) return;
        if (idx >= 0 && idx < prezentacjaConfig.slides.length) {
            prezentacjaIndex = idx;
            io.emit('prezentacja_slide', { index: prezentacjaIndex, playing: prezentacjaPlaying });
        }
    });
    socket.on('prezentacja_play', () => {
        prezentacjaPlaying = true;
        io.emit('prezentacja_playing', { playing: true });
    });
    socket.on('prezentacja_pause', () => {
        prezentacjaPlaying = false;
        io.emit('prezentacja_playing', { playing: false });
    });
    socket.on('prezentacja_loop', (data) => {
        prezentacjaLoop = !!(data && data.loop);
        io.emit('prezentacja_loop', { loop: prezentacjaLoop });
    });

    let liveOverlayType = 'none';
    let liveOverlayCountdownMinutes = 3;
    let liveOverlayText = '';
    let liveOverlayTextPosition = 'center';
    socket.on('prezentacja_overlay', (data) => {
        const t = (data && data.type) || 'none';
        if (t === 'none') {
            liveOverlayType = 'none';
        } else {
            liveOverlayType = t;
            if (t === 'countdown') {
                const m = parseFloat(String(data.countdownMinutes || 3).replace(',', '.'));
                liveOverlayCountdownMinutes = !isNaN(m) && m >= 1 ? Math.min(120, m) : 3;
            } else if (t === 'text') {
                liveOverlayText = String(data.text || '').slice(0, 200);
                liveOverlayTextPosition = ['top', 'center', 'bottom'].includes(data.textPosition) ? data.textPosition : 'center';
            }
        }
        io.emit('prezentacja_overlay', {
            type: liveOverlayType,
            countdownMinutes: liveOverlayCountdownMinutes,
            text: liveOverlayText,
            textPosition: liveOverlayTextPosition
        });
    });

    // === MIK SER – Master (globalny mnożnik) + kanały (per-tryb). Wyjście = kanał × master ===
    socket.on('master_volume', (data) => {
        const v = parseFloat(data && data.volume);
        if (!isNaN(v) && v >= 0 && v <= 1) {
            masterVolume = v;
            saveVolumes();
            io.emit('master_volume', { volume: masterVolume });
            broadcastEffectiveVolumes();
        }
    });
    socket.on('master_volume_request', () => {
        socket.emit('master_volume', { volume: masterVolume });
    });
    socket.on('volumes_request', () => {
        socket.emit('volumes_all', {
            master: masterVolume, quiz: quizVolume, familiada: familiadaVolume, statki: statkiVolume,
            prezentacja: prezentacjaVolume, sampler: njrSamplerVolume, whitney: whitneyVolume,
            spiewaj: spiewajDalejVolume, bitwa: bitwaWokalnaVolume, imprezator: imprezatorVolume
        });
    });
    socket.on('channel_volume', (data) => {
        const ch = data && data.channel;
        const v = parseFloat(data && data.volume);
        if (isNaN(v) || v < 0 || v > 1) return;
        const set = (name, setter) => { setter(v); saveVolumes(); broadcastEffectiveVolumes(); };
        if (ch === 'quiz') set('quiz', x => { quizVolume = x; });
        else if (ch === 'familiada') set('familiada', x => { familiadaVolume = x; });
        else if (ch === 'statki') set('statki', x => { statkiVolume = x; });
        else if (ch === 'prezentacja') set('prezentacja', x => { prezentacjaVolume = x; });
        else if (ch === 'sampler') set('sampler', x => { njrSamplerVolume = x; });
        else if (ch === 'whitney') set('whitney', x => { whitneyVolume = x; });
        else if (ch === 'spiewaj') set('spiewaj', x => { spiewajDalejVolume = x; });
        else if (ch === 'bitwa') set('bitwa', x => { bitwaWokalnaVolume = x; });
        else if (ch === 'imprezator') set('imprezator', x => { imprezatorVolume = x; });
    });

    // === FAMILIADA ===
    socket.on('register_familiada', (data) => {
        socket.familiadaRole = (data && data.role) || null;
        socket.join('familiada');
        socket.emit('familiada_volume', familiadaVolume);
        if (socket.familiadaRole === 'screen' && familiadaShowStartScreenOnConnect) {
            familiadaShowStartScreenOnConnect = false;
            socket.emit('familiada_show_start_screen');
        }
        if (socket.familiadaRole === 'admin') {
            socket.emit('init_admin', familiadaQuestions);
            socket.emit('familiada_golden_list', familiadaGoldenQuestions);
        }
        socket.emit('update_scores', { t1: familiadaTeam1Score, t2: familiadaTeam2Score, roundAwarded: familiadaRoundAwardedTo !== null, team1: familiadaTeam1Name, team2: familiadaTeam2Name });
        socket.emit('familiada_team_names', { team1: familiadaTeam1Name, team2: familiadaTeam2Name });
        io.to('familiada').emit('familiada_request_intro_state');
    });
    socket.on('familiada_set_mode', () => {
        gameMode = 'familiada';
        socket.join('familiada');
        familiadaTeam1Score = 0;
        familiadaTeam2Score = 0;
        familiadaRoundAwardedTo = null;
        io.to('familiada').emit('update_scores', { t1: 0, t2: 0, roundAwarded: false, team1: familiadaTeam1Name, team2: familiadaTeam2Name });
        socket.emit('familiada_team_names', { team1: familiadaTeam1Name, team2: familiadaTeam2Name });
    });
    socket.on('familiada_set_team_names', (data) => {
        if (socket.familiadaRole !== 'admin') return;
        if (data.team1 && data.team1.trim()) familiadaTeam1Name = data.team1.trim();
        if (data.team2 && data.team2.trim()) familiadaTeam2Name = data.team2.trim();
        const payload = { team1: familiadaTeam1Name, team2: familiadaTeam2Name };
        io.to('familiada').emit('familiada_team_names', payload);
        io.emit('familiada_team_names', payload);
        io.to('familiada').emit('board_update', { type: 'TEAM_NAMES', ...payload });
    });
    socket.on('familiada_request_team_names', () => {
        socket.emit('familiada_team_names', { team1: familiadaTeam1Name, team2: familiadaTeam2Name });
    });
    socket.on('familiada_request_qr_admin', async () => {
        const proto = httpsServer ? 'https' : 'http';
        const port = httpsServer ? PORT_HTTPS : PORT;
        const adminUrl = `${proto}://${IP}:${port}/familiada/admin.html`;
        const buttonsUrl = `${proto}://${IP}:${port}/familiada/buttons.html`;
        try {
            const [adminQr, buttonsQr] = await Promise.all([
                QRCode.toDataURL(adminUrl, { width: 220, margin: 2 }),
                QRCode.toDataURL(buttonsUrl, { width: 220, margin: 2 })
            ]);
            socket.emit('familiada_qr_admin', { qrCode: adminQr, url: adminUrl });
            socket.emit('familiada_qr_buttons', { qrCode: buttonsQr, url: buttonsUrl });
        } catch (err) {
            socket.emit('familiada_qr_admin', { url: adminUrl });
            socket.emit('familiada_qr_buttons', { url: buttonsUrl });
        }
    });
    socket.on('set_game_mode', (mode) => {
        if (mode === 'quiz') gameMode = 'quiz';
    });

    // NJR Sampler – ekran (komputer) i telefon
    socket.on('njr_sampler_join_screen', () => {
        socket.join('njr_sampler_screen');
        socket.emit('njr_sampler_state', { active: njrSamplerActive, config: njrSamplerConfig });
        socket.emit('njr_sampler_volume', Math.min(1, njrSamplerVolume * masterVolume));
    });
    socket.on('njr_sampler_join_phone', () => {
        socket.join('njr_sampler_phone');
        const phoneConfig = buildNjrSamplerStateForPhone();
        socket.emit('njr_sampler_state', { active: njrSamplerActive, config: phoneConfig });
        socket.emit('njr_sampler_volume_sync', njrSamplerVolume); // telefon ustawia suwak
    });
    socket.on('njr_sampler_set_bank', (index) => {
        if (!njrSamplerActive) return;
        io.to('njr_sampler_phone').emit('njr_sampler_set_bank', { index: Math.max(0, Math.floor(index)) });
    });
    socket.on('njr_sampler_bank_delta', (delta) => {
        if (!njrSamplerActive) return;
        io.to('njr_sampler_phone').emit('njr_sampler_bank_delta', { delta: delta === 1 || delta === -1 ? delta : 0 });
    });
    socket.on('njr_sampler_toggle', (payload) => {
        if (!njrSamplerActive) return;
        const banks = njrSamplerConfig.banks || [{ tiles: njrSamplerConfig.tiles || [] }];
        let bankIndex = (typeof payload === 'object' && payload != null && typeof payload.bankIndex === 'number') ? payload.bankIndex : 0;
        bankIndex = Math.max(0, Math.min(bankIndex, banks.length - 1));
        const tileId = (typeof payload === 'object' && payload != null && payload.tileId != null) ? payload.tileId : payload;
        const bank = banks[bankIndex];
        const tiles = bank ? (bank.tiles || []) : [];
        const tile = tiles.find(t => t.id === tileId);
        if (!tile || !tile.audio) return;
        const vol = Math.max(0, Math.min(100, tile.volume ?? 100)) / 100;
        let audioUrl = tile.audio.startsWith('/') || tile.audio.startsWith('http') ? tile.audio : '/uploads/' + tile.audio;
        if (/\.(vdjsample|ogg)$/i.test(audioUrl)) audioUrl = '/api/audio/stream?path=' + encodeURIComponent(audioUrl);
        const isBg = !!tile.isBackground;
        const loop = !!tile.loop;
        const normalizedGain = typeof tile.normalizedGain === 'number' ? tile.normalizedGain : undefined;
        const playPayload = (u, v, lp, isBg) => ({ url: u, volume: v, loop: lp, isBackground: isBg, ...(normalizedGain != null && { normalizedGain }) });
        const thenPlayPayload = (u, v, lp) => ({ url: u, volume: v, loop: lp, ...(normalizedGain != null && { normalizedGain }) });

        if (isBg) {
            if (njrSamplerPlayingBackgroundTile === tileId && njrSamplerPlayingBackgroundBankIndex === bankIndex) {
                njrSamplerPlayingBackgroundTile = null;
                njrSamplerPlayingBackgroundBankIndex = null;
                io.to('njr_sampler_screen').emit('njr_sampler_stop_background', { fadeOut: true });
                io.to('njr_sampler_phone').emit('njr_sampler_playing', { tileId: null, bankIndex: null, isBackground: true });
            } else {
                const prevBgId = njrSamplerPlayingBackgroundTile;
                const prevBgBank = njrSamplerPlayingBackgroundBankIndex != null ? banks[njrSamplerPlayingBackgroundBankIndex] : null;
                const prevBgTile = prevBgId && prevBgBank ? (prevBgBank.tiles || []).find(t => t.id === prevBgId) : null;
                njrSamplerPlayingBackgroundTile = tileId;
                njrSamplerPlayingBackgroundBankIndex = bankIndex;
                if (njrSamplerPlayingImprezatorTrack) {
                    njrSamplerPlayingImprezatorTrack = null;
                    io.to('njr_sampler_screen').emit('njr_sampler_imprezator_stop');
                    io.to('njr_sampler_phone').emit('njr_sampler_imprezator_playing', null);
                }
                if (prevBgId && prevBgTile && !!prevBgTile.fadeOut) {
                    io.to('njr_sampler_screen').emit('njr_sampler_stop_background', { fadeOut: true, thenPlay: thenPlayPayload(audioUrl, vol, loop) });
                } else {
                    if (prevBgId) io.to('njr_sampler_screen').emit('njr_sampler_stop_background', { fadeOut: false });
                    io.to('njr_sampler_screen').emit('njr_sampler_play', playPayload(audioUrl, vol, loop, true));
                }
                audioMonitorLast = { type: 'sampler_tile', tileId, bankIndex, isBg: true };
                io.to('njr_sampler_phone').emit('njr_sampler_playing', { tileId, bankIndex, isBackground: true });
            }
        } else {
            if (njrSamplerPlayingTile === tileId && njrSamplerPlayingBankIndex === bankIndex) {
                njrSamplerPlayingTile = null;
                njrSamplerPlayingBankIndex = null;
                io.to('njr_sampler_screen').emit('njr_sampler_stop', { fadeOut: true });
                io.to('njr_sampler_phone').emit('njr_sampler_playing', { tileId: null, bankIndex: null, isBackground: false });
            } else {
                const prevTileId = njrSamplerPlayingTile;
                const prevBank = njrSamplerPlayingBankIndex != null ? banks[njrSamplerPlayingBankIndex] : null;
                const prevTile = prevTileId && prevBank ? (prevBank.tiles || []).find(t => t.id === prevTileId) : null;
                njrSamplerPlayingTile = tileId;
                njrSamplerPlayingBankIndex = bankIndex;
                if (njrSamplerPlayingImprezatorTrack) {
                    njrSamplerPlayingImprezatorTrack = null;
                    io.to('njr_sampler_screen').emit('njr_sampler_imprezator_stop');
                    io.to('njr_sampler_phone').emit('njr_sampler_imprezator_playing', null);
                }
                if (prevTileId && prevTile && !!prevTile.fadeOut) {
                    io.to('njr_sampler_screen').emit('njr_sampler_stop', { fadeOut: true, thenPlay: thenPlayPayload(audioUrl, vol, loop) });
                } else {
                    if (prevTileId) io.to('njr_sampler_screen').emit('njr_sampler_stop', { fadeOut: false });
                    io.to('njr_sampler_screen').emit('njr_sampler_play', playPayload(audioUrl, vol, loop, false));
                }
                audioMonitorLast = { type: 'sampler_tile', tileId, bankIndex, isBg: false };
                io.to('njr_sampler_phone').emit('njr_sampler_playing', { tileId, bankIndex, isBackground: false });
            }
        }
        emitAudioMonitorState();
    });
    socket.on('njr_sampler_background_ended', () => {
        njrSamplerPlayingBackgroundTile = null;
        njrSamplerPlayingBackgroundBankIndex = null;
        io.to('njr_sampler_phone').emit('njr_sampler_playing', { tileId: null, bankIndex: null, isBackground: true });
        emitAudioMonitorState();
    });
    socket.on('njr_sampler_volume', (vol) => {
        njrSamplerVolume = Math.max(0, Math.min(1, vol));
        saveVolumes();
        io.to('njr_sampler_screen').emit('njr_sampler_volume', Math.min(1, njrSamplerVolume * masterVolume));
        io.to('njr_sampler_phone').emit('njr_sampler_volume_sync', njrSamplerVolume);
    });

    socket.on('njr_sampler_imprezator_toggle', (trackId) => {
        if (!njrSamplerActive || !trackId) return;
        let track = null;
        if (imprezatorConfig && imprezatorConfig.banks && Array.isArray(imprezatorConfig.banks)) {
            for (const b of imprezatorConfig.banks) {
                track = (b.tracks || []).find(t => t.id === trackId);
                if (track) break;
            }
        } else if (imprezatorConfig) {
            track = (imprezatorConfig.tracks || []).find(t => t.id === trackId);
        }
        if (!track || !track.audio) return;

        if (njrSamplerPlayingImprezatorTrack === trackId) {
            njrSamplerPlayingImprezatorTrack = null;
            io.to('njr_sampler_screen').emit('njr_sampler_imprezator_stop');
            io.to('njr_sampler_phone').emit('njr_sampler_imprezator_playing', null);
        } else {
            if (njrSamplerPlayingTile) {
                njrSamplerPlayingTile = null;
                njrSamplerPlayingBankIndex = null;
                io.to('njr_sampler_screen').emit('njr_sampler_stop');
                io.to('njr_sampler_phone').emit('njr_sampler_playing', { tileId: null, bankIndex: null, isBackground: false });
            }
            njrSamplerPlayingImprezatorTrack = trackId;
            audioMonitorLast = { type: 'sampler_imprezator', trackId };
            const audioUrl = '/api/imprezator/stream?path=' + encodeURIComponent(track.audio);
            io.to('njr_sampler_screen').emit('njr_sampler_imprezator_play', {
                url: audioUrl,
                volume: njrSamplerVolume,
                trackId
            });
            io.to('njr_sampler_phone').emit('njr_sampler_imprezator_playing', trackId);
        }
        emitAudioMonitorState();
    });

    socket.on('njr_sampler_imprezator_ended', () => {
        njrSamplerPlayingImprezatorTrack = null;
        io.to('njr_sampler_phone').emit('njr_sampler_imprezator_playing', null);
        emitAudioMonitorState();
    });

    // Monitor audio – przycisk play/pause na ekranie głównym start.html
    socket.on('join_audio_monitor', () => {
        socket.join('audio_monitor');
        const isPlaying = !!(njrSamplerPlayingTile || njrSamplerPlayingBackgroundTile || njrSamplerPlayingImprezatorTrack || imprezatorCurrentlyPlaying);
        socket.emit('audio_monitor_state', { isPlaying, hasLast: !!audioMonitorLast });
    });

    socket.on('audio_monitor_stop', () => {
        if (njrSamplerPlayingTile) {
            njrSamplerPlayingTile = null;
            njrSamplerPlayingBankIndex = null;
            io.to('njr_sampler_screen').emit('njr_sampler_stop');
            io.to('njr_sampler_phone').emit('njr_sampler_playing', { tileId: null, bankIndex: null, isBackground: false });
        }
        if (njrSamplerPlayingBackgroundTile) {
            njrSamplerPlayingBackgroundTile = null;
            njrSamplerPlayingBackgroundBankIndex = null;
            io.to('njr_sampler_screen').emit('njr_sampler_stop_background', { fadeOut: false });
            io.to('njr_sampler_phone').emit('njr_sampler_playing', { tileId: null, bankIndex: null, isBackground: true });
        }
        if (njrSamplerPlayingImprezatorTrack) {
            njrSamplerPlayingImprezatorTrack = null;
            io.to('njr_sampler_screen').emit('njr_sampler_imprezator_stop');
            io.to('njr_sampler_phone').emit('njr_sampler_imprezator_playing', null);
        }
        if (imprezatorCurrentlyPlaying) {
            imprezatorCurrentlyPlaying = false;
            io.to('imprezator_screen').emit('imprezator_stop');
        }
        emitAudioMonitorState();
    });

    socket.on('audio_monitor_play_last', () => {
        if (!audioMonitorLast) return;
        const last = audioMonitorLast;
        if (last.type === 'sampler_tile') {
            const banks = njrSamplerConfig.banks || [{ tiles: njrSamplerConfig.tiles || [] }];
            const bank = banks[last.bankIndex] || banks[0];
            const tile = (bank ? (bank.tiles || []) : []).find(t => t.id === last.tileId);
            if (!tile || !tile.audio) return;
            const vol = Math.max(0, Math.min(100, tile.volume ?? 100)) / 100;
            let audioUrl = tile.audio.startsWith('/') || tile.audio.startsWith('http') ? tile.audio : '/uploads/' + tile.audio;
            if (/\.(vdjsample|ogg)$/i.test(audioUrl)) audioUrl = '/api/audio/stream?path=' + encodeURIComponent(audioUrl);
            if (last.isBg) {
                njrSamplerPlayingBackgroundTile = last.tileId;
                njrSamplerPlayingBackgroundBankIndex = last.bankIndex;
                io.to('njr_sampler_screen').emit('njr_sampler_play', { url: audioUrl, volume: vol, isBackground: true, loop: !!tile.loop });
                io.to('njr_sampler_phone').emit('njr_sampler_playing', { tileId: last.tileId, bankIndex: last.bankIndex, isBackground: true });
            } else {
                njrSamplerPlayingTile = last.tileId;
                njrSamplerPlayingBankIndex = last.bankIndex;
                io.to('njr_sampler_screen').emit('njr_sampler_play', { url: audioUrl, volume: vol, isBackground: false, loop: !!tile.loop });
                io.to('njr_sampler_phone').emit('njr_sampler_playing', { tileId: last.tileId, bankIndex: last.bankIndex, isBackground: false });
            }
        } else if (last.type === 'sampler_imprezator') {
            let track = null;
            if (imprezatorConfig && imprezatorConfig.banks) {
                for (const b of imprezatorConfig.banks) { track = (b.tracks || []).find(t => t.id === last.trackId); if (track) break; }
            } else if (imprezatorConfig) {
                track = (imprezatorConfig.tracks || []).find(t => t.id === last.trackId);
            }
            if (!track || !track.audio) return;
            njrSamplerPlayingImprezatorTrack = last.trackId;
            const audioUrl = '/api/imprezator/stream?path=' + encodeURIComponent(track.audio);
            io.to('njr_sampler_screen').emit('njr_sampler_imprezator_play', { url: audioUrl, volume: njrSamplerVolume, trackId: last.trackId });
            io.to('njr_sampler_phone').emit('njr_sampler_imprezator_playing', last.trackId);
        } else if (last.type === 'imprezator') {
            let track = null;
            if (imprezatorConfig && imprezatorConfig.banks) {
                for (const b of imprezatorConfig.banks) { track = (b.tracks || []).find(t => t.id === last.trackId); if (track) break; }
            } else if (imprezatorConfig) {
                track = (imprezatorConfig.tracks || []).find(t => t.id === last.trackId);
            }
            if (!track || !track.audio) return;
            imprezatorCurrentlyPlaying = true;
            const audioUrl = (track.audio.startsWith('http://') || track.audio.startsWith('https://'))
                ? track.audio
                : '/api/imprezator/stream?path=' + encodeURIComponent(track.audio);
            const displayName = track.displayName || track.audio.replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '') || 'Utwór';
            const ng = typeof track.normalizedGain === 'number' ? track.normalizedGain : undefined;
            io.to('imprezator_screen').emit('imprezator_play', { url: audioUrl, volume: Math.min(1, imprezatorVolume * masterVolume), trackId: last.trackId, displayName, ...(ng != null && { normalizedGain: ng }) });
        }
        emitAudioMonitorState();
    });

    // Whitney – ekran i telefon (8 kafelków, bez banków)
    socket.on('whitney_join_screen', () => {
        socket.join('whitney_screen');
        socket.emit('whitney_state', { active: whitneyActive, config: whitneyConfig });
        socket.emit('whitney_volume', Math.min(1, whitneyVolume * masterVolume));
    });
    socket.on('whitney_join_phone', () => {
        socket.join('whitney_phone');
        socket.emit('whitney_state', { active: whitneyActive, config: whitneyConfig });
        socket.emit('whitney_volume_sync', whitneyVolume);
    });
    socket.on('whitney_toggle', (payload) => {
        if (!whitneyActive) return;
        const tileId = (typeof payload === 'object' && payload != null && payload.tileId != null) ? payload.tileId : payload;
        const tiles = whitneyConfig.tiles || [];
        const tile = tiles.find(t => t.id === tileId);
        if (!tile || !tile.audio) return;
        let audioUrl = tile.audio.startsWith('/') || tile.audio.startsWith('http') ? tile.audio : '/uploads/' + tile.audio;
        if (/\.(vdjsample|ogg)$/i.test(audioUrl)) audioUrl = '/api/audio/stream?path=' + encodeURIComponent(audioUrl);
        const vol = Math.max(0, Math.min(100, tile.volume ?? 100)) / 100;
        const isBg = !!tile.isBackground;
        const loop = !!tile.loop;
        const ng = typeof tile.normalizedGain === 'number' ? tile.normalizedGain : undefined;
        const playPayload = (u, v, lp) => ({ url: u, volume: v, loop: lp, isBackground: isBg, ...(ng != null && { normalizedGain: ng }) });
        const thenPlayPayload = (u, v, lp) => ({ url: u, volume: v, loop: lp, ...(ng != null && { normalizedGain: ng }) });

        if (isBg) {
            if (whitneyPlayingBackgroundTile === tileId) {
                whitneyPlayingBackgroundTile = null;
                io.to('whitney_screen').emit('whitney_stop_background', { fadeOut: true });
                io.to('whitney_phone').emit('whitney_playing', { tileId: null, isBackground: true });
            } else {
                const prevBgId = whitneyPlayingBackgroundTile;
                const prevBgTile = prevBgId ? tiles.find(t => t.id === prevBgId) : null;
                whitneyPlayingBackgroundTile = tileId;
                if (prevBgId && prevBgTile && !!prevBgTile.fadeOut) {
                    io.to('whitney_screen').emit('whitney_stop_background', { fadeOut: true, thenPlay: thenPlayPayload(audioUrl, vol, loop) });
                } else {
                    if (prevBgId) io.to('whitney_screen').emit('whitney_stop_background', { fadeOut: false });
                    io.to('whitney_screen').emit('whitney_play', playPayload(audioUrl, vol, loop));
                }
                io.to('whitney_phone').emit('whitney_playing', { tileId, isBackground: true });
            }
        } else {
            if (whitneyPlayingTile === tileId) {
                whitneyPlayingTile = null;
                io.to('whitney_screen').emit('whitney_stop', { fadeOut: true });
                io.to('whitney_phone').emit('whitney_playing', { tileId: null, isBackground: false });
            } else {
                const prevTileId = whitneyPlayingTile;
                const prevTile = prevTileId ? tiles.find(t => t.id === prevTileId) : null;
                whitneyPlayingTile = tileId;
                if (prevTileId && prevTile && !!prevTile.fadeOut) {
                    io.to('whitney_screen').emit('whitney_stop', { fadeOut: true, thenPlay: thenPlayPayload(audioUrl, vol, loop) });
                } else {
                    if (prevTileId) io.to('whitney_screen').emit('whitney_stop', { fadeOut: false });
                    io.to('whitney_screen').emit('whitney_play', playPayload(audioUrl, vol, loop));
                }
                io.to('whitney_phone').emit('whitney_playing', { tileId, isBackground: false });
            }
        }
    });
    socket.on('whitney_background_ended', () => {
        whitneyPlayingBackgroundTile = null;
        io.to('whitney_phone').emit('whitney_playing', { tileId: null, isBackground: true });
    });
    socket.on('whitney_volume', (vol) => {
        whitneyVolume = Math.max(0, Math.min(1, vol));
        saveVolumes();
        io.to('whitney_screen').emit('whitney_volume', Math.min(1, whitneyVolume * masterVolume));
    });

    // Śpiewaj Dalej – ekran (komputer) i telefon
    socket.on('spiewaj_dalej_join_screen', () => {
        socket.join('spiewaj_dalej_screen');
        socket.emit('spiewaj_dalej_state', { active: spiewajDalejActive, config: spiewajDalejConfig });
        socket.emit('spiewaj_dalej_volume', Math.min(1, spiewajDalejVolume * masterVolume));
    });
    socket.on('spiewaj_dalej_join_phone', () => {
        socket.join('spiewaj_dalej_phone');
        socket.emit('spiewaj_dalej_state', { active: spiewajDalejActive, config: spiewajDalejConfig, usedIds: Array.from(spiewajDalejUsedIds) });
        socket.emit('spiewaj_dalej_volume_sync', spiewajDalejVolume);
    });
    socket.on('spiewaj_dalej_play', (trackId) => {
        if (!spiewajDalejActive || !trackId) return;
        let track = null;
        if (spiewajDalejConfig.banks && Array.isArray(spiewajDalejConfig.banks)) {
            for (const b of spiewajDalejConfig.banks) {
                track = (b.tracks || []).find(t => t.id === trackId);
                if (track) break;
            }
        } else {
            track = (spiewajDalejConfig.tracks || []).find(t => t.id === trackId);
        }
        if (!track || !track.audio) return;
        let audioUrl = track.audio.startsWith('http') ? track.audio : (track.audio.startsWith('/') ? track.audio : '/uploads/' + track.audio.replace(/^\/+/, ''));
        if (/\.(vdjsample|ogg)$/i.test(audioUrl)) {
            audioUrl = '/api/audio/stream?path=' + encodeURIComponent(audioUrl);
        }
        spiewajDalejUsedIds.add(trackId);
        const ng = typeof track.normalizedGain === 'number' ? track.normalizedGain : undefined;
        io.to('spiewaj_dalej_screen').emit('spiewaj_dalej_play', { url: audioUrl, volume: spiewajDalejVolume, trackId, ...(ng != null && { normalizedGain: ng }) });
        io.to('spiewaj_dalej_phone').emit('spiewaj_dalej_used', { trackId });
    });
    socket.on('spiewaj_dalej_stop', (trackId) => {
        io.to('spiewaj_dalej_screen').emit('spiewaj_dalej_stop', { trackId });
    });
    socket.on('spiewaj_dalej_progress', (data) => {
        io.to('spiewaj_dalej_phone').emit('spiewaj_dalej_progress', data);
    });
    socket.on('spiewaj_dalej_ended', (data) => {
        io.to('spiewaj_dalej_phone').emit('spiewaj_dalej_ended', data);
    });
    socket.on('spiewaj_dalej_volume', (vol) => {
        spiewajDalejVolume = Math.max(0, Math.min(1, vol));
        saveVolumes();
        io.to('spiewaj_dalej_screen').emit('spiewaj_dalej_volume', Math.min(1, spiewajDalejVolume * masterVolume));
    });

    // Bitwa wokalna – ekran (komputer) i telefon
    socket.on('bitwa_wokalna_join_screen', () => {
        socket.join('bitwa_wokalna_screen');
        socket.emit('bitwa_wokalna_state', { active: bitwaWokalnaActive, config: bitwaWokalnaConfig });
        socket.emit('bitwa_wokalna_volume', Math.min(1, bitwaWokalnaVolume * masterVolume));
    });
    socket.on('bitwa_wokalna_join_phone', () => {
        socket.join('bitwa_wokalna_phone');
        socket.emit('bitwa_wokalna_state', { active: bitwaWokalnaActive, config: bitwaWokalnaConfig, usedIds: Array.from(bitwaWokalnaUsedIds) });
        socket.emit('bitwa_wokalna_volume_sync', bitwaWokalnaVolume);
    });
    socket.on('bitwa_wokalna_play', (trackId) => {
        if (!bitwaWokalnaActive || !trackId) return;
        let track = null;
        if (bitwaWokalnaConfig.banks && Array.isArray(bitwaWokalnaConfig.banks)) {
            for (const b of bitwaWokalnaConfig.banks) {
                track = (b.tracks || []).find(t => t.id === trackId);
                if (track) break;
            }
        } else {
            track = (bitwaWokalnaConfig.tracks || []).find(t => t.id === trackId);
        }
        if (!track || !track.audio) return;
        let audioUrl = track.audio.startsWith('http') ? track.audio : (track.audio.startsWith('/') ? track.audio : '/uploads/' + track.audio.replace(/^\/+/, ''));
        if (/\.(vdjsample|ogg)$/i.test(audioUrl)) {
            audioUrl = '/api/audio/stream?path=' + encodeURIComponent(audioUrl);
        }
        bitwaWokalnaUsedIds.add(trackId);
        const ng = typeof track.normalizedGain === 'number' ? track.normalizedGain : undefined;
        io.to('bitwa_wokalna_screen').emit('bitwa_wokalna_play', { url: audioUrl, volume: bitwaWokalnaVolume, trackId, ...(ng != null && { normalizedGain: ng }) });
        io.to('bitwa_wokalna_phone').emit('bitwa_wokalna_used', { trackId });
    });
    socket.on('bitwa_wokalna_stop', (trackId) => {
        io.to('bitwa_wokalna_screen').emit('bitwa_wokalna_stop', { trackId });
    });
    socket.on('bitwa_wokalna_progress', (data) => {
        io.to('bitwa_wokalna_phone').emit('bitwa_wokalna_progress', data);
    });
    socket.on('bitwa_wokalna_ended', (data) => {
        io.to('bitwa_wokalna_phone').emit('bitwa_wokalna_ended', data);
    });
    socket.on('bitwa_wokalna_volume', (vol) => {
        bitwaWokalnaVolume = Math.max(0, Math.min(1, vol));
        saveVolumes();
        io.to('bitwa_wokalna_screen').emit('bitwa_wokalna_volume', Math.min(1, bitwaWokalnaVolume * masterVolume));
    });

    // Imprezator – muzyka do tańca
    socket.on('imprezator_join_screen', () => {
        socket.join('imprezator_screen');
        socket.emit('imprezator_state', { active: imprezatorActive, config: imprezatorConfig });
        socket.emit('imprezator_volume', Math.min(1, imprezatorVolume * masterVolume));
    });
    socket.on('imprezator_join_phone', () => {
        socket.join('imprezator_phone');
        socket.emit('imprezator_state', { active: imprezatorActive, config: imprezatorConfig });
        socket.emit('imprezator_volume_sync', imprezatorVolume);
    });
    socket.on('imprezator_play', (trackId) => {
        if (!imprezatorActive || !trackId) return;
        let track = null;
        if (imprezatorConfig.banks && Array.isArray(imprezatorConfig.banks)) {
            for (const b of imprezatorConfig.banks) {
                track = (b.tracks || []).find(t => t.id === trackId);
                if (track) break;
            }
        } else {
            track = (imprezatorConfig.tracks || []).find(t => t.id === trackId);
        }
        if (!track || !track.audio) return;
        const audioUrl = (track.audio.startsWith('http://') || track.audio.startsWith('https://'))
            ? track.audio
            : '/api/imprezator/stream?path=' + encodeURIComponent(track.audio);
        const displayName = track.displayName || track.audio.replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '') || 'Utwór';
        const ng = typeof track.normalizedGain === 'number' ? track.normalizedGain : undefined;
        imprezatorCurrentlyPlaying = true;
        audioMonitorLast = { type: 'imprezator', trackId };
        io.to('imprezator_screen').emit('imprezator_play', { url: audioUrl, volume: Math.min(1, imprezatorVolume * masterVolume), trackId, displayName, ...(ng != null && { normalizedGain: ng }) });
        emitAudioMonitorState();
    });
    socket.on('imprezator_stop', (trackId) => {
        imprezatorCurrentlyPlaying = false;
        io.to('imprezator_screen').emit('imprezator_stop', { trackId });
        emitAudioMonitorState();
    });
    socket.on('imprezator_ended', (data) => {
        imprezatorCurrentlyPlaying = false;
        io.to('imprezator_phone').emit('imprezator_ended', data);
        emitAudioMonitorState();
    });
    socket.on('imprezator_volume', (vol) => {
        imprezatorVolume = Math.max(0, Math.min(1, vol));
        saveVolumes();
        io.to('imprezator_screen').emit('imprezator_volume', Math.min(1, imprezatorVolume * masterVolume));
    });

    socket.on('select_question', (index) => {
        if (socket.familiadaRole !== 'admin') return;
        if (familiadaQuestions[index]) {
            familiadaCurrentQuestionIndex = index;
            familiadaCurrentGoldenIndex = null;
            familiadaRoundAwardedTo = null;
            familiadaQuestionActive = true;
            familiadaButtonUsedThisRound = false;
            io.to('familiada').emit('board_update', { type: 'NEW_ROUND', data: familiadaQuestions[index], team1: familiadaTeam1Name, team2: familiadaTeam2Name });
        }
    });
    socket.on('select_golden_question', (index) => {
        if (socket.familiadaRole !== 'admin') return;
        if (familiadaGoldenQuestions[index]) {
            familiadaCurrentGoldenIndex = index;
            familiadaCurrentQuestionIndex = null;
            familiadaRoundAwardedTo = null;
            familiadaQuestionActive = true;
            familiadaButtonUsedThisRound = false;
            io.to('familiada').emit('board_update', { type: 'NEW_ROUND', data: familiadaGoldenQuestions[index], team1: familiadaTeam1Name, team2: familiadaTeam2Name });
        }
    });
    socket.on('familiada_reset_buttons', () => {
        if (socket.familiadaRole !== 'admin') return;
        familiadaButtonUsedThisRound = false;
        const data = familiadaCurrentGoldenIndex !== null && familiadaGoldenQuestions[familiadaCurrentGoldenIndex]
            ? familiadaGoldenQuestions[familiadaCurrentGoldenIndex]
            : (familiadaCurrentQuestionIndex !== null && familiadaQuestions[familiadaCurrentQuestionIndex]
                ? familiadaQuestions[familiadaCurrentQuestionIndex]
                : null);
        if (data) {
            familiadaQuestionActive = true;
            io.to('familiada').emit('board_update', { type: 'NEW_ROUND', data, team1: familiadaTeam1Name, team2: familiadaTeam2Name });
        }
    });
    socket.on('familiada_button_press', (data) => {
        if (!familiadaQuestionActive || familiadaButtonUsedThisRound) return;
        const team = data && (data.team === 1 || data.team === 2) ? data.team : null;
        if (!team) return;
        familiadaButtonUsedThisRound = true;
        io.to('familiada').emit('familiada_button_flash', { team });
    });
    socket.on('reveal_answer', (index) => {
        if (socket.familiadaRole !== 'admin') return;
        io.to('familiada').emit('board_update', { type: 'REVEAL', index: index, team1: familiadaTeam1Name, team2: familiadaTeam2Name });
    });
    socket.on('send_error', (data) => {
        if (socket.familiadaRole !== 'admin') return;
        io.to('familiada').emit('board_update', { type: 'ERROR', team: data.team, count: data.count, team1: familiadaTeam1Name, team2: familiadaTeam2Name });
    });
    socket.on('add_points', (data) => {
        if (socket.familiadaRole !== 'admin') return;
        const team = data.team;
        const points = Number(data.points) || 0;
        if (points <= 0) return;
        if (familiadaRoundAwardedTo === null) {
            // Pierwsze przyznanie – tylko wybrana drużyna dostaje punkty
            if (team === 1) familiadaTeam1Score += points;
            else if (team === 2) familiadaTeam2Score += points;
            familiadaRoundAwardedTo = team;
            if (data.playSound) io.to('familiada').emit('play_sound_event', 'win_round');
        } else if (familiadaRoundAwardedTo === team) {
            // Cofnięcie – ta sama drużyna, odejmujemy punkty
            if (team === 1) familiadaTeam1Score -= points;
            else if (team === 2) familiadaTeam2Score -= points;
            familiadaRoundAwardedTo = null;
            io.to('familiada').emit('update_scores', { t1: familiadaTeam1Score, t2: familiadaTeam2Score, roundAwarded: false, team1: familiadaTeam1Name, team2: familiadaTeam2Name });
            return;
        } else {
            // Przeniesienie – druga drużyna: odejmujemy od obecnej, dodajemy do nowej
            if (familiadaRoundAwardedTo === 1) familiadaTeam1Score -= points;
            else if (familiadaRoundAwardedTo === 2) familiadaTeam2Score -= points;
            if (team === 1) familiadaTeam1Score += points;
            else if (team === 2) familiadaTeam2Score += points;
            familiadaRoundAwardedTo = team;
            if (data.playSound) io.to('familiada').emit('play_sound_event', 'win_round');
        }
        familiadaTeam1Score = Math.max(0, familiadaTeam1Score);
        familiadaTeam2Score = Math.max(0, familiadaTeam2Score);
        io.to('familiada').emit('update_scores', { t1: familiadaTeam1Score, t2: familiadaTeam2Score, roundAwarded: true, team1: familiadaTeam1Name, team2: familiadaTeam2Name });
    });
    socket.on('play_sound', (soundName) => {
        if (socket.familiadaRole !== 'admin') return;
        io.to('familiada').emit('play_sound_event', soundName);
    });
    socket.on('stop_sound', (soundName) => {
        if (socket.familiadaRole !== 'admin') return;
        io.to('familiada').emit('stop_sound_event', soundName);
    });
    socket.on('familiada_volume', (vol) => {
        if (socket.familiadaRole !== 'admin') return;
        const v = Math.max(0, Math.min(1, parseFloat(vol) || 0));
        familiadaVolume = v;
        saveVolumes();
        io.to('familiada').emit('familiada_volume', v);
    });
    socket.on('familiada_stop_all', () => {
        if (socket.familiadaRole !== 'admin') return;
        io.to('familiada').emit('familiada_stop_all');
    });
    socket.on('familiada_stop_music', () => {
        io.to('familiada').emit('familiada_stop_all');
    });
    socket.on('familiada_intro_state', (playing) => {
        io.to('familiada').emit('familiada_intro_state', playing);
    });
    socket.on('show_final', () => {
        if (socket.familiadaRole !== 'admin') return;
        familiadaQuestionActive = false;
        familiadaCurrentQuestionIndex = null;
        familiadaCurrentGoldenIndex = null;
        io.to('familiada').emit('board_update', { type: 'SHOW_FINAL', scores: { t1: familiadaTeam1Score, t2: familiadaTeam2Score, team1: familiadaTeam1Name, team2: familiadaTeam2Name } });
    });
    socket.on('familiada_end_game', () => {
        if (socket.familiadaRole !== 'admin') return;
        familiadaTeam1Score = 0;
        familiadaTeam2Score = 0;
        familiadaRoundAwardedTo = null;
        familiadaQuestionActive = false;
        familiadaButtonUsedThisRound = false;
        familiadaCurrentQuestionIndex = null;
        familiadaCurrentGoldenIndex = null;
        io.to('familiada').emit('familiada_stop_all');
        io.to('familiada').emit('update_scores', { t1: 0, t2: 0, roundAwarded: false, team1: familiadaTeam1Name, team2: familiadaTeam2Name });
        io.to('familiada').emit('board_update', { type: 'FULL_RESET', team1: familiadaTeam1Name, team2: familiadaTeam2Name });
        io.to('familiada').emit('familiada_show_idle_title');
        io.to('familiada').emit('familiada_end_game');
        io.sockets.sockets.forEach((s) => {
            if (s.familiadaRole === 'buttons') s.disconnect(true);
        });
        console.log('⛔ Familiada: zakończono grę – przyciski rozłączone, dźwięk wyłączony');
    });
    socket.on('reset_game', () => {
        if (socket.familiadaRole !== 'admin') return;
        familiadaTeam1Score = 0;
        familiadaTeam2Score = 0;
        familiadaRoundAwardedTo = null;
        familiadaQuestionActive = false;
        familiadaButtonUsedThisRound = false;
        familiadaCurrentQuestionIndex = null;
        familiadaCurrentGoldenIndex = null;
        io.to('familiada').emit('update_scores', { t1: 0, t2: 0, roundAwarded: false, team1: familiadaTeam1Name, team2: familiadaTeam2Name });
        io.to('familiada').emit('board_update', { type: 'FULL_RESET', team1: familiadaTeam1Name, team2: familiadaTeam2Name });
    });
    socket.on('familiada_screen_reset', () => {
        familiadaTeam1Score = 0;
        familiadaTeam2Score = 0;
        familiadaRoundAwardedTo = null;
        familiadaQuestionActive = false;
        familiadaButtonUsedThisRound = false;
        familiadaCurrentQuestionIndex = null;
        familiadaCurrentGoldenIndex = null;
        io.to('familiada').emit('update_scores', { t1: 0, t2: 0, roundAwarded: false, team1: familiadaTeam1Name, team2: familiadaTeam2Name });
        io.to('familiada').emit('board_update', { type: 'FULL_RESET', team1: familiadaTeam1Name, team2: familiadaTeam2Name });
        io.to('familiada').emit('familiada_show_idle_title');
    });
    socket.on('familiada_get_files', () => {
        socket.emit('familiada_files_list', getFamiliadaFiles());
    });
    socket.on('familiada_load_file', (filename) => {
        if (socket.familiadaRole !== 'admin') return;
        const filePath = resolveFamiliadaFilePath(filename);
        if (!filePath) return socket.emit('familiada_load_error', 'Plik nie istnieje');
        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(raw);
            const questions = Array.isArray(data) ? data : [];
            familiadaQuestions = questions;
            const isGolden = filename && filename.toLowerCase() === FAMILIADA_GOLDEN_FILE.toLowerCase();
            if (!isGolden) {
                const dir = path.dirname(familiadaDataPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(familiadaDataPath, JSON.stringify(questions, null, 2), 'utf8');
            }
            io.to('familiada').emit('familiada_data_updated', questions);
            socket.emit('familiada_load_ok', { count: questions.length });
        } catch (err) {
            socket.emit('familiada_load_error', err.message || 'Błąd ładowania');
        }
    });
    // QR tunel (tylko gdy otwarty) – osobny box na ekranie
    if (currentPinggyUrl) {
        generateGameQR().then((data) => {
            if (data) socket.emit('qr_code', data.qrCode);
        });
    }
    // QR do gry w sieci lokalnej (gdy admin włączył „Pokaż lokalnie”)
    if (showLocalGameQR) {
        generateLocalGameQR().then((data) => {
            if (data) socket.emit('qr_local_game', data);
        });
    }
    // QR do panelu admina – zawsze wysyłaj przy połączeniu ekranu (pozostaje widoczny także po wejściu admina z telefonu)
    generateAdminQR().then((data) => {
        if (data) socket.emit('qr_admin', data);
    });

    socket.on('request_qr_admin', () => {
        // Zawsze zwracaj QR admina (np. po „Zakończ” na ekranie startowym – pokaż QR nawet gdy admin już połączony)
        generateAdminQR().then((data) => {
            if (data) socket.emit('qr_admin', data);
        });
    });

    socket.on('request_qr_admin_pwa', () => {
        generateAdminPWAQR().then((data) => {
            if (data) socket.emit('qr_admin_pwa', data);
        });
    });

    socket.on('request_qr', () => {
        if (currentPinggyUrl) {
            generateGameQR().then((data) => {
                if (data) socket.emit('qr_code', data.qrCode);
            });
        }
    });

    socket.on('request_qr_local', () => {
        if (showLocalGameQR) {
            generateLocalGameQR().then((data) => {
                if (data) socket.emit('qr_local_game', data);
            });
        } else {
            socket.emit('qr_local_game', { qrCode: null });
        }
    });

    // === OBSŁUGA QR WIFI ===
    socket.on('admin_generate_wifi_qr', async (data) => {
        // Obsługa zarówno starego formatu (tylko ssid jako string) jak i nowego (obiekt z ssid, password i wifiType)
        const ssid = typeof data === 'string' ? data : (data?.ssid || data);
        let password = typeof data === 'object' && data !== null ? (data.password || null) : null;
        const wifiType = typeof data === 'object' && data !== null ? (data.wifiType || null) : null;
        
        // Normalizuj password: pusty string -> null
        if (password !== null && password !== undefined && password.trim() === '') {
            password = null;
        }
        
        console.log('📶 admin_generate_wifi_qr otrzymał:', { ssid, password, wifiType, dataType: typeof data });
        
        if (!ssid || ssid.trim() === '') {
            socket.emit('wifi_qr_error', 'Nazwa sieci nie może być pusta');
            return;
        }
        const wifiData = await generateWiFiQR(ssid, password, wifiType);
        if (wifiData) {
            socket.emit('wifi_qr_generated', wifiData);
            io.emit('qr_wifi', wifiData);
            io.emit('update_state', getStateForBroadcast());
        } else {
            socket.emit('wifi_qr_error', 'Nie udało się wygenerować QR');
        }
    });
    
    socket.on('request_qr_wifi', async () => {
        if (currentWiFiSSID) {
            const wifiData = await generateWiFiQR(currentWiFiSSID);
            if (wifiData) socket.emit('qr_wifi', wifiData);
        } else {
            socket.emit('qr_wifi', { qrCode: null, ssid: null });
        }
    });

    // === JEDEN KLIK: tunel – Cloudflare (wszystkie platformy), Mac/Linux fallback: Pinggy (SSH) ===
    socket.on('admin_start_tunnel', () => {
        if (tunnelProcess) {
            socket.emit('tunnel_started', { tunnelUrl: currentPinggyUrl });
            return;
        }
        appendTunnelLog('=== tunnel start ' + new Date().toISOString() + ' ===');
        const isWin = process.platform === 'win32';

        // Cloudflare Tunnel – spawn cloudflared bezpośrednio, bez Tunnel.quick() który ma bug
        appendTunnelLog('Cloudflare Tunnel start');
        {
            // Znajdź cloudflared(.exe):
            // 1. extraResources – resources/cloudflared.exe (dodane do instalatora Windows)
            // 2. app.asar.unpacked/node_modules/cloudflared/bin/ (asarUnpack)
            // 3. normalny node_modules (dev)
            const cfExeName = isWin ? 'cloudflared.exe' : 'cloudflared';
            let cfBin = null;
            // 1) extraResources: obok app.asar w katalogu resources (process.resourcesPath w Electron)
            const resourcesDir2 = (typeof process !== 'undefined' && process.resourcesPath) || path.dirname(__dirname);
            const cfExtra = path.join(resourcesDir2, cfExeName);
            if (fs.existsSync(cfExtra)) cfBin = cfExtra;
            // 2) asarUnpack
            if (!cfBin) {
                try {
                    let b = require('cloudflared').bin;
                    if (b && b.includes('app.asar') && !b.includes('app.asar.unpacked')) {
                        b = b.replace('app.asar', 'app.asar.unpacked');
                    }
                    if (b && fs.existsSync(b)) cfBin = b;
                } catch (_) {}
            }
            // 3) dev: normalny require
            if (!cfBin) {
                try { const b = require('cloudflared').bin; if (b && fs.existsSync(b)) cfBin = b; } catch (_) {}
            }
            if (!cfBin) {
                emitTunnelError(socket, { message: 'Nie znaleziono pliku cloudflared. Sprawdzono: ' + cfExtra });
                return;
            }
            appendTunnelLog('cloudflared binary: ' + cfBin);
            let urlSent = false;
            let cfChild = null;
            const timeout = setTimeout(() => {
                if (urlSent) return;
                urlSent = true;
                try { if (cfChild) cfChild.kill('SIGTERM'); } catch (_) {}
                emitTunnelError(socket, { message: 'Tunel nie odpowiedział w czasie (timeout). Sprawdź połączenie z internetem.' });
            }, 30000);
            const child = spawn(cfBin, ['tunnel', '--url', `http://localhost:${PORT}`], {
                stdio: ['ignore', 'pipe', 'pipe'],
                windowsHide: true
            });
            cfChild = child;
            let cfOutput = '';
            let cfUrl = null;
            const onData = (data) => {
                const chunk = data.toString('utf8');
                cfOutput += chunk;
                appendTunnelLog(chunk.trim());
                // URL pojawia się przed potwierdzeniem połączenia
                if (!cfUrl) {
                    const m = cfOutput.match(/https:\/\/[a-zA-Z0-9][-a-zA-Z0-9.]*\.trycloudflare\.com/i);
                    if (m) cfUrl = m[0].replace(/\/$/, '');
                }
                // Tunel jest gotowy dopiero gdy zarejestruje połączenie
                if (!urlSent && cfUrl && /Registered tunnel connection/i.test(cfOutput)) {
                    urlSent = true;
                    clearTimeout(timeout);
                    const normalized = normalizePinggyUrl(cfUrl);
                    if (!normalized) {
                        try { child.kill('SIGTERM'); } catch (_) {}
                        emitTunnelError(socket, { message: 'Tunel zwrócił nieprawidłowy adres: ' + cfUrl });
                        return;
                    }
                    currentPinggyUrl = normalized;
                    tunnelProcess = child;
                    console.log('🌐 Tunel Cloudflare (1 klik):', currentPinggyUrl);
                    appendTunnelLog('Cloudflare Tunnel URL: ' + currentPinggyUrl);
                    (async () => {
                        // Generuj kod sesji i skróć URL — alternatywa dla skanera QR
                        currentSessionCode = generateSessionCode();
                        const voteUrl = currentPinggyUrl + '/vote.html';
                        currentShortUrl = await shortenUrl(voteUrl);
                        console.log('\U0001f511 Kod sesji:', currentSessionCode, '| Krotki URL:', currentShortUrl || '(brak)');
                        // Zarejestruj sesję na serwerze Render — stały punkt /dolacz
                        const renderBase = process.env.STRIPE_DOMAIN || process.env.RENDER_EXTERNAL_URL || '';
                        if (renderBase && renderBase.startsWith('http')) {
                            try {
                                const regUrl = new URL('/api/register-game-session', renderBase).href;
                                const regBody = JSON.stringify({ code: currentSessionCode, redirectUrl: voteUrl });
                                const mod = regUrl.startsWith('https') ? require('https') : require('http');
                                const regReq = mod.request(regUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(regBody) } }, (r) => {
                                    let d = ''; r.on('data', c => d += c); r.on('end', () => console.log('\U0001f3ae Render /dolacz:', d.slice(0,60)));
                                });
                                regReq.on('error', e => console.warn('Blad rejestracji sesji:', e.message));
                                regReq.write(regBody); regReq.end();
                            } catch(e) { console.warn('Blad rejestracji sesji:', e.message); }
                        }
                        const tunnelPayload = { tunnelUrl: currentPinggyUrl, shortUrl: currentShortUrl, sessionCode: currentSessionCode };
                        const data = await generateGameQR();
                        if (data) io.emit('qr_code', data.qrCode);
                        socket.emit('tunnel_started', tunnelPayload);
                        io.to(ADMIN_ROOM).emit('tunnel_started', tunnelPayload);
                        io.to('njr_sampler_screen').emit('tunnel_started', tunnelPayload);
                        io.to('spiewaj_dalej_screen').emit('tunnel_started', tunnelPayload);
                        io.to('bitwa_wokalna_screen').emit('tunnel_started', tunnelPayload);
                        io.to('imprezator_screen').emit('tunnel_started', tunnelPayload);
                        io.to('whitney_screen').emit('tunnel_started', tunnelPayload);
                        io.emit('update_state', getStateForBroadcast());
                        if (gameState.showQROnPhones) {
                            const wifiQR = currentWiFiSSID ? await generateWiFiQR(currentWiFiSSID) : null;
                            const localGameQR = showLocalGameQR ? await generateLocalGameQR() : null;
                            const tunnelQR = await generateGameQR();
                            io.emit('qr_codes_on_phones', { wifiQR, wifiSSID: currentWiFiSSID, localGameQR, tunnelQR, gameQR: tunnelQR });
                        }
                    })();
                }
            };
            child.stdout.on('data', onData);
            child.stderr.on('data', onData);
            child.on('error', (err) => {
                clearTimeout(timeout);
                if (!urlSent) { urlSent = true; emitTunnelError(socket, { message: 'Błąd cloudflared: ' + (err.message || err) }); }
            });
            child.on('close', (code) => {
                clearTimeout(timeout);
                if (tunnelProcess === child) {
                    tunnelProcess = null;
                    currentPinggyUrl = null;
                    currentShortUrl = null;
                    currentSessionCode = null;
                    io.emit('qr_code', null);
                    io.emit('update_state', getStateForBroadcast());
                    io.to(ADMIN_ROOM).emit('tunnel_stopped');
                }
                if (!urlSent) {
                    urlSent = true;
                    const snippet = cfOutput.slice(-400).replace(/\r\n/g, '\n');
                    emitTunnelError(socket, { message: 'Cloudflare zakończył się (kod ' + code + '). ' + (snippet || '') });
                }
            });
        }
            return;
    });

    socket.on('admin_stop_tunnel', async () => {
        if (tunnelProcess) {
            if (typeof tunnelProcess.stop === 'function') {
                try { tunnelProcess.stop(); } catch (_) {}
            } else if (typeof tunnelProcess.close === 'function') {
                try { tunnelProcess.close(); } catch (_) {}
            } else {
                try { tunnelProcess.kill('SIGTERM'); } catch (_) {}
            }
            tunnelProcess = null;
        }
        currentPinggyUrl = null;
        console.log('🌐 Tunel zatrzymany.');
        io.emit('qr_code', null);
        io.emit('update_state', getStateForBroadcast());
        socket.emit('tunnel_stopped');
        if (gameState.showQROnPhones) {
            const wifiQR = currentWiFiSSID ? await generateWiFiQR(currentWiFiSSID) : null;
            const localGameQR = showLocalGameQR ? await generateLocalGameQR() : null;
            io.emit('qr_codes_on_phones', { wifiQR, wifiSSID: currentWiFiSSID, localGameQR, tunnelQR: null, gameQR: localGameQR || null });
        }
    });

    socket.on('admin_set_show_local_qr', async (on) => {
        showLocalGameQR = !!on;
        console.log('📱 QR sieci lokalnej na ekranie:', showLocalGameQR ? 'tak' : 'nie');
        if (showLocalGameQR) {
            const data = await generateLocalGameQR();
            if (data) io.emit('qr_local_game', data);
        } else {
            io.emit('qr_local_game', { qrCode: null });
        }
        io.emit('update_state', getStateForBroadcast());
        if (gameState.showQROnPhones) {
            const wifiQR = currentWiFiSSID ? await generateWiFiQR(currentWiFiSSID) : null;
            const localGameQR = showLocalGameQR ? await generateLocalGameQR() : null;
            const tunnelQR = currentPinggyUrl ? await generateGameQR() : null;
            io.emit('qr_codes_on_phones', { wifiQR, wifiSSID: currentWiFiSSID, localGameQR, tunnelQR, gameQR: tunnelQR || localGameQR });
        }
    });

    socket.on('admin_set_pinggy_url', async (url) => {
        const trimmed = typeof url === 'string' ? url.trim() : '';
        if (!trimmed) {
            currentPinggyUrl = null;
        } else {
            currentPinggyUrl = normalizePinggyUrl(trimmed);
            if (!currentPinggyUrl) {
                try {
                    const u = new URL(trimmed.startsWith('http') ? trimmed : 'https://' + trimmed);
                    const origin = u.origin;
                    if (!/dashboard|localhost|127\.0\.0\.1/i.test(origin)) currentPinggyUrl = origin.replace(/^http:\/\//i, 'https://');
                } catch (_) {}
            }
        }
        console.log('🌐 Tunel Pinggy (ręczny URL):', currentPinggyUrl ? currentPinggyUrl : '(wyłączony)');
        const data = await generateGameQR();
        if (data) io.emit('qr_code', data.qrCode);
        // Regeneruj QR 2.0 – baseUrl się zmienił (tunel włączony/wyłączony)
        io.emit('update_state', getStateForBroadcast());
        socket.emit('pinggy_url_set', { tunnelUrl: currentPinggyUrl });
    });

    socket.emit('update_state', getStateForBroadcast());
    socket.emit('users_count', players.size);

    socket.on('request_state', () => {
        const full = getStateForBroadcast();
        // Admin gets full state; phones get slim state (without playerNicks unless showPlayersWithQR)
        const isAdmin = socket.rooms && socket.rooms.has(ADMIN_ROOM);
        socket.emit('update_state', isAdmin ? full : getPhoneState(full));
        socket.emit('users_count', players.size);
    });

    // === ADMIN ===

    socket.on('admin_login', (data) => {
        socket.join(ADMIN_ROOM); // Priorytet – admin dostaje update_state od razu, bez throttle
        const fromComputer = data && data.isComputer === true;
        if (!fromComputer) adminHasBeenOpened = true;
        // Auto-cleanup: stale "resting" HNC phases (match_result/round_complete/champion) with no active game
        const _isInconsistent = (hncPhase==='match_result'||hncPhase==='round_complete'||hncPhase==='champion') && !(gameState.activeQuestion && gameState.activeQuestion.type === 'HNC');
        if (_isInconsistent) {
            hncStopTimer();
            hncPhase = 'setup';
            hncVoters.clear(); hncVotedThis.clear(); hncVotesA.clear(); hncVotesB.clear();
        }
        const files = getQuizFiles();
        socket.emit('files_list', files);
        if (fromComputer) socket.emit('admin_from_computer_confirmed');
        broadcastStateImmediate();
    });

    // ZAŁADUJ QUIZ DO GRY
    socket.on('admin_load_quiz', (filename) => {
        console.log(`🎮 Ładowanie quizu: ${filename}`);
        const { questions, options } = loadQuestions(filename);
        
        if (questions.length === 0) return socket.emit('quiz_error', 'Plik jest pusty');
        
        // Załaduj pełne dane quizu (w tym thanksScreen)
        let thanksScreen = null;
        try {
            const filePath = path.join(quizzesDir, filename);
            const rawData = fs.readFileSync(filePath, 'utf8');
            const quizData = JSON.parse(rawData);
            if (quizData.thanksScreen) {
                thanksScreen = quizData.thanksScreen;
            }
        } catch (err) {
            console.warn('⚠️ Nie można załadować thanksScreen z quizu:', err.message);
        }
        
        gameState.questions = questions;
        gameState.quizOptions = options || { disableTimePoints: false };
        gameState.quizTitle = filename.replace('.json', '').toUpperCase();
        gameState.type = 'INTRO';
        gameState.activeQuestionIndex = -1;
        if (gameState.activeQuestion && gameState.activeQuestion.type === 'WYBORCZY') stopWyborczyQuestionOnServer();
        gameState.activeQuestion = null;
        gameState.showStats = false;
        gameState.showCorrect = false;
        gameState.stats = {};
        gameState.questionStartTime = null;
        gameState.speedrunQueue = [];
        gameState.playoff = null;
        gameState.thanksScreen = thanksScreen;
        
        players.forEach(p => { p.score = 0; p.answers = {}; p.correctAnswersCount = 0; p.eliminated = false; });

        // Reset punktów drużyn przy nowym quizie (żeby nie przenosiły się wyniki między quizami)
        gameState.teams.A.score = 0;
        gameState.teams.B.score = 0;
        
        // Wyczyść rozłączeni gracze z poprzedniego quizu
        pendingDisconnects.clear();
        disconnectedPlayersWithScore.clear();
        
        socket.emit('quiz_loaded', { filename: filename, questions: questions, options: options });
        broadcastState();
    });

    // Start pytania
    socket.on('admin_start_question', (data) => {
        // Obsługa zarówno starego formatu (tylko index) jak i nowego (obiekt z index i letterCount)
        let index, letterCount;
        if (typeof data === 'number') {
            index = data;
            letterCount = 1; // Domyślnie 1 litera dla kompatybilności wstecznej
        } else if (typeof data === 'object' && data !== null) {
            index = data.index;
            letterCount = data.letterCount || 1;
        } else {
            return;
        }
        
        if (index < 0 || index >= gameState.questions.length) return;
        
        // Wyczyść poprzedni timer jeśli istnieje
        if (questionTimer) {
            clearTimeout(questionTimer);
            questionTimer = null;
        }
        
        applySpeedrunScoring();
        applyEstimationScoring();
        gameState.speedrunQueue = [];
        gameState.playoff = null;
        
        const question = gameState.questions[index];
        if (gameState.activeQuestion && gameState.activeQuestion.type === 'WYBORCZY' && question.type !== 'WYBORCZY') {
            stopWyborczyQuestionOnServer();
        }
        if (!question.id) question.id = `q_${Date.now()}_${index}`;
        
        gameState.type = 'GAME';
        gameState.showPlayersWithQR = false;
        gameState.showZarazZaczynamy = false;
        gameState.activeQuestionIndex = index;
        gameState.activeQuestion = question;
        gameState.showStats = false;
        gameState.showCorrect = false;
        gameState.stats = { A: 0, B: 0, C: 0, D: 0, E: 0 };
        
        // Dla typu LETTER - nie ustawiaj timera od razu, tylko przygotuj pytanie
        // Timer uruchomi się dopiero po wysłaniu liter do graczy
        if (question.type === 'LETTER') {
            gameState.timeLeft = 0; // Timer nie działa jeszcze
            gameState.duration = question.time || 45;
            gameState.questionStartTime = null; // Timer nie rozpoczął się jeszcze
            
            // Przygotuj stan gry z literami (ale jeszcze nie losuj liter - to zrobi admin)
            gameState.letterGame = {
                questionId: question.id,
                letterCount: letterCount || question.letterCount || 1,
                playerLetters: {}, // Puste - litery będą wysłane przez admina
                gameStarted: false // Flaga czy gra już się rozpoczęła
            };
            gameState.shipsGame = null;
            console.log(`🔤 [LETTER] Przygotowanie: questionId=${question.id}, letterCount=${letterCount || question.letterCount || 1}, gameStarted=false – oczekiwanie na admin_start_letter_game (Wyślij 1/2 litery)`);
        } else if (question.type === 'WYBORCZY') {
            stopWyborczyPhotoTimer();
            wyborczySession = {
                photos: (question.photos || []).map(p => ({ url: p.url, label: p.label || '' })),
                currentIndex: -1,
                votes: {},
                voterIds: {},
                phase: 'idle'
            };
            wyborczyVotedThis.clear();
            gameState.timeLeft = 0;
            gameState.duration = question.time || 15;
            gameState.questionStartTime = null;
            gameState.shipsGame = null;
            gameState.letterGame = null;
            const bgMusic = question.bgMusic || '/uploads/sfx/tlowyborcze.mp3';
            io.emit('wyborczy_bg_music', { url: bgMusic });
        } else if (question.type === 'HNC') {
            // Auto-setup HNC tournament from quiz question
            hncStopTimer();
            hncPhotos = (question.photos || []).map((p, i) => ({ id: `hnc_${i}_${Date.now()}`, url: p.url, desc: p.desc || '' }));
            hncMatchTime = Math.max(5, parseInt(question.time) || 15);
            hncQuestionText = question.question || '';
            hncBuildBracket(hncPhotos);
            hncCurrentRound = 0;
            hncCurrentMatch = 0;
            hncPhase = 'ready';
            hncVoters.clear(); hncVotedThis.clear(); hncVotesA.clear(); hncVotesB.clear();
            // Pre-register all currently connected quiz players as voters
            players.forEach((p, sid) => { if (p.nick) hncVoters.add(sid); });
            // Preload first match photos on all clients
            const firstM = hncBracket[0]?.[0];
            if (firstM?.photoA && firstM?.photoB) {
                io.emit('hnc_preload', [firstM.photoA.url, firstM.photoB.url]);
            }
            gameState.timeLeft = 0;
            gameState.duration = 0;
            gameState.questionStartTime = null;
            gameState.shipsGame = null;
            gameState.letterGame = null;
        } else {
            // Dla innych typów pytań - normalna logika
            gameState.timeLeft = question.time || 30;
            gameState.duration = question.time || 30;
            gameState.questionStartTime = Date.now();

            // Inicjalizuj stan gry w statki jeśli to pytanie typu SHIPS
            if (question.type === 'SHIPS') {
                const boardSize = question.boardSize || 8;
                const validShips = (question.ships || []).filter(s => {
                    if (!s || typeof s.size !== 'number' || s.size < 2 || s.size > 5) return false;
                    const vertical = !!s.vertical;
                    for (let i = 0; i < s.size; i++) {
                        const r = s.row + (vertical ? i : 0);
                        const c = s.col + (vertical ? 0 : i);
                        if (r < 0 || r >= boardSize || c < 0 || c >= boardSize) return false;
                    }
                    return true;
                });
                gameState.shipsGame = {
                    questionId: question.id,
                    boardSize,
                    ships: validShips,
                    shots: {},
                    currentTurn: 0,
                    playersShot: new Set(),
                    gameEnded: false
                };
                console.log(`⚓ Inicjalizacja gry w statki dla pytania ${question.id}, plansza ${question.boardSize || 8}x${question.boardSize || 8}`);
                gameState.letterGame = null;
            } else {
                // Wyczyść stan gry w statki i literach dla innych typów pytań
                gameState.shipsGame = null;
                gameState.letterGame = null;
            }
            
            // Ustaw timer dla automatycznego pokazania statystyk po upływie czasu
            // Tylko jeśli pytanie ma ustawiony czas i czas nie jest wyłączony
            // NIE ustawiaj timera dla SHIPS (ręczna kontrola) ani HNC (turniej sterowany ręcznie, może trwać wiele minut)
            const questionTime = question.time || 30;
            if (questionTime > 0 && !gameState.quizOptions.disableTimePoints && question.type !== 'SHIPS' && question.type !== 'HNC') {
                questionTimer = setTimeout(() => {
                    console.log(`⏰ Czas pytania minął - automatyczne pokazanie statystyk`);
                    endQuestionAndShowStats();
                }, questionTime * 1000);
            } else if (question.type === 'SHIPS') {
                console.log(`⚓ Pytanie typu SHIPS - timer wyłączony, gra kończy się ręcznie`);
            } else if (question.type === 'HNC') {
                console.log(`🏆 Pytanie typu HNC - timer wyłączony, turniej sterowany ręcznie`);
            }
        }
        
        broadcastStateImmediate(); // Admin musi od razu zobaczyć panel pytania
        const questionTime = question.time || (question.type === 'LETTER' ? 45 : 30);
        console.log(`❓ Pytanie ${index + 1}: ${question.question} (czas: ${questionTime}s${question.type === 'LETTER' ? ', oczekiwanie na wysłanie liter' : ''})`);
    });
    
    // Start gry z literami - wysyła litery do graczy i uruchamia timer
    // letterCount: 1 lub 2 - przekazywane z admina (przycisk "Wyślij 1 literę" / "Wyślij 2 litery")
    socket.on('admin_start_letter_game', (letterCount) => {
        if (!gameState.activeQuestion || gameState.activeQuestion.type !== 'LETTER') {
            console.warn('⚠️ admin_start_letter_game - brak aktywnego pytania typu LETTER');
            return;
        }
        
        if (!gameState.letterGame) {
            console.warn('⚠️ admin_start_letter_game - brak letterGame');
            return;
        }
        
        if (gameState.letterGame.gameStarted) {
            console.warn('⚠️ admin_start_letter_game - gra już się rozpoczęła');
            return;
        }
        
        const question = gameState.activeQuestion;
        const finalLetterCount = (letterCount === 1 || letterCount === 2) ? letterCount : (gameState.letterGame.letterCount || 1);
        gameState.letterGame.letterCount = finalLetterCount;
        // Tylko litery bez diakrytyków – skrypt NIE wysyła ś, ć, ń, ó, ą, ę, ź, ż, ł (ani wielkich) przy „Wyślij 1/2 litery”
        // Bez Q, V, X, Y (mało słów w polskim). Gracze mogą wpisywać wyrazy z polskimi znakami – blokada tylko przy wylosowanej literze.
        const availableLetters = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','r','s','t','u','w','z'];
        const playerLetters = {};
        
        // Losuj litery dla każdego gracza
        players.forEach((player, socketId) => {
            const letters = [];
            for (let i = 0; i < finalLetterCount; i++) {
                // Jeśli więcej graczy niż liter, powtórz litery
                const letterIndex = (players.size > availableLetters.length) 
                    ? Math.floor(Math.random() * availableLetters.length)
                    : ((socketId.charCodeAt(0) + i) % availableLetters.length);
                letters.push(availableLetters[letterIndex]);
            }
            playerLetters[socketId] = letters;
        });
        
        // Zaktualizuj letterGame z wylosowanymi literami
        gameState.letterGame.playerLetters = playerLetters;
        gameState.letterGame.gameStarted = true;
        
        // Uruchom timer
        gameState.timeLeft = question.time || 45;
        gameState.duration = question.time || 45;
        gameState.questionStartTime = Date.now();
        
        // Ustaw timer dla automatycznego pokazania statystyk
        const questionTime = question.time || 45;
        if (questionTime > 0 && !gameState.quizOptions.disableTimePoints) {
            questionTimer = setTimeout(() => {
                console.log(`⏰ Czas pytania z literami minął - automatyczne pokazanie statystyk`);
                endQuestionAndShowStats();
            }, questionTime * 1000);
        }
        
        broadcastStateImmediate(); // Admin musi od razu zobaczyć aktualizację
        const lg = gameState.letterGame;
        console.log(`🔤 [LETTER] Gra z literami rozpoczęta: questionId=${question.id}, letterCount=${finalLetterCount}, gameStarted=${!!lg?.gameStarted}, playerLettersCount=${lg?.playerLetters ? Object.keys(lg.playerLetters).length : 0}, czas=${questionTime}s`);
    });

    socket.on('admin_show_ships_stats', () => {
        // Admin nie musi być w players - jeśli wysyła admin_* eventy, to jest adminem
        console.log('📊 admin_show_ships_stats otrzymane');
        if (!gameState.activeQuestion || gameState.activeQuestion.type !== 'SHIPS') {
            console.warn('⚠️ admin_show_ships_stats - brak aktywnego pytania SHIPS');
            return;
        }
        if (!gameState.shipsGame) {
            console.warn('⚠️ admin_show_ships_stats - brak shipsGame');
            return;
        }
        
        // Zakończ aktualną rundę - gracze nie mogą już strzelać
        // Nie czyść playersShot - to pokazuje kto już strzelił w tej rundzie
        gameState.showStats = true;
        gameState.showCorrect = false;
        // NIE zmieniaj type na GAME_STATS - pozostaw GAME aby można było rozpocząć następną rundę
        console.log('📊 admin_show_ships_stats - ustawiono showStats=true');
        broadcastStateImmediate();
    });

    socket.on('admin_show_ships_answer', () => {
        if (!gameState.activeQuestion || gameState.activeQuestion.type !== 'SHIPS') return;
        
        gameState.showCorrect = true;
        gameState.showStats = false;
        broadcastStateImmediate();
    });

    socket.on('admin_show_stats', () => {
        // Wyczyść timer jeśli admin ręcznie pokazuje statystyki
        if (questionTimer) {
            clearTimeout(questionTimer);
            questionTimer = null;
        }
        
        applySpeedrunScoring();
        applyEstimationScoring();
        checkEliminationNoAnswer(); // Sprawdź brak odpowiedzi w pytaniach eliminacyjnych
        gameState.showStats = true;
        gameState.type = 'GAME_STATS';
        gameState.timeLeft = 0;
        
        // WAŻNE: Dla typu LETTER/OPEN NIE uruchamiaj automatycznie dogrywki
        // Dogrywka będzie uruchomiona dopiero gdy admin kliknie słowo w chmurze
        // Tutaj tylko przygotuj chmurę słów (openCloud) dla wyświetlenia
        
        broadcastStateImmediate(); // Admin klika „Statystyki"
    });

    socket.on('admin_show_correct', () => {
        // Wyczyść timer jeśli admin ręcznie pokazuje poprawną odpowiedź
        if (questionTimer) {
            clearTimeout(questionTimer);
            questionTimer = null;
        }
        
        applySpeedrunScoring();
        applyEstimationScoring();
        checkEliminationNoAnswer(); // Sprawdź brak odpowiedzi w pytaniach eliminacyjnych
        gameState.showCorrect = true;
        gameState.showStats = false;
        broadcastStateImmediate(); // Admin klika „Odpowiedź" – natychmiastowa aktualizacja
    });

    socket.on('admin_repeat_music', () => {
        const q = gameState.activeQuestion;
        const audioUrl = q && (q.type === 'MUSIC' || q.type === 'M') && q.audio;
        if (audioUrl) {
            io.emit('admin_repeat_music', audioUrl);
            console.log('🔁 admin_repeat_music – powtórzenie dźwięku pytania muzycznego');
        }
    });

    socket.on('admin_start_playoff', (word) => {
        // Wyczyść timer gdy zaczyna się dogrywka
        if (questionTimer) {
            clearTimeout(questionTimer);
            questionTimer = null;
        }
        
        const w = (word != null && word !== undefined) ? String(word).trim() : '';
        if (!w) return;
        const q = gameState.activeQuestion;
        const qId = q && q.id;
        const isOpenOrLetter = q && (q.type === 'OPEN' || q.type === 'LETTER');
        const wLower = w.toLowerCase();
        const submitters = [];
        if (isOpenOrLetter && qId) {
            players.forEach((p, socketId) => {
                const raw = p.answers[qId];
                if (raw === undefined || raw === null) return;
                let words = [];
                if (Array.isArray(raw)) {
                    words = raw.map(x => String(x).trim()).filter(x => x);
                } else {
                    const t = String(raw).trim();
                    if (t) words = [t];
                }
                const matches = words.some(word => word.toLowerCase() === wLower);
                if (matches) submitters.push({ socketId, nick: p.nick, points: 100 });
            });
        }
        gameState.playoff = {
            active: true,
            word: w,
            question: `Czy ${w} rozkręca imprezę?`,
            options: ['TAK', 'NIE'],
            stats: { A: 0, B: 0 },
            voted: [],
            submitters
        };
        broadcastState();
        console.log(`🎤 Dogrywka: ${w}${submitters.length ? ` (${submitters.length} graczy: ${submitters.map(s => s.nick).join(', ')})` : ''}`);
    });

    socket.on('admin_end_playoff', () => {
        const playoff = gameState.playoff;
        if (playoff && playoff.submitters && playoff.submitters.length > 0) {
            const total = (playoff.stats.A || 0) + (playoff.stats.B || 0);
            const takPct = total > 0 ? (playoff.stats.A || 0) / total : 1;
            if (takPct < 0.51) {
                const ptsToRemove = 100;
                playoff.submitters.forEach(({ socketId, nick, points }) => {
                    const player = players.get(socketId);
                    if (player) {
                        const remove = Math.min(points, player.score);
                        player.score -= remove;
                        if (player.correctAnswersCount > 0) player.correctAnswersCount--;
                        if (gameState.teamBattleMode && player.team && gameState.teams[player.team]) {
                            gameState.teams[player.team].score -= remove * getTeamBalanceMultiplier(player.team);
                        }
                        const sock = io.sockets.sockets.get(socketId);
                        if (sock) sendPlayerScore(sock, player);
                        console.log(`🎤 Dogrywka: odjęto ${remove} pkt graczowi ${nick} (TAK < 51%)`);
                    } else {
                        const pending = pendingDisconnects.get(socketId);
                        const disc = disconnectedPlayersWithScore.get(nick);
                        const p = (pending && pending.player) ? pending.player : disc;
                        if (p) {
                            const remove = Math.min(points, p.score);
                            p.score -= remove;
                            if (p.correctAnswersCount > 0) p.correctAnswersCount--;
                            if (gameState.teamBattleMode && p.team && gameState.teams[p.team]) {
                                gameState.teams[p.team].score -= remove * getTeamBalanceMultiplier(p.team);
                            }
                            console.log(`🎤 Dogrywka: odjęto ${remove} pkt (rozłączony) ${nick}`);
                        }
                    }
                });
                io.emit('update_team_scores', gameState.teams);
            }
        }
        gameState.playoff = null;
        broadcastState();
    });

    socket.on('admin_show_leaderboard', () => {
        // Wyczyść timer gdy pokazuje się ranking
        if (questionTimer) {
            clearTimeout(questionTimer);
            questionTimer = null;
        }
        
        applySpeedrunScoring();
        applyEstimationScoring();
        checkEliminationNoAnswer(); // Sprawdź brak odpowiedzi w pytaniach eliminacyjnych
        gameState.type = 'LEADERBOARD';
        gameState.showStats = false;
        gameState.showCorrect = false;
        gameState.leaderboard = calculateLeaderboard();
        broadcastStateImmediate(); // Admin klika „Ranking"
    });

    // === PODIUM (PRZYWRÓCONE) ===
    socket.on('admin_show_thanks', () => {
        const player = players.get(socket.id);
        const isAdmin = player ? (player.isAdmin === true) : true;
        if (!isAdmin) return;
        
        gameState.type = 'THANKS';
        broadcastState();
    });

    socket.on('admin_show_podium', () => {
        // Wyczyść timer gdy pokazuje się podium
        if (questionTimer) {
            clearTimeout(questionTimer);
            questionTimer = null;
        }
        
        applySpeedrunScoring();
        applyEstimationScoring();
        checkEliminationNoAnswer(); // Sprawdź brak odpowiedzi w pytaniach eliminacyjnych
        
        if (gameState.teamBattleMode) {
            // Tryb drużynowy - podium z drużynami (tylko miejsca 2 i 1)
            const teams = [
                { name: gameState.teams.A?.name || 'Team A', score: gameState.teams.A?.score || 0 },
                { name: gameState.teams.B?.name || 'Team B', score: gameState.teams.B?.score || 0 }
            ].sort((a, b) => (b.score || 0) - (a.score || 0));
            
            // W trybie drużynowym winners to drużyny (tylko 2 miejsca)
            gameState.winners = [
                teams[0] || { name: '---', score: 0 },
                teams[1] || { name: '---', score: 0 }
            ];
            console.log('🥇 Generowanie podium drużynowego:', gameState.winners);
        } else {
            // Tryb indywidualny - standardowe podium z graczami
            const top3 = calculateLeaderboard().slice(0, 3);
            gameState.winners = top3;
            console.log('🥇 Generowanie podium dla:', top3);
        }
        
        gameState.type = 'PODIUM';
        gameState.podiumStep = 0;
        broadcastStateImmediate(); // Admin klika „Podium" – natychmiastowa aktualizacja
    });

    socket.on('admin_podium_step', (step) => {
        gameState.podiumStep = step;
        broadcastStateImmediate(); // Admin klika krok podium
    });

    socket.on('admin_idle', () => {
        // Wyczyść timer gdy pauza
        if (questionTimer) {
            clearTimeout(questionTimer);
            questionTimer = null;
        }
        
        applySpeedrunScoring();
        applyEstimationScoring();
        checkEliminationNoAnswer(); // Sprawdź brak odpowiedzi w pytaniach eliminacyjnych
        gameState.type = 'IDLE';
        broadcastState();
    });

    // === PEŁNY RESET GRY ===
    socket.on('admin_reset_game', () => {
        console.log('🔄 PEŁNY RESET GRY - resetowanie wszystkiego...');
        
        // Wyczyść timer
        if (questionTimer) {
            clearTimeout(questionTimer);
            questionTimer = null;
        }
        
        if (gameState.activeQuestion && gameState.activeQuestion.type === 'WYBORCZY') stopWyborczyQuestionOnServer();
        
        // Resetuj stan gry
        gameState.type = 'IDLE';
        gameState.activeQuestionIndex = -1;
        gameState.activeQuestion = null;
        gameState.showStats = false;
        gameState.showCorrect = false;
        gameState.stats = {};
        gameState.timeLeft = 0;
        gameState.questionStartTime = null;
        gameState.speedrunQueue = [];
        gameState.playoff = null;
        gameState.leaderboard = [];
        gameState.winners = [];
        gameState.podiumStep = 0;
        gameState.shipsGame = null; // WAŻNE: Resetuj grę w statki
        
        // WAŻNE: Wyłącz tryb drużynowy podczas resetu (żeby gra nie odpalała się jako team battle)
        gameState.teamBattleMode = false;
        
        // Resetuj wyniki drużyn
        gameState.teams.A.score = 0;
        gameState.teams.B.score = 0;
        gameState.teams.A.name = '';
        gameState.teams.B.name = '';
        
        // Resetuj wszystkich graczy: punkty, odpowiedzi, drużynę
        players.forEach((player, socketId) => {
            player.score = 0;
            player.answers = {};
            player.correctAnswersCount = 0;
            player.eliminated = false;
            player.team = null; // Usuń drużynę - WAŻNE: usuwa wszystkie wpisy o przynależności do drużyny
            
            // Wyślij gracza z powrotem do ekranu logowania (wymaga nowego nicka)
            const playerSocket = io.sockets.sockets.get(socketId);
            if (playerSocket) {
                playerSocket.emit('update_state', {
                    type: 'LOGIN',
                    quizTitle: gameState.quizTitle,
                    teamBattleMode: false // Upewnij się że tryb drużynowy jest wyłączony
                });
            }
        });
        
        // WAŻNE: Wygeneruj nowe ID dla wszystkich pytań, aby uniknąć konfliktów z localStorage
        // To zapewni, że po resecie pytania będą miały nowe ID i localStorage nie będzie zawierał starych odpowiedzi
        if (gameState.questions && gameState.questions.length > 0) {
            const timestamp = Date.now();
            gameState.questions.forEach((q, index) => {
                // Zawsze generuj nowe ID przy resecie (nawet jeśli pytanie już ma ID)
                q.id = `q_${timestamp}_${Math.random().toString(36).substr(2, 5)}`;
            });
            console.log('🔄 Wygenerowano nowe ID dla wszystkich pytań po resecie');
        }
        
        // Wyczyść bufor: lista graczy (nicki) i rozłączeni
        players.clear();
        pendingDisconnects.clear();
        disconnectedPlayersWithScore.clear();

        // Pełny reset HNC (żeby telefony z poprzedniej gry nie trafiały do hncVoters nowej gry)
        hncStopTimer();
        hncPhase = 'setup';
        hncPhotos = []; hncBracket = []; hncCurrentRound = 0; hncCurrentMatch = 0;
        hncVoters.clear(); hncVotedThis.clear(); hncVotesA.clear(); hncVotesB.clear();
        
        // Wyślij event pełnego resetu gry do wszystkich graczy (aby wyczyścili nick i drużynę)
        io.emit('game_reset');
        
        // Wyślij event resetu drużyn do wszystkich graczy (aby wyczyścili localStorage)
        io.emit('team_mode_reset', { 
            teamA: '', 
            teamB: '' 
        });
        
        // Zawsze wyślij ekran logowania (tryb drużynowy jest wyłączony)
        io.emit('update_state', {
            ...getStateForBroadcast(),
            type: 'LOGIN',
            teamBattleMode: false
        });
        
        updateUsersCount();
        console.log('✅ Pełny reset gry zakończony');
    });

    socket.on('admin_end_game', () => {
        const player = players.get(socket.id);
        const isAdmin = player ? (player.isAdmin === true) : true;
        if (!isAdmin) return;
        // Wyłącza tylko muzykę, tunel i rozłącza telefony – serwer pozostaje włączony
        (async () => {
            console.log('⛔ KONIEC GRY – muzyka, tunel, rozłączenie telefonów');
            io.emit('admin_stop_music');
            if (tunnelProcess) {
                if (typeof tunnelProcess.stop === 'function') {
                    try { tunnelProcess.stop(); } catch (_) {}
                } else if (typeof tunnelProcess.close === 'function') {
                    try { tunnelProcess.close(); } catch (_) {}
                } else {
                    try { tunnelProcess.kill('SIGTERM'); } catch (_) {}
                }
                tunnelProcess = null;
            }
            currentPinggyUrl = null;
            io.emit('qr_code', null);
            socket.emit('tunnel_stopped');
            if (gameState.showQROnPhones) {
                const wifiQR = currentWiFiSSID ? await generateWiFiQR(currentWiFiSSID) : null;
                const localGameQR = showLocalGameQR ? await generateLocalGameQR() : null;
                io.emit('qr_codes_on_phones', { wifiQR, wifiSSID: currentWiFiSSID, localGameQR, tunnelQR: null, gameQR: localGameQR || null });
            }
            const voteSocketIds = Array.from(players.keys());
            voteSocketIds.forEach((sid) => {
                const s = io.sockets.sockets.get(sid);
                if (s) s.disconnect(true);
            });
            players.clear();
            pendingDisconnects.clear();
            disconnectedPlayersWithScore.clear();
            gameState.type = 'IDLE';
            gameState.showZarazZaczynamy = false;
            gameState.showPlayersWithQR = false;
            broadcastStateImmediate();
            updateUsersCount();
            console.log('✅ Koniec gry – telefony rozłączone');
        })();
    });

    socket.on('admin_intro', () => {
        // Wyczyść timer gdy intro
        if (questionTimer) {
            clearTimeout(questionTimer);
            questionTimer = null;
        }
        
        gameState.type = 'INTRO';
        broadcastState();
    });

    socket.on('admin_toggle_show_players_with_qr', async () => {
        gameState.showPlayersWithQR = !gameState.showPlayersWithQR;
        console.log('👥 QR + nicki na ekranie:', gameState.showPlayersWithQR ? 'WŁĄCZONE' : 'WYŁĄCZONE');
        if (gameState.showPlayersWithQR) {
            const wifiQR = currentWiFiSSID ? await generateWiFiQR(currentWiFiSSID) : null;
            const localGameQR = showLocalGameQR ? await generateLocalGameQR() : null;
            const tunnelQR = currentPinggyUrl ? await generateGameQR() : null;
            socket.emit('qr_codes_on_phones', { wifiQR, wifiSSID: currentWiFiSSID, localGameQR, tunnelQR, gameQR: tunnelQR || localGameQR });
        }
        broadcastStateImmediate();
    });

    socket.on('admin_toggle_zaraz', () => {
        gameState.showZarazZaczynamy = !gameState.showZarazZaczynamy;
        if (gameState.showZarazZaczynamy) gameState.showPlayersWithQR = false;
        console.log('🎬 Ekran ZARAZ ZACZYNAMY:', gameState.showZarazZaczynamy ? 'WŁĄCZONY' : 'WYŁĄCZONY');
        broadcastStateImmediate();
    });

    socket.on('admin_play_intro_music', (data) => {
        io.emit('admin_play_intro_music', data || { volume: 70 });
    });
    socket.on('admin_stop_music', () => {
        io.emit('admin_stop_music');
    });

    // Koniec gry: wyłącz muzykę, zatrzymaj tunel, rozłącz telefony vote
    socket.on('admin_end_game_session', async () => {
        console.log('⛔ KONIEC GRY – muzyka, tunel, rozłączenie telefonów');
        io.emit('admin_stop_music');
        if (tunnelProcess) {
            if (typeof tunnelProcess.stop === 'function') {
                try { tunnelProcess.stop(); } catch (_) {}
            } else if (typeof tunnelProcess.close === 'function') {
                try { tunnelProcess.close(); } catch (_) {}
            } else {
                try { tunnelProcess.kill('SIGTERM'); } catch (_) {}
            }
            tunnelProcess = null;
        }
        currentPinggyUrl = null;
        io.emit('qr_code', null);
        socket.emit('tunnel_stopped');
        if (gameState.showQROnPhones) {
            const wifiQR = currentWiFiSSID ? await generateWiFiQR(currentWiFiSSID) : null;
            const localGameQR = showLocalGameQR ? await generateLocalGameQR() : null;
            io.emit('qr_codes_on_phones', { wifiQR, wifiSSID: currentWiFiSSID, localGameQR, tunnelQR: null, gameQR: localGameQR || null });
        }
        const voteSocketIds = Array.from(players.keys());
        voteSocketIds.forEach((sid) => {
            const s = io.sockets.sockets.get(sid);
            if (s) s.disconnect(true);
        });
        players.clear();
        pendingDisconnects.clear();
        disconnectedPlayersWithScore.clear();
        gameState.type = 'IDLE';
        gameState.showZarazZaczynamy = false;
        gameState.showPlayersWithQR = false;
        broadcastStateImmediate();
        updateUsersCount();
        console.log('✅ Koniec gry – telefony rozłączone');
    });
    socket.on('admin_set_master_volume', (vol) => {
        const v = Math.max(0, Math.min(100, parseInt(vol, 10))) / 100;
        masterVolume = v;
        saveVolumes();
        io.emit('master_volume', { volume: masterVolume });
        io.emit('admin_master_volume', Math.round(v * 100)); // kompatybilność z admin.html
    });

    // === TEAM BATTLE MODE ===
    // === Pokaż QR na telefonach (u graczy po dołączeniu – przekaż dalej dostęp) ===
    socket.on('admin_toggle_show_qr_on_phones', async () => {
        gameState.showQROnPhones = !gameState.showQROnPhones;
        console.log(`📱 Pokaż QR na telefonach: ${gameState.showQROnPhones ? 'WŁĄCZONE' : 'WYŁĄCZONE'}`);
        
        if (gameState.showQROnPhones) {
            const wifiQR = currentWiFiSSID ? await generateWiFiQR(currentWiFiSSID) : null;
            const localGameQR = showLocalGameQR ? await generateLocalGameQR() : null;
            const tunnelQR = currentPinggyUrl ? await generateGameQR() : null;
            const payload = {
                wifiQR, wifiSSID: currentWiFiSSID,
                localGameQR, tunnelQR,
                gameQR: tunnelQR || localGameQR
            };
            socket.emit('show_qr_on_phones_enabled', payload);
            io.emit('qr_codes_on_phones', payload);
        } else {
            socket.emit('show_qr_on_phones_disabled');
            io.emit('show_qr_on_phones_disabled');
        }
        
        broadcastState();
    });

    socket.on('admin_toggle_send_images_to_phones', () => {
        gameState.sendImagesToPhones = !gameState.sendImagesToPhones;
        console.log(`🖼️ Obrazki na telefonach: ${gameState.sendImagesToPhones ? 'WŁĄCZONE' : 'WYŁĄCZONE'}`);
        broadcastStateImmediate();
    });
    
    // Gracz prosi o kody QR (po dołączeniu, gdy opcja włączona)
    socket.on('request_qr_codes_on_phones', async () => {
        if (!gameState.showQROnPhones && !gameState.showPlayersWithQR) return;
        const wifiQR = currentWiFiSSID ? await generateWiFiQR(currentWiFiSSID) : null;
        const localGameQR = showLocalGameQR ? await generateLocalGameQR() : null;
        const tunnelQR = currentPinggyUrl ? await generateGameQR() : null;
        socket.emit('qr_codes_on_phones', {
            wifiQR, wifiSSID: currentWiFiSSID,
            localGameQR, tunnelQR,
            gameQR: tunnelQR || localGameQR
        });
    });
    
    socket.on('admin_set_teams', (data) => {
        console.log('📥 Otrzymano admin_set_teams:', data);
        const { teamA, teamB } = data || {};
        if (teamA && teamB && teamA.trim() && teamB.trim()) {
            gameState.teamBattleMode = true;
            gameState.teams.A.name = teamA.trim();
            gameState.teams.B.name = teamB.trim();
            gameState.teams.A.score = 0;
            gameState.teams.B.score = 0;
            // Resetuj drużyny wszystkich graczy
            players.forEach(p => { 
                p.team = null; 
                console.log(`🔄 Reset drużyny dla gracza ${p.nick}`);
            });
            
            // Wyślij specjalny event do wszystkich graczy, aby wyczyścili localStorage
            io.emit('team_mode_reset', { teamA: teamA.trim(), teamB: teamB.trim() });
            
            // Wyślij TEAM_SELECTION do wszystkich graczy bez drużyny
            players.forEach((player, socketId) => {
                const playerSocket = io.sockets.sockets.get(socketId);
                if (playerSocket && !player.team) {
                    console.log(`⚔️ Wysyłam TEAM_SELECTION do gracza ${player.nick}`);
                    playerSocket.emit('update_state', {
                        ...getStateForBroadcast(),
                        type: 'TEAM_SELECTION',
                        teamBattleMode: true
                    });
                }
            });
            
            broadcastState();
            console.log(`⚔️ Tryb drużynowy aktywowany: ${teamA.trim()} vs ${teamB.trim()}`);
            socket.emit('team_mode_activated', { teamA: teamA.trim(), teamB: teamB.trim() });
        } else {
            console.warn('⚠️ admin_set_teams: brak nazw drużyn lub puste wartości');
            socket.emit('team_mode_error', { message: 'Nieprawidłowe nazwy drużyn' });
        }
    });

    // === OBSŁUGA EDYTORA ===
    socket.on('editor_get_files', () => { socket.emit('editor_files_list', getQuizFiles()); });
    
    socket.on('editor_load_file', (filename) => {
        const { questions, options } = loadQuestions(filename);
        socket.emit('editor_file_content', { filename, questions, options });
    });

    socket.on('editor_save_file', (data) => {
        // Zachowaj oryginalną nazwę pliku (włączając spacje), tylko usuń niebezpieczne znaki
        let safeName = data.filename.trim();
        // Usuń tylko niebezpieczne znaki dla systemów plików (/, \, :, *, ?, ", <, >, |)
        safeName = safeName.replace(/[\/\\:*?"<>|]/g, '');
        // Usuń wielokrotne spacje
        safeName = safeName.replace(/\s+/g, ' ');
        // Upewnij się że ma rozszerzenie .json
        if (!safeName.toLowerCase().endsWith('.json')) safeName += '.json';
        const filePath = path.join(quizzesDir, safeName);
        const quizJsonData = JSON.stringify(data.content, null, 2);
        fs.writeFile(filePath, quizJsonData, (err) => {
            if (err) {
                socket.emit('editor_save_status', { success: false, message: 'Błąd zapisu' });
            } else {
                socket.emit('editor_save_status', { success: true, message: `Zapisano ${safeName}` });
                io.emit('files_list', getQuizFiles()); 
                socket.emit('editor_files_list', getQuizFiles());
                devSyncWriteData(`public/quizzes/${safeName}`, quizJsonData);
            }
        });
    });

    // Funkcje pomocnicze dla usuwania (muszą być przed handlerami które ich używają)
    function extractFilePath(url) {
        if (!url) return null;
        // Jeśli to URL lokalny (/uploads/...), wyciągnij nazwę pliku
        const match = url.match(/\/uploads\/([^\/]+)$/);
        if (match) return match[1];
        // Jeśli to już sama nazwa pliku (bez ścieżki)
        if (!url.includes('/') && !url.includes('http')) return url;
        return null;
    }

    function getThumbnailPath(filePath) {
        if (!filePath) return null;
        // Zamień rozszerzenie na -thumb.webp
        return filePath.replace(/\.[^.]+$/, '-thumb.webp');
    }

    // Zbiera wszystkie pliki używane przez INNE quizy (z wyjątkiem excludeFilename)
    function getFilesUsedByOtherQuizzes(excludeFilename) {
        const used = new Set();
        let quizFiles = [];
        try { quizFiles = fs.readdirSync(quizzesDir).filter(f => f.toLowerCase().endsWith('.json')); } catch (_) {}
        for (const qf of quizFiles) {
            if (qf === excludeFilename) continue;
            try {
                const raw = fs.readFileSync(path.join(quizzesDir, qf), 'utf8');
                const data = JSON.parse(raw);
                const questions = Array.isArray(data) ? data : (data.questions || []);
                questions.forEach(q => {
                    for (const field of ['media', 'image', 'imageSmall', 'audio', 'imageA', 'imageB', 'imageSmallA', 'imageSmallB', 'bgMusic']) {
                        const fp = extractFilePath(q[field]);
                        if (fp) { used.add(fp); used.add(getThumbnailPath(fp)); }
                    }
                    // WYBORCZY photos
                    if (Array.isArray(q.photos)) {
                        q.photos.forEach(p => { const fp = extractFilePath(p.url); if (fp) { used.add(fp); used.add(getThumbnailPath(fp)); } });
                    }
                });
                // top-level bgMusic (options)
                if (data.options && data.options.bgMusic) { const fp = extractFilePath(data.options.bgMusic); if (fp) used.add(fp); }
            } catch (_) {}
        }
        used.delete(null); used.delete(undefined);
        return used;
    }

    // Wyciąga wszystkie pliki mediów z quizu
    function getFilesFromQuiz(filePath) {
        const files = new Set();
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const questions = Array.isArray(data) ? data : (data.questions || []);
            questions.forEach(q => {
                for (const field of ['media', 'image', 'imageSmall', 'audio', 'imageA', 'imageB', 'imageSmallA', 'imageSmallB', 'bgMusic']) {
                    const fp = extractFilePath(q[field]);
                    if (fp) { files.add(fp); const t = getThumbnailPath(fp); if (t && fs.existsSync(path.join(uploadsDir, t))) files.add(t); }
                }
                if (Array.isArray(q.photos)) {
                    q.photos.forEach(p => { const fp = extractFilePath(p.url); if (fp) { files.add(fp); const t = getThumbnailPath(fp); if (t && fs.existsSync(path.join(uploadsDir, t))) files.add(t); } });
                }
            });
            if (data.options && data.options.bgMusic) { const fp = extractFilePath(data.options.bgMusic); if (fp) files.add(fp); }
        } catch (_) {}
        return files;
    }

    // Pobierz listę powiązanych plików dla quizu
    socket.on('editor_get_related_files', (filename) => {
        try {
            const filePath = path.join(quizzesDir, filename);
            if (!fs.existsSync(filePath)) {
                socket.emit('editor_related_files', { files: [], safeFiles: [], sharedFiles: [] });
                return;
            }

            // Użyj nowej funkcji pomocniczej
            const allFiles = getFilesFromQuiz(filePath);
            const usedElsewhere = getFilesUsedByOtherQuizzes(filename);
            const safeFiles = Array.from(allFiles).filter(f => !usedElsewhere.has(f));
            const sharedFiles = Array.from(allFiles).filter(f => usedElsewhere.has(f));

            socket.emit('editor_related_files', {
                files: Array.from(allFiles),  // dla kompatybilności
                safeFiles,
                sharedFiles
            });
        } catch (err) {
            console.error('❌ Błąd pobierania powiązanych plików:', err);
            socket.emit('editor_related_files', { files: [], safeFiles: [], sharedFiles: [] });
        }
    });


    // Usuń quiz i opcjonalnie powiązane pliki
    socket.on('editor_delete_file', (data) => {
        console.log('📥 Otrzymano żądanie usunięcia:', data);
        const { filename, deleteRelated } = data;
        
        if (!filename) {
            console.error('❌ Brak nazwy pliku w żądaniu');
            socket.emit('editor_delete_status', { success: false, message: 'Błąd: Brak nazwy pliku' });
            return;
        }
        
        try {
            const filePath = path.join(quizzesDir, filename);
            console.log('🔍 Sprawdzanie pliku:', filePath);
            
            if (!fs.existsSync(filePath)) {
                console.error('❌ Plik nie istnieje:', filePath);
                socket.emit('editor_delete_status', { success: false, message: `Plik ${filename} nie istnieje` });
                return;
            }

            let deletedFiles = [];
            let skippedFiles = [];
            let errors = [];

            // Jeśli usuwamy powiązane pliki, sprawdź które są bezpieczne do usunięcia
            if (deleteRelated) {
                const allQuizFiles = getFilesFromQuiz(filePath);
                const usedElsewhere = getFilesUsedByOtherQuizzes(filename);

                allQuizFiles.forEach(fileName => {
                    if (usedElsewhere.has(fileName)) {
                        // Plik używany przez inne quizy – CHRONIONY, nie usuwamy
                        skippedFiles.push(fileName);
                        console.log(`🛡️ Pominięto (używany przez inny quiz): ${fileName}`);
                        return;
                    }
                    const fullPath = path.join(uploadsDir, fileName);
                    if (fs.existsSync(fullPath)) {
                        try {
                            fs.unlinkSync(fullPath);
                            removeFileFromIndex(fileName);
                            deletedFiles.push(fileName);
                            console.log(`✅ Usunięto powiązany plik: ${fileName}`);
                            devSyncDelete(`public/uploads/${fileName}`);
                        } catch (err) {
                            errors.push(`Błąd usuwania ${fileName}: ${err.message}`);
                            console.error(`❌ Błąd usuwania ${fileName}:`, err);
                        }
                    }
                });
            }

            // Usuń plik JSON quizu
            try {
                fs.unlinkSync(filePath);
                deletedFiles.push(filename);
                console.log(`✅ Usunięto quiz: ${filename}`);
                devSyncDelete(`public/quizzes/${filename}`);
            } catch (err) {
                errors.push(`Błąd usuwania ${filename}: ${err.message}`);
                console.error(`❌ Błąd usuwania ${filename}:`, err);
            }

            // Odśwież listę plików
            io.emit('files_list', getQuizFiles());
            socket.emit('editor_files_list', getQuizFiles());

            let message = `Usunięto: ${filename}`;
            if (deleteRelated && deletedFiles.length > 1) {
                message += ` oraz ${deletedFiles.length - 1} plik(ów) multimedialnych`;
            }
            if (skippedFiles.length > 0) {
                message += `. Zachowano ${skippedFiles.length} plik(ów) używanych przez inne quizy`;
            }
            if (errors.length > 0) {
                message += `. Błędy: ${errors.join(', ')}`;
            }

            socket.emit('editor_delete_status', { 
                success: errors.length === 0, 
                message,
                skippedFiles
            });
        } catch (err) {
            console.error('❌ Błąd usuwania quizu:', err);
            socket.emit('editor_delete_status', { 
                success: false, 
                message: `Błąd usuwania: ${err.message}` 
            });
        }
    });

    // Funkcje pomocnicze zostały przeniesione wyżej (przed handlerami które ich używają)

    // === GRACZE ===
    socket.on('register_player', (nick) => {
        if (!nick || nick.trim() === '') return;
        
        // Sprawdź czy gracz był wcześniej rozłączony (reconnect)
        let existingPlayer = null;
        
        // Najpierw sprawdź pendingDisconnects (grace period)
        for (const [oldSocketId, pending] of pendingDisconnects.entries()) {
            if (pending.player.nick === nick.trim()) {
                existingPlayer = pending.player;
                pendingDisconnects.delete(oldSocketId);
                break;
            }
        }
        
        // Jeśli nie znaleziono w pendingDisconnects, sprawdź disconnectedPlayersWithScore
        if (!existingPlayer && disconnectedPlayersWithScore.has(nick.trim())) {
            existingPlayer = disconnectedPlayersWithScore.get(nick.trim());
            disconnectedPlayersWithScore.delete(nick.trim());
        }
        
        if (existingPlayer) {
            // Przywróć gracza z poprzednimi danymi (wynik, odpowiedzi, drużyna)
            existingPlayer.socketId = socket.id;
            players.set(socket.id, existingPlayer);
            console.log(`🔄 Przywrócono gracza ${nick} po reconnect (wynik: ${existingPlayer.score}, drużyna: ${existingPlayer.team})`);
            // Przywróć gracza do hncVoters tylko jeśli mecz aktywny (nie match_result — tam hnc_start_match rebuilds)
            if (hncPhase === 'voting' || hncPhase === 'ready' || hncPhase === 'tiebreak') {
                hncVoters.add(socket.id);
            }
            updateUsersCount();
            // Odśwież listę nicków na screen.html gdy widok QR jest aktywny
            if (gameState.showPlayersWithQR) io.emit('update_state', getStateForBroadcast());
            
            // Jeśli tryb drużynowy jest aktywny i gracz nie ma drużyny, wyślij ekran wyboru drużyny
            if (gameState.teamBattleMode && !existingPlayer.team) {
                console.log(`⚔️ Gracz ${nick} zarejestrowany - wysyłam TEAM_SELECTION`);
                socket.emit('update_state', {
                    ...getStateForBroadcast(),
                    type: 'TEAM_SELECTION',
                    teamBattleMode: true
                });
            } else {
                socket.emit('update_state', getStateForBroadcast());
            }
            return;
        }
        
        // Nowy gracz - utwórz nowy rekord
        const player = {
            socketId: socket.id,
            nick: nick.trim(),
            score: 0,
            answers: {},
            correctAnswersCount: 0,
            team: null,
            eliminated: false
        };
        players.set(socket.id, player);
        // Dodaj do hncVoters tylko gdy mecz jest aktywny (nie match_result — tam hnc_start_match rebuilds)
        if (hncPhase === 'voting' || hncPhase === 'ready' || hncPhase === 'tiebreak') {
            hncVoters.add(socket.id);
        }
        updateUsersCount();
        // Odśwież listę nicków na screen.html gdy widok QR jest aktywny
        if (gameState.showPlayersWithQR) io.emit('update_state', getStateForBroadcast());
        
        // Wyślij aktualny wynik gracza (0 dla nowego gracza)
        sendPlayerScore(socket, player);
        
        // Jeśli tryb drużynowy jest aktywny i gracz nie ma drużyny, wyślij ekran wyboru drużyny
        if (gameState.teamBattleMode && !player.team) {
            console.log(`⚔️ Gracz ${nick} zarejestrowany - wysyłam TEAM_SELECTION`);
            socket.emit('update_state', {
                ...getStateForBroadcast(),
                type: 'TEAM_SELECTION',
                teamBattleMode: true
            });
        } else {
            socket.emit('update_state', getStateForBroadcast());
        }
    });

    socket.on('send_answer', (data) => {
        const { index, value, text, team } = data;
        const player = players.get(socket.id);
        if (!player) return;
        if (player.eliminated) return;
        
        // Dogrywka TAK/NIE (bez punktów) – priorytet nad zwykłym pytaniem
        if (gameState.playoff && gameState.playoff.active) {
            if (gameState.playoff.voted.includes(socket.id)) return;
            if (index !== 0 && index !== 1) return;
            gameState.playoff.voted.push(socket.id);
            gameState.playoff.stats[index === 0 ? 'A' : 'B']++;
            broadcastState();
            return;
        }
        
        if (!gameState.activeQuestion) return;
        const qId = gameState.activeQuestion.id;
        if (player.answers[qId] !== undefined) return;
        const question = gameState.activeQuestion;
        
        // Pytanie otwarte – gracz wysyła tekst, 100 pkt za udział
        if (question.type === 'OPEN') {
            const t = (text != null && text !== undefined) ? String(text).trim() : '';
            if (!t) return;
            player.answers[qId] = t;
            const points = 100;
            player.score += points;
            player.correctAnswersCount++;
            // Dodaj punkty do drużyny jeśli tryb drużynowy jest włączony i gracz ma drużynę
            if (gameState.teamBattleMode && player.team && gameState.teams[player.team]) {
                gameState.teams[player.team].score += points * getTeamBalanceMultiplier(player.team);
            }
            io.emit('update_team_scores', gameState.teams);
            sendPlayerScore(socket, player);
            broadcastState();
            if (haveAllParticipatingPlayersAnswered()) endQuestionAndShowStats();
            return;
        }
        
        // Pytanie z literą – gracz wysyła tekst zaczynający się na przypisaną literę, 100 pkt za udział
        if (question.type === 'LETTER') {
            if (!gameState.letterGame || gameState.letterGame.questionId !== qId) return;
            const playerLetters = gameState.letterGame.playerLetters[socket.id];
            if (!playerLetters || playerLetters.length === 0) return;
            
            // Jeśli letterCount === 1, text jest pojedynczym słowem
            // Jeśli letterCount === 2, text powinien być tablicą [word1, word2] lub stringiem oddzielonym przecinkiem
            let words = [];
            if (gameState.letterGame.letterCount === 1) {
                const t = (text != null && text !== undefined) ? String(text).trim() : '';
                if (!t) return;
                words = [t];
            } else {
                // 2 litery - oczekujemy tablicy [word1, word2] lub stringa "word1,word2"
                if (Array.isArray(text)) {
                    words = text.map(w => String(w).trim()).filter(w => w);
                } else {
                    const t = (text != null && text !== undefined) ? String(text).trim() : '';
                    if (!t) return;
                    words = t.split(',').map(w => w.trim()).filter(w => w);
                }
                console.log('🔤 [LETTER] send_answer 2 litery – otrzymano text:', typeof text, JSON.stringify(text), '→ words:', words);
                if (words.length < 2) {
                    console.warn('🔤 [LETTER] Odrzucono – oczekiwano 2 słów, otrzymano:', words.length, words);
                    return;
                }
                words = [words[0], words[1]];
            }
            
            // Walidacja: każde słowo musi zaczynać się na odpowiednią literę (case-insensitive)
            let isValid = true;
            for (let i = 0; i < words.length && i < playerLetters.length; i++) {
                const word = words[i].toLowerCase();
                const letter = playerLetters[i].toLowerCase();
                if (!word.startsWith(letter)) {
                    isValid = false;
                    break;
                }
            }
            
            if (!isValid) return; // Odrzuć odpowiedź jeśli nie zaczyna się na właściwą literę
            
            // Zapisz odpowiedź (dla 1 litery jako string, dla 2 liter jako tablica)
            player.answers[qId] = gameState.letterGame.letterCount === 1 ? words[0] : words;
            
            const points = 100;
            player.score += points;
            player.correctAnswersCount++;
            // Dodaj punkty do drużyny jeśli tryb drużynowy jest włączony i gracz ma drużynę
            if (gameState.teamBattleMode && player.team && gameState.teams[player.team]) {
                gameState.teams[player.team].score += points * getTeamBalanceMultiplier(player.team);
            }
            io.emit('update_team_scores', gameState.teams);
            sendPlayerScore(socket, player);
            broadcastState();
            if (haveAllParticipatingPlayersAnswered()) endQuestionAndShowStats();
            return;
        }
        
        // Szacowanie – gracz wysyła liczbę, punkty przyznane na końcu pytania
        if (question.type === 'ESTIMATION') {
            const num = value !== undefined && value !== null ? Number(value) : NaN;
            if (Number.isNaN(num)) return;
            player.answers[qId] = num;
            broadcastState();
            if (haveAllParticipatingPlayersAnswered()) endQuestionAndShowStats();
            return;
        }
        
        const responseTime = gameState.questionStartTime ? Math.floor((Date.now() - gameState.questionStartTime) / 1000) : 0;
        player.answers[qId] = index;
        
        const result = calculatePoints(question, index, responseTime);
        const isSpeedrun = question.speedrun;
        
        if (question.elimination && !result.isCorrect) {
            player.eliminated = true;
            player.score = 0;
            const letters = ['A', 'B', 'C', 'D', 'E'];
            const letter = letters[index];
            if (letter && gameState.stats[letter] !== undefined) gameState.stats[letter]++;
            io.emit('stats_update', gameState.stats);
            io.emit('update_team_scores', gameState.teams);
            broadcastState();
            if (haveAllParticipatingPlayersAnswered()) endQuestionAndShowStats();
            return;
        }
        
        if (isSpeedrun && result.isCorrect) {
            gameState.speedrunQueue.push({ socketId: socket.id, responseTime });
        } else {
            player.score += result.points;
            if (result.isCorrect) player.correctAnswersCount++;
            // Dodaj punkty do drużyny jeśli tryb drużynowy jest włączony i gracz ma drużynę
            if (gameState.teamBattleMode && player.team && gameState.teams[player.team]) {
                gameState.teams[player.team].score += result.points * getTeamBalanceMultiplier(player.team);
            }
            // Wyślij zaktualizowany wynik gracza
            sendPlayerScore(socket, player);
        }
        
        const letters = ['A', 'B', 'C', 'D', 'E'];
        const letter = letters[index];
        if (letter && gameState.stats[letter] !== undefined) gameState.stats[letter]++;
        
        io.emit('stats_update', gameState.stats);
        if (!isSpeedrun) io.emit('update_team_scores', gameState.teams);
        broadcastState();
        if (haveAllParticipatingPlayersAnswered()) endQuestionAndShowStats();
    });

    socket.on('player_join_team', (team) => {
        const player = players.get(socket.id);
        if (player) {
            player.team = team;
            socket.emit('team_selected', team);
            broadcastState(); // odśwież liczbę graczy w drużynach na adminie i wszędzie
        }
    });

    // === GRA W STATKI ===
    socket.on('ships_shot', (data) => {
        const { questionId, row, col, hit, playerNick, team } = data;
        const player = players.get(socket.id);
        if (!player) return;
        if (player.eliminated) return;
        
        if (!gameState.activeQuestion || gameState.activeQuestion.id !== questionId) return;
        if (gameState.activeQuestion.type !== 'SHIPS') return;
        
        // Inicjalizuj stan gry jeśli nie istnieje (backup - powinno być już zainicjalizowane przy starcie pytania)
        if (!gameState.shipsGame || gameState.shipsGame.questionId !== questionId) {
            const boardSize = gameState.activeQuestion.boardSize || 8;
            const rawShips = gameState.activeQuestion.ships || [];
            const validShips = rawShips.filter(s => {
                if (!s || typeof s.size !== 'number' || s.size < 2 || s.size > 5) return false;
                const vertical = !!s.vertical;
                for (let i = 0; i < s.size; i++) {
                    const r = s.row + (vertical ? i : 0);
                    const c = s.col + (vertical ? 0 : i);
                    if (r < 0 || r >= boardSize || c < 0 || c >= boardSize) return false;
                }
                return true;
            });
            gameState.shipsGame = {
                questionId: questionId,
                boardSize,
                ships: validShips,
                shots: {}, // { "r_c": { hit: bool, players: [socketId], turn: number } }
                currentTurn: 0,
                playersShot: new Set(), // Gracze którzy już strzelili w tej turze
                gameEnded: false
            };
            console.log(`⚓ Backup inicjalizacja gry w statki dla pytania ${questionId}`);
        }
        
        const shipsGame = gameState.shipsGame;
        if (shipsGame.gameEnded) return;
        if (shipsGame.playersShot.has(socket.id)) return; // Już strzelił w tej turze
        
        // Sprawdź czy trafienie (weryfikacja po stronie serwera)
        let actualHit = false;
        for (const ship of shipsGame.ships) {
            for(let i = 0; i < ship.size; i++) {
                const sr = ship.row + (ship.vertical ? i : 0);
                const sc = ship.col + (ship.vertical ? 0 : i);
                if (sr === row && sc === col) {
                    actualHit = true;
                    break;
                }
            }
            if (actualHit) break;
        }
        
        const key = `${row}_${col}`;
        const existingShot = shipsGame.shots[key];
        const hitInPreviousRound = existingShot && existingShot.turn !== shipsGame.currentTurn;
        const hitInCurrentRound = existingShot && existingShot.turn === shipsGame.currentTurn;
        
        // Zarejestruj strzał w historii
        if (!existingShot) {
            // Pierwsze trafienie tej komórki w historii gry
            shipsGame.shots[key] = { hit: actualHit, players: [socket.id], turn: shipsGame.currentTurn };
        } else if (hitInCurrentRound && !existingShot.players.includes(socket.id)) {
            // Ten sam gracz nie może strzelić dwa razy (chronione przez playersShot), ale inny może trafić tę samą komórkę w tej samej rundzie
            existingShot.players.push(socket.id);
        }
        // hitInPreviousRound: komórka odkryta wcześniej – tylko zapisujemy strzał w playersShot, bez punktów
        
        shipsGame.playersShot.add(socket.id);
        
        // Przyznaj punkty tylko jeśli trafienie I komórka jest odkrywana w tej rundzie
        if (actualHit && !hitInPreviousRound) {
            const playersThisRound = shipsGame.shots[key].players;
            const hitCount = playersThisRound.length;
            const pointsPerPlayer = Math.floor(100 / hitCount);
            
            if (hitInCurrentRound) {
                // Kolejna osoba trafia tę samą komórkę w tej samej rundzie → przelicz punkty wszystkim w tej rundzie
                const previousHitCount = hitCount - 1;
                const oldPoints = Math.floor(100 / previousHitCount);
                const pointsDiff = pointsPerPlayer - oldPoints; // wartość ujemna (korekta)
                playersThisRound.slice(0, -1).forEach(prevSocketId => {
                    const prevPlayer = players.get(prevSocketId);
                    if (prevPlayer) {
                        prevPlayer.score += pointsDiff;
                        if (gameState.teamBattleMode && prevPlayer.team && gameState.teams[prevPlayer.team]) {
                            gameState.teams[prevPlayer.team].score += pointsDiff * getTeamBalanceMultiplier(prevPlayer.team);
                        }
                        const prevSocket = io.sockets.sockets.get(prevSocketId);
                        if (prevSocket) sendPlayerScore(prevSocket, prevPlayer);
                    }
                });
            }
            
            // Przyznaj punkty nowemu graczowi (lub pierwszemu)
            player.score += pointsPerPlayer;
            player.correctAnswersCount++;
            if (gameState.teamBattleMode && player.team && gameState.teams[player.team]) {
                gameState.teams[player.team].score += pointsPerPlayer * getTeamBalanceMultiplier(player.team);
            }
            sendPlayerScore(socket, player);
        }
        
        // Gdy wszyscy gracze strzelili w tej turze – pokaż wyniki i czekaj na admina
        // WAŻNE: NIE inkrementuj currentTurn tutaj – robi to dopiero admin przez ships_next_turn
        if (players.size > 0 && shipsGame.playersShot.size >= players.size) {
            gameState.showStats = true;
            gameState.showCorrect = false;
            gameState.type = 'GAME';
            console.log(`⚓ Wszyscy strzelili w rundzie ${shipsGame.currentTurn} – czekam na admina (ships_next_turn)`);
        }
        
        // Wyślij aktualizację stanu gry do wszystkich klientów (nie tylko graczy) - Screen.html też musi otrzymać
        // Dla każdego gracza wyślij indywidualną informację czy już strzelił w tej turze
        const playersArray = Array.from(players.values());
        playersArray.forEach(p => {
            io.to(p.socketId).emit('ships_game_update', {
                questionId: questionId,
                shots: shipsGame.shots,
                currentTurn: shipsGame.currentTurn,
                hasShotThisTurn: shipsGame.playersShot.has(p.socketId),
                gameEnded: shipsGame.gameEnded,
                showStats: gameState.showStats || false, // WAŻNE: Informuj klientów o stanie showStats
                showCorrect: gameState.showCorrect || false // WAŻNE: Informuj klientów o stanie showCorrect
            });
        });
        // Wyślij również ogólną aktualizację do wszystkich klientów (dla Screen.html)
        io.emit('ships_game_update', {
            questionId: questionId,
            shots: shipsGame.shots,
            currentTurn: shipsGame.currentTurn,
            hasShotThisTurn: false, // Screen.html nie potrzebuje indywidualnej informacji
            gameEnded: shipsGame.gameEnded,
            showStats: gameState.showStats || false,
            showCorrect: gameState.showCorrect || false
        });
        
        io.emit('update_team_scores', gameState.teams);
        broadcastState();
    });

    socket.on('ships_next_turn', (data) => {
        console.log('🔄 ships_next_turn otrzymane:', data);
        console.log('🔄 ships_next_turn - socket.id:', socket.id, 'players.size:', players.size);
        const { questionId } = data;
        
        // WAŻNE: Admin nie jest w mapie players - sprawdź czy socket wysyła eventy admin_*
        // Jeśli socket wysyła admin_* eventy, to jest adminem (używa admin.html)
        // Sprawdź czy socket ma referencję do admina przez sprawdzenie czy może wysyłać admin_* eventy
        // Alternatywnie: jeśli socket nie jest w players, ale wysyła admin_* eventy, to jest adminem
        
        // Sprawdź czy socket jest w players (może admin się zarejestrował jako gracz)
        const player = players.get(socket.id);
        console.log('🔄 ships_next_turn - player:', {
            found: !!player,
            nick: player?.nick,
            isAdmin: player?.isAdmin,
            socketId: socket.id
        });
        
        // Jeśli gracz nie istnieje w players, ale wysyła admin_* eventy, to jest adminem
        // Dla uproszczenia: jeśli socket nie jest w players, ale wysyła ships_next_turn, 
        // to zakładamy że jest adminem (bo tylko admin.html ma dostęp do tego przycisku)
        const isAdmin = player ? (player.isAdmin === true) : true; // Jeśli nie ma w players, zakładamy że to admin
        
        if (!isAdmin) {
            console.error('❌ ships_next_turn - gracz nie jest adminem:', player?.nick, 'isAdmin:', player?.isAdmin);
            return;
        }
        
        console.log('🔄 ships_next_turn - sprawdzam gameState:', {
            hasShipsGame: !!gameState.shipsGame,
            gameQuestionId: gameState.shipsGame?.questionId,
            requestedQuestionId: questionId,
            activeQuestionId: gameState.activeQuestion?.id,
            activeQuestionType: gameState.activeQuestion?.type
        });
        
        if (!gameState.shipsGame || gameState.shipsGame.questionId !== questionId) {
            console.error('❌ ships_next_turn - brak gry lub złe questionId:', {
                hasShipsGame: !!gameState.shipsGame,
                gameQuestionId: gameState.shipsGame?.questionId,
                requestedQuestionId: questionId,
                activeQuestionId: gameState.activeQuestion?.id,
                activeQuestionType: gameState.activeQuestion?.type
            });
            return;
        }
        
        const shipsGame = gameState.shipsGame;
        if (shipsGame.gameEnded) {
            console.error('❌ ships_next_turn - gra już zakończona');
            return;
        }
        
        const oldTurn = shipsGame.currentTurn;
        shipsGame.currentTurn++;
        shipsGame.playersShot.clear(); // Reset strzałów dla nowej tury - wszyscy mogą strzelać ponownie
        
        // Resetuj showStats i showCorrect aby wrócić do trybu gry (nie statystyk)
        gameState.showStats = false;
        gameState.showCorrect = false;
        gameState.type = 'GAME'; // Upewnij się że jesteśmy w trybie gry, nie statystyk
        
        console.log(`🔄 Następna runda ${shipsGame.currentTurn} (było ${oldTurn}) dla pytania ${questionId}, graczy: ${players.size}`);
        console.log('🔄 Stan po zmianie:', {
            currentTurn: shipsGame.currentTurn,
            showStats: gameState.showStats,
            showCorrect: gameState.showCorrect,
            type: gameState.type,
            playersShotSize: shipsGame.playersShot.size
        });
        
        // Wyślij aktualizację do wszystkich klientów (nie tylko graczy) - Screen.html też musi otrzymać
        io.emit('ships_game_update', {
            questionId: questionId,
            shots: shipsGame.shots,
            currentTurn: shipsGame.currentTurn,
            hasShotThisTurn: false, // Wszyscy mogą strzelać w nowej rundzie
            gameEnded: shipsGame.gameEnded,
            showStats: false, // WAŻNE: Informuj klientów że showStats jest false (nowa runda aktywna)
            showCorrect: false // WAŻNE: Informuj klientów że showCorrect jest false
        });
        
        console.log('📤 Wysłano ships_game_update do wszystkich klientów');
        
        // WAŻNE: Wyślij aktualizację wyników drużyn jeśli tryb drużynowy jest włączony
        if (gameState.teamBattleMode) {
            io.emit('update_team_scores', gameState.teams);
            console.log('📤 Wysłano update_team_scores po ships_next_turn');
        }
        
        // Wyślij również przez broadcastState aby zaktualizować wszystkie komponenty
        broadcastState();
        console.log('📤 Wywołano broadcastState()');
    });

    // ─── SHIPS_SOLO standalone: inicjalizacja bez pytania ───────────────────────

    /** Standalone: admin ładuje konfigurację i startuje grę */
    socket.on('ships_solo_init', (data) => {
        const { boardSize, ships, rewards, soundtrack } = data;
        const validShips = (ships || []).filter(s => {
            if (!s || typeof s.size !== 'number' || s.size < 2 || s.size > 5) return false;
            const vertical = !!s.vertical;
            for (let i = 0; i < s.size; i++) {
                const r = s.row + (vertical ? i : 0);
                const c = s.col + (vertical ? 0 : i);
                if (r < 0 || r >= boardSize || c < 0 || c >= boardSize) return false;
            }
            return true;
        });
        // rewards jako tablica; rewardMode: 'per_hit' (każdy maszt) | 'per_ship' (pierwsze trafienie)
        const rewardsArr = Array.isArray(rewards) ? rewards : Object.values(rewards || {}).filter(Boolean);
        gameState.shipsSoloGame = {
            questionId: 'standalone',
            boardSize: boardSize || 8,
            ships: validShips,
            rewards: rewardsArr,
            rewardMode: data.rewardMode || 'per_hit',
            shipsHitOrder: [],   // per_ship: indeksy w kolejności pierwszego trafienia
            totalHits: 0,        // per_hit: licznik trafionych komórek
            shots: {},
            aimRow: null, aimCol: null,
            phase: 'col',
            lastShot: null,
            gameEnded: false,
            soundtrack: soundtrack || '',
            soundtrackLoop: data.soundtrackLoop !== false
        };
        io.emit('ships_solo_state', gameState.shipsSoloGame);
        console.log(`⚓ [SHIPS_SOLO standalone] Gra zainicjowana, plansza ${boardSize}x${boardSize}, ${validShips.length} statków`);
    });

    /** Standalone: reset gry */
    socket.on('ships_solo_reset', () => {
        clearShipsSoloAimTimer();
        gameState.shipsSoloGame = null;
        io.emit('ships_solo_state', null);
        console.log('⚓ [SHIPS_SOLO standalone] Reset gry');
    });

    /** Screen pyta o aktualny stan po połączeniu */
    socket.on('ships_solo_get_state', () => {
        socket.emit('ships_solo_state', gameState.shipsSoloGame || null);
    });

    // ─── SHIPS_SOLO: Admin steruje celownikiem i strzałem ───────────────────────
    let shipsSoloAimTimer = null; // timer 10s na strzał

    function clearShipsSoloAimTimer() {
        if (shipsSoloAimTimer) { clearTimeout(shipsSoloAimTimer); shipsSoloAimTimer = null; }
    }

    /** Admin wybiera kolumnę/wiersz (phase: 'col'|'row') – emitujemy aim do Screena */
    socket.on('ships_solo_aim', (data) => {
        const { questionId, aimRow, aimCol, phase } = data;
        if (!gameState.shipsSoloGame) return;
        if (questionId && gameState.shipsSoloGame.questionId !== questionId) return;
        const g = gameState.shipsSoloGame;
        g.aimRow = aimRow ?? g.aimRow;
        g.aimCol = aimCol ?? g.aimCol;
        g.phase = phase || g.phase;
        io.emit('ships_solo_aim_update', { aimRow: g.aimRow, aimCol: g.aimCol, phase: g.phase });

        // Timer 10s – gdy admin wchodzi w fazę 'row' (kolumna wybrana, cel aktywny)
        if (phase === 'row') {
            clearShipsSoloAimTimer();
            shipsSoloAimTimer = setTimeout(() => {
                shipsSoloAimTimer = null;
                if (!gameState.shipsSoloGame) return;
                gameState.shipsSoloGame.aimRow = null;
                gameState.shipsSoloGame.aimCol = null;
                gameState.shipsSoloGame.phase = 'col';
                io.emit('ships_solo_timeout');
                io.emit('ships_solo_aim_update', { aimRow: null, aimCol: null, phase: 'col' });
                console.log('⚓ [SHIPS_SOLO] Timeout strzału – runda pominięta');
            }, 10000);
        } else {
            // Wróciło do fazy 'col' (reset) – anuluj timer
            clearShipsSoloAimTimer();
        }
    });

    /** Admin oddaje strzał */
    socket.on('ships_solo_shot', (data) => {
        clearShipsSoloAimTimer(); // Anuluj timer 10s
        const { questionId, row, col } = data;
        if (!gameState.shipsSoloGame) return;
        if (questionId && gameState.shipsSoloGame.questionId !== questionId) return;
        const g = gameState.shipsSoloGame;
        if (g.gameEnded) return;

        const key = `${row}_${col}`;
        if (g.shots[key]) return; // Już strzelano w to pole

        // Wykryj trafienie + ustal rozmiar i indeks trafionego statku
        let hit = false;
        let hitShipIdx = -1;
        for (let si = 0; si < g.ships.length; si++) {
            const ship = g.ships[si];
            for (let i = 0; i < ship.size; i++) {
                const sr = ship.row + (ship.vertical ? i : 0);
                const sc = ship.col + (ship.vertical ? 0 : i);
                if (sr === row && sc === col) { hit = true; hitShipIdx = si; break; }
            }
            if (hit) break;
        }

        // Nagroda wg trybu
        let reward = null;
        const shipSize = hit ? g.ships[hitShipIdx].size : null;
        if (hit) {
            if (g.rewardMode === 'buciki') {
                const sz = g.ships[hitShipIdx].size;
                const pl = sz === 1 ? 'flaszka' : sz <= 4 ? 'flaszki' : 'flaszek';
                reward = `${'🥃'.repeat(sz)} ${sz} ${pl}!`;
            } else if (g.rewardMode === 'buciki_2') {
                reward = '🥃 1 flaszka!';
            } else if (g.rewardMode === 'per_ship') {
                // Nagroda tylko przy PIERWSZYM trafieniu danego statku
                if (!g.shipsHitOrder.includes(hitShipIdx)) {
                    g.shipsHitOrder.push(hitShipIdx);
                    reward = (g.rewards && g.rewards[g.shipsHitOrder.length - 1]) || null;
                }
            } else {
                // per_hit: nagroda przy każdym trafieniu masztu (domyślny)
                reward = (g.rewards && g.rewards[g.totalHits]) || null;
                g.totalHits++;
            }
        }

        g.shots[key] = { hit, reward, shipSize };
        g.lastShot = { row, col, hit, reward, shipSize };
        g.aimRow = null;
        g.aimCol = null;
        g.phase = 'col';

        // Sprawdź czy wszystkie statki zatopione
        let allSunk = true;
        for (const ship of g.ships) {
            for (let i = 0; i < ship.size; i++) {
                const sr = ship.row + (ship.vertical ? i : 0);
                const sc = ship.col + (ship.vertical ? 0 : i);
                if (!g.shots[`${sr}_${sc}`]?.hit) { allSunk = false; break; }
            }
            if (!allSunk) break;
        }
        if (allSunk) g.gameEnded = true;

        const hitCount = g.rewardMode === 'per_ship' ? g.shipsHitOrder.length : g.totalHits;
        console.log(`⚓ [SHIPS_SOLO] Strzał (${row},${col}) – ${hit ? `TRAFIONY (${shipSize}-masztowy, ${hitCount}. statek)` : 'pudło'}${reward ? ' nagroda: ' + reward : ''}`);
        io.emit('ships_solo_shot_result', {
            questionId, row, col, hit, reward, shipSize,
            hitCount,           // ile różnych statków trafionych łącznie
            shots: g.shots,
            gameEnded: g.gameEnded,
            phase: g.phase
        });
        broadcastState();
    });

    /** Admin reguluje głośność soundtracku SHIPS_SOLO – zapis w kanale statki */
    socket.on('ships_solo_volume', (data) => {
        const v = parseFloat(data && data.volume);
        if (!isNaN(v) && v >= 0 && v <= 1) {
            statkiVolume = v;
            saveVolumes();
        }
        io.emit('ships_solo_volume', { volume: statkiVolume });
    });

    /** Admin kończy grę solo */
    socket.on('ships_solo_end', (data) => {
        clearShipsSoloAimTimer();
        if (!gameState.shipsSoloGame) return;
        gameState.shipsSoloGame.gameEnded = true;
        io.emit('ships_solo_stop_music');
        io.emit('ships_solo_shot_result', {
            questionId: gameState.shipsSoloGame.questionId || 'standalone',
            shots: gameState.shipsSoloGame.shots,
            gameEnded: true
        });
        broadcastState();
        console.log(`⚓ [SHIPS_SOLO] Gra zakończona przez admina`);
    });

    socket.on('ships_end_game', (data) => {
        const { questionId } = data;
        const player = players.get(socket.id);
        // Admin może nie być w players - jeśli nie ma w players, zakładamy że to admin
        const isAdmin = player ? (player.isAdmin === true) : true;
        if (!isAdmin) return;
        
        if (!gameState.shipsGame || gameState.shipsGame.questionId !== questionId) return;
        
        gameState.shipsGame.gameEnded = true;
        
        // Wyślij aktualizację do wszystkich graczy
        const playersArray = Array.from(players.values());
        playersArray.forEach(p => {
            io.to(p.socketId).emit('ships_game_update', {
                questionId: questionId,
                shots: gameState.shipsGame.shots,
                currentTurn: gameState.shipsGame.currentTurn,
                hasShotThisTurn: false,
                gameEnded: true
            });
        });
        
        // WAŻNE: Wyślij aktualizację wyników drużyn jeśli tryb drużynowy jest włączony
        if (gameState.teamBattleMode) {
            io.emit('update_team_scores', gameState.teams);
        }
        
        broadcastState();
    });

    // ===== DODATEK WYBORCZY =====
    socket.on('wyborczy_join_voters', () => {
        wyborczyVoters.add(socket.id);
        // Jeśli już zagłosował w tej rundzie (reconnect)
        if (wyborczySession && wyborczySession.currentIndex >= 0) {
            const idx = wyborczySession.currentIndex;
            if (wyborczySession.voterIds[idx] && wyborczySession.voterIds[idx].has(socket.id)) {
                wyborczyVotedThis.add(socket.id);
            }
        }
        checkWyborczyAllVoted();
    });

    socket.on('wyborczy_admin_start', (data) => {
        wyborczySession = {
            photos: data.photos || [],
            currentIndex: -1,
            votes: {},
            voterIds: {},
            phase: 'idle'
        };
        wyborczyVotedThis.clear();
        io.emit('wyborczy_state', buildWyborczyState());
    });

    socket.on('wyborczy_admin_next', () => {
        if (!wyborczySession) return;
        const next = wyborczySession.currentIndex + 1;
        stopWyborczyPhotoTimer();
        if (next >= wyborczySession.photos.length) {
            wyborczySession.phase = 'podium';
            wyborczyVotedThis.clear();
            io.emit('wyborczy_state', buildWyborczyState());
            broadcastState();
            return;
        }
        wyborczySession.currentIndex = next;
        wyborczySession.phase = 'voting';
        wyborczyVotedThis.clear();
        if (!wyborczySession.votes[next]) wyborczySession.votes[next] = [];
        if (!wyborczySession.voterIds[next]) wyborczySession.voterIds[next] = new Set();
        const phDuration = (gameState.activeQuestion && gameState.activeQuestion.type === 'WYBORCZY')
            ? (gameState.activeQuestion.time || 15) : 15;
        startWyborczyPhotoTimer(phDuration);
        io.emit('wyborczy_state', buildWyborczyState());
        broadcastState();
    });

    socket.on('wyborczy_admin_prev', () => {
        if (!wyborczySession) return;
        const prev = wyborczySession.currentIndex - 1;
        if (prev < 0) return;
        stopWyborczyPhotoTimer();
        wyborczySession.currentIndex = prev;
        wyborczySession.phase = 'voting';
        wyborczyVotedThis.clear();
        const phDuration = (gameState.activeQuestion && gameState.activeQuestion.type === 'WYBORCZY')
            ? (gameState.activeQuestion.time || 15) : 15;
        startWyborczyPhotoTimer(phDuration);
        io.emit('wyborczy_state', buildWyborczyState());
        broadcastState();
    });

    socket.on('wyborczy_admin_podium', () => {
        if (!wyborczySession) return;
        stopWyborczyPhotoTimer();
        wyborczySession.phase = 'podium';
        io.emit('wyborczy_state', buildWyborczyState());
        broadcastState();
    });

    socket.on('wyborczy_admin_stats', () => {
        if (!wyborczySession) return;
        wyborczySession.phase = 'stats';
        io.emit('wyborczy_state', buildWyborczyState());
        broadcastState();
    });

    // Dogrywka – głosowanie tylko na remisowe zdjęcia
    socket.on('wyborczy_dogrywka_start', () => {
        if (!wyborczySession) return;
        const st = buildWyborczyState();
        const tiedIndices = getWyborczyTies(st.ranking);
        if (!tiedIndices.length) return;
        // Reset votes only for tied photos
        tiedIndices.forEach(idx => {
            wyborczySession.votes[idx] = [];
            wyborczySession.voterIds[idx] = new Set();
        });
        // Narrow photos to tied ones only (virtual dogrywka session)
        wyborczySession.dogrywkaIndices = tiedIndices;
        wyborczySession.dogrywkaPhotoPos = -1;
        wyborczySession.phase = 'dogrywka';
        wyborczyVotedThis.clear();
        io.emit('wyborczy_state', buildWyborczyState());
        broadcastState();
    });

    socket.on('wyborczy_dogrywka_next', () => {
        if (!wyborczySession || wyborczySession.phase !== 'dogrywka') return;
        const indices = wyborczySession.dogrywkaIndices || [];
        const nextPos = (wyborczySession.dogrywkaPhotoPos || -1) + 1;
        stopWyborczyPhotoTimer();
        if (nextPos >= indices.length) {
            wyborczySession.phase = 'podium';
            wyborczySession.dogrywkaIndices = null;
            wyborczyVotedThis.clear();
            io.emit('wyborczy_state', buildWyborczyState());
            broadcastState();
            return;
        }
        wyborczySession.dogrywkaPhotoPos = nextPos;
        const realIdx = indices[nextPos];
        wyborczySession.currentIndex = realIdx;
        wyborczyVotedThis.clear();
        if (!wyborczySession.votes[realIdx]) wyborczySession.votes[realIdx] = [];
        if (!wyborczySession.voterIds[realIdx]) wyborczySession.voterIds[realIdx] = new Set();
        const phDuration = (gameState.activeQuestion && gameState.activeQuestion.type === 'WYBORCZY')
            ? (gameState.activeQuestion.time || 15) : 15;
        startWyborczyPhotoTimer(phDuration);
        io.emit('wyborczy_state', buildWyborczyState());
        broadcastState();
    });

    socket.on('wyborczy_podium_reveal', (data) => {
        // Dołącz dane zdjęcia do eventu – screen.html nie musi ich szukać
        let photoData = {};
        if (wyborczySession) {
            const st = buildWyborczyState();
            const r = st.ranking.find(x => x.place === data.place);
            if (r) photoData = { url: r.url, label: r.label, avg: r.avg, count: r.count };
        }
        io.emit('wyborczy_podium_reveal', {
            place: data.place,
            confetti: data.confetti !== false,
            ...photoData
        });
    });

    socket.on('wyborczy_podium_full', () => {
        if (!wyborczySession) return;
        wyborczySession.phase = 'podium_full';
        io.emit('wyborczy_state', buildWyborczyState());
    });

    socket.on('wyborczy_admin_reset', () => {
        stopWyborczyPhotoTimer();
        wyborczySession = null;
        wyborczyVoters.clear();
        wyborczyVotedThis.clear();
        io.emit('wyborczy_state', { phase: 'idle', photos: [], currentIndex: -1, ranking: [], voteSummary: [] });
        broadcastState();
    });

    socket.on('wyborczy_vote', (data) => {
        if (!wyborczySession || (wyborczySession.phase !== 'voting' && wyborczySession.phase !== 'dogrywka')) return;
        const idx = wyborczySession.currentIndex;
        if (wyborczySession.voterIds[idx] && wyborczySession.voterIds[idx].has(socket.id)) return;
        if (!wyborczySession.votes[idx]) wyborczySession.votes[idx] = [];
        if (!wyborczySession.voterIds[idx]) wyborczySession.voterIds[idx] = new Set();
        const stars = Math.max(1, Math.min(10, parseInt(data.stars || data.rating || 1)));
        wyborczySession.votes[idx].push(stars);
        wyborczySession.voterIds[idx].add(socket.id);
        wyborczyVotedThis.add(socket.id);

        // Przyznaj 10 punktów za oddany głos (niezależnie od oceny)
        const player = players.get(socket.id);
        if (player) {
            player.score += 10;
            sendPlayerScore(socket, player);
            if (gameState.teamBattleMode && player.team && gameState.teams[player.team]) {
                gameState.teams[player.team].score += 10 * getTeamBalanceMultiplier(player.team);
                io.emit('update_team_scores', gameState.teams);
            }
        }

        socket.emit('wyborczy_vote_ok', { photoIndex: idx });
        io.emit('wyborczy_vote_update', {
            photoIndex: idx,
            count: wyborczySession.votes[idx].length,
            avg: calcAvg(wyborczySession.votes[idx])
        });
        checkWyborczyAllVoted();
    });

    socket.on('wyborczy_get_state', () => {
        if (!wyborczySession) {
            socket.emit('wyborczy_state', { phase: 'idle', photos: [], currentIndex: -1, ranking: [], voteSummary: [] });
        } else {
            const st = buildWyborczyState();
            const idx = wyborczySession.currentIndex;
            const alreadyVoted = idx >= 0 && wyborczySession.voterIds[idx] && wyborczySession.voterIds[idx].has(socket.id);
            socket.emit('wyborczy_state', { ...st, alreadyVoted });
        }
    });
    // ===== /DODATEK WYBORCZY =====

    // ===== HOT OR NOT CHAMPION =====
    socket.on('hnc_join_phone', () => {
        hncVoters.add(socket.id);
        socket.emit('hnc_state', hncGetState());
    });
    socket.on('hnc_join_screen', () => { socket.emit('hnc_state', hncGetState()); });
    socket.on('hnc_join_admin', () => { socket.emit('hnc_state', hncGetState()); });

    socket.on('hnc_setup', (data) => {
        hncPhotos = (data.photos || []).map((p, i) => ({ id: `hnc_${i}_${Date.now()}`, url: p.url, desc: p.desc || '' }));
        hncMatchTime = Math.max(5, parseInt(data.time) || 15);
        hncQuestionText = data.questionText || '';
        hncBuildBracket(hncPhotos);
        hncCurrentRound = 0;
        hncCurrentMatch = 0;
        hncPhase = 'ready';
        hncVotedThis.clear(); hncVotesA.clear(); hncVotesB.clear();
        hncStopTimer();
        hncBroadcast();
    });

    socket.on('hnc_shuffle', () => {
        // Only allowed at the very start of eliminacje (round 0, match 0, no winners yet)
        if (hncPhase !== 'ready' || hncCurrentRound !== 0 || hncCurrentMatch !== 0) return;
        if (hncBracket[0]?.some(m => m?.winner)) return;
        // Fisher-Yates shuffle of hncPhotos, then rebuild bracket
        for (let i = hncPhotos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [hncPhotos[i], hncPhotos[j]] = [hncPhotos[j], hncPhotos[i]];
        }
        hncBuildBracket(hncPhotos);
        hncCurrentRound = 0;
        hncCurrentMatch = 0;
        // Preload first match after shuffle
        const firstM = hncBracket[0]?.[0];
        if (firstM?.photoA && firstM?.photoB) {
            io.emit('hnc_preload', [firstM.photoA.url, firstM.photoB.url]);
        }
        hncBroadcast();
    });

    socket.on('hnc_start_match', () => {
        const m = hncBracket[hncCurrentRound]?.[hncCurrentMatch];
        if (!m || !m.photoA || !m.photoB) return;
        hncPhase = 'voting';
        hncVotedThis.clear(); hncVotesA.clear(); hncVotesB.clear();
        // Refresh voters: remove disconnected sockets, add current players
        for (const id of [...hncVoters]) {
            if (!io.sockets.sockets.has(id)) hncVoters.delete(id);
        }
        players.forEach((p, sid) => { if (p.nick) hncVoters.add(sid); });
        hncBroadcast();
        hncTimeLeft = hncMatchTime;
        hncStopTimer();
        hncTimerInt = setInterval(() => {
            hncTimeLeft--;
            hncBroadcast();
            if (hncTimeLeft <= 0) hncEndVoting();
        }, 1000);
    });

    socket.on('hnc_vote', (data) => {
        if (hncPhase !== 'voting') return;
        if (hncVotedThis.has(socket.id)) return;
        // Auto-register voter — handles reconnect (new socket.id) and post-reset scenarios
        hncVoters.add(socket.id);
        hncVotedThis.add(socket.id);
        if (data.side === 'A') hncVotesA.add(socket.id);
        else hncVotesB.add(socket.id);
        socket.emit('hnc_vote_ok', { side: data.side });
        // 10 punktów za oddanie głosu (quiz context)
        const player = players.get(socket.id);
        if (player) {
            player.score = (player.score || 0) + 10;
            io.emit('update_team_scores', Array.from(players.values()).map(p => ({ nick: p.nick, score: p.score || 0, team: p.team })));
        }
        // Only connected voters count — disconnected phones don't block the match
        const connectedVoters = [...hncVoters].filter(id => io.sockets.sockets.has(id));
        if (connectedVoters.length > 0 && connectedVoters.every(id => hncVotedThis.has(id))) {
            hncEndVoting();
        } else {
            hncBroadcast();
            // After 8s grace period, end match if remaining non-voters haven't engaged
            clearTimeout(hncVoteGraceTimer);
            hncVoteGraceTimer = setTimeout(() => {
                if (hncPhase !== 'voting') return;
                const stillConn = [...hncVoters].filter(id => io.sockets.sockets.has(id));
                const allNow = stillConn.length > 0 && stillConn.every(id => hncVotedThis.has(id));
                if (allNow) hncEndVoting();
            }, 8000);
        }
    });

    socket.on('hnc_force_end', () => { if (hncPhase === 'voting') hncEndVoting(); });

    socket.on('hnc_coin_flip', () => {
        if (hncPhase !== 'tiebreak') return;
        const m = hncBracket[hncCurrentRound]?.[hncCurrentMatch];
        if (!m) return;
        const side = Math.random() < 0.5 ? 'A' : 'B';
        m.winner = side === 'A' ? m.photoA : m.photoB;
        m.votesA = hncVotesA.size; m.votesB = hncVotesB.size;
        io.emit('hnc_coin_result', { side, winner: m.winner });
        hncPhase = 'match_result';
        setTimeout(() => hncBroadcast(), 2500);
    });

    socket.on('hnc_advance', () => {
        const m = hncBracket[hncCurrentRound]?.[hncCurrentMatch];
        if (!m || !m.winner) return;
        const nextRound = hncCurrentRound + 1;
        if (nextRound < hncBracket.length) {
            const nextIdx = Math.floor(hncCurrentMatch / 2);
            const nextM = hncBracket[nextRound][nextIdx];
            if (nextM) {
                if (hncCurrentMatch % 2 === 0) nextM.photoA = m.winner;
                else nextM.photoB = m.winner;
            }
        }
        const matchCount = hncBracket[hncCurrentRound].length;
        if (hncCurrentMatch + 1 < matchCount) {
            hncCurrentMatch++;
            hncPhase = 'ready';
        } else if (nextRound < hncBracket.length) {
            hncCurrentRound = nextRound;
            hncCurrentMatch = 0;
            hncPhase = 'round_complete';
        } else {
            hncPhase = 'champion';
        }
        hncBroadcast();
    });

    socket.on('hnc_next_round', () => {
        if (hncPhase === 'round_complete') {
            hncPhase = 'ready';
            // Preload first match of new round
            const firstM = hncBracket[hncCurrentRound]?.[0];
            if (firstM?.photoA && firstM?.photoB) {
                io.emit('hnc_preload', [firstM.photoA.url, firstM.photoB.url]);
            }
            hncBroadcast();
        }
    });

    socket.on('hnc_reset', () => {
        hncStopTimer();
        hncPhotos = []; hncBracket = []; hncQuestionText = '';
        hncCurrentRound = 0; hncCurrentMatch = 0;
        hncPhase = 'setup';
        hncVoters.clear(); hncVotedThis.clear(); hncVotesA.clear(); hncVotesB.clear();
        hncTimeLeft = 0;
        hncBroadcast();
    });
    // ===== /HOT OR NOT CHAMPION =====

    socket.on('disconnect', () => {
        // HNC – usuń votera
        if (hncVoters.has(socket.id)) {
            hncVoters.delete(socket.id);
            hncVotedThis.delete(socket.id);
        }
        // Wyborczy – usuń votera i sprawdź czy wszyscy zagłosowali
        if (wyborczyVoters.has(socket.id)) {
            wyborczyVoters.delete(socket.id);
            wyborczyVotedThis.delete(socket.id);
            checkWyborczyAllVoted();
        }

        const player = players.get(socket.id);
        if (player) {
            // Zamiast natychmiast usuwać, przenieś do pendingDisconnects z timestamp
            pendingDisconnects.set(socket.id, {
                player: player,
                disconnectTime: Date.now()
            });
            players.delete(socket.id);
            updateUsersCount();
            
            // Jeśli gracz ma punkty, zachowaj go w disconnectedPlayersWithScore (do końca gry)
            if (player.score > 0 || player.correctAnswersCount > 0) {
                disconnectedPlayersWithScore.set(player.nick, player);
                console.log(`💾 Zachowano gracza ${player.nick} z wynikiem ${player.score} pkt (rozłączony)`);
            }
            
            // Usuń gracza z pendingDisconnects po grace period jeśli nie wrócił
            setTimeout(() => {
                if (pendingDisconnects.has(socket.id)) {
                    console.log(`⏰ Grace period minął dla ${player.nick}, ale zachowuję w disconnectedPlayersWithScore`);
                    pendingDisconnects.delete(socket.id);
                }
            }, DISCONNECT_GRACE_PERIOD);
        }
    });
});

// === START ===
// Próbuj najpierw nasłuchiwać na wszystkich interfejsach (0.0.0.0)
// Jeśli się nie uda (brak uprawnień), użyj localhost
function onServerReady(urlPrefix) {
    console.log('\n🚀 ═══════════════════════════════════════════════════');
    console.log(`   Imprezja Quiz - System Quizowy`);
    console.log('   ═══════════════════════════════════════════════════');
    console.log(`   🌐 Sieć lokalna:      http://${IP}:${PORT}`);
    console.log('   ─────────────────────────────────────────────────');
    console.log(`   👨‍💼 Admin:              http://${IP}:${PORT}/admin.html`);
    console.log(`   📺 Ekran TV:           http://${IP}:${PORT}/Screen.html`);
    console.log(`   ✏️  Edytor:             http://${IP}:${PORT}/editor.html`);
    console.log(`   📱 Gracze:             http://${IP}:${PORT}/vote.html`);
    console.log(`   🎛️  NJR Sampler:       http://${IP}:${PORT}/njr-sampler.html`);
    console.log(`   🎤  Śpiewaj Dalej:     http://${IP}:${PORT}/spiewaj-dalej.html`);
    console.log(`   🎙️  Bitwa wokalna:     http://${IP}:${PORT}/bitwa-wokalna.html`);
    console.log(`   🎵  Imprezator:        http://${IP}:${PORT}/imprezator.html`);
    console.log('   ─────────────────────────────────────────────────');
    console.log(`   📂 Katalog quizzes:   ${quizzesDir}`);
    if (IP === 'localhost') {
        console.log('   ═══════════════════════════════════════════════════');
        console.warn('   ⚠️  UWAGA: Wykryto tylko localhost!');
        console.warn('   Telefon nie będzie mógł się połączyć.');
        console.warn('   Upewnij się że komputer i telefon są w tej samej sieci WiFi.');
    }
    console.log('   ═══════════════════════════════════════════════════\n');
    // Otwieraj przeglądarkę tylko gdy uruchamiasz serwer ręcznie (node server.js) – nie w aplikacji Electron
    if (!process.env.IMPREZJA_ELECTRON && !process.env.IMPREZJA_NO_BROWSER) {
        const { exec } = require('child_process');
        const url = `${urlPrefix}/start.html`;
        const cmd = process.platform === 'win32' ? `start "" "${url}"` : (process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`);
        exec(cmd, () => {});
    }
}

// Middleware do sprawdzania licencji (opcjonalne - można użyć do blokowania funkcji)
function checkLicenseMiddleware(req, res, next) {
    const status = license.checkLicense();
    if (!status.valid) {
        return res.status(403).json({ 
            error: 'Licencja nieważna', 
            reason: status.reason,
            trial: status.trial 
        });
    }
    next();
}

// Sprawdź na czym faktycznie nasłuchuje serwer.
// W trybie Electron (IMPREZJA_ELECTRON) eksportujemy startServer – serwer uruchamia proces główny w tym samym procesie (bez spawn), żeby na macOS nie pojawiał się dialog z hasłem.
function doListen(readyCallback) {
    loadVolumes();
    const serverInstance = server.listen(PORT, '0.0.0.0', () => {
        const address = serverInstance.address();
        console.log(`✅ Serwer HTTP uruchomiony na porcie ${PORT}`);
        if (address.address === '0.0.0.0' || address.address === '::') {
            console.log(`✅ Serwer nasłuchuje na WSZYSTKICH interfejsach - dostępny z sieci!`);
        }
        console.log(`📡 Wykryte IP: ${IP}`);
        if (httpsServer) {
            httpsServer.listen(PORT_HTTPS, '0.0.0.0', () => {
                console.log(`✅ Serwer HTTPS uruchomiony na porcie ${PORT_HTTPS}`);
                console.log(`🔒 Quiz admin (niegasnący ekran): https://${IP}:${PORT_HTTPS}/admin.html`);
                console.log(`🔒 Familiada admin: https://${IP}:${PORT_HTTPS}/familiada/admin.html`);
                console.log(`🔒 Familiada przyciski: https://${IP}:${PORT_HTTPS}/familiada/buttons.html`);
            });
            httpsServer.on('error', (err) => {
                if (err.code === 'EADDRINUSE') console.warn(`⚠️ Port HTTPS ${PORT_HTTPS} zajęty – Familiada użyje HTTP`);
                else console.warn('⚠️ Błąd HTTPS:', err.message);
            });
        }
        if (IP === 'localhost' || IP === '127.0.0.1') {
            console.warn('⚠️ UWAGA: Wykryto tylko localhost - telefon nie będzie mógł się połączyć!');
        }
        if (!process.env.IMPREZJA_ELECTRON) onServerReady(`http://${IP}:${PORT}`);
        scheduleRefreshFileHashCache();
        if (typeof readyCallback === 'function') readyCallback();
    });
    serverInstance.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${PORT} jest już zajęty!`);
            console.error(`   Zamknij inne aplikacje używające portu ${PORT} lub zmień PORT w server.js`);
            process.exit(1);
        } else if (err.code === 'EPERM' || err.code === 'EACCES') {
            console.error(`❌ Brak uprawnień do nasłuchiwania na 0.0.0.0:${PORT}`);
            console.error(`   Na Windows może być potrzebne uruchomienie jako administrator.`);
            console.error(`   Lub sprawdź firewall Windows - może blokować port ${PORT}`);
            process.exit(1);
        } else {
            console.error('❌ Błąd uruchamiania serwera:', err);
            console.error('   Kod błędu:', err.code);
            process.exit(1);
        }
    });
}

if (process.env.IMPREZJA_ELECTRON) {
    exports.startServer = doListen;
} else {
    doListen();
}
