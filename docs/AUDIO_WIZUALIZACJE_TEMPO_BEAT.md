# Audio dla wizualizerów – źródła, tempo, beat detection

## 1. Źródła dźwięku

Wszystkie wizualizacje w trybie Prezentacja używają **mikrofonu** (`getUserMedia({ audio: true })`):

| Wizualizacja | Źródło | Opis |
|--------------|--------|------|
| **Milkdrop (Butterchurn)** | Mikrofon → GainNode (+10 dB) → Butterchurn | Butterchurn analizuje spektrum (bass, mid, treb), presety reagują na `sounda`, `soundb` itd. |
| **Winamp (tunel)** | Mikrofon → AnalyserNode | Beat detection (40–150 Hz) → skala logo |
| **Webvs AVS** | Mikrofon → Webvs | WAVEFORM, SPECTRUM |
| **Equalizer, Spektrum, LED** | Mikrofon → audioMotion | AnalyserNode |
| **Logo bouncer** | Mikrofon → AnalyserNode | Beat detection (40–150 Hz) → skala obrazka |

**Alternatywne źródło:** Na Macu można użyć **BlackHole** – przekierowanie dźwięku z oprogramowania DJ (Serato, Virtual DJ) do mikrofonu. Patrz `docs/PREZENTACJE_WIZUALIZACJA_DJ.md`.

---

## 2. Beat detection (logo bouncer, Winamp)

### Parametry (prezentacja-screen.html)

| Parametr | Wartość | Znaczenie |
|----------|---------|-----------|
| **BEAT_HOLD_MS** | 400 | Min. odstęp między beatami (ms). 400 ms ≈ max 150 BPM – wspiera 140 BPM (częste na imprezach) |
| **MIN_DELTA** | 20 | Min. skok amplitudy (0–255) do uznania za beat |
| **BEAT_DECAY** | 0.97 | Wolniejszy spadek progu – mniej fałszywych beatów |
| **Pasmo** | 40–150 Hz | Bass (kick, bas) |
| **ARM_THRESH** | 50 | Próg „uzbrojenia” – musi być muzyka |
| **ARM_TIMEOUT_MS** | 2000 | Po 2 s ciszy – detektor się wyłącza |

### Zakres tempa 80–160 BPM

- **80 BPM** → 750 ms między beatami
- **160 BPM** → 375 ms między beatami
- **BEAT_HOLD_MS = 400** → max ~150 BPM – wspiera 140 BPM (częste na imprezach), ogranicza „szaleństwo” (wcześniej 220 ms ≈ 272 BPM)

Szybsze tempo (np. 180 BPM) jest obsługiwane, ale detektor nie będzie generował beatów częściej niż co 450 ms – efekt zbliżony do „standardowej prędkości”.

---

## 3. Milkdrop (Butterchurn) – prędkość animacji

### Problem

Milkdrop presety używają zmiennej `time`, która rośnie w każdej klatce. Przy 60 fps animacja może wyglądać na „odklejoną” od tempa muzyki – zbyt szybka.

### Rozwiązanie

- **Throttle renderu:** 30 fps zamiast 60 fps – animacja ~2× wolniejsza
- **Gain:** +10 dB – umiarkowane wzmocnienie (mniej „szaleństwa” niż +12 dB)

### Zmienne w presetach Milkdrop

- `time` – czas (rośnie co klatkę)
- `bass`, `mid`, `treb` – poziomy z analizy audio
- `frame` – numer klatki

Butterchurn nie ma API do skalowania czasu – throttle fps jest jedynym sposobem spowolnienia bez modyfikacji biblioteki.

---

## 4. Możliwe ulepszenia

| Podejście | Opis | Złożoność |
|-----------|------|-----------|
| **BPM detection** | Zewnętrzna biblioteka (np. `soundtouch`, `aubio`) – analiza BPM z audio | Wysoka |
| **Regulacja VIZ_TARGET_FPS** | Ustawienie w edytorze (24/30/45/60 fps) | Niska |
| **Regulacja BEAT_HOLD_MS** | Ustawienie w edytorze (zakres 80–160 BPM) | Niska |
| **Źródło audio – line-in** | Wybór mikrofonu vs systemowego audio (Electron) | Średnia |

---

## 5. Pliki

- `public/prezentacja-screen.html` – beat detection (logo bouncer), runMilkdrop, runWinamp, runWebvs
- `docs/GLOSNOSC_NORMALIZACJA_AUTO_GAIN.md` – normalizacja głośności
- `docs/PREZENTACJE_WIZUALIZACJA_DJ.md` – BlackHole dla DJ-a
