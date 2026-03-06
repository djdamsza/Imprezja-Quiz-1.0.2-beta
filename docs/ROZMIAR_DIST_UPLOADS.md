# Rozmiar dist i opcja „uploads” jako zawartość zewnętrzna

## Szacunek rozmiarów (stan obecny)

| Element | Rozmiar |
|--------|---------|
| **public/uploads** | **64 MB** |
| public/familiada | 4 MB |
| public/img | 628 KB |
| public/quizzes | 92 KB |
| public (łącznie) | ~70 MB |
| **Instalery (po buildzie)** | |
| Imprezja Quiz Setup (Windows) | ~235 MB |
| Imprezja Quiz-1.0.4-arm64.dmg | ~236 MB |
| Imprezja Quiz-1.0.4.dmg (x64) | ~240 MB |
| Aplikacja (mac/win unpacked) | ~388–457 MB |

**uploads** to głównie dźwięki (MP3) i grafika z pytań oraz domyślne SFX (intro, win, correct itd.). To jedyny duży katalog w paczce.

## Czy musimy to ograniczać?

- **Nie musimy** – aplikacja działa z obecnym rozmiarem (~235–240 MB instalera).
- **Możemy** – jeśli zależy nam na mniejszym pliku do pobrania: wykluczenie `public/uploads` z builda i traktowanie go jako **zawartość opcjonalna**, pobieraną po instalacji (np. z Google Drive).

## Opcja: uploads jako zawartość zewnętrzna

### Pomysł

1. **Wykluczyć `public/uploads` z paczki** (electron-builder) → instalery mniejsze o **~64 MB** (ok. 170–175 MB zamiast ~235 MB).
2. **Po instalacji** użytkownik ma pusty katalog danych (Application Support). Dźwięki/grafika z „wbudowanych” quizów mogą być niedostępne do pierwszego pobrania.
3. **Pobieranie po instalacji**:  
   - Wersja A: link na stronie / w instrukcji: „Pobierz zawartość startową (dźwięki, logo)” → plik ZIP z Google Drive (lub inny stały URL). Użytkownik ręcznie rozpakowuje do katalogu danych `uploads` (lub do wskazanego folderu w aplikacji).  
   - Wersja B: w aplikacji przy pierwszym uruchomieniu (lub w menu) przycisk „Pobierz zawartość startową” – pobranie ZIP z zadanego URL i rozpakowanie do `dataDir/uploads`.

### Co już jest po stronie kodu

- **Katalog danych**: `uploadsDir = path.join(dataDir, 'uploads')` – zapis użytkownika jest w Application Support, nie w aplikacji.
- **Fallback**: serwer najpierw serwuje z `uploadsDir`, potem z `path.join(__dirname, 'public', 'uploads')`.  
  Jeśli wykluczymy `public/uploads` z builda, ten katalog po prostu nie będzie w asar – `express.static()` na nieistniejącej ścieżce nie wywoła błędu, brak plików da 404. Aplikacja nie musi być zmieniana pod kątem „braku” tego katalogu.
- **Quizy/Familiada/Śpiewaj dalej/NJR** – kopiowane z aplikacji do katalogu danych przy starcie (brak kopiowania uploads; uploads to wyłącznie fallback do odczytu).

### Kroki wdrożenia (minimalne)

1. **Build** – w `package.json` w `build.files` dodać wykluczenie: `"!public/uploads"`.
2. **Zawartość do pobrania** – przygotować archiwum ZIP z aktualną zawartością `public/uploads` (np. `imprezja-quiz-uploads-start.zip`) i wgrać na Google Drive (lub inny hosting) z linkiem „do pobrania”.
3. **Dokumentacja / UI** – w instrukcji (lub w aplikacji) opisać:  
   „Zawartość startowa (dźwięki, logo) nie jest w instalatorze. Pobierz plik [link] i rozpakuj do folderu: [ścieżka do uploads w katalogu danych].”  
   Opcjonalnie: w aplikacji przycisk „Pobierz zawartość startową”, który pobiera ten ZIP i rozpakowuje do `dataDir/uploads` (wymaga implementacji pobierania + np. `adm-zip` już w projekcie).

### Podsumowanie

- **Szacunek**: dist z uploads ~235–240 MB (instalery); po wykluczeniu `public/uploads` ok. **~64 MB mniej**.
- **Nie musimy** ograniczać – to kwestia wygody pobierania.
- **Możemy** ograniczyć, traktując **katalog uploads jako zewnętrzną zawartość** pobieraną po instalacji z Google Drive (lub innego URL), bez konieczności zmiany logiki serwera – wystarczy wykluczenie z builda i link/instrukcja (ew. przycisk w aplikacji).
