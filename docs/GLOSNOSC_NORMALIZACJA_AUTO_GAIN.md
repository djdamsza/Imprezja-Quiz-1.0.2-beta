# Głośność – normalizacja i auto gain

**Pytanie:** Czy możemy inaczej ustawić poziomy głośności – normalizacja głośności sampli / muzyki? Czy możemy dodać mechanizm auto gain?

---

## Zaimplementowane (2025)

### Klient – pliki uploadowane i SFX (Web Audio API)
- **`/lib/audio-normalize.js`** – analiza peak, cache w localStorage
- **Sampler, Śpiewaj Dalej, Bitwa** – przy odtwarzaniu: `decodeAudioData` → peak → `gain = targetPeak / measuredPeak`
- Działa offline (pliki z `/uploads/` są same-origin)

### Serwer – pliki linkowane (URL zewnętrzne)
- **POST /api/audio/analyze-loudness** `{ url: "https://..." }` – ffmpeg `volumedetect`, zwraca `{ gain }`
- **Edytor Samplera** – pole „lub wklej URL”, przycisk 📊 – analiza i zapis `tile.normalizedGain`
- Mnożnik stosowany przy odtwarzaniu

---

## Odpowiedź krótka

**Tak** – można dodać normalizację głośności i auto gain. Wymaga to analizy plików audio (po stronie serwera lub klienta) oraz zastosowania korekcji przed odtworzeniem.

---

## 1. Normalizacja głośności (per-plik)

**Cel:** Wyrównanie poziomu głośności między plikami (np. różne sample w Samplerze, różne utwory w Śpiewaj Dalej).

**Możliwe podejścia:**

| Podejście | Gdzie | Opis |
|-----------|-------|------|
| **A. Serwer – przy uploadzie** | `server.js` | Po uploadzie pliku audio: analiza RMS/peak (np. `ffmpeg`, `node-audio`), zapis metadanych (np. `loudness_db`) do JSON. Klient przy odtwarzaniu mnoży `volume` przez współczynnik korekcyjny. |
| **B. Klient – Web Audio API** | `njr-sampler`, `spiewaj-dalej` itd. | `decodeAudioData()` → `AnalyserNode` lub ręczna analiza bufora → obliczenie peak/RMS → `GainNode.gain.value = targetLevel / measuredLevel`. |
| **C. FFmpeg – normalizacja przy uploadzie** | Serwer | `ffmpeg -i input.mp3 -af loudnorm ...` – normalizacja do np. -14 LUFS przed zapisem. Plik jest fizycznie zmieniony. |

**Rekomendacja:** B (klient) – najprostsze, bez zmian na serwerze. Dla każdego pliku przy pierwszym odtworzeniu: dekoduj → zmierz peak → ustaw `gain = 1 / peak` (lub docelowy poziom, np. 0.8).

---

## 2. Auto gain (w czasie odtwarzania)

**Cel:** Automatyczne dostosowanie głośności w trakcie odtwarzania – ciche fragmenty głośniej, głośne ciszej (kompresja / limiter).

**Możliwe podejścia:**

| Podejście | Opis |
|-----------|------|
| **A. Web Audio API – DynamicsCompressorNode** | Wbudowany w przeglądarce. Łączy się między źródłem a wyjściem. Parametry: `threshold`, `knee`, `ratio`, `attack`, `release`. Działa w czasie rzeczywistym. |
| **B. Web Audio API – własny GainNode + AnalyserNode** | Analyser mierzy poziom w czasie rzeczywistym, skrypt co ~50 ms aktualizuje `GainNode.gain` (np. `gain = targetLevel / currentLevel`). Ryzyko: „pumping” przy zbyt agresywnej korekcji. |
| **C. FFmpeg – loudnorm przy uploadzie** | Plik jest normalizowany do stałego poziomu (np. -14 LUFS) przed zapisem. Brak korekcji w czasie odtwarzania, ale pliki są już wyrównane. |

**Rekomendacja:** A – `DynamicsCompressorNode` jest natywny, prosty w użyciu i daje efekt „auto gain” (kompresja dynamiki). Przykład:

```javascript
const compressor = ctx.createDynamicsCompressor();
compressor.threshold.value = -24;  // dB
compressor.knee.value = 30;
compressor.ratio.value = 12;
compressor.attack.value = 0.003;
compressor.release.value = 0.25;
source.connect(compressor);
compressor.connect(ctx.destination);
```

---

## 3. Integracja z obecnym kodem

- **Master volume** (admin-pwa) – pozostaje jako mnożnik końcowy.
- **Normalizacja per-plik** – można dodać opcję w edytorze Samplera / Śpiewaj Dalej: „Normalizuj głośność” – przy pierwszym odtworzeniu pliku mierzony jest peak, zapisywany w konfiguracji (np. `samples[].normalizedGain`), stosowany przy kolejnych odtworzeniach.
- **Auto gain (kompresor)** – można dodać przełącznik w ustawieniach trybu muzycznego: „Auto gain (kompresja)” – włącza `DynamicsCompressorNode` w łańcuchu audio.

---

## 4. Uwagi

- **Electron vs przeglądarka:** W dokumencie `AUDIO_KONFLIKTY_PRZEGLADARKA_VS_APLIKACJA.md` jest informacja, że GainNode w Electronie powodował brak dźwięku w niektórych trybach – naprawiono przez użycie `HTMLAudioElement.volume`. Przy dodawaniu `DynamicsCompressorNode` trzeba przetestować w obu środowiskach.
- **Familiada** – ma własny `familiada_volume`, nie używa globalnego `master_volume`. Normalizacja/auto gain w Familiadzie wymagałaby osobnej implementacji.
