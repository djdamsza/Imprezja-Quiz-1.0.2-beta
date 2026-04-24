# Build Windows i Mac – stan i instrukcja

**NJR Konwerter** (VirtualDJ / eksporty) to **osobny produkt** i **osobne repozytorium** — nie jest częścią tego projektu. Źródła, CI i release: [github.com/djdamsza/njr-konwerter](https://github.com/djdamsza/njr-konwerter).

---

## 1. Imprezja Quiz (Electron – główna aplikacja)

**Lokalizacja:** katalog główny VoteBattle (`package.json`, `electron-main.js`).

### Konfiguracja
- **electron-builder** – targety: Mac (dmg), Windows (nsis x64).
- Skrypty: `build`, `build:mac`, `build:mac:arm64`, `build:mac:x64`, `build:win`, `pac`.
- **pac** = clean + build:mac:arm64 + build:mac:x64 + build:win (wszystkie trzy w jednym uruchomieniu).

### Jak budować

| Środowisko | Polecenie | Wynik |
|------------|-----------|--------|
| **macOS** | `npm run build:mac` | DMG (domyślnie architektura bieżącej maszyny) |
| **macOS** | `npm run build:mac:arm64` | DMG (Apple Silicon) |
| **macOS** | `npm run build:mac:x64` | DMG (Intel) – **wymaga uruchomienia na Macu z Apple Silicon** (cross-compile) |
| **macOS** | `npm run build:win` | Instalator Windows (nsis) – cross-compile na Macu |
| **macOS** (wszystkie) | `npm run pac` | Czyści `dist/`, potem arm64 + x64 + win |
| **Windows** | `npm run build:win` | Instalator Windows (nsis) |

### Aktualizacja na Windows (dla użytkowników)

Jeśli instalator nowej wersji się wywala lub nie nadpisuje poprzedniej, przyczyną bywa **stara wersja w systemie**. W release notes / na stronie pobierania warto polecać: **przed instalacją nowej wersji zamknąć aplikację i odinstalować poprzednią** (Panel sterowania → Programy i funkcje → Imprezja Quiz → Odinstaluj), potem uruchomić nowy instalator. Zostało to uwzględnione w FAQ („Instalator się wywala / nie instaluje nowej wersji”).

### Uwagi
- **Skrypt `kill-port`** (`node scripts/kill-port.js`) – cross-platform, działa na Windows i Mac. Używany w `electron` / `electron:dev`.
- **Build Mac x64**: skrypt `prepare-cloudflared-for-mac-x64.js` podmienia binarkę cloudflared na darwin-amd64. **Musi być uruchomiony na Macu z Apple Silicon** – na Intel Macu nie da się zbudować (skrypt pomija się gdy arch !== arm64).
- **clean.js** – czysty Node (fs/path), działa na Windows i Mac.
- Build Mac (DMG) ma sens tylko na macOS; build Windows można robić na Macu (cross) lub na Windows.
- Katalog `dist/` jest wynikiem; w `package.json` → `build.files` wykluczone są m.in. `docs`, `*.md`, `scripts`, `*.sh`, `*.bat` – do paczki nie trafiają.

### Co faktycznie wchodzi do paczki Electron (`package.json` → `build.files`)

Źródło prawdy to **lista w `package.json`**: wzorzec `**/*` plus **negacje** (`!…`). Poniżej skrót w sensie biznesowym (szczegóły zawsze w pliku).

| Obszar | Czy w buildzie Imprezja Quiz? | Uwagi |
|--------|-------------------------------|--------|
| **`docs/`** (WordPress, n8n, checklisty, MD) | **Nie** | Negacja `!docs` — cały katalog odpada z asar. |
| **`scripts/`** | **Nie** | Negacja `!scripts`. |
| **Pliki `*.md`** | **Nie** | Negacja `!**/*.md`. |
| **`tools/image-to-webp/`** (konwerter WebP) | **Nie** | Jawna negacja `!tools/image-to-webp/**`. Inne podkatalogi `tools/` — obecnie praktycznie tylko ten; **cokolwiek dodasz obok bez nowej negacji, trafi do builda.** |
| **`resources/njr-converter/**`** | **Nie** | Wykluczone; **NJR Konwerter** jako produkt to osobne repo (sekcja 2). |
| **`public/imprezator-configs/**`** | **Nie** | Wybrane konfiguracje. |
| **`stripe-shop/`** | **Nie** | Negacja `!stripe-shop/**` — sklep Stripe w repo nie trafia do asar (hostowanie osobno). |
| **`public/`** (quiz, vote, Screen, uploady, quizy JSON…) | **Tak** | Rdzeń aplikacji. |
| **Katalog główny** (`server.js`, `electron-main.js`, `license.js`, `package.json`…) | **Tak** | O ile nie pasuje do negacji (`*.bat`, itd.). |

### Aktualizacje (electron-updater)
- **GitHub Release musi zawierać `latest.yml` i `latest-mac.yml`** (powstają w `dist/` przy buildzie obok instalatorów). Skrypt `npm run publish:github` wgrywa je po poprawce nazw plików (spacje → kropki, zgodnie z assetami `.exe`/`.dmg`). Bez tych plików aplikacja zgłasza błąd kanału aktualizacji i nie zaktualizuje się automatycznie z 1.2.1 itd.
- Przy publikacji osobnych buildów Mac (arm64 + x64) electron-updater automatycznie wybiera właściwą architekturę. Upewnij się, że `latest-mac.yml` zawiera oba assety (kolejność `pac`: jeśli plik ma tylko jedną architekturę, rozważ jeden wspólny build Mac lub ręczną edycję YAML przed publikacją).
- **singleArchFiles** (`**/node_modules/@img/**`) – electron-builder pakuje tylko binarki sharp dla bieżącej architektury, co zmniejsza rozmiar DMG.
- **Launcher** (`build:launcher`): domyślnie `node18-win-x64`. Dla Windows ARM64: `--targets node18-win-x64,node18-win-arm64 --output dist/ImprezjaQuiz-Launcher` (tworzy dwa pliki .exe).

### Konflikty
- Brak – konfiguracja jest spójna. Na Windows nie uruchamiaj `pac` w celu zbudowania wersji Mac (electron-builder nie zbuduje poprawnie DMG na Windows).

---

## 2. NJR Konwerter

Nie buduje się z tego repozytorium. Zobacz README i GitHub Actions w repozytorium **njr-konwerter** (link wyżej).

---

## 3. Podsumowanie

| Cel | Windows | Mac | Uwagi |
|-----|---------|-----|--------|
| **Imprezja Quiz** | `npm run build:win` | `npm run build:mac` lub `pac` | Electron; na Macu można zbudować też win (cross). |
| **NJR Konwerter** | — | — | Osobne repo; binaria w **Releases** na GitHubie. |
