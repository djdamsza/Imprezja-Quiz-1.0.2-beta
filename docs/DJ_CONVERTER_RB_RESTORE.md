# Rekordbox Restore Library – format i ograniczenia

## Różnica: Restore Library vs rekordbox xml

| Funkcja | Format | Zawartość |
|---------|--------|-----------|
| **File → Library → Restore Library** | ZIP z `master.db` | Pełna baza RB (RB6/7: SQLite zaszyfrowany SQLCipher) |
| **Preferences → Database** | — | Tylko wyświetlenie pliku bazy w użyciu – brak importu/eksportu |

**Restore Library** zastępuje całą bazę RB. Wymaga backupu utworzonego przez Rekordbox (File → Library → Backup Library). Ten backup to ZIP z wewnętrzną strukturą RB (master.db, pliki ANLZ itd.).

W Preferences (Database) RB nie ma opcji importu ani eksportu – tylko pokazuje ścieżkę pliku bazy. **Jedyna droga do wgrania całej nowej bazy to Restore Library.**

---

## RB5 vs RB6/7 – zmiana struktury bazy

| Wersja | Format bazy | Backup |
|--------|-------------|--------|
| **RB5 i wcześniej** | DeviceSQL (`.edb`) | ZIP z `.edb` |
| **RB6, RB7** | SQLite zaszyfrowany (master.db) | ZIP z `master.db` |

Nasz eksport generuje **rekordbox.xml** (format DJ_PLAYLISTS) – ten sam od lat, używany przez RB do „rekordbox xml”. **Nie jest to format backupu** – RB Restore go nie przyjmuje.

---

## Co jest potrzebne do Restore Library?

Aby eksport działał z **Restore Library**, trzeba wygenerować ZIP w formacie backupu RB:

1. **master.db** – baza SQLite (RB6/7) z tabelami: djmdContent, djmdPlaylist, djmdSongPlaylist, djmdArtist, djmdAlbum, djmdGenre itd.
2. **Struktura ZIP** – taka sama jak przy Backup Library (master.db + ewentualnie inne pliki).

**pyrekordbox** umożliwia:
- odczyt i zapis `master.db`
- dodawanie utworów (DjmdContent), playlist (DjmdPlaylist), itd.
- obsługę RB 5.8.6, 6.7.7, 7.0.9

Integracja z pyrekordbox pozwoliłaby na:
1. Tworzenie nowego `master.db` z danych VDJ
2. Pakowanie go do ZIP w formacie backupu RB
3. Użycie **File → Library → Restore Library** w RB

---

## Obecny stan konwertera

- **Eksport:** ZIP z plikiem `rekordbox.xml` (format DJ_PLAYLISTS)
- **Import w RB:** W Preferences nie ma importu – tylko wyświetlenie pliku bazy. Jedyna droga do pełnej bazy to **Restore Library**
- **Restore Library:** nieobsługiwane – nasz ZIP nie jest backupem RB (master.db). Pełna migracja VDJ→RB przez konwerter nie jest obecnie możliwa

---

## Plan: eksport do master.db (Restore Library)

Szczegółowy plan implementacji: **[DJ_CONVERTER_MASTER_DB_PLAN.md](DJ_CONVERTER_MASTER_DB_PLAN.md)**

Krótko:
1. Dodać zależność `pyrekordbox`
2. Przy eksporcie: tworzenie `master.db` z danych Unified (ścieżki, metadane, playlisty, beatgrid, cue points)
3. Pakowanie `master.db` do ZIP w formacie backupu RB
4. Sprawdzenie kompatybilności z RB7

Szacowany czas: 7–12 dni roboczych.
