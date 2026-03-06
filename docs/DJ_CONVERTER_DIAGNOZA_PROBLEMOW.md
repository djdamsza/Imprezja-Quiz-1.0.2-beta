# Diagnoza: dlaczego RB pokazuje te same problemy mimo poprawek

## Co wiemy

1. **master.db jest zapisywany poprawnie** – analiza przed/po Sync potwierdza ~11k utworów, poprawne ID.
2. **RB odczytuje master.db** – liczba utworów się zgadza.
3. **Te same problemy w interfejsie RB:**
   - Artist – kolumna pusta mimo danych w djmdArtist
   - Rating – tylko 5 lub 0 gwiazdek
   - My Tags – brak zaznaczeń
   - Czerwone ikony (brak pliku) – ścieżki nie pasują

## Możliwe przyczyny (do weryfikacji)

### A. Plan Free RB
Plan Free może ograniczać:
- Collection Filter (Artist, Genre, Album)
- Wyświetlanie kolumny Artist
- Auto Relocate, My Tags

**Test:** 30-dniowy trial Core/Professional – czy Artist i inne kolumny się pojawią?

### B. RB czyta metadane z plików
RB może nadpisywać metadane z bazy danymi z plików (ID3). Gdy pliki mają puste tagi, RB pokazuje puste.

**Test:** Uruchom „Zapisz tagi do plików” w konwerterze, potem w RB: PPM na utwór → „Reload tag” (jeśli dostępne).

### C. Brakujące lub niekompatybilne kolumny
RB 7 może wymagać dodatkowych pól lub innego formatu. Pyrekordbox może być zoptymalizowany pod RB 6.

**Test:** Porównaj strukturę naszej bazy z backupem utworzonym w RB (File → Backup Library).

### D. Import XML zamiast Sync
Inna ścieżka importu może działać inaczej.

**Test:**
1. Załaduj VDJ w konwerterze
2. Kliknij **Eksport XML** (vdj-export-rekordbox.zip)
3. W RB: File → Import → wybierz rekordbox.xml z ZIP
4. Sprawdź, czy Artist i inne kolumny są widoczne

### E. Lexicon jako punkt odniesienia
Lexicon robi to samo (zapis do master.db) i działa. Różnice mogą być w:
- Wartości kolumn (np. rb_data_status, inne flagi)
- Dodatkowe tabele (agentNotification, djmdCloudExportPlaylist – mamy 37 tabel, oryginał 46)
- Wersja schematu

**Test:** Jeśli masz Lexicon – migruj tym samym zestawem VDJ przez Lexicon i porównaj strukturę wygenerowanego master.db z naszym (np. `analyze_rb_db.py`).

## Rekomendowane kolejne kroki

1. **Import XML** – najszybszy test innej ścieżki.
2. **Trial płatny RB** – sprawdzenie, czy problem wynika z planu Free.
3. **Zapisz tagi do plików** – jeśli RB nadpisuje z plików, poprawne ID3 powinny pomóc.
4. **Porównanie z Lexicon** – jeśli dostępny.
