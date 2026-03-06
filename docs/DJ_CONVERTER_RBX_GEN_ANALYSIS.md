# Analiza rbx-gen (FunctionDJ) – wskazówki dla naszego konwertera

## Źródło

- **Repo:** https://github.com/FunctionDJ/rbx-gen
- **Status:** Zarchiwizowany (kwiecień 2021) – „deprecated, VirtualDJ ma natywny CDJ-Export”
- **Stack:** TypeScript, Node.js, xml2js, node-id3, platform-folders
- **Cel:** Konwersja playlist VDJ → rekordbox.xml (RB5.6 / RB6 z workaroundem)

---

## Co rbx-gen robi inaczej

| Aspekt | rbx-gen | Nasz edytor |
|--------|---------|-------------|
| **Źródło playlist** | .m3u / .m3u8 z `Drive:/VirtualDJ/` (ulubione foldery) + `Documents/Playlists` | .vdjfolder (VirtualFolder XML) |
| **Źródło bazy** | database.xml z wielu dysków (volumes) | database.xml z ZIP lub folderu |
| **Wyjście** | rekordbox.xml | master.db (Restore/Sync) + rekordbox.xml |
| **RB6** | Import przez „rekordbox xml” + workaround (film YT) | Bezpośredni zapis master.db – bez workaroundu |

---

## Wskazówki z kodu rbx-gen

### 1. Struktura VDJ database.xml (VirtualDJ.ts)

Pełna definicja typów – potwierdza nasz model:

```
Song:
  FilePath, FileSize, Flag
  Tags: Bpm, Year, Author, Title, Genre, Remix, Album, Stars, Key
  Infos: FirstSeen (unix*1000), Cover, SongLength, FirstPlay, Bitrate, PlayCount
  Scan: Version, Bpm, AltBpm, Volume, Key, Flag
  Poi: Type (automix|remix|beatgrid|cue), Pos, Name, Num, Bpm, Point
  Comment
```

**Wniosek:** Mamy to samo w vdj_parser / vdj_adapter. Poi w _children_xml – OK.

### 2. Mapowanie cue points (main.ts)

```typescript
vdjEntry?.pois
  .filter(p => p.pos && p.num)  // tylko cue z pozycją i numerem
  .map(poi => new CueMark(poi.pos, poi.num))
```

**Wniosek:** Filtrowanie `pos && num` – sensowne. U nas w vdj_adapter bierzemy wszystkie cue. Sprawdzić, czy Num=0 jest OK w RB.

### 3. Fallback Artist/Title z nazwy pliku (getTrackData.ts)

```typescript
const parsedInfoResult = fileInfo.name.trim().match(/\s*(.+)[\s_]*-[\s_]*(.+)\s*/)
const parsedTitle = parsedInfoResult?.[2] ?? fileInfo.name
const parsedArtist = parsedInfoResult?.[1] ?? ""
artist: dbEntry?.tags.author ?? parsedArtist
name: id3Data?.title ?? parsedTitle
```

**Wniosek:** Gdy brak w bazie – parsuj „Artist - Title” z nazwy pliku. Możemy dodać podobny fallback w vdj_adapter lub przy imporcie RB.

### 4. Priorytety metadanych (getTrackData.ts)

| Pole | Źródło 1 | Źródło 2 |
|------|----------|----------|
| artist | dbEntry.tags.author | parsedArtist (z nazwy) |
| name | id3Data.title | parsedTitle |
| averageBpm | id3Data.bpm | (0) |
| tonality | dbEntry.scan.key | id3Data.initialKey |
| totalTime | – | id3Data.time |
| comments | dbEntry.comment | id3Data.comment |

**Wniosek:** rbx-gen preferuje ID3 dla BPM i totalTime. My preferujemy VDJ (beatgrid BPM, Infos.SongLength) – bardziej spójne z analizą VDJ.

### 5. Rekordbox XML – PositionMark (PositionMark.ts)

- **CueMark:** Type=0, Start, Num
- **CueLoopMark:** Type=4, Start, End, Num
- Kolory: Red, Green, Blue w atrybutach

**Wniosek:** Nasz rb_generator i rb_masterdb_generator używają innego modelu (master.db). Dla rekordbox.xml mamy rb_generator – sprawdzić zgodność typów.

### 6. TruePath – normalizacja ścieżek

rbx-gen używa `path.parse()` + `path.format()` do porównywania ścieżek (np. `C:\a\b` vs `C:/a/b`). Nasz `normalize_path()` w vdjfolder.py robi podobnie.

---

## Czego rbx-gen NIE robi (z README)

> „The main missing feature is looking up any track inside the VirtualDJ database and fetching it's cue points and maybe the BPM and such. The model for the Rekordbox hot cues and loops already exists in the code but is untested.”

W praktyce rbx-gen **już pobiera** cue points z `masterbase.songs.get(truePath)?.pois` – więc to działa. Model hot cues/loops był „untested” w 2021.

---

## dj-data-converter (bonus)

- **Traktor ↔ Rekordbox** (nie VDJ)
- **„Correct 26ms grid offset when converting mp3 files”** – beatgrid shift, o którym pisał Lexicon
- Cue points, loops, beat grid, playlists (Pro)
- rekordbox.xml, collection.nml

---

## Wnioski dla naszego projektu

1. **Fallback Artist/Title z nazwy pliku** – gdy brak w Tags, parsuj `Artist - Title` z nazwy. Prosty regex.
2. **Filtrowanie cue** – rozważyć `pos && num` (pomijanie cue bez numeru).
3. **Struktura Poi** – rbx-gen potwierdza Type, Pos, Name, Num, Bpm. Zgodne z naszym modelem.
4. **rekordbox.xml vs master.db** – rbx-gen tylko XML. My mamy master.db (Restore/Sync) – lepsze dla RB6/7.
5. **Źródło playlist** – rbx-gen: m3u z dysków. My: .vdjfolder. Różne przypadki użycia – .vdjfolder jest bliżej natywnego backupu VDJ.
