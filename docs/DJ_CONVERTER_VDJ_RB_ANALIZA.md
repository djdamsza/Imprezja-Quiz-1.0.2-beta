# Konwerter VDJ ↔ Rekordbox – analiza trudności

## 0. Kluczowe ustalenia (aktualizacja)

- **Aplikacja desktopowa** – pobierana na dysk, działa lokalnie. Roadmap: [DJ_CONVERTER_ROADMAP.md](DJ_CONVERTER_ROADMAP.md)
- **Waveformy:** RB zapisuje je w plikach ANLZ; VDJ generuje na bieżąco. **Przed użyciem bazy w RB – przeanalizuj waveformy od nowa** (Tools → Analyze). Beatgrid i cue points zostaną zachowane.
- **Baza RB:** pyrekordbox odszyfrowuje `master.db` – odczyt i zapis są możliwe.
- **My Library (VDJ):** foldery typu Database, CU Cache, Tools – narzędzia do porządkowania, **nie konwertujemy**.
- **Bpm/Key Difference:** RB obsługuje to w Track Suggestion – **nie musi być w smart listach**.
- **Tagi:** RB – używać **My Tags**, nie Comments (Comments do innych celów).
- **Beatgrid i cue points:** formaty są kompatybilne – **da się zachować** przy przenoszeniu (szczegóły w sekcji 9).

---

## 1. Porównanie formatów

| Aspekt | VirtualDJ | Rekordbox |
|--------|------------|-----------|
| **Baza utworów** | `database.xml` (~10 MB, ~11k utworów) | `master.db` SQLite (~282 MB) + ANLZ (~334 MB) |
| **Rozmiar na utwór** | ~1 KB (XML) | ~28 KB (DB) + ~33 KB (ANLZ) ≈ **~60 KB** |
| **Tagi** | Genre, User1, User2 (tekst, spacje) | djmdGenre (ID), djmdMyTag (hierarchia) |
| **Filter lists** | `.vdjfolder` – atrybut `filter="..."` | `djmdPlaylist.SmartList` – XML w DB |
| **Playlisty statyczne** | `.vdjfolder` – lista `<song path="...">` | `djmdSongPlaylist` – ContentID |
| **Ścieżki** | Pełna ścieżka w FilePath | FolderPath + FileNameL |

---

## 1b. Różnice rozmiaru – skąd ~60× więcej w RB?

**VDJ** (~10 MB dla ~11k utworów): wszystko w jednym pliku XML – metadane, tagi, beatgrid, cue points. **~1 KB na utwór.**

**RB** (~616 MB dla ~10k utworów):
- **master.db (~282 MB):** metadane, playlisty, cue points (referencje), My Tags, historie, sync (UUID, usn), znormalizowane tabele (djmdArtist, djmdAlbum, djmdGenre…). **~28 KB na utwór.**
- **ANLZ (~334 MB):** osobne pliki `.DAT`/`.EXT`/`.2EX` na utwór – beatgrid, cue points, **waveformy** (kilka wersji: monochromatyczne, kolorowe, różna rozdzielczość dla CDJ/Nexus). **~33 KB na utwór.**

### Co RB ma, czego nie ma VDJ w database.xml?

| Element | VDJ | RB |
|---------|-----|-----|
| **Waveformy** | Osobny cache (`.vdjcache`) lub generowane na bieżąco | ANLZ – kilka formatów (PWAV, PWV3–7) dla różnych urządzeń |
| **Struktura utworu** | Brak | PSSI – Intro, Verse, Chorus, Bridge, Outro (automatyczna analiza) |
| **Sync / chmura** | Brak | UUID, rb_local_synced, usn – do Rekordbox Cloud |
| **Znormalizowane tabele** | Powtórzenia w XML (np. ten sam artysta w wielu utworach) | djmdArtist, djmdAlbum – jeden wpis, referencje |
| **Cue points** | W XML (Poi) | W DB (djmdCue) + w ANLZ |

### Czy VDJ „czegoś brakuje” do konwersji?

**Nie.** W `database.xml` są wszystkie dane potrzebne do przeniesienia:
- metadane (tytuł, artysta, gatunek, BPM, tonacja),
- tagi (Genre, User1, User2),
- beatgrid (w tym zmienne tempo),
- cue points.

Różnica rozmiaru wynika głównie z:
1. **Waveformów** – RB trzyma je w ANLZ; VDJ ma je w cache lub generuje. Przy imporcie RB i tak wygeneruje własne ANLZ.
2. **Architektury** – RB: SQLite + osobne pliki; VDJ: jeden XML.
3. **Syncu** – RB ma dodatkowe metadane pod chmurę.

