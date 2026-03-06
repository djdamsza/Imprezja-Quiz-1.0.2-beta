# Rekordbox ignoruje zmiany – diagnoza i rozwiązania

## Problem

Sync i Restore działają (rozmiar i data plików się zmienia), ale RB nadal pokazuje starą/wadliwą listę.

## Co robimy tak samo jak Lexicon/Mixo

- Zapis bezpośrednio do `master.db`
- Usuwanie `master.db-wal`, `master.db-shm`
- Usuwanie `master.backup.db`, `master.backup1/2/3.db`
- RB zamknięty podczas zapisu

## Prawdopodobne przyczyny (od najczęstszych)

### 1. Cloud Sync (plan Creative/Pro)

**RB przy starcie nadpisuje lokalną bazę z chmury.** To najczęstsza przyczyna.

**Rozwiązanie:** Przed Sync i przed uruchomieniem RB:
- MY PAGE → CLOUD → **wyłącz** „Sync library to another device”
- Upewnij się, że Cloud Sync jest wyłączony na wszystkich urządzeniach

*(Jeśli Cloud Sync nigdy nie był włączony – tę przyczynę można wykluczyć.)*

### 2. Baza w innej lokalizacji (Advanced → Move Database)

**RB może mieć bazę na dysku zewnętrznym lub w innym folderze.** Jeśli w Preferences → Advanced użyłeś „Move Database", RB czyta z tej lokalizacji, a Sync domyślnie zapisuje do `~/Library/Pioneer/rekordbox`.

**Rozwiązanie:** W polu „Folder RB" w konwerterze wpisz **faktyczną** ścieżkę do folderu z master.db. Sprawdź w RB: Preferences → Advanced – tam jest dropdown z aktualną lokalizacją bazy. Użyj tej samej ścieżki w konwerterze.

Źródło: [Moving your rekordbox database (Pioneer)](https://forums.pioneerdj.com/hc/en-us/articles/205021549-Moving-your-rekordbox-database-Video)

### 3. Folder RB w chmurze (iCloud, Google Drive, MIXO)

Jeśli folder `rekordbox` jest w iCloud Drive lub Google Drive:
- Zapis może trafić do lokalnej kopii
- RB może czytać wersję z chmury (starszą)
- Opóźnienie synchronizacji powoduje rozjazd

**Rozwiązanie:** Upewnij się, że RB używa lokalnego folderu (np. `~/Library/Pioneer/rekordbox`), nie w chmurze.

### 4. masterPlaylists6.xml / rekordbox.xml

RB może używać `masterPlaylists6.xml` lub `rekordbox.xml` przy starcie. Stary plik może nadpisywać playlisty z `master.db`.

**Rozwiązanie:** Sync usuwa oba pliki. RB powinien odtworzyć je z `master.db`.

### 5. Bridge / Imported Library (XML)

RB ma pane **Bridge** z opcją „Imported Library" (File → Preferences → Bridge). Można tam zaimportować XML z playlistami. Jeśli masz tam stary XML, RB może pokazywać playlists z Bridge obok głównej biblioteki – upewnij się, że nie mylisz widoku Bridge z główną kolekcją.

Źródło: [rekordbox for Developers](https://rekordbox.com/en/support/developer/)

### 6. Brak fsync – plik nie zdążył się zapisać

Przy zapisie w folderze w chmurze plik może być w buforze. RB uruchomiony zaraz po Sync może czytać starą wersję.

**Rozwiązanie:** Sync wymusza `os.fsync()` po zapisie.

## Różnice vs Lexicon/Mixo

| Aspekt | Lexicon / Mixo | Nasz konwerter |
|--------|----------------|----------------|
| Cloud Sync | Prawdopodobnie ostrzeżenie w UI | Ostrzeżenie w confirm – łatwo pominąć |
| masterPlaylists6.xml | Prawdopodobnie aktualizują | Nie aktualizowaliśmy – **teraz usuwamy** |
| fsync | Nie wiadomo | **Dodane** |
| Folder w chmurze | Nie wiadomo | Brak ostrzeżenia – **dodane** |

## Kroki diagnostyczne

1. **Sprawdź Cloud Sync:** MY PAGE → CLOUD – czy jest włączony? (jeśli nie – wyklucz.)
2. **Sprawdź lokalizację bazy:** Preferences → Advanced – czy „Move Database" jest ustawiony? Jeśli tak, **podaj tę ścieżkę** w polu „Folder RB" w konwerterze.
3. **Sprawdź folder:** Folder rekordbox – czy w iCloud/Google Drive?
4. **Po Sync, przed RB:** Usuń ręcznie `master.db-wal`, `master.db-shm` – na wszelki wypadek
5. **Sprawdź zawartość:** `python3 scripts/analyze_rb_db.py [ścieżka_do_master.db]` – ile utworów w djmdContent? (użyj ścieżki z folderu RB, który faktycznie używasz)
6. **Sprawdź ścieżki:** `python3 scripts/verify_rb_paths.py [ścieżka_do_master.db]` – czy pliki z bazy istnieją na dysku? Jeśli większość to „BRAK", ścieżki są z innego systemu – użyj pathFrom/pathTo w konwerterze.

### Gdy RB tworzy pliki z „złą" wersją po Sync

Jeśli po Sync RB przy starcie tworzy master.backup.db, masterPlaylists6.xml itd. z nieprawidłowymi danymi:

- **Pliki nie działają (czerwone ikony):** Ścieżki w bazie nie wskazują na istniejące pliki. Uruchom `verify_rb_paths.py` – pokaże, ile ścieżek jest błędnych. Użyj pathFrom/pathTo (np. `D:\muzyka` → `/Users/test/Desktop/muzyka dj`), gdy backup VDJ pochodzi z Windowsa.
- **Zupełnie inna lista utworów:** Sprawdź, czy szablon RB nie pochodzi ze starej bazy. Użyj świeżego backupu RB (File → Library → Backup Library) po wyczyszczeniu folderu rekordbox.

## Źródła użyteczne przy problemach z bazą RB

- [rekordbox for Developers](https://rekordbox.com/en/support/developer/) – Bridge, Imported Library, format XML
- [rekordbox-bulk-edit](https://github.com/jviall/rekordbox-bulk-edit) – narzędzie modyfikujące master.db przez pyrekordbox (RB zamknięty); backup przed zmianami
- [pyrekordbox](https://github.com/dylanljones/pyrekordbox) – biblioteka do odczytu/modyfikacji master.db (RB 6/7)
- [Reddit](https://www.reddit.com/r/Rekordbox/comments/gbc2je/rekordbox_database_management/) – wątek o zarządzaniu bazą RB
- [Pioneer Community](https://community.pioneerdj.com/hc/en-us/community/posts/22978936893465-Rekordbox-Database-Management-Issue) – problemy z lokalizacją bazy
