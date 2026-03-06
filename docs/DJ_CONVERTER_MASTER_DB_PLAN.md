# Plan implementacji eksportu do master.db (Restore Library)

## 1. Cel

Umożliwić **pełną migrację bazy** z VirtualDJ do Rekordbox przez **File → Library → Restore Library**. Obecny eksport (rekordbox.xml) nie działa – RB go nie przyjmuje. Jedyna droga to generowanie backupu RB (ZIP z `master.db`).

**Skupienie:** RB6 i RB7 (master.db). RB5 (.edb) – pomijamy.

---

## 1b. Inspiracja: VirtualDJ czyta master.db natywnie

VirtualDJ **nie wymaga migracji** przy pracy z bazą Rekordbox – od buildu 6106 (2020) czyta `master.db` bezpośrednio:
- Settings → OPTIONS → **RekordboxFolder** → wskaż folder z master.db
- VDJ pokazuje playlisty RB pod Local Music → Rekordbox

Rekordbox **nie ma** odwrotnej opcji (VDJFolder) – dlatego musimy generować master.db i używać Restore. Szczegóły: [DJ_CONVERTER_VDJ_NATIVE_DB_RESEARCH.md](DJ_CONVERTER_VDJ_NATIVE_DB_RESEARCH.md)

---

## 2. Wymagania techniczne

### 2.1 pyrekordbox

- **Pakiet:** `pyrekordbox` (PyPI)
- **Wersja:** 0.4.x – obsługa RB 5.8.6, 6.7.7, 7.0.9
- **Funkcje:** odczyt/zapis `master.db`, dodawanie utworów (DjmdContent), playlist (DjmdPlaylist, DjmdSongPlaylist)
- **Uwaga:** Baza RB6/7 jest zaszyfrowana SQLCipher4 – pyrekordbox obsługuje to (klucz jest wspólny dla wszystkich instalacji RB)

### 2.2 SQLCipher (opcjonalnie)

- pyrekordbox może wymagać `pysqlcipher3` lub `sqlcipher3` do odczytu zaszyfrowanej bazy
- Przy **tworzeniu nowej bazy** – trzeba sprawdzić, czy RB Restore akceptuje bazę nieszyfrowaną, czy wymaga szyfrowania

### 2.3 Struktura backupu RB

Backup tworzony przez RB (File → Library → Backup Library) to ZIP zawierający m.in.:

- `master.db` – główna baza SQLite (RB6/7)
- Ewentualnie inne pliki (ANLZ, obrazy) – do weryfikacji

**Krok 0:** Wykonać Backup Library w RB, rozpakować ZIP i sprawdzić dokładną strukturę plików.

---

## 3. Mapowanie Unified → master.db

### 3.1 Kluczowe tabele

| Tabela RB | Zawartość | Źródło w Unified |
|-----------|-----------|------------------|
| `djmdContent` | Utwory (ścieżka, tytuł, BPM, długość, itd.) | `Track` |
| `djmdArtist` | Artyści | `Track.artist` (deduplikacja) |
| `djmdAlbum` | Albumy | `Track.album` |
| `djmdGenre` | Gatunki | `Track.genre` |
| `djmdKey` | Tonacje | `Track.key` |
| `djmdPlaylist` | Playlisty i foldery | `Playlist` |
| `djmdSongPlaylist` | Powiązania utwór–playlista | `Playlist.track_ids` → ContentID |

### 3.2 djmdContent – kolumny istotne przy imporcie

- `ID` – unikalny identyfikator (integer, auto-increment)
- `FolderPath` – ścieżka do pliku (pełna)
- `FileNameL` – nazwa pliku
- `Title`, `ArtistID`, `AlbumID`, `GenreID`, `KeyID`
- `BPM`, `Length`, `TrackNo`, `BitRate`, `FileType`
- `Commnt` – komentarze (np. tagi)
- `Rating`, `ReleaseYear`, `ColorID`
- `DJPlayCount`
- Kolumny systemowe: `UUID`, `rb_data_status`, `created_at`, `updated_at` itd.

### 3.3 Tabele referencyjne

- `djmdArtist`, `djmdAlbum`, `djmdGenre`, `djmdKey` – najpierw wstawiamy unikalne wartości, pobieramy ID, potem używamy w `djmdContent`
- `djmdColor` – kolory cue points (RB ma zestaw domyślny)

### 3.4 Playlisty

- `djmdPlaylist`: `ID`, `Name`, `Seq`, `ParentID` (folder nadrzędny), `ImagePath`, `Attribute` (0=playlista, 1=folder)
- `djmdSongPlaylist`: `ID`, `PlaylistID`, `ContentID`, `TrackNo` (kolejność w playliście)

