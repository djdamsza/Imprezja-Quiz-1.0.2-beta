# Analiza Mixo – wskazówki dla naszego konwertera

## Źródło

- **Strona:** https://www.mixo.dj
- **Model:** Subskrypcja ($7/mies.), wersja darmowa z ograniczeniami
- **Platforma:** Mac, Windows, Linux (AppImage)
- **Architektura:** Electron (IndexedDB, Local Storage w `~/Library/Application Support/MIXO`)

---

## Przepływ Mixo

```
Import (VDJ / RB / Serato / Traktor / …) → Mixo (wewnętrzna baza) → Export (VDJ / RB / USB / …)
```

- **Rekordbox Direct:** czyta `master.db` bezpośrednio
- **VDJ:** `database.xml` + folder MyLists (vdjfolder)
- **Eksport VDJ:** generuje `database.xml` do `Music/MIXO/Exports/VIRTUALDJ`

---

## Wskazówki z budowy Mixo

### 1. DJXML – otwarty format pośredni

Mixo udostępnia **DJXML** – otwarty standard XML do migracji między programami DJ.

- **Repo:** https://github.com/mixo-marcus/DJXML
- **Strona:** https://www.djxml.com

**Struktura DJXML v2.0.0:**

| Element | Pola |
|---------|------|
| **Track** | Id, Title, Album, Artist, Bpm, Location, Key, TotalTime, Rating, PlayCount, KeywordTags, … |
| **Beatgrid** | StartTime, Bpm, BeatType |
| **CuePoint** | Name, Type, Start, End, Num, Red, Green, Blue |
| **Folder** | Id, Name, Entries, ParentFolderId |
| **Playlist** | Id, PlaylistName, Entries, ParentFolderId |
| **PlaylistTrack** | TrackId |

**Wniosek:** DJXML to sensowny format pośredni – jeden XML łączy biblioteki z różnych programów. Możemy rozważyć eksport do DJXML dla interoperacyjności (np. z Mixo lub innymi narzędziami).

### 2. Virtual Folders vs Filter Folders (VDJ)

> „Virtual Folders i Filter Folders to reguły wewnątrz VDJ – domyślnie nie są importowane przez Mixo. Aby je zaimportować, wyeksportuj je jako Playlists (m3u) i zapisz w Documents/VirtualDJ/Playlists.”

**Wniosek:** Zgodne z naszym podejściem – .vdjfolder to „Filter Folders” (listy utworów). Virtual Folders (smart listy) wymagają innej obsługi.

### 3. MyLists vs Playlists (VDJ)

> „W najnowszych wersjach VDJ pliki M3U w Playlists są automatycznie konwertowane na vdjfolder w MyLists. Przy imporcie wybierz MyLists, żeby uniknąć duplikatów.”

**Wniosek:** MyLists (.vdjfolder) to główne źródło list – tak jak u nas.

### 4. Mapowanie kolumn

- Track colours → kolumna „Color”
- User1, User2 → kolumna „Tags”

**Wniosek:** Zgodne z naszym modelem (Genre, User1, User2 → tagi).

### 5. Narzędzia Mixo (porównanie z naszym edytorem)

| Mixo | Nasz edytor |
|------|-------------|
| Duplicate Finder | ✓ Duplikaty (path, similar) |
| Relocate Tracks | – (możliwy przyszły moduł) |
| Convert Keys & Cues | – |
| Find & Replace | ✓ Scal tagi, Polskie litery, Czyszczenie tytułów |
| Smart playlists | – |

### 6. Backup

Mixo robi backup przed importem XML/NML i przed eksportem (Serato, VDJ). Przechowuje do 5 backupów.

**Wniosek:** Backup przed zapisem – mamy w planie (`database.xml.bak`).

---

## Wnioski dla naszego projektu

1. **DJXML** – otwarty format; warto mieć go na uwadze jako opcjonalny eksport (interoperacyjność z Mixo i innymi).
2. **Struktura DJXML** – Track, Beatgrid, CuePoint, Folder, Playlist – zbliżona do naszego UnifiedDatabase. Mapowanie powinno być proste.
3. **Virtual Folders** – Mixo ich nie importuje; my też skupiamy się na .vdjfolder (listy utworów).
4. **Rekordbox Direct** – Mixo czyta master.db; my zapisujemy master.db – ten sam kierunek.
5. **Enkodowanie** – DJXML: `&`, `"`, `<`, `>` jako entity; apostrof `'` nie jest konwertowany – uwaga przy parsowaniu.

---

## Ograniczenia Mixo (z doświadczeń użytkownika)

- Program najmniej preferowany
- Wcześniejsze próby użycia bez satysfakcjonującego efektu
- Subskrypcja dla pełnej funkcjonalności

Nasz edytor – lokalny, open source, bez subskrypcji – może być lepszą alternatywą dla użytkowników VDJ→RB.

---

## Wdrożenie DJXML w naszym edytorze

- **Eksport:** Przycisk „Eksport DJXML” – generuje plik .djxml (format v2.0.0)
- **Import:** Przycisk „Import DJXML” – ładuje plik DJXML do edytora (utwory + playlisty)
- **Moduły:** `djxml_generator.py`, `djxml_parser.py`
