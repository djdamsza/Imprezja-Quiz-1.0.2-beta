# Lexicon vs nasz edytor – skąd bierzemy dane

## Problem z Lexicon

1h dla 4 plików, 50 min dla ~20 utworów – to nie ma sensu. Lexicon analizuje **każdy plik audio** (Librosa, ffmpeg), generuje waveformy i beatgrid. Nawet przy małej playliście proces trwa bardzo długo.

## Alternatywa: skąd bierzemy informacje

| Dane | Lexicon | Nasz edytor |
|------|---------|-------------|
| **Metadane** (Artist, Title, BPM, Key) | Z bazy źródłowej + analiza audio | **Z database.xml** – VDJ już to ma |
| **Beatgrid** | Analiza audio (Librosa) – wolne | **Z database.xml** – elementy `<Poi Type="beatgrid">` – już są w XML |
| **Cue points** | Z bazy + ewentualna korekta | **Z database.xml** – elementy `<Poi Type="cue">` – już są w XML |
| **Playlisty** | Z bazy źródłowej | **Z .vdjfolder** lub rekordbox.xml |
| **Waveformy (ANLZ)** | Generuje – **godziny** | **Nie generujemy** – RB zrobi przy Tools → Analyze |

## Kluczowa różnica

**Lexicon:** Odtwarza pliki audio, analizuje je (Librosa), generuje waveformy i beatgrid od zera. Każdy plik = kilka sekund–minut pracy CPU.

**Nasz edytor:** Czyta **database.xml** – VirtualDJ już zapisał tam beatgrid, cue points, BPM. Kopiujemy te dane do master.db. **Zero analizy audio.** Waveformy – Rekordbox wygeneruje sam, gdy użytkownik uruchomi Tools → Analyze (i może to zrobić w tle, tylko dla wybranych utworów).

## Co tracimy (w porównaniu z Lexicon)

1. **Beatgrid shift** – Lexicon koryguje przesunięcia 26–50 ms (MP3 vs różne programy). My tego nie robimy – RB wygeneruje własny beatgrid przy Analyze.
2. **Pre-generowane waveformy** – Lexicon ma je od razu po Sync. My – użytkownik musi uruchomić Tools → Analyze w RB (jednorazowo, RB robi to wielordzeniowo i szybciej niż Lexicon).

## Podsumowanie

**Tak, możemy uzyskać potrzebne informacje inaczej** – z plików XML/VDJ, bez analizy audio. Nasz konwerter:

- Migruje metadane, beatgrid, cue points z database.xml
- Zapisuje do master.db z `AnalysisDataPath=""`
- RB wie, że ma wygenerować waveformy przy Analyze
- **Czas: sekundy**, nie godziny

Dla typowej migracji VDJ→RB (backup ZIP + listy) nasz edytor jest wystarczający i wielokrotnie szybszy.
