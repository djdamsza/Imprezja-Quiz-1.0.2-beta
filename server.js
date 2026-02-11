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
const io = socketIo(server);

const PORT = 3000;

// Sprawdź licencję przy starcie
let licenseStatus = license.checkLicense();
console.log('\n🔐 ═══════════════════════════════════════════════════');
console.log('   STATUS LICENCJI');
console.log('   ═══════════════════════════════════════════════════');
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
const dataDir = process.env.IMPREZJA_DATA_DIR;
const quizzesDir = dataDir ? path.join(dataDir, 'quizzes') : path.join(__dirname, 'public', 'quizzes');
const uploadsDir = dataDir ? path.join(dataDir, 'uploads') : path.join(__dirname, 'public', 'uploads');
if (dataDir) console.log('   📂 Katalog danych (quizy, uploady):', dataDir);

// Przechowywanie aktualnej nazwy sieci WiFi
let currentWiFiSSID = null;
// URL tunelu Pinggy – gdy ustawiony, QR „do gry” prowadzi przez sieć komórkową (zawsze tylko origin, bez ścieżki)
let currentPinggyUrl = null;

/** Normalizuje URL tunelu: tylko origin, https; odrzuca dashboard i localhost. Pinggy. */
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
        if (!isPinggy) return null;
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

// Stwórz foldery jeśli nie istnieją
if (!fs.existsSync(quizzesDir)) fs.mkdirSync(quizzesDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
// Przy pierwszym uruchomieniu z katalogu danych: skopiuj quizy z aplikacji (asar) do data dir
if (dataDir) {
    try {
        const existing = fs.readdirSync(quizzesDir).filter(f => f.toLowerCase().endsWith('.json'));
        if (existing.length === 0) {
            const appQuizzes = path.join(__dirname, 'public', 'quizzes');
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
        }
    } catch (err) {
        console.warn('   ⚠️ Nie udało się skopiować quizów z aplikacji:', err.message);
    }
}

// Middleware
app.use(express.json());

// === ENDPOINTY LICENCJI ===
app.get('/api/license/status', (req, res) => {
    const status = license.checkLicense();
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
        licenseStatus = license.checkLicense();
        res.json({ success: true, status: licenseStatus });
    } else {
        res.status(500).json({ error: 'Błąd zapisu licencji' });
    }
});

app.get('/api/license/machine-id', (req, res) => {
    res.json({ machineId: license.getMachineId() });
});

// Sprawdź aktualizacje (tylko w aplikacji Electron – in-process)
app.post('/api/check-updates', async (req, res) => {
    const fn = typeof global.imprezjaCheckForUpdates === 'function' ? global.imprezjaCheckForUpdates : null;
    if (!fn) {
        return res.json({ available: false, message: 'Sprawdzanie aktualizacji dostępne tylko w aplikacji desktop.' });
    }
    try {
        const result = await fn();
        res.json(result);
    } catch (err) {
        res.json({ available: false, error: err.message || 'Błąd sprawdzania aktualizacji' });
    }
});

// Blokada gdy licencja nieważna – główne strony serwują license-required.html
const BLOCKED_PATHS = ['/', '/admin.html', '/Screen.html', '/vote.html', '/index.html'];
app.use((req, res, next) => {
    const isBlockedPath = BLOCKED_PATHS.some(p => req.path === p || req.path === p.replace(/^\//, ''));
    if (!isBlockedPath) return next();
    const status = license.checkLicense();
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
// /uploads: najpierw katalog danych (zapis użytkownika), potem fallback na pliki z aplikacji (asar) – żeby w DMG/setup były dźwięki i grafika z pytań
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Obsługa favicon.ico (aby uniknąć błędów 404)
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No Content - pusty favicon
});

// Cache dla hash plików (hash -> nazwa pliku)
const fileHashCache = new Map();

// Funkcja do obliczania hash pliku
function calculateFileHash(buffer) {
    return crypto.createHash('md5').update(buffer).digest('hex');
}

// Funkcja do sprawdzania czy plik o danym hash już istnieje
function findExistingFile(hash, originalName) {
    // Sprawdź cache najpierw
    if (fileHashCache.has(hash)) {
        const cachedFile = fileHashCache.get(hash);
        const cachedPath = path.join(uploadsDir, cachedFile);
        if (fs.existsSync(cachedPath)) {
            return cachedFile;
        } else {
            // Plik został usunięty - usuń z cache
            fileHashCache.delete(hash);
        }
    }
    
    // Jeśli nie ma w cache, sprawdź wszystkie pliki
    const files = fs.readdirSync(uploadsDir);
    
    for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        try {
            // Sprawdź czy to plik (nie katalog)
            const stats = fs.statSync(filePath);
            if (!stats.isFile()) continue;
            
            const fileBuffer = fs.readFileSync(filePath);
            const fileHash = calculateFileHash(fileBuffer);
            
            // Dodaj do cache
            fileHashCache.set(fileHash, file);
            
            if (fileHash === hash) {
                return file; // Zwróć nazwę istniejącego pliku
            }
        } catch (err) {
            // Ignoruj błędy (np. brak uprawnień)
            continue;
        }
    }
    return null;
}

// Funkcja do odświeżenia cache (można wywołać okresowo)
function refreshFileHashCache() {
    fileHashCache.clear();
    const files = fs.readdirSync(uploadsDir);
    let processed = 0;
    
    for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        try {
            const stats = fs.statSync(filePath);
            if (!stats.isFile()) continue;
            
            const fileBuffer = fs.readFileSync(filePath);
            const fileHash = calculateFileHash(fileBuffer);
            fileHashCache.set(fileHash, file);
            processed++;
        } catch (err) {
            continue;
        }
    }
    console.log(`📦 Odświeżono cache hash plików: ${processed} plików`);
}

