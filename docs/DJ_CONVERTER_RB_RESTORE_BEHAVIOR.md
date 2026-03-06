# Rekordbox – zachowanie przy Restore / Sync

## Odkrycie (2026-02-27)

**Problem:** Po zapisaniu bazy RB z 1 utworem i przywróceniu jej (Restore Library), RB pokazuje starą bibliotekę (np. 11 192 utworów).

**Przyczyna:** Rekordbox utrzymuje automatyczne kopie zapasowe w tym samym folderze:
- `master.backup1.db`
- `master.backup2.db`
- `master.backup3.db`

Przy starcie RB może wykryć zmianę w `master.db` (np. po naszym Sync) i **odtworzyć zawartość z backupu** – stąd „ignorowanie” nowej bazy.

## Rozwiązanie w Sync do RB

Przy zapisie nowego `master.db` usuwamy:
1. **master.db-wal**, **master.db-shm** – stare pliki WAL SQLite powodują ładowanie starej zawartości
2. **master.backup1.db**, **master.backup2.db**, **master.backup3.db** – RB nie może wtedy „odtworzyć” starej bazy

## Inne możliwe przyczyny

- **Cloud Sync** (plan Creative/Pro): RB nadpisuje lokalną bazę z chmury przy starcie. Wyłącz: MY PAGE → CLOUD.
- **Inna ścieżka**: RB może używać innego folderu (np. Advanced Preferences → zmiana lokalizacji bazy).

## Źródła

- `docs/DJ_CONVERTER_FAZA_A_WYNIKI.md` – master.backup1/2/3.db
- [Pioneer DJ Forums: Restoring Master Database](https://forums.pioneerdj.com/hc/en-us/community/posts/360016873703-Restoring-Master-Database)
