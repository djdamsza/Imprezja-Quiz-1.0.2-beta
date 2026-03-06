# Waveformy w Rekordbox – czy musimy je generować?

## Odpowiedź: **NIE**

Nasz konwerter **nie musi** generować waveformów (ANLZ). Rekordbox wygeneruje je sam.

## Jak to działa

| Element | Nasz konwerter | Rekordbox |
|---------|----------------|-----------|
| **master.db** | Zapisujemy utwory, playlisty, cue points | ✓ |
| **AnalysisDataPath** | Ustawiamy na `""` (puste) | ✓ |
| **ANLZ (waveformy)** | Nie tworzymy | RB generuje przy **Tools → Analyze** |

## Co robi użytkownik po imporcie

1. Otwórz Rekordbox z zaimportowaną bazą.
2. **Tools → Manage Collection → Analyze** (lub podobna opcja).
3. RB przeskanuje pliki i wygeneruje waveformy (ANLZ) w `share/PIONEER/USBANLZ/`.

Utwory będą widoczne od razu; waveformy pojawią się po analizie.

## Dlaczego Lexicon jest wolny

Lexicon generuje waveformy (ANLZ) przy Sync – analizuje każdy plik audio (Librosa, ffmpeg). Przy ~11k utworów to godziny pracy CPU.

**Nasz konwerter** – tylko master.db, bez ANLZ. Sync trwa sekundy. Waveformy – RB generuje w tle (Tools → Analyze), użytkownik może to zrobić w dowolnym momencie.

## Weryfikacja w kodzie

W `rb_masterdb_generator.py`:
```python
AnalysisDataPath="",  # puste – RB wygeneruje przy Analyze
Analysed=0,           # 0 = nie przeanalizowano
```

## Źródła

- `docs/DJ_CONVERTER_MASTER_DB_PLAN.md` – „RB wygeneruje przy Tools → Analyze – nie musimy ich tworzyć”
- `docs/DJ_CONVERTER_VDJ_RB_ANALIZA.md` – „Przy imporcie RB i tak wygeneruje własne ANLZ”
- Pioneer DJ Forum – przy pustym AnalysisDataPath RB wymaga Re-analyze, ale utwory działają
