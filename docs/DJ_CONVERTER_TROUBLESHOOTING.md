# Konwerter VDJ ↔ Rekordbox – rozwiązywanie problemów

> **Format eksportu:** Obecnie eksportujemy „rekordbox xml” (ZIP z rekordbox.xml). File → Library → **Restore Library** wymaga backupu RB (master.db). Eksport do formatu Restore jest w planach – zob. [DJ_CONVERTER_RB_RESTORE.md](DJ_CONVERTER_RB_RESTORE.md).

## Problem: Po imporcie do Rekordbox widzę tylko 8 sampli zamiast całej bazy

### Możliwe przyczyny

1. **Zaimportowano niewłaściwy plik lub niewłaściwa metoda**
   - W RB **nie ma importu bazy w Preferences** – tylko wyświetlenie pliku w użyciu. Jedyna droga do pełnej bazy to **File → Library → Restore Library**.
   - Nasz eksport (rekordbox.xml) nie jest backupem RB – Restore go nie przyjmuje. Pełna migracja wymaga eksportu do formatu master.db (w planach).

2. **Pliki nie istnieją pod ścieżkami z bazy**
   - Rekordbox **pomija utwory**, których pliki nie istnieją pod podaną ścieżką Location.
   - Jeśli muzyka jest na zewnętrznym dysku lub innej lokalizacji, użyj opcji **zamiany ścieżki** w konwerterze:
     - W polu „Ścieżka z bazy” wpisz np. `/Users/test/Desktop`
     - W polu „Nowa ścieżka” wpisz np. `/Volumes/MyDrive`
     - Kliknij „Eksport do Rekordbox” – ścieżki w XML zostaną zamienione.

3. **Restore Library – jedyna droga do pełnej bazy**
   - W Preferences (Database) RB nie ma importu – tylko wyświetlenie pliku bazy w użyciu.
   - **File → Library → Restore Library** to jedyna metoda wgrania całej nowej bazy. Wymaga backupu RB (ZIP z master.db).
   - Nasz eksport (rekordbox.xml) nie jest backupem RB – Restore go nie przyjmuje. Pełna migracja wymaga implementacji eksportu do master.db.

---

## Problem: Brak playlist po imporcie

- Przy eksporcie z VDJ konwerter **konwertuje listy .vdjfolder** (VirtualFolder z listą utworów) na playlisty RB.
- **FilterFolder** (listy inteligentne, np. „User 1 has tag PARTY”) nie są konwertowane – RB XML nie obsługuje ich w imporcie.
- Upewnij się, że przy ładowaniu VDJ wybrałeś folder zawierający zarówno **database.xml**, jak i pliki **.vdjfolder** (np. z MyLists).

---

## Problem: Waveformy nie wyświetlają się w RB

- RB zapisuje waveformy w plikach ANLZ; VDJ generuje je na bieżąco.
- Po imporcie: **Tools → Analyze** – RB wygeneruje waveformy. Beatgrid i cue points zostaną zachowane.
