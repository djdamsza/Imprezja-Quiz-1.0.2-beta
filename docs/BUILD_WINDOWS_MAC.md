# Build Windows i Mac – stan i instrukcja

## All in one (zalecane)

Jeden instalator może zawierać **Imprezja Quiz** oraz **NJR Konwerter**. Python i PyInstaller **nie są wymagane na komputerze użytkownika** – binarka konwertera jest budowana na Twoim komputerze (przy buildzie) i pakowana do aplikacji.

### Jak zbudować all in one

| Środowisko | Polecenie | Wynik |
|------------|-----------|--------|
| **macOS** | `npm run build:all-in-one:mac` | Najpierw PyInstaller (NJR → `resources/njr-converter/`), potem electron-builder → DMG z wbudowanym konwerterem |
| **Windows** | `npm run build:all-in-one:win` | Najpierw PyInstaller (NJR → `resources/njr-converter/`), potem electron-builder → instalator NSIS z wbudowanym konwerterem |
| Dowolne | `npm run build:all-in-one` | To samo co powyżej, ale target zależny od systemu (Mac na macOS, Win na Windows) |

**Wymagania na maszynie do buildu:** Python 3, w katalogu `tools/vdj-database-editor`: `pip install -r requirements.txt` i `pip install pyinstaller`. Skrypt `scripts/prepare-njr-for-electron.js` uruchamia PyInstaller i kopiuje plik `NJR-konwerter` (Mac) lub `NJR-konwerter.exe` (Windows) do `resources/njr-converter/`. Electron-builder pakuje tę folder do aplikacji i rozpakowuje (asarUnpack), więc konwerter jest w katalogu instalacji obok Imprezja Quiz.

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
| **macOS** | `npm run build:mac:x64` | DMG (Intel) |
| **macOS** | `npm run build:win` | Instalator Windows (nsis) – cross-compile na Macu |
| **macOS** (wszystkie) | `npm run pac` | Czyści `dist/`, potem arm64 + x64 + win |
| **Windows** | `npm run build:win` | Instalator Windows (nsis) |

### Aktualizacja na Windows (dla użytkowników)

Jeśli instalator nowej wersji się wywala lub nie nadpisuje poprzedniej, przyczyną bywa **stara wersja w systemie**. W release notes / na stronie pobierania warto polecać: **przed instalacją nowej wersji zamknąć aplikację i odinstalować poprzednią** (Panel sterowania → Programy i funkcje → Imprezja Quiz → Odinstaluj), potem uruchomić nowy instalator. Zostało to uwzględnione w FAQ („Instalator się wywala / nie instaluje nowej wersji”).

### Uwagi
- **Skrypt `kill-port`** (lsof) jest tylko w `electron` / `electron:dev` – **nie** jest używany przy `build`, więc build na Windows nie zależy od lsof.
- **clean.js** – czysty Node (fs/path), działa na Windows i Mac.
- Build Mac (DMG) ma sens tylko na macOS; build Windows można robić na Macu (cross) lub na Windows.
- Katalog `dist/` jest wynikiem; w `package.json` → `build.files` wykluczone są m.in. `docs`, `*.md`, `scripts`, `*.sh`, `*.bat` – do paczki nie trafiają.

### Konflikty
- Brak – konfiguracja jest spójna. Na Windows nie uruchamiaj `pac` w celu zbudowania wersji Mac (electron-builder nie zbuduje poprawnie DMG na Windows).

---

## 2. NJR Konwerter / Edytor bazy VDJ (Python + PyInstaller)

**Lokalizacja:** `tools/vdj-database-editor/` (`app.py`, `launcher.py`, `njr.spec`).

### Konfiguracja
- **PyInstaller** – jeden plik wykonywalny z `launcher.py` (uruchamia Flask + przeglądarkę).
- **njr.spec** – hiddenimports (flask, vdj_parser, rb_parser, serato_parser, license_njr, mutagen, cryptography, pyrekordbox itd.), `datas=(static, static)`.
- **build.sh** (macOS/Linux): `python3 -m PyInstaller njr.spec` → `dist/NJR-konwerter`.
- **build.bat** (Windows): `python -m PyInstaller njr.spec` → `dist\NJR-konwerter.exe`.

### Jak budować

| Środowisko | Polecenie | Wynik |
|------------|-----------|--------|
| **macOS / Linux** | `cd tools/vdj-database-editor && ./scripts/build.sh` | `dist/NJR-konwerter` |
| **Windows** | `cd tools\vdj-database-editor && scripts\build.bat` | `dist\NJR-konwerter.exe` |

Wymagane: Python 3, `pip install -r requirements.txt`, `pip install pyinstaller`. Opcjonalnie venv.

### Konflikty
- **Brak** – `njr.spec` wskazuje `launcher.py` i `static`; `license_njr.py` istnieje; `requirements.txt` i hiddenimports są zgodne.
- Build Pythona jest niezależny od Electronu – można budować konwerter osobno na każdej platformie.

---

## 3. Podsumowanie

| Cel | Windows | Mac | Uwagi |
|-----|---------|-----|--------|
| **All in one** (Quiz + Konwerter) | `npm run build:all-in-one:win` | `npm run build:all-in-one:mac` | Wymaga Pythona tylko na maszynie do buildu; użytkownik dostaje jeden instalator. |
| **Tylko Imprezja Quiz** | `npm run build:win` | `npm run build:mac` lub `pac` | Electron; na Macu można zbudować też win (cross). |
| **Tylko NJR Konwerter** | `scripts\build.bat` | `./scripts/build.sh` | PyInstaller; wynik w `tools/vdj-database-editor/dist/`. |

Python 3 i PyInstaller są używane **wyłącznie przy budowaniu** all-in-one (skrypt `prepare-njr-for-electron.js`). W gotowym instalatorze jest tylko skompilowana binarka konwertera – użytkownik nie instaluje Pythona.