---

## 2. Trudności w dopasowaniu tagów

### 2.1 Różna struktura

**VDJ:**
- 3 pola: Genre, User1, User2
- Wartość = spacja‑rozdzielone tagi: `#Lata20 #PARTY #Taneczne`
- Tag może mieć `#` prefix

**Rekordbox:**
- Genre: słownik `djmdGenre` (ID → nazwa)
- My Tag: hierarchia `djmdMyTag` (sekcje + wartości)
- Relacja `djmdSongMyTag`: ContentID ↔ MyTagID

### 2.2 Mapowanie

| VDJ → RB | Uwagi |
|----------|-------|
| Genre → Genre | Genre w RB to słownik – trzeba dopasować lub tworzyć nowe |
| User1 → My Tag | **Używać My Tags** (nie Comments – to pole do innych celów) |
| User2 → My Tag | User1 i User2 → My Tag (np. sekcje „Kategoria” / „Notatki”) |

### 2.3 Problemy

1. **Brak odpowiedników** – RB nie ma „User2” – trzeba zdecydować, gdzie zapisać (Comments? My Tag sekcja 2?)
2. **Różne konwencje** – VDJ: `#Lata20`, RB: `Lata 20` – normalizacja
3. **Hierarchia My Tag** – RB ma ParentID – trzeba tworzyć sekcje
4. **Wielkość** – 100k utworów × 10 tagów = 1M wpisów djmdSongMyTag

---

## 3. Trudności w inteligentnych playlistach / filter lists

### 3.1 Format VDJ (`.vdjfolder`)

```xml
<FilterFolder filter="User 1 has tag PARTY or User 1 has tag TANECZNE" scope="database" />
```

**Operatory:** `has tag`, `contains`, `is`, `=`, `>=`, `<=`, `>`, `<`, `and`, `or`  
**Pola:** `User 1`, `User 2`, `Genre`, `Year`, `title`, `filepath`, `exists`, `file type`, `days since first seen`

**Pomijamy:** foldery z „My Library” (Database, CU Cache, Tools, Video, Folders) – to narzędzia do porządkowania, nie konwertujemy.

### 3.2 Format Rekordbox (SmartList)

- XML w kolumnie `djmdPlaylist.SmartList`
- Attribute=4 dla smart playlist
- Inna struktura – trzeba zdekodować (np. przez pyrekordbox)

### 3.3 Konwersja reguł

| VDJ | RB (przykład) |
|-----|----------------|
| `User 1 has tag X` | Warunek na My Tag = X |
| `User 1 contains X` | `LIKE '%X%'` na My Tag |
| `Genre is #Y` | Warunek Genre = Y |
| `Year >= 2020` | Warunek ReleaseYear |
| `exists = 1` | Brak w RB – pominięcie lub filtrowanie po załadowaniu |

### 3.4 Problemy

1. **Brak „exists”** – VDJ ma `exists = 0` dla brakujących plików; RB nie ma tego
2. **Brak „file type contains vdjcache”** – specyficzne dla VDJ
3. **Różne nazwy pól** – „User 1” vs „My Tag”, „Year” vs „ReleaseYear”
4. **Błędy w filtrach** – np. `title contain` (typo) w VDJ

---

## 4. Duże bazy (10k–100k utworów)

### 4.1 Wydajność

- **VDJ:** Parsowanie XML – ~10 MB to ~100k linii; można streamować (iterparse)
- **RB:** master.db 295 MB – trzeba odszyfrować, potem SQL; indeksy na ContentID, GenreID itd.

### 4.2 Pamięć

- Nie ładować wszystkich utworów w RAM
- Przetwarzanie batchami (np. 5000 utworów)
- Mapowanie ścieżek w pamięci (path → ID)

### 4.3 Nieistniejące pliki

- RB: wiele rekordów z `FolderPath` do nieistniejących plików
- Strategia: **match po ścieżce** lub **Title + Artist + FileSize**
- Opcja: **mapowanie ścieżek** (np. `/old/path/` → `/new/path/`)

---

## 5. Szyfrowanie Rekordbox

- `master.db` = SQLite + SQLCipher4
- Klucz jest dostępny w systemie (np. pyrekordbox)
- Alternatywa: **Rekordbox** → File → Export Collection → XML (bez szyfrowania)

---

## 6. Rekomendacje

### 6.1 Faza 1 – MVP