// Odśwież cache przy starcie serwera
refreshFileHashCache();

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
            
            // Jeśli obrazek jest mniejszy niż maxWidth, tylko kompresuj (bez zmniejszania)
            if (metadata.width <= maxWidth) {
                return await image
                    .webp({ quality, effort: 6 })
                    .toBuffer();
            }
            
            // Zmniejsz do maxWidth (zachowując proporcje) i kompresuj do WebP
            return await image
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
            const existingFile = findExistingFile(fileHash, file.originalname);
            
            if (existingFile) {
                // Plik już istnieje - użyj istniejącego
                console.log(`✅ Plik już istnieje, używam istniejącego: ${existingFile} (hash: ${fileHash.substring(0, 8)}...)`);
                response.filepath = `/uploads/${existingFile}`;
                
                // Sprawdź czy istnieje miniatura dla tego pliku
                const thumbName = existingFile.replace(/\.[^.]+$/, '-thumb.webp');
                const thumbPath = path.join(uploadsDir, thumbName);
                if (fs.existsSync(thumbPath)) {
                    response.thumbnailpath = `/uploads/${thumbName}`;
                    console.log(`✅ Miniatura już istnieje: ${thumbName}`);
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
                        // Zmień rozszerzenie na .webp
                        finalFilename = file.originalname.replace(/\.[^.]+$/, '.webp');
                    } catch (err) {
                        console.error('❌ Błąd optymalizacji obrazka, używam oryginału:', err);
                        // W przypadku błędu użyj oryginału
                    }
                }
                
                // Zapisz zoptymalizowany plik
                const timestamp = Date.now();
                const sanitized = finalFilename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const filename = `${timestamp}-${sanitized}`;
                const filePath = path.join(uploadsDir, filename);
                
                fs.writeFileSync(filePath, finalBuffer);
                response.filepath = `/uploads/${filename}`;
                console.log(`✅ Zapisano nowy plik: ${filename} (hash: ${fileHash.substring(0, 8)}...)`);
            }
        }
        
        // Obsługa miniatury (tylko jeśli główny plik nie miał istniejącej miniatury)
        if (req.files['thumbnail'] && req.files['thumbnail'][0] && !response.thumbnailpath) {
            const thumb = req.files['thumbnail'][0];
            const thumbHash = calculateFileHash(thumb.buffer);
            
            // Sprawdź czy miniatura już istnieje
            const existingThumb = findExistingFile(thumbHash, 'thumb.webp');
            
            if (existingThumb) {
                // Miniatura już istnieje
                console.log(`✅ Miniatura już istnieje, używam istniejącej: ${existingThumb}`);
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
                console.log(`✅ Zapisano nową miniaturę: ${thumbFilename} (hash: ${thumbHash.substring(0, 8)}...)`);
            }
        }
        
        // Fallback dla starego edytora (pojedynczy plik 'file')
        if (!response.filepath && !response.thumbnailpath) {
            if (req.file) {
                const file = req.file;
                const fileHash = calculateFileHash(file.buffer);
                const existingFile = findExistingFile(fileHash, file.originalname);
                
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
    teams: {
        A: { name: "", score: 0 },
        B: { name: "", score: 0 }
    },
    speedrunQueue: [],  // { socketId, responseTime } – kolejność poprawnych odpowiedzi w trybie speedrun
    playoff: null,       // { active: true, word, question, options: ['TAK','NIE'], stats: { A: 0, B: 0 } } – dogrywka TAK/NIE bez punktów
    shipsGame: null,     // { questionId, boardSize, ships, shots: {}, currentTurn, playersShot: Set, gameEnded } – gra w statki
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

/** Balansowanie drużyn: przy 10% różnicy graczy mnożnik 1.1 dla słabszej drużyny */
function getTeamBalanceMultiplier(team) {
    if (!gameState.teamBattleMode || !team) return 1;
    let countA = 0, countB = 0;
    players.forEach((p) => {
        if (p.team === 'A') countA++;
        else if (p.team === 'B') countB++;
    });
    const smaller = Math.min(countA, countB);
    const larger = Math.max(countA, countB);
    if (larger === 0) return 1;
    const ratio = larger / smaller;
    if (ratio < 1.1) return 1; // próg 10% różnicy (ratio >= 1.1)
    const weakerTeam = countA <= countB ? 'A' : 'B';
    return team === weakerTeam ? 1.1 : 1;
}

// === FUNKCJE POMOCNICZE ===

function getLocalIP() {
    try {
        const interfaces = os.networkInterfaces();
        console.log('🔍 Sprawdzam interfejsy sieciowe...');
        console.log('📋 Dostępne interfejsy:', Object.keys(interfaces).join(', '));
        
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
                console.log(`⏭️  Pomijam wirtualny interfejs: ${name}`);
                continue;
            }
            
            // Loguj WSZYSTKIE interfejsy (nawet te które pomijamy)
            console.log(`🔍 Sprawdzam interfejs: ${name}`);
            for (const iface of interfaces[name]) {
                const isIPv4 = iface.family === 'IPv4' || iface.family === 4;
                console.log(`   - ${iface.family} ${iface.address} (internal: ${iface.internal}, netmask: ${iface.netmask || 'brak'})`);
                
                if (isIPv4 && !iface.internal) {
                    // Sprawdź czy to nie jest link-local (169.254.x.x)
                    const ipParts = iface.address.split('.');
                    const isLinkLocal = ipParts[0] === '169' && ipParts[1] === '254';
                    
                    if (!isLinkLocal) {
                        foundIPs.push({ name, address: iface.address, internal: iface.internal });
                        console.log(`   ✅ DODANO: ${iface.address} z interfejsu ${name}`);
                    } else {
                        console.log(`   ⏭️  Pomijam link-local: ${iface.address}`);
                    }
                } else if (isIPv4 && iface.internal) {
                    console.log(`   ⏭️  Pomijam internal: ${iface.address}`);
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
            console.log(`✅ Używam IP z interfejsu WiFi/Ethernet: ${selected.address} (${selected.name})`);
            return selected.address;
        }
        
        // Jeśli nie ma WiFi, użyj pierwszego znalezionego (ale nie localhost)
        if (foundIPs.length > 0) {
            const selected = foundIPs[0];
            console.log(`✅ Używam IP: ${selected.address} z interfejsu ${selected.name}`);
            return selected.address;
        }
        
        console.warn('⚠️ Nie znaleziono zewnętrznego IP!');
        console.warn('   Sprawdź czy komputer jest połączony z siecią WiFi/Ethernet');
        console.warn('   Dostępne interfejsy:', Object.keys(interfaces).join(', '));
    } catch (error) {
        console.warn('⚠️ Nie można pobrać adresów IP:', error.message);
        console.warn('   Stack:', error.stack);
    }
    return 'localhost';
}

let IP = getLocalIP();

// Jeśli nie znaleziono IP, spróbuj alternatywną metodę (dla Windows)
if (IP === 'localhost' && process.platform === 'win32') {
    console.log('🔄 Próbuję alternatywną metodę wykrywania IP na Windows...');
    try {
        const { execSync } = require('child_process');
        // Użyj ipconfig na Windows
        const result = execSync('ipconfig', { encoding: 'utf8', timeout: 5000 });
        const lines = result.split('\n');
        let currentAdapter = '';
        for (const line of lines) {
            // Znajdź adapter WiFi/Ethernet
            if (line.includes('adapter') && (line.toLowerCase().includes('wi-fi') || 
                line.toLowerCase().includes('wireless') || line.toLowerCase().includes('ethernet'))) {
                currentAdapter = line.trim();
            }
            // Znajdź IPv4 Address w tym adapterze
            if (currentAdapter && line.includes('IPv4 Address')) {
                const match = line.match(/(\d+\.\d+\.\d+\.\d+)/);
                if (match && !match[1].startsWith('169.254')) {
                    IP = match[1];
                    console.log(`✅ Znaleziono IP przez ipconfig: ${IP} (adapter: ${currentAdapter})`);
                    break;
                }
            }
        }
    } catch (err) {
        console.warn('⚠️ Alternatywna metoda nie zadziałała:', err.message);
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

// === QR DO PANELU ADMINA (http://IP:PORT/admin.html) – na start ekranu ===
async function generateAdminQR() {
    try {
        const adminHost = getAdminHost();
        const adminUrl = `http://${adminHost}:${PORT}/admin.html`;
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

// === SPEEDRUN: przyznaj punkty według kolejności (1. = 1000, 2. = 900, ..., 10. = 100) ===
function applySpeedrunScoring() {
    if (!gameState.speedrunQueue || gameState.speedrunQueue.length === 0) return;
    const pointsByPosition = [1000, 900, 800, 700, 600, 500, 400, 300, 200, 100];
    const sorted = [...gameState.speedrunQueue].sort((a, b) => a.responseTime - b.responseTime);
    sorted.slice(0, 10).forEach((entry, i) => {
        const player = players.get(entry.socketId);
        if (player) {
            const pts = pointsByPosition[i];
            player.score += pts;
            player.correctAnswersCount++;
            // Dodaj punkty do drużyny jeśli tryb drużynowy jest włączony i gracz ma drużynę
            if (gameState.teamBattleMode && player.team && gameState.teams[player.team]) {
                gameState.teams[player.team].score += pts * getTeamBalanceMultiplier(player.team);
            }
            // Wyślij zaktualizowany wynik gracza
            const socket = io.sockets.sockets.get(entry.socketId);
            if (socket) sendPlayerScore(socket, player);
        }
    });
    gameState.speedrunQueue = [];
    io.emit('update_team_scores', gameState.teams);
}

// === SZACOWANIE: punkty według odległości od poprawnej wartości (100 za trafienie, mniej wg odległości) ===
function applyEstimationScoring() {
    const question = gameState.activeQuestion;
    if (!question || question.type !== 'ESTIMATION') return;
    const qId = question.id;
    const correctValue = Number(question.correctValue);
    if (Number.isNaN(correctValue)) return;
    // 100 pkt za dokładną odpowiedź, -5 pkt za każdą jednostkę odległości
    players.forEach((player, socketId) => {
        const raw = player.answers[qId];
        if (raw === undefined || raw === null) return;
        const value = Number(raw);
        if (Number.isNaN(value)) return;
        const distance = Math.abs(value - correctValue);
        const points = Math.max(0, 100 - Math.round(distance * 5));
        player.score += points;
        if (points > 0) player.correctAnswersCount++;
        // Dodaj punkty do drużyny jeśli tryb drużynowy jest włączony i gracz ma drużynę
        if (gameState.teamBattleMode && player.team && gameState.teams[player.team]) {
            gameState.teams[player.team].score += points * getTeamBalanceMultiplier(player.team);
        }
        // Wyślij zaktualizowany wynik gracza
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
    
    // HOT_OR_NOT - specjalna logika
    if (questionType === 'HOT_OR_NOT') {
        // Jeśli brak poprawnej odpowiedzi (correct = -1), działa jak ankieta
        if (correctAnswers.length === 0) {
            return { points: 100, isCorrect: true };
        }
        // Jeśli są poprawne odpowiedzi, sprawdź czy odpowiedź jest poprawna
        if (!isCorrect) {
            return { points: 0, isCorrect: false };
        }
        // Poprawna odpowiedź - w speedrun bez bonusu za czas (kolejka)
        if (question.speedrun) return { points: 0, isCorrect: true };
        const basePoints = 100;
        let bonusPoints = 0;
        if (!gameState.quizOptions.disableTimePoints) {
            const maxTime = question.time || 30;
            const timeBonus = Math.max(0, maxTime - responseTime);
            bonusPoints = Math.floor(timeBonus * 10);
        }
        return { points: basePoints + bonusPoints, isCorrect: true };
    }
    
    // VOTE / VOTE_IMG – 100 pkt za udział (lub w speedrun kolejka według czasu)
    if (questionType === 'VOTE' || questionType === 'VOTE_IMG') {
        if (question.speedrun) return { points: 0, isCorrect: true };
        return { points: 100, isCorrect: true };
    }
    
    // QUIZ / MUSIC
    if (!isCorrect) {
        return { points: 0, isCorrect: false };
    }
    
    const basePoints = 100;
    let bonusPoints = 0;

    // Sprawdzenie opcji wyłączenia punktów za czas
    if (!gameState.quizOptions.disableTimePoints) {
        const maxTime = question.time || 30;
        const timeBonus = Math.max(0, maxTime - responseTime);
        bonusPoints = Math.floor(timeBonus * 10); // 10 pkt za każdą sekundę
    }
    
    const totalPoints = basePoints + bonusPoints;
    return { points: totalPoints, isCorrect: true };
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
        letterGame: gameState.letterGame,
        thanksScreen: gameState.thanksScreen,
        hasWifi: !!currentWiFiSSID,
        tunnelUrl: currentPinggyUrl || null,
        showLocalGameQR: showLocalGameQR,
        localGameUrl: `http://${IP}:${PORT}/vote.html`,
        showAdminQR: !adminHasBeenOpened,
        adminUrl: `http://${getAdminHost()}:${PORT}/admin.html`
    };
}

// Funkcja do wysłania indywidualnego wyniku gracza
function sendPlayerScore(socket, player) {
    if (player) {
        socket.emit('player_score_update', { score: player.score, correctCount: player.correctAnswersCount });
    }
}

function broadcastState() {
    io.emit('update_state', getStateForBroadcast());
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
    if (isGameActive && hasQuestions && noPlayers) {
        console.log('🔄 Wykryto osierocony stan gry (pytania bez graczy) – reset do ekranu startowego');
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
    // QR do panelu admina (na start – znika po otwarciu admina na telefonie)
    if (!adminHasBeenOpened) {
        generateAdminQR().then((data) => {
            if (data) socket.emit('qr_admin', data);
        });
    }

    socket.on('request_qr_admin', () => {
        if (!adminHasBeenOpened) {
            generateAdminQR().then((data) => {
                if (data) socket.emit('qr_admin', data);
            });
        } else {
            socket.emit('qr_admin', { qrCode: null });
        }
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

    // === JEDEN KLIK: tunel Pinggy (SSH) – na Mac/Linux działa od razu; na Windows wymaga OpenSSH lub ręcznego URL ===
    socket.on('admin_start_tunnel', () => {
        if (tunnelProcess) {
            socket.emit('tunnel_started', { tunnelUrl: currentPinggyUrl });
            return;
        }
        const isWin = process.platform === 'win32';
        const knownHostsOpt = isWin ? 'NUL' : '/dev/null';
        const args = [
            '-o', 'UserKnownHostsFile=' + knownHostsOpt,
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'ConnectTimeout=15',
            '-p', '443',
            '-R0:localhost:' + PORT,
            'a.pinggy.io'
        ];
        let sshExe = 'ssh';
        if (isWin) {
            const sysRoot = process.env.SystemRoot || process.env.windir || 'C:\\Windows';
            const sshPath = path.join(sysRoot, 'System32', 'OpenSSH', 'ssh.exe');
            if (fs.existsSync(sshPath)) sshExe = sshPath;
        }
        const spawnOpts = { stdio: ['ignore', 'pipe', 'pipe'], env: process.env };
        if (isWin) spawnOpts.windowsHide = true;
        const child = spawn(sshExe, args, spawnOpts);
        let output = '';
        child.stdout.on('data', (data) => { output += (data && data.toString()) || ''; });
        child.stderr.on('data', (data) => { output += (data && data.toString()) || ''; });

        const PINGGY_URL_REGEX = /https:\/\/[a-zA-Z0-9][-a-zA-Z0-9.]*\.(a\.)?(free\.)?pinggy\.(io|link)(\/[^\s]*)?/gi;
        const tryExtractUrl = () => {
            const matches = output.match(PINGGY_URL_REGEX);
            if (!matches || matches.length === 0) return null;
            const candidates = [];
            for (const raw of matches) {
                let u = raw.replace(/\/$/, '').replace(/#.*$/, '').trim();
                if (/dashboard/i.test(u)) continue;
                try {
                    const origin = new URL(u).origin;
                    if (/dashboard|localhost/i.test(origin)) continue;
                    candidates.push(origin);
                } catch (_) {}
                }
            const tunnelLike = candidates.find(c => /\.(a\.|free\.)?pinggy\.(io|link)$/i.test(c.replace(/^https?:\/\//, '')));
            return tunnelLike || candidates[0] || null;
        };

        const timeout = setTimeout(() => {
            if (tunnelProcess !== child) return;
            const url = tryExtractUrl();
            if (!url) {
                try { child.kill('SIGTERM'); } catch (_) {}
                tunnelProcess = null;
                socket.emit('tunnel_error', { message: 'Nie udało się odczytać adresu z tunelu (timeout). Użyj sekcji „Wklej adres tunelu” poniżej – uruchom ręcznie i wklej URL.' });
            }
        }, 22000);

        child.on('error', (err) => {
            clearTimeout(timeout);
            if (tunnelProcess === child) tunnelProcess = null;
            let msg = err.message || 'Błąd uruchomienia tunelu.';
            if (err.code === 'ENOENT' && isWin) {
                msg = 'Na Windows tunel jednym kliknięciem wymaga Klienta OpenSSH (Ustawienia → Aplikacje → Opcjonalne funkcje → Dodaj funkcję → Klient OpenSSH). Alternatywnie: w sekcji „Wklej adres tunelu” uruchom ręcznie w PowerShell: ssh -p 443 -R0:localhost:3000 a.pinggy.io i wklej wyświetlony adres.';
            } else if (err.code === 'ENOENT') {
                msg = 'Nie znaleziono polecenia ssh. Użyj sekcji „Wklej adres tunelu” i uruchom tunel ręcznie.';
            }
            socket.emit('tunnel_error', { message: msg });
        });

        let urlSent = false;
        const removeUrlListeners = () => {
            try {
                child.stdout.removeAllListeners('data');
                child.stderr.removeAllListeners('data');
            } catch (_) {}
        };
        const onUrlReady = async (url) => {
            if (!url || urlSent) return;
            const normalized = normalizePinggyUrl(url);
            if (!normalized) return;
            urlSent = true;
            clearTimeout(timeout);
            removeUrlListeners();
            currentPinggyUrl = normalized;
            tunnelProcess = child;
            console.log('🌐 Tunel Pinggy (1 klik):', currentPinggyUrl);
            const data = await generateGameQR();
            if (data) io.emit('qr_code', data.qrCode);
            socket.emit('tunnel_started', { tunnelUrl: currentPinggyUrl });
            io.emit('update_state', getStateForBroadcast());
            if (gameState.showQROnPhones) {
                const wifiQR = currentWiFiSSID ? await generateWiFiQR(currentWiFiSSID) : null;
                const localGameQR = showLocalGameQR ? await generateLocalGameQR() : null;
                const tunnelQR = await generateGameQR();
                io.emit('qr_codes_on_phones', { wifiQR, wifiSSID: currentWiFiSSID, localGameQR, tunnelQR, gameQR: tunnelQR });
            }
        };
        child.stderr.on('data', () => { const u = tryExtractUrl(); if (u) onUrlReady(u); });
        child.stdout.on('data', () => { const u = tryExtractUrl(); if (u) onUrlReady(u); });
        child.on('close', async () => {
            clearTimeout(timeout);
            if (tunnelProcess === child) {
                tunnelProcess = null;
                currentPinggyUrl = null;
                io.emit('qr_code', null);
                io.emit('update_state', getStateForBroadcast());
                if (gameState.showQROnPhones) {
                    const wifiQR = currentWiFiSSID ? await generateWiFiQR(currentWiFiSSID) : null;
                    const localGameQR = showLocalGameQR ? await generateLocalGameQR() : null;
                    io.emit('qr_codes_on_phones', { wifiQR, wifiSSID: currentWiFiSSID, localGameQR, tunnelQR: null, gameQR: localGameQR || null });
                }
            }
        });
    });

    socket.on('admin_stop_tunnel', async () => {
        if (tunnelProcess) {
            try { tunnelProcess.kill('SIGTERM'); } catch (_) {}
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
        socket.emit('pinggy_url_set', { tunnelUrl: currentPinggyUrl });
    });

    socket.emit('update_state', getStateForBroadcast());
    socket.emit('users_count', players.size);

    socket.on('request_state', () => {
        socket.emit('update_state', getStateForBroadcast());
        socket.emit('users_count', players.size);
    });

    // === ADMIN ===

    socket.on('admin_login', (data) => {
        const fromComputer = data && data.isComputer === true;
        // Gdy admin wchodzi z komputera – nie chowaj QR (można sterować z komputera i z telefonu)
        if (!fromComputer && !adminHasBeenOpened) {
            adminHasBeenOpened = true;
            io.emit('update_state', getStateForBroadcast());
            io.emit('hide_admin_qr');
        }
        const files = getQuizFiles();
        socket.emit('files_list', files);
        if (fromComputer) socket.emit('admin_from_computer_confirmed');
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
        gameState.activeQuestion = null;
        gameState.showStats = false;
        gameState.showCorrect = false;
        gameState.stats = {};
        gameState.questionStartTime = null;
        gameState.speedrunQueue = [];
        gameState.playoff = null;
        gameState.thanksScreen = thanksScreen;
        
        players.forEach(p => { p.score = 0; p.answers = {}; p.correctAnswersCount = 0; p.eliminated = false; });
        
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
        if (!question.id) question.id = `q_${Date.now()}_${index}`;
        
        gameState.type = 'GAME';
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
            // NIE ustawiaj timera dla pytań typu SHIPS (gra w statki nie ma automatycznego końca czasu)
            const questionTime = question.time || 30;
            if (questionTime > 0 && !gameState.quizOptions.disableTimePoints && question.type !== 'SHIPS') {
                questionTimer = setTimeout(() => {
                    console.log(`⏰ Czas pytania minął - automatyczne pokazanie statystyk`);
                    endQuestionAndShowStats();
                }, questionTime * 1000);
            } else if (question.type === 'SHIPS') {
                // Dla pytań SHIPS nie ustawiamy timera - gra kończy się ręcznie przez admina
                console.log(`⚓ Pytanie typu SHIPS - timer wyłączony, gra kończy się ręcznie`);
            }
        }
        
        broadcastState();
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
        // Bez Q, X, Y (mało słów w polskim). Gracze mogą wpisywać wyrazy z V i znakami polskimi – blokada tylko przy wylosowanej literze.
        const availableLetters = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','r','s','t','u','v','w','z'];
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
        
        broadcastState();
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
        broadcastState();
    });

    socket.on('admin_show_ships_answer', () => {
        if (!gameState.activeQuestion || gameState.activeQuestion.type !== 'SHIPS') return;
        
        gameState.showCorrect = true;
        gameState.showStats = false;
        broadcastState();
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
        
        broadcastState();
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
        broadcastState();
    });

    socket.on('admin_start_playoff', (word) => {
        // Wyczyść timer gdy zaczyna się dogrywka
        if (questionTimer) {
            clearTimeout(questionTimer);
            questionTimer = null;
        }
        
        const w = (word != null && word !== undefined) ? String(word).trim() : '';
        if (!w) return;
        gameState.playoff = {
            active: true,
            word: w,
            question: `Czy ${w} rozkręca imprezę?`,
            options: ['TAK', 'NIE'],
            stats: { A: 0, B: 0 },
            voted: []
        };
        broadcastState();
        console.log(`🎤 Dogrywka: ${w}`);
    });

    socket.on('admin_end_playoff', () => {
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
        broadcastState();
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
        broadcastState();
    });

    socket.on('admin_podium_step', (step) => {
        gameState.podiumStep = step;
        broadcastState();
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
        console.log('⛔ END GAME - wyłączanie serwera...');
        io.emit('server_shutting_down');
        io.sockets.sockets.forEach((s) => s.disconnect(true));
        server.close(() => {
            console.log('Serwer zakończony.');
            process.exit(0);
        });
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
    
    // Gracz prosi o kody QR (po dołączeniu, gdy opcja włączona)
    socket.on('request_qr_codes_on_phones', async () => {
        if (!gameState.showQROnPhones) return;
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
        fs.writeFile(filePath, JSON.stringify(data.content, null, 2), (err) => {
            if (err) {
                socket.emit('editor_save_status', { success: false, message: 'Błąd zapisu' });
            } else {
                socket.emit('editor_save_status', { success: true, message: `Zapisano ${safeName}` });
                io.emit('files_list', getQuizFiles()); 
                socket.emit('editor_files_list', getQuizFiles()); 
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

    // Pobierz listę powiązanych plików dla quizu
    socket.on('editor_get_related_files', (filename) => {
        try {
            const filePath = path.join(quizzesDir, filename);
            if (!fs.existsSync(filePath)) {
                socket.emit('editor_related_files', { files: [] });
                return;
            }

            const rawData = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(rawData);
            const questions = Array.isArray(data) ? data : (data.questions || []);
            
            const relatedFiles = new Set();
            
            questions.forEach(q => {
                // Media (obrazy/audio)
                if (q.media) {
                    const mediaPath = extractFilePath(q.media);
                    if (mediaPath) relatedFiles.add(mediaPath);
                    // Sprawdź miniaturę
                    const thumbPath = getThumbnailPath(mediaPath);
                    if (thumbPath && fs.existsSync(path.join(uploadsDir, thumbPath))) {
                        relatedFiles.add(thumbPath);
                    }
                }
                
                // imageSmall (miniatury)
                if (q.imageSmall) {
                    const smallPath = extractFilePath(q.imageSmall);
                    if (smallPath) relatedFiles.add(smallPath);
                }
                
                // image (kompatybilność wsteczna)
                if (q.image) {
                    const imagePath = extractFilePath(q.image);
                    if (imagePath) relatedFiles.add(imagePath);
                    const thumbPath = getThumbnailPath(imagePath);
                    if (thumbPath && fs.existsSync(path.join(uploadsDir, thumbPath))) {
                        relatedFiles.add(thumbPath);
                    }
                }
                
                // audio
                if (q.audio) {
                    const audioPath = extractFilePath(q.audio);
                    if (audioPath) relatedFiles.add(audioPath);
                }
                
                // HOT_OR_NOT - dwa obrazki
                if (q.type === 'HOT_OR_NOT') {
                    if (q.imageA) {
                        const imageAPath = extractFilePath(q.imageA);
                        if (imageAPath) relatedFiles.add(imageAPath);
                        const thumbAPath = getThumbnailPath(imageAPath);
                        if (thumbAPath && fs.existsSync(path.join(uploadsDir, thumbAPath))) {
                            relatedFiles.add(thumbAPath);
                        }
                    }
                    if (q.imageB) {
                        const imageBPath = extractFilePath(q.imageB);
                        if (imageBPath) relatedFiles.add(imageBPath);
                        const thumbBPath = getThumbnailPath(imageBPath);
                        if (thumbBPath && fs.existsSync(path.join(uploadsDir, thumbBPath))) {
                            relatedFiles.add(thumbBPath);
                        }
                    }
                    if (q.imageSmallA) {
                        const smallAPath = extractFilePath(q.imageSmallA);
                        if (smallAPath) relatedFiles.add(smallAPath);
                    }
                    if (q.imageSmallB) {
                        const smallBPath = extractFilePath(q.imageSmallB);
                        if (smallBPath) relatedFiles.add(smallBPath);
                    }
                }
            });
            
            socket.emit('editor_related_files', { files: Array.from(relatedFiles) });
        } catch (err) {
            console.error('❌ Błąd pobierania powiązanych plików:', err);
            socket.emit('editor_related_files', { files: [] });
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
            let errors = [];

            // Jeśli usuwamy powiązane pliki, najpierw pobierz ich listę
            if (deleteRelated) {
                const rawData = fs.readFileSync(filePath, 'utf8');
                const quizData = JSON.parse(rawData);
                const questions = Array.isArray(quizData) ? quizData : (quizData.questions || []);
                
                const filesToDelete = new Set();
                
                questions.forEach(q => {
                    // Media
                    if (q.media) {
                        const mediaPath = extractFilePath(q.media);
                        if (mediaPath) filesToDelete.add(mediaPath);
                        const thumbPath = getThumbnailPath(mediaPath);
                        if (thumbPath) filesToDelete.add(thumbPath);
                    }
                    if (q.imageSmall) {
                        const smallPath = extractFilePath(q.imageSmall);
                        if (smallPath) filesToDelete.add(smallPath);
                    }
                    if (q.image) {
                        const imagePath = extractFilePath(q.image);
                        if (imagePath) filesToDelete.add(imagePath);
                        const thumbPath = getThumbnailPath(imagePath);
                        if (thumbPath) filesToDelete.add(thumbPath);
                    }
                    if (q.audio) {
                        const audioPath = extractFilePath(q.audio);
                        if (audioPath) filesToDelete.add(audioPath);
                    }
                    if (q.type === 'HOT_OR_NOT') {
                        if (q.imageA) {
                            const imageAPath = extractFilePath(q.imageA);
                            if (imageAPath) filesToDelete.add(imageAPath);
                            const thumbAPath = getThumbnailPath(imageAPath);
                            if (thumbAPath) filesToDelete.add(thumbAPath);
                        }
                        if (q.imageB) {
                            const imageBPath = extractFilePath(q.imageB);
                            if (imageBPath) filesToDelete.add(imageBPath);
                            const thumbBPath = getThumbnailPath(imageBPath);
                            if (thumbBPath) filesToDelete.add(thumbBPath);
                        }
                        if (q.imageSmallA) {
                            const smallAPath = extractFilePath(q.imageSmallA);
                            if (smallAPath) filesToDelete.add(smallAPath);
                        }
                        if (q.imageSmallB) {
                            const smallBPath = extractFilePath(q.imageSmallB);
                            if (smallBPath) filesToDelete.add(smallBPath);
                        }
                    }
                });
                
                // Usuń powiązane pliki
                filesToDelete.forEach(fileName => {
                    const fullPath = path.join(uploadsDir, fileName);
                    if (fs.existsSync(fullPath)) {
                        try {
                            fs.unlinkSync(fullPath);
                            deletedFiles.push(fileName);
                            console.log(`✅ Usunięto powiązany plik: ${fileName}`);
                        } catch (err) {
                            errors.push(`Błąd usuwania ${fileName}: ${err.message}`);
                            console.error(`❌ Błąd usuwania ${fileName}:`, err);
                        }
                    }
                });
            }

            // Usuń plik JSON
            try {
                fs.unlinkSync(filePath);
                deletedFiles.push(filename);
                console.log(`✅ Usunięto quiz: ${filename}`);
            } catch (err) {
                errors.push(`Błąd usuwania ${filename}: ${err.message}`);
                console.error(`❌ Błąd usuwania ${filename}:`, err);
            }

            // Odśwież listę plików
            io.emit('files_list', getQuizFiles());
            socket.emit('editor_files_list', getQuizFiles());

            let message = `Usunięto: ${filename}`;
            if (deleteRelated && deletedFiles.length > 1) {
                message += ` oraz ${deletedFiles.length - 1} powiązanych plików`;
            }
            if (errors.length > 0) {
                message += `. Błędy: ${errors.join(', ')}`;
            }

            socket.emit('editor_delete_status', { 
                success: errors.length === 0, 
                message: message 
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
            updateUsersCount();
            
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
        updateUsersCount();
        
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
                shots: {}, // { "r_c": { hit: bool, players: [socketId] } }
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
        const wasAlreadyHit = !!shipsGame.shots[key];
        const previousPlayers = wasAlreadyHit ? [...shipsGame.shots[key].players] : [];
        const previousHitCount = previousPlayers.length;
        
        if (shipsGame.shots[key]) {
            // Wielokrotne trafienie w to samo miejsce
            if (!shipsGame.shots[key].players.includes(socket.id)) {
                shipsGame.shots[key].players.push(socket.id);
            }
        } else {
            // Pierwsze trafienie w to miejsce
            shipsGame.shots[key] = {
                hit: actualHit,
                players: [socket.id]
            };
        }
        
        shipsGame.playersShot.add(socket.id);
        
        // Przyznaj punkty tylko jeśli to trafienie
        if (actualHit) {
            const hitCount = shipsGame.shots[key].players.length;
            const pointsPerPlayer = Math.floor(100 / hitCount); // Dziel punkty przez ilość trafień
            
            // WAŻNE: Jeśli to wielokrotne trafienie w to samo miejsce, przelicz punkty dla wszystkich graczy
            if (wasAlreadyHit && previousHitCount > 0) {
                // Odejmij stare punkty od graczy którzy trafili wcześniej i dodaj nowe
                previousPlayers.forEach(prevSocketId => {
                    const prevPlayer = players.get(prevSocketId);
                    if (prevPlayer) {
                        const oldPoints = Math.floor(100 / previousHitCount);
                        const newPoints = pointsPerPlayer;
                        const pointsDiff = newPoints - oldPoints;
                        
                        // Zaktualizuj punkty gracza
                        prevPlayer.score += pointsDiff;
                        
                        // Zaktualizuj punkty drużyny jeśli tryb drużynowy jest włączony
                        if (gameState.teamBattleMode && prevPlayer.team && gameState.teams[prevPlayer.team]) {
                            gameState.teams[prevPlayer.team].score += pointsDiff * getTeamBalanceMultiplier(prevPlayer.team);
                        }
                        
                        // Wyślij zaktualizowany wynik gracza
                        const prevSocket = io.sockets.sockets.get(prevSocketId);
                        if (prevSocket) sendPlayerScore(prevSocket, prevPlayer);
                    }
                });
            }
            
            // Przyznaj punkty nowemu graczowi (lub pierwszemu jeśli to pierwsze trafienie)
            player.score += pointsPerPlayer;
            player.correctAnswersCount++;
            
            // WAŻNE: Dodaj punkty do drużyny jeśli tryb drużynowy jest włączony i gracz ma drużynę
            if (gameState.teamBattleMode && player.team && gameState.teams[player.team]) {
                gameState.teams[player.team].score += pointsPerPlayer * getTeamBalanceMultiplier(player.team);
            }
            
            sendPlayerScore(socket, player);
        }
        
        // Gdy wszyscy gracze (z nickiem) strzelili w tej turze – pokaż wyniki i zakończ turę
        if (players.size > 0 && shipsGame.playersShot.size >= players.size) {
            gameState.showStats = true;
            shipsGame.currentTurn++;
            shipsGame.playersShot.clear();
            gameState.showCorrect = false;
            gameState.type = 'GAME';
            console.log(`⚓ Wszyscy strzelili w rundzie – pokazano wyniki, nowa runda ${shipsGame.currentTurn}`);
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
            console.log('📤 Wysłano update_team_scores po ships_end_game');
        }
        
        broadcastState();
    });

    socket.on('disconnect', () => {
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
    if (process.platform === 'darwin' && !process.env.IMPREZJA_ELECTRON) {
        const { exec } = require('child_process');
        exec(`open "${urlPrefix}/Screen.html"`, () => {});
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
    const serverInstance = server.listen(PORT, '0.0.0.0', () => {
        const address = serverInstance.address();
        console.log(`✅ Serwer uruchomiony!`);
        console.log(`📡 Adres nasłuchiwania: ${address.address}:${address.port}`);
        console.log(`📡 Rodzina: ${address.family}`);
        if (address.address === '0.0.0.0' || address.address === '::') {
            console.log(`✅ Serwer nasłuchuje na WSZYSTKICH interfejsach - dostępny z sieci!`);
        } else if (address.address === '127.0.0.1' || address.address === '::1') {
            console.error(`❌ PROBLEM: Serwer nasłuchuje tylko na localhost (${address.address})!`);
            console.error(`   Telefon NIE będzie mógł się połączyć!`);
            console.error(`   Serwer musi nasłuchiwać na 0.0.0.0 żeby być dostępnym z sieci.`);
        }
        console.log(`📡 Wykryte IP komputera: ${IP}`);
        console.log(`🌐 URL dla telefonu: http://${IP}:${PORT}/admin.html`);
        if (IP === 'localhost' || IP === '127.0.0.1') {
            console.warn('⚠️ UWAGA: Wykryto tylko localhost - telefon nie będzie mógł się połączyć!');
            console.warn('   Upewnij się że komputer i telefon są w tej samej sieci WiFi.');
            console.warn('   Sprawdź czy komputer ma przypisane IP w sieci lokalnej.');
        }
        if (!process.env.IMPREZJA_ELECTRON) onServerReady(`http://${IP}:${PORT}`);
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
