# Analiza folderu Rekordbox – gdzie przechowywana jest kolekcja

## Lokalizacja

`~/Library/Pioneer/rekordbox/` (Mac)  
`%AppData%\Pioneer\rekordbox` (Windows)

## Pliki – rola i zawartość

### Główna baza (RB 6+)

| Plik | Rozmiar | Zawartość |
|------|---------|-----------|
| **master.db** | ~100 MB | **Główna baza SQLite (SQLCipher4)** – utwory (djmdContent), playlisty (djmdPlaylist, djmdSongPlaylist), cue points (djmdCue), artyści, albumy, gatunki. To jedyne źródło kolekcji w RB 6/7. |
| master.db-wal | zmienny | Write-Ahead Log SQLite – zmiany w trakcie sesji RB. Przy starcie RB łączy z master.db. |
| master.db-shm | 32 KB | Shared memory SQLite. |
| master.backup.db | ~50–100 MB | Automatyczna kopia RB – tworzona przy zamknięciu. RB może z niej „odtworzyć” przy wykryciu problemu. |
| master.backup1/2/3.db | opcjonalnie | Starsze backupy (nazewnictwo zależy od wersji RB). |

### Pliki .edb (DeviceSQL – starszy format)

| Plik | Rozmiar | Zawartość |
|------|---------|-----------|
| **datafile.edb** | ~3 KB | Mały plik – prawdopodobnie indeksy lub ustawienia, **nie** pełna kolekcja. |
| **ExtData.edb** | ~5 KB | Dane rozszerzone – **nie** główna lista utworów. |
| *.backup.edb | jak wyżej | Kopie zapasowe plików .edb. |

W RB 6+ kolekcja jest **wyłącznie** w master.db. Pliki .edb są małe i nie przechowują tysięcy utworów.

### XML i sync

| Plik | Zawartość |
|------|-----------|
| **masterPlaylists6.xml** | Eksport playlist – RB może go używać przy starcie. **Sync usuwa** – RB odtworzy z master.db (stary plik mógł nadpisywać nasze playlisty). |
| automixPlaylist6.xml | Playlista automix. |
| playlists3.sync | Stan synchronizacji (np. cloud). |

### Inne

| Plik/Folder | Zawartość |
|-------------|-----------|
| share/ | Waveformy (ANLZ), artwork. |
| Exceptions/ | Wyjątki. |
| networkAnalyze6.db, networkRecommend.db | Dane sieciowe. |
| product.db | Informacje o produkcie. |

## Wnioski dla Sync do RB

1. **master.db** – jedyne miejsce z pełną kolekcją. Zapis nowego master.db powinien wystarczyć.
2. **master.db-wal, master.db-shm** – usuwane przed zapisem, żeby RB nie wczytywał starej sesji.
3. **master.backup.db** – usuwany, żeby RB nie przywracał starej bazy.
4. **masterPlaylists6.xml** – Sync usuwa (stary mógł nadpisywać playlisty); RB odtworzy z master.db.
5. **datafile.edb, ExtData.edb** – za małe na kolekcję; RB 6+ ich nie używa do listy utworów.

## Dlaczego RB nadal pokazuje starą zawartość?

Możliwe przyczyny:

1. **RB nie jest w pełni zamknięty** – na Macu użyj Cmd+Q lub PPM na ikonie w Dock → Zakończ. Sprawdź w Monitorze aktywności, czy nie ma procesu „rekordbox”. Gdy RB ma otwarty master.db, przy wyjściu może nadpisać plik swoją wersją z pamięci.
2. **RB otwarty podczas Sync** – master.db jest zablokowany; zapis może się nie powieść lub RB nadpisze plik przy zamknięciu.
3. **Checkpoint WAL** – RB mógł nie wykonać checkpointu przed zamknięciem; stary master.db-wal mógł nadpisać nasz master.db przy starcie (mało prawdopodobne po usunięciu -wal).
4. **Błąd w generatorze** – generowana baza może być niekompatybilna (schemat, szyfrowanie) i RB przy starcie przywraca z master.backup.db.
5. **Inna ścieżka bazy** – Preferences → Advanced → inna lokalizacja bazy.

## Diagnostyka

Uruchom (gdy RB jest **zamknięty**):

```bash
cd tools/vdj-database-editor
python3 scripts/analyze_rb_db.py ~/Library/Pioneer/rekordbox/master.db
```

Sprawdź liczbę rekordów w djmdContent – powinna odpowiadać liczbie utworów z VDJ po Sync.
