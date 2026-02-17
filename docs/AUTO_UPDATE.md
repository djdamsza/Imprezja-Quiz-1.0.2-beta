# Automatyczne aktualizacje – Imprezja Quiz

**Czy da się zrobić tak, że aplikacja poinformuje o nowej wersji i pozwoli pobrać aktualizację?**

**Tak.** Electron ma wbudowany mechanizm auto-update przez pakiet `electron-updater`. Aplikacja może:
1. Sprawdzić, czy jest nowsza wersja (np. przy starcie lub przez przycisk „Sprawdź aktualizacje”)
2. Pobrać aktualizację w tle
3. Poinformować użytkownika i zaproponować restart do zainstalowania

---

## Jak to działa

1. **Hosting plików** – nowe wersje (EXE, DMG) muszą być dostępne pod stałym adresem (np. GitHub Releases lub własny serwer)
2. **Plik `latest.yml`** – electron-updater szuka pliku z informacją o najnowszej wersji (numer, URL do pobrania, hash)
3. **Porównanie wersji** – aplikacja porównuje swoją wersję z `latest.yml`, jeśli jest nowsza – pokazuje powiadomienie
4. **Pobieranie** – użytkownik klika „Pobierz” lub „Zaktualizuj” → aplikacja pobiera nowy instalator
5. **Instalacja** – na Windows: uruchamia się nowy instalator; na macOS: wymaga ponownego uruchomienia z nowego DMG

---

## Co trzeba dodać

### 1. Zależność

```bash
npm install electron-updater
```

### 2. Konfiguracja w `package.json`

Dodać `publish` – gdzie szukać aktualizacji, np.:

```json
"build": {
  "publish": {
    "provider": "github",
    "owner": "TWOJ_USER",
    "repo": "ImprezjaQuiz-releases"
  }
}
```

Albo własny serwer:

```json
"publish": {
  "provider": "generic",
  "url": "https://nowajakoscrozrywki.pl/updates/"
}
```

### 3. Kod w `electron-main.js`

```javascript
const { autoUpdater } = require('electron-updater');

// Sprawdź aktualizacje przy starcie (opcjonalnie)
app.whenReady().then(() => {
  autoUpdater.checkForUpdates();
});

// Gdy jest nowa wersja
autoUpdater.on('update-available', (info) => {
  // Wyślij do renderera (okna) – pokaż powiadomienie
  // np. "Dostępna wersja 1.0.3. Pobierz aktualizację?"
});

// Gdy pobrano – zaproponuj restart
autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall(); // lub najpierw zapytaj użytkownika
});
```

### 4. Przycisk w panelu admina

Przycisk „Sprawdź aktualizacje” – wywołuje `autoUpdater.checkForUpdates()` i pokazuje wynik użytkownikowi.

---

## Gdzie hostować pliki aktualizacji

### Opcja A: GitHub Releases

- **Darmowe**, bez limitów
- electron-updater **automatycznie** generuje `latest.yml` przy buildzie (gdy `publish` jest ustawione)
- Build: `npm run build:win` – tworzy EXE + `latest.yml`
- Upload do GitHub Releases – auto-updater sam znajdzie pliki

### Opcja B: Własny serwer (np. strona WP / domena)

Pliki muszą być w folderze dostępnym przez HTTPS, np.:
- `https://nowajakoscrozrywki.pl/updates/latest.yml`
- `https://nowajakoscrozrywki.pl/updates/Imprezja Quiz Setup 1.0.3.exe`

Format `latest.yml` (Windows):

```yaml
version: 1.0.3
files:
  - url: Imprezja Quiz Setup 1.0.3.exe
    sha512: [hash pliku]
path: Imprezja Quiz Setup 1.0.3.exe
sha512: [hash]
releaseDate: '2026-02-15T12:00:00.000Z'
```

---

## Przepływ dla użytkownika

1. Użytkownik uruchamia aplikację (lub klika „Sprawdź aktualizacje”)
2. Aplikacja sprawdza wersję online
3. Jeśli jest nowa: **„Dostępna wersja 1.0.3. Pobierz teraz?”** → [Pobierz] [Później]
4. Po pobraniu: **„Aktualizacja pobrana. Zrestartuj aplikację, aby zainstalować.”** → [Zrestartuj]
5. Aplikacja się zamyka, uruchamia się nowy instalator (Windows) lub użytkownik instaluje z DMG (macOS)

---

## Uwagi

- **macOS:** Auto-update z GitHub/Generic wymaga podpisania aplikacji (Apple Developer) – inaczej użytkownik może dostać ostrzeżenie Gatekeeper przy aktualizacji
- **Windows:** Działa od razu, jeśli build ma `publish` ustawione
- **Wersjonowanie:** Zawsze zwiększaj `version` w `package.json` przed buildem (semver: 1.0.2 → 1.0.3)

---

## Stan wdrożenia (2026-02-16)

✅ **Zaimplementowane:**
- `electron-updater` w `electron-main.js` – `setupAutoUpdater()` przed startem serwera
- **Źródło aktualizacji:** GitHub Releases – wymuszone w `electron-main.js` przez `setFeedURL({ provider: 'github', owner: 'djdamsza', repo: 'Imprezja-Quiz-1.0.2-beta' })`
- Endpoint `POST /api/check-updates` w server.js – wywołuje `global.imprezjaCheckForUpdates()`
- Sekcja „Aktualizacje” w panelu admina – przycisk „Sprawdź aktualizacje” + ostrzeżenie: *Nie zalecam aktualizacji w trakcie imprezy – lepiej zrobić to na spokojnie i przetestować*
- Przy błędzie sprawdzania – komunikat + link do ręcznego pobrania z GitHub Releases

## Publikowanie aktualizacji

1. Zwiększ `version` w `package.json` (np. 1.0.3 → 1.0.4)
2. Zbuduj i opublikuj:
   ```bash
   # Gdy release ma >2h – wymuś nadpisanie plików:
   export EP_GH_IGNORE_TIME=true
   npm run build:mac:arm64 -- --publish always
   npm run build:mac:x64 -- --publish always
   npm run build:win -- --publish always
   ```
3. Pliki trafiają na **GitHub Releases** – electron-updater pobiera stamtąd `latest-mac.yml` / `latest.yml`
