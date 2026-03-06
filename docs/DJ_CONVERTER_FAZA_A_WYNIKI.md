# Faza A – Wyniki badania (master.db / Restore Library)

## 1. pyrekordbox – instalacja i odczyt

- **Zainstalowano:** `pyrekordbox==0.4.4`
- **Zależności:** sqlalchemy, sqlcipher3-wheels, construct, numpy, psutil
- **Odczyt master.db:** działa – baza RB6/7 jest zaszyfrowana SQLCipher4, pyrekordbox obsługuje to automatycznie

### Lokalizacja bazy RB (Mac)

- `~/Library/Pioneer/rekordbox/master.db` – aktywna baza (gdy RB jest zamknięty może nie istnieć)
- `master.backup3.db`, `master.backup2.db`, `master.backup1.db` – kopie zapasowe RB

pyrekordbox otwiera zarówno `master.db`, jak i `master.backup3.db`.

---

## 2. Struktura bazy – kluczowe tabele

| Tabela | Rekordów (przykład) | Opis |
|--------|---------------------|------|
| `djmdContent` | 10360 | Utwory – FolderPath, FileNameL, Title, ArtistID, BPM, Length, GenreID, KeyID |
| `djmdArtist` | 6520 | Artyści – ID, Name |
| `djmdAlbum` | 5729 | Albumy |
| `djmdGenre` | 462 | Gatunki |
| `djmdKey` | 48 | Tonacje |
| `djmdPlaylist` | 800 | Playlisty i foldery – Name, ParentID, Attribute (0=playlista, 1=folder) |
| `djmdSongPlaylist` | 491282 | Powiązania utwór–playlista – PlaylistID, ContentID, TrackNo |
| `djmdCue` | 24029 | Cue points – ContentID, InMsec, Kind, Color |
| `contentFile` | 12352 | Ścieżki plików – ContentID, Path |

### ID – format

- **Typ:** TEXT (string)
- **Wartości:** duże liczby całkowite (np. 4151701110, 266802802)
- **Generowanie:** trzeba podać jawnie – brak auto-increment w modelu SQLAlchemy

### djmdContent – przykładowe kolumny

- `ID`, `FolderPath`, `FileNameL`, `FileNameS`, `Title`
- `ArtistID`, `AlbumID`, `GenreID`, `KeyID` – odwołania do innych tabel
- `BPM`, `Length`, `TrackNo`, `BitRate`, `FileType`
- `Commnt`, `Rating`, `ReleaseYear`, `ColorID`, `DJPlayCount`
- Kolumny systemowe: `UUID`, `rb_data_status`, `created_at`, `updated_at`

### djmdPlaylist

- `Attribute`: 0 = playlista, 1 = folder
- `ParentID`: ID folderu nadrzędnego (np. "root" dla głównego poziomu)
- `Seq`: kolejność

---

## 3. Zapis (insert) – status

- **session.add()** – wymaga jawnego `ID` dla każdego rekordu
- **DjmdArtist**, **DjmdContent** itd. – modele istnieją, ale `ID` nie ma generatora
- **Strategia:** generować unikalne ID (np. `str(random.randint(1, 2**31))` lub na podstawie max(ID)+1)

---

## 4. Struktura backupu ZIP

**Do weryfikacji:** W Rekordbox wykonaj **File → Library → Backup Library** i zapisz plik .zip.

Skrypt analizy: `tools/vdj-database-editor/scripts/analyze_rb_backup_zip.py`

```bash
python scripts/analyze_rb_backup_zip.py ~/Downloads/rekordbox-backup.zip
```

**Oczekiwana struktura (na podstawie dokumentacji):** ZIP zawiera `master.db` i ewentualnie inne pliki (ANLZ, obrazy). Dokładna struktura zostanie potwierdzona po wykonaniu backupu przez użytkownika.

---

## 5. Wnioski dla Fazy B

1. **pyrekordbox** – nadaje się do odczytu i zapisu (z jawnym ID).
2. **Mapowanie Unified → RB:** 
   - Najpierw wstawić `djmdArtist`, `djmdAlbum`, `djmdGenre`, `djmdKey` (z deduplikacją), pobrać ID.
   - Potem `djmdContent` z odwołaniami.
   - Na końcu `djmdPlaylist` i `djmdSongPlaylist`.
3. **Generowanie ID:** algorytm unikalnych ID (np. timestamp + random, lub max+1).
4. **Backup ZIP:** po uzyskaniu przykładowego backupu – doprecyzować strukturę i sposób pakowania.

---

## 6. Skrypty utworzone w Fazie A

- `scripts/analyze_rb_db.py` – analiza master.db (tabele, schemat, przykłady)
- `scripts/analyze_rb_backup_zip.py` – analiza struktury ZIP backupu RB