1. **Import RB:** Użyć XML export z Rekordbox (prostsze niż odszyfrowywanie DB)
2. **Import VDJ:** Obecny parser `vdj_parser.py` + skan `.vdjfolder`
3. **Unified model:** Tracks (path, title, artist, genre, tags[]), SmartPlaylists (rules[])
4. **Eksport VDJ:** Zapis `database.xml` + `.vdjfolder` z `FilterFolder`

### 6.2 Mapowanie tagów

- **Domyslne:** VDJ Genre → RB Genre, VDJ User1 → RB My Tag 1, VDJ User2 → RB My Tag 2
- **Konfiguracja:** Plik JSON z mapowaniem (np. `User1.#PARTY` → `MyTag.Lata20`)

### 6.3 Smart playlists

- **Parser VDJ:** Regex → AST (field, operator, value)
- **Generator VDJ:** AST → string filter
- **RB:** Dla MVP – smart playlisty jako playlisty statyczne (wyliczone listy utworów)

---

## 8. Filter List → Smart List – wykonalność („wyczyn”)

### 8.1 Czy da się przenieść między systemami?

**Tak.** Transfer VDJ ↔ RB jest możliwy. Podział na Genre/User1/User2 nie jest wymagany – można mapować wszystkie tagi do jednego pola (np. RB Comments lub My Tag) i zachować spójność.

### 8.2 Format RB SmartList (odkryty – pyrekordbox)

Smart playlists w RB są zapisane w `master.db` (kolumna `djmdPlaylist.SmartList`) jako XML:

```xml
<NODE Id="-123456" LogicalOperator="1" AutomaticUpdate="0">
  <CONDITION PropertyName="genre" Operator="1" ValueUnit="" ValueLeft="House" ValueRight="" />
  <CONDITION PropertyName="myTag" Operator="8" ValueUnit="" ValueLeft="PARTY" ValueRight="" />
</NODE>
```

- **LogicalOperator:** 1 = ALL (and), 2 = ANY (or)
- **PropertyName:** `genre`, `myTag`, `name`, `artist`, `comments`, `bpm`, `rating`, `year`, `dateCreated`, `duration`…
- **Operator:** 1=EQUAL, 2=NOT_EQUAL, 3=GREATER, 4=LESS, 5=IN_RANGE, 6=IN_LAST, 7=NOT_IN_LAST, 8=CONTAINS, 9=NOT_CONTAINS, 10=STARTS_WITH, 11=ENDS_WITH

**Uwaga:** Eksport XML z Rekordbox (File → Export) **nie zawiera** definicji smart playlist – tylko statyczne listy. SmartList jest wyłącznie w `master.db`.

### 8.3 Mapowanie VDJ filter → RB SmartList

| VDJ filter | RB SmartList |
|------------|--------------|
| `User 1 has tag PARTY` | `myTag` CONTAINS (8) `PARTY` |
| `User 1 contains taneczne` | `myTag` CONTAINS (8) `taneczne` |
| `User 2 has tag "high energy"` | `myTag` CONTAINS (8) `high energy` |
| `Genre is #House` | `genre` EQUAL (1) `House` |
| `User 1 has tag X or User 1 has tag Y` | LogicalOperator=2 (ANY) + 2× `myTag` CONTAINS |
| `User 1 has tag X and User 1 has tag Y` | LogicalOperator=1 (ALL) + 2× `myTag` CONTAINS |
| `Days since First Seen <= 30` | `dateCreated` IN_LAST (6) ValueLeft=30, ValueUnit=day |
| `Days since First Seen <= 90` | `dateCreated` IN_LAST (6) ValueLeft=90, ValueUnit=day |
| `Rating >= 3` | `rating` GREATER (3) `153` (RB: 3★ = 153) |
| `Year >= 2020` | `year` GREATER (3) `2020` |
| `Bpm Difference < 10` | ❌ Brak – RB nie ma „różnicy względem aktualnego utworu” |
| `Key Difference < 2` | ❌ Brak |
| `Exists = 1` | ❌ Brak w RB |
| `scope="folder"` | ❌ RB smart = zawsze cała baza |
| `group by User 1` | ❌ RB nie ma grupowania w smart listach |
| `file type contains vdjcache` | ❌ Specyficzne dla VDJ |

### 8.4 Co jest wykonalne

1. **Parser VDJ filter** – regex/gramatyka → AST (pole, operator, wartość).
2. **Generator RB SmartList XML** – AST → `<NODE><CONDITION>…</CONDITION></NODE>`.
3. **Zapis do master.db** – przez pyrekordbox (Rekordbox musi być zamknięty):
   - Odszyfrowanie DB
   - INSERT do `djmdPlaylist` (Attribute=4, SmartList=XML)
   - Zapis z powrotem

