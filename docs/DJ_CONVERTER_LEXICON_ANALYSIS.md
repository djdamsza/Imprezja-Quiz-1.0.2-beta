# Analiza Lexicon DJ – migracja kolekcji między programami DJ

## Źródło

Plik: `virtualdj/lexicon-1.9.11-mac-aarch64.zip` (~120 MB)  
Wersja: 1.9.11 (Mac ARM64)  
Producent: Rekordcloud (Christiaan Maks)

---

## Czym jest Lexicon

Lexicon to **komercyjny program do zarządzania biblioteką DJ** z możliwością migracji kolekcji między różnymi programami DJ. Strona: [lexicondj.com](https://www.lexicondj.com).

### Obsługiwane programy DJ

| Program | Wersje |
|---------|--------|
| Rekordbox | 5, 6 |
| Serato | ✓ |
| Traktor | Pro |
| VirtualDJ | ✓ |
| Engine DJ | ✓ |
| iTunes / Apple Music | ✓ |

### Co jest konwertowane

- Utwory i playlisty
- Cue points i pętle
- Beatgridy i tagi
- Kolory i metadane
- Smart playlists (z automatyczną konwersją)
- Utwory streamingowe (Beatport LINK, Tidal, SoundCloud GO)

---

## Architektura techniczna

### Stack

- **Electron** – aplikacja desktopowa (JS/Node)
- **better-sqlite3-multiple-ciphers** – baza SQLite z obsługą szyfrowania (RB master.db)

### Pliki otwierane przez Lexicon (lsof)

- **Rekordbox:** `~/Library/Pioneer/rekordbox/master.db`, `master.db-wal`, `master.db-shm`
- **Własna baza:** `~/Library/Application Support/lexicon/main.db`, `main.db-wal`, `main.db-shm`
- **lexicon-tagger** – zewnętrzny binarny (PyInstaller), Python 3.13:
  - **eyed3** – odczyt/zapis ID3 (MP3)
  - **mutagen** – metadane audio
- **ffmpeg**, **lame** – przetwarzanie audio
- **Librosa** – analiza audio (detekcja beatów)

### Struktura pliku ZIP

```
Lexicon.app/
├── Contents/
│   ├── Resources/
│   │   ├── app.asar              # główny kod (bundlowany webpack)
│   │   └── app.asar.unpacked/
│   │       └── lib/
│   │           ├── ffmpeg/       # ffmpeg, ffprobe
│   │           ├── lame/         # encoder MP3
│   │           ├── lexicon-tagger/  # Python – tagowanie plików
│   │           └── node_modules/
│   │               └── better-sqlite3-multiple-ciphers/
│   └── Frameworks/
│       ├── Electron Framework.framework
│       ├── Sparkle.framework     # auto-update
│       └── ...
```

### Przepływ konwersji (z manuala)

1. **Import** – Sync → Import tracks & playlists → wybór programu źródłowego
2. **Lexicon** – dane trafiają do wewnętrznej bazy Lexicon
3. **Sync** – wybór programu docelowego → Sync

### Znane ograniczenia (z manuala)

- **Beatgrid shift** – RB, Traktor, VDJ, Serato inaczej czytają MP3; Lexicon skanuje i koryguje przesunięcia (26–50 ms)
- **Rekordbox** – inteligentne playlisty zapisywane jako zwykłe; max 8 hot cues (RB obsługuje 16)
- **VirtualDJ** – kolory cue points domyślnie puste (trzeba ustawić w POI editor)
- **Serato** – FLIP nie konwertowany; OGG – 1 beatgrid; AAC nieobsługiwany
- **Engine DJ** – album art: „Re-import track information” po konwersji

---

## Licencja i cennik

- **Licencja**: Proprietary – modyfikacja, reverse engineering, dekompilacja zabronione
- **Cennik**: Free (konwersja), Essential, Ultimate (subskrypcja)
- **Biblioteki**: Electron (MIT), Librosa (ISC), FFmpeg (LGPLv2.1), Mutagen (GPL2)

---

## Wnioski dla naszego konwertera VDJ→RB

1. **Lexicon** – gotowe, płatne rozwiązanie z obsługą VDJ↔RB; można je traktować jako punkt odniesienia.
2. **better-sqlite3-multiple-ciphers** – ta sama biblioteka co w pyrekordbox do obsługi master.db.
3. **lexicon-tagger** – zapis tagów do plików (ID3) – przydatne, gdy VDJ/RB czytają metadane z plików.
   - **Wdrożone:** moduł `tag_writer.py` (mutagen), przycisk „Zapisz tagi do plików” w UI.
4. **Beatgrid shift** – Lexicon rozwiązuje problem przesunięć; wymaga analizy audio – odłożone.
5. **Workflow** – Lexicon używa pośredniej bazy (własny model), podobnie jak nasz UnifiedDatabase.
6. **Waveformy** – przy Sync do RB Lexicon prawdopodobnie generuje/rysuje waveformy (ANLZ) dla każdego utworu – stąd długi czas i wysokie obciążenie CPU przy dużej bibliotece.
7. **Jednordzeniowość** – Lexicon wykorzystuje głównie jeden rdzeń (~100% CPU), mimo 24 wątków. Mało wydajne przy wielordzeniowych CPU.

### Szacowany czas konwersji Lexicon (Sync do RB)

| Biblioteka | Szacunek | Uwagi |
|------------|----------|-------|
| ~11 000 utworów | **6–20 godzin** | Analiza audio (waveform, beatgrid) ~2–6 s/utwór, jeden rdzeń |
| ~1 000 utworów | **30–100 min** | |
| ~100 utworów | **3–10 min** | |

*Zależy od CPU, długości utworów i lokalizacji plików (SSD vs HDD).*

### Doświadczenia użytkowników (znane problemy)

- **1h dla 4 plików** – bardzo mała playlista (4 utwory normalnej długości), analiza bez końca.
- **50 min dla ~20 utworów** – jedna lista (~20 nagrań Oldschool), Lexicon nadal miał tylko tę jedną listę. Czas nieadekwatny do rozmiaru.
- **Prawdopodobna przyczyna:** Lexicon analizuje audio (waveformy, beatgrid) dla każdego pliku – Librosa, ffmpeg, jeden rdzeń. Nawet mała playlista = długi czas.

### Kluczowa różnica: Lexicon sync vs Restore

**Lexicon dla RB 6/7:** Zapisuje **bezpośrednio** do folderu RB (`~/Library/Pioneer/rekordbox/master.db`), gdy RB jest zamknięty. Nie używa Restore Library.

**Nasz edytor:** Ma teraz oba tryby:
- **Eksport Restore (ZIP)** – File → Restore Library w RB
- **Sync do RB** – zapis bezpośrednio do folderu RB (jak Lexicon)

**Gdy Lexicon jest za wolny:** Nasz konwerter VDJ→RB nie generuje waveformów ani beatgridów – RB zrobi to przy Tools → Analyze. Restore/Sync zajmuje **sekundy**, nie godziny. Dla małych list (pojedynczy backup VDJ) nasz edytor jest praktyczniejszy.

→ Szczegóły: `docs/DJ_CONVERTER_LEXICON_VS_EDYTOR.md` – skąd bierzemy dane (bez analizy audio).
