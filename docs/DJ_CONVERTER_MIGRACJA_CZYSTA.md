# Migracja VDJ → Rekordbox – czysta instalacja

## Przygotowanie (RB pusta, świeża instalacja)

### 1. Rekordbox i konwerter
- [ ] RB zainstalowane, folder `~/Library/Pioneer/rekordbox/` istnieje
- [ ] **Nie uruchamiaj konwertera i Lexicon jednocześnie** – oba blokują master.db („database is locked”)
- [ ] Uruchom RB **raz** (tworzy pustą bazę master.db)
- [ ] **File → Library → Backup Library** – zapisz np. `rb_pusta.zip` (szablon dla konwertera)
- [ ] **Zamknij RB** całkowicie (Cmd+Q, sprawdź Monitor aktywności)

### 2. Konwerter VDJ
- [ ] Uruchom lokalnie **NJR Konwerter** (osobne repo [njr-konwerter](https://github.com/djdamsza/njr-konwerter), katalog `editor/`): `python app.py`
- [ ] Otwórz http://127.0.0.1:5050
- [ ] **VDJ: plik ZIP (backup)** lub **VDJ: folder** → wybierz backup VDJ
- [ ] Kliknij **Załaduj**

### 3. Mapowanie ścieżek (jeśli pliki na innym dysku)
- [ ] W polach **Ścieżka z bazy** → **Nowa ścieżka** wpisz mapowanie (np. `/Users/xyz/Music` → `/Volumes/SSD/Music`)

### 4. Sync do RB
- [ ] Zaznacz **Użyj szablonu RB**
- [ ] **Szablon RB: Przeglądaj** → wybierz `rb_pusta.zip`
- [ ] Kliknij **Sync do RB**
- [ ] Sprawdź komunikat (np. „Sync zapisany (X utworów w bazie)”)

### 5. Uruchom Rekordbox
- [ ] Otwórz RB – powinna być widoczna kolekcja z VDJ
- [ ] Czerwone ikony = pliki nie znalezione – popraw pathFrom/pathTo i powtórz Sync

### 6. VDJ – odczyt z RB (opcjonalnie)
- [ ] VDJ: Settings → RekordboxFolder = `~/Library/Pioneer/rekordbox`
- [ ] **Zamknij VDJ**, w konwerterze: **Zapisz tagi do plików** (VDJ czyta metadane z plików, nie z master.db)
- [ ] Uruchom VDJ – Local Music → Rekordbox

## Bez szablonu (generowanie od zera)

Jeśli nie masz backupu RB:
- [ ] Odznacz **Użyj szablonu RB**
- [ ] Sync wygeneruje bazę od zera (wymaga sqlcipher3)

## Alternatywa: Eksport Restore (ZIP)

Zamiast Sync:
- [ ] **Eksport Restore (ZIP)** – pobierz ZIP
- [ ] W RB: **File → Library → Restore Library** → wybierz ZIP
