# Konwerter VDJ ↔ Rekordbox – roadmap i architektura

## 1. Cel

**Aplikacja desktopowa** – pobierana na dysk, działa lokalnie (offline). Umożliwia:
- **Import** z VDJ lub Rekordbox
- **Edycję** bazy (scalanie tagów, usuwanie, przesuwanie – jak teraz w vdj-database-editor)
- **Eksport** do VDJ lub Rekordbox

**Bazuje na istniejącym** `tools/vdj-database-editor` – rozszerzamy, nie budujemy od zera.

---

## 2. Ważna informacja o waveformach

> **Rekordbox zapisuje waveformy w plikach ANLZ.** VirtualDJ generuje je na bieżąco (lub w cache).  
> **Przed użyciem skonwertowanej bazy w Rekordbox należy ponownie przeanalizować waveformy** – RB wygeneruje własne pliki ANLZ. Beatgrid i cue points zostaną zachowane; waveformy – odświeżone.

*(Dopisek do wyświetlenia w aplikacji przy eksporcie do RB.)*

---

## 3. Architektura – model uniwersalny

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Import VDJ     │     │  Unified Model   │     │  Export VDJ     │
│  database.xml   │────▶│  (SQLite / RAM)  │────▶│  database.xml   │
│  + .vdjfolder   │     │  Tracks[]        │     │  + .vdjfolder   │
└─────────────────┘     │  Playlists[]     │     └─────────────────┘
                        │  SmartPlaylists[]│
┌─────────────────┐     │  Tags, Beatgrid, │     ┌─────────────────┐
│  Import RB      │     │  CuePoints       │     │  Export RB       │
│  rbxml.xml      │────▶│                  │────▶│  rbxml.xml       │
│  (lub master.db)│     │  + edycja tagów  │     │  (lub master.db) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

**Unified Track:**
- path, title, artist, album, genre, tags[], bpm, key
- beatgrid: [{pos, bpm}, ...]
- cue_points: [{name, pos, num, color}, ...]

---

## 4. Fazy rozwoju

### Faza 1 – Rozszerzenie vdj-database-editor (obecny stan)
- ✅ Ładowanie database.xml
- ✅ Edycja tagów (scalanie, usuwanie)
- ✅ Obsługa .vdjfolder (filter lists)
- ✅ Zapisywanie do VDJ

### Faza 2 – Import RB
- Parser `rbxml.xml` (eksport File → Export Collection)
- Mapowanie RB → Unified Model
- Nowy przycisk „Import z Rekordbox” – wybór pliku XML

### Faza 3 – Eksport RB
- Generator RB XML (COLLECTION + PLAYLISTS)
- Mapowanie Unified → RB (TEMPO, POSITION_MARK)
- Eksport do pliku – użytkownik importuje w RB (File → Preferences → Bridge)

### Faza 4 – Aplikacja desktopowa (do pobrania)
- **PyInstaller** – jeden plik .exe / .app (jak image-to-webp)
- Lub **Electron** – jeśli wolisz UI webowe w oknie
- Działa offline, bez instalacji serwera

### Faza 5 – master.db / Restore Library (w planach)
- **Import** bezpośrednio z master.db (pyrekordbox)
- **Eksport do Restore Library** – generowanie backupu RB (ZIP z master.db) zamiast rekordbox.xml
- Umożliwi użycie File → Library → Restore Library (pełna baza, nie tylko rekordbox xml)
- RB5 vs RB7: RB6/7 używają master.db (SQLite); RB5 – .edb (DeviceSQL)
- **Plan implementacji:** [DJ_CONVERTER_MASTER_DB_PLAN.md](DJ_CONVERTER_MASTER_DB_PLAN.md)

### Faza 6 – Filter List → Smart List
- Konwersja .vdjfolder → RB SmartList (zapis do master.db)

---

## 5. Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Backend | Python (Flask – już jest) |
| Parser VDJ | vdj_parser.py, vdjfolder.py |
| Parser RB | Nowy: rb_parser.py (rbxml.xml) |
| Generator RB | Nowy: rb_generator.py |
| UI | Obecny HTML/JS (static/) |
| Pakowanie | PyInstaller (onefile) |

---

## 6. Struktura plików (docelowa)

```
tools/vdj-database-editor/
├── app.py              # Flask – rozszerzyć o import/export RB
├── vdj_parser.py       # Istniejący
├── vdjfolder.py        # Istniejący
├── rb_parser.py        # NOWY – parsowanie rbxml.xml
├── rb_generator.py     # NOWY – generowanie RB XML
├── unified_model.py    # NOWY – Track, Playlist, SmartPlaylist
├── static/
│   └── index.html      # Rozszerzyć UI
├── requirements.txt    # + pyrekordbox (opcjonalnie)
└── build.spec          # PyInstaller
```

---

## 7. Kolejność prac

1. **unified_model.py** – struktury danych (Track, Playlist)
2. **rb_parser.py** – odczyt rbxml.xml → Unified
3. **Integracja w app.py** – endpoint `/api/import-rb`, ładowanie do tego samego modelu co VDJ
4. **rb_generator.py** – Unified → RB XML
5. **Eksport w app.py** – `/api/export-rb`
6. **UI** – przyciski Import RB, Export RB, dopisek o waveformach
7. **PyInstaller** – build .exe / .app

---

## 8. Dopisek o waveformach (tekst do UI)

```
⚠️ Rekordbox zapisuje waveformy w plikach ANLZ. VirtualDJ generuje je na bieżąco.
Po imporcie bazy do Rekordbox uruchom analizę waveformów (Tools → Analyze) –
RB wygeneruje własne pliki. Beatgrid i cue points zostaną zachowane.
```