4. **Konwersja większości Twoich filtrów** – np.:
   - `TANECZNE 2025` (User 1 has tag Taneczne and User 1 has tag 2025) ✅
   - `30 dni nowości`, `90 dni nowosci` ✅
   - `dancing` (User 2 contains dancing) ✅
   - `Club POWER`, `Club party` ✅
   - `TAG 1 FOR SERCH` (wielokrotne or) ✅
   - `energy.subfolders/Energy 1-5` ✅

### 8.5 Ograniczenia (fallback do statycznej listy)

- Filtry z `Bpm Difference`, `Key Difference`, `scope=folder`, `group by` → **konwersja na statyczną playlistę** (wyliczony wynik).
- Filtry z `exists`, `file type vdjcache` → pominięcie lub uproszczenie.

### 8.6 Podsumowanie

**Filter List → Smart List jest wykonalne** dla typowych przypadków (tagi, genre, rok, rating, „days since”). Wymaga:

1. Parser VDJ filter (gramatyka ~50–100 linii).
2. Mapowanie na RB Property/Operator.
3. Zapis do `master.db` przez pyrekordbox.

Trudniejsze filtry (Bpm/Key Difference, group by) można obsłużyć jako statyczne playlisty.

---

## 9. Beatgrid i cue points – czy się „rozjadą”?

### 9.1 Format VDJ (database.xml)

```xml
<Poi Pos="0.240" Type="beatgrid" Bpm="125.0" />
<Poi Pos="25.304082" Type="beatgrid" Bpm="154.047684" Phrase="1" />
<Poi Name="Cue 1" Pos="0.090" Num="1" Color="4278255360" Type="cue" />
```

- **Beatgrid:** `Pos` = pozycja pierwszego bitu (s), `Bpm` = tempo. Zmienne tempo = wiele `<Poi Type="beatgrid">` w różnych miejscach.
- **Cue:** `Pos` = pozycja w sekundach, `Num` = numer, `Color` = ARGB 32-bit.

### 9.2 Format RB (XML export / import)

```xml
<TEMPO Inizio="0.000" Bpm="123.00" Metro="4/4" Battito="1"/>
<TEMPO Inizio="0.861" Bpm="99.99" Metro="4/4" Battito="1"/>
<POSITION_MARK Name="Cue 1" Type="0" Start="0.051" Num="0" Red="224" Green="40" Blue="35"/>
```

- **Beatgrid:** `Inizio` = start segmentu (s), `Bpm` = tempo. Wiele `<TEMPO>` = zmienne tempo.
- **Cue:** `Start` = pozycja (s), `Num` = indeks, `Red/Green/Blue` = kolor 0–255.

### 9.3 Mapowanie VDJ → RB

| VDJ | RB |
|-----|-----|
| `Poi Pos` (beatgrid) | `TEMPO Inizio` |
| `Poi Bpm` | `TEMPO Bpm` |
| `Poi Pos` (cue) | `POSITION_MARK Start` |
| `Poi Num` (cue) | `POSITION_MARK Num` |
| `Poi Color` (ARGB) | `Red`, `Green`, `Blue` (ekstrakcja z 32-bit) |
| `Metro` | domyślnie `4/4`, `Battito` = 1 |

### 9.4 Zachowanie przy przenoszeniu

**Tak – beatgrid i cue points da się zachować.** RB importuje XML z TEMPO i POSITION_MARK i stosuje te dane do kolekcji. Warunek: **ścieżki plików muszą się zgadzać** (ten sam plik audio w obu systemach).

Dla muzyki nie-mechanicznej (zmienne tempo) oba formaty obsługują wiele segmentów beatgrid – konwersja jest możliwa.

### 9.5 Ograniczenia

- **VDJ automix** (`Point="realStart"`, `fadeStart` itd.) – RB nie ma odpowiednika, pomijamy.
- **VDJ remix** (`Type="remix"`) – RB ma inne typy cue, można mapować na Memory Cue.
- **Różnice precyzji** – oba używają sekund (float), precyzja jest zbliżona.

### 6.4 Brakujące pliki

- Raport: lista utworów bez pliku
- Opcja: pominąć / załączyć w raporcie
- Mapowanie ścieżek: np. zamiana `/Users/old/` na `D:\Music\`

---

## 7. Stack technologiczny (desktop)

- **Python** – parsery, logika
- **Electron** lub **Tauri** – UI desktop
- **SQLite** – unified model dla 100k utworów (bez ładowania do RAM)
- **pyrekordbox** – opcjonalnie do odczytu master.db (gdy brak XML export)