---

## 4. Kroki implementacji

### Faza A – Badanie (1–2 dni) ✅

**Wyniki:** [DJ_CONVERTER_FAZA_A_WYNIKI.md](DJ_CONVERTER_FAZA_A_WYNIKI.md)

1. **Struktura backupu RB** – pyrekordbox otwiera master.db (SQLCipher4). Struktura ZIP do potwierdzenia po Backup Library.
2. **pyrekordbox API** – odczyt działa. Zapis przez `session.add()` – wymaga jawnego `ID` (typ TEXT, duże liczby).
3. **Skrypty:** `scripts/analyze_rb_db.py`, `scripts/analyze_rb_backup_zip.py`

### Faza B – Moduł eksportu (3–5 dni) ✅

4. **Nowy plik `rb_masterdb_generator.py`**
   - Funkcja `unified_to_master_db(db: UnifiedDatabase, path_replace: dict) -> bytes`
   - Zwraca zawartość `master.db` (bytes) lub ścieżkę do pliku
   - Użycie pyrekordbox lub bezpośrednie SQL (jeśli pyrekordbox nie wspiera tworzenia)

5. **Mapowanie Unified → tabele RB**
   - Iteracja po `db.tracks` → wstawianie do `djmdArtist`, `djmdAlbum`, `djmdGenre`, `djmdKey` (z deduplikacją)
   - Wstawianie do `djmdContent` z poprawnymi ID referencji
   - Iteracja po `db.playlists` → `djmdPlaylist` (foldery + playlisty), `djmdSongPlaylist`

6. **Beatgrid i cue points**
   - RB przechowuje je w `djmdCue` (lub podobnej tabeli) – sprawdzić w dokumentacji pyrekordbox
   - Mapowanie `Track.beatgrid`, `Track.cue_points` → tabele RB

### Faza C – Integracja (1–2 dni)

7. **Endpoint `/api/export-rb-restore`**
   - Alternatywa do `/api/export-rb` – zwraca ZIP z `master.db` zamiast `rekordbox.xml`
   - Struktura ZIP zgodna z backupem RB
   - Parametry: `pathFrom`, `pathTo` (zamiana ścieżek)

8. **UI**
   - Przycisk „Eksport do Restore (master.db)” lub przełącznik formatu
   - Instrukcja: File → Library → Restore Library

### Faza D – Testy i dopracowanie (2–3 dni)

9. **Testy**
   - Mała baza VDJ (10 utworów, 2 playlisty) → eksport → Restore w RB
   - Weryfikacja: utwory, playlisty, BPM, cue points
   - Test na RB7

10. **Obsługa błędów**
    - Brakujące pliki (ścieżki nie istnieją)
    - Duże bazy (wydajność)
    - Nieobsługiwane formaty plików

---

## 5. Ryzyka i ograniczenia

| Ryzyko | Mitigation |
|--------|------------|
| RB wymaga szyfrowania master.db | Użyć pyrekordbox do zapisu – obsługuje SQLCipher |
| Struktura backupu ZIP różna od oczekiwanej | Faza A – dokładna analiza backupu |
| pyrekordbox nie wspiera tworzenia bazy | Bezpośredni SQL + szablon pustej bazy RB |
| Różnice RB5 vs RB7 | Cel: RB6/7 (master.db). RB5 (.edb) – osobny projekt |
| Waveformy (ANLZ) | RB wygeneruje przy Tools → Analyze – nie musimy ich tworzyć |

---

## 6. Szacowany czas

| Faza | Czas |
|------|------|
| A – Badanie | 1–2 dni |
| B – Moduł eksportu | 3–5 dni |
| C – Integracja | 1–2 dni |
| D – Testy | 2–3 dni |
| **Razem** | **7–12 dni** |

---

## 7. Zależności

```
# requirements.txt – dodać
pyrekordbox>=0.4.4
# Opcjonalnie, jeśli pyrekordbox wymaga:
# pysqlcipher3  # lub sqlcipher3
```

---

## 8. Odniesienia

- [pyrekordbox – Rekordbox 6 Database Format](https://pyrekordbox.readthedocs.io/en/stable/formats/db6.html)
- [pyrekordbox GitHub](https://github.com/dylanljones/pyrekordbox)
- [DJ_CONVERTER_RB_RESTORE.md](DJ_CONVERTER_RB_RESTORE.md) – kontekst, różnica Restore vs rekordbox xml
