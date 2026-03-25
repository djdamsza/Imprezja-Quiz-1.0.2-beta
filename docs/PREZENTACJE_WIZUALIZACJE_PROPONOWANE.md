# Propozycje wizualizacji dla trybu Prezentacja

## Kontekst

Prezentacja ma już tło muzyczne (audio w pętli). Można dodać slajdy typu „wizualizacja” – animacje reagujące na muzykę lub efekt wizualny w tle.

---

## Opcja 1: **audioMotion-analyzer** (Equalizer / Spektrum) ⭐ Rekomendowana

**Co to robi:** Rzeczywisty analizator spektrum audio – słupki reagują na muzykę w czasie rzeczywistym (bas, średnie, wysokie).

**Biblioteka:** [audiomotion-analyzer](https://github.com/hvianna/audioMotion-analyzer)  
- ~30 kB (minified), zero zależności  
- Web Audio API + Canvas  
- CDN: `https://cdn.jsdelivr.net/npm/audiomotion-analyzer@4`  
- npm: `npm i audiomotion-analyzer`

**Możliwości:**
- Słupki LED (jak equalizer)
- Skala logarytmiczna / liniowa
- Gradienty kolorów (np. złoty, niebieski)
- Efekt lustra (odbicie)
- Do ~240 pasm częstotliwości
- Pełny ekran

**Integracja:** Nowy typ slajdu „Wizualizacja” → wybór presetów (Equalizer, Spektrum, LED bars). Źródłem audio jest **mikrofon** (getUserMedia) – bez uprawnień wizualizacja się nie wyświetli. Na Macu można użyć BlackHole do przekierowania dźwięku z oprogramowania DJ → patrz `docs/PREZENTACJE_WIZUALIZACJA_DJ.md`.

**Złożoność:** Niska – biblioteka gotowa, trzeba tylko podłączyć `<audio>` i kontener.

---

## Opcja 1b: **Milkdrop (Butterchurn)** ✅ Zaimplementowane

**Co to robi:** Klasyczny wizualizer Milkdrop (Winamp) – 500+ presetów z falami, cząsteczkami, gradientami reagującymi na muzykę w czasie rzeczywistym.

**Biblioteka:** [Butterchurn](https://github.com/jberg/butterchurn) – WebGL 2, ładowana z CDN (esm.sh). Wymaga połączenia z internetem przy pierwszym uruchomieniu.

**Preset w edytorze:** „Milkdrop (klasyczny wizualizer)" – strzałki lub klik zmieniają preset.

---

## Opcja 2: **Winamp (klasyczny)** ✅ Zaimplementowane

**Co to robi:** Klasyczny efekt „lotu przez tunel” – kamerą w głąb, tekstura na ścianach.

**Biblioteka:** Three.js (~150 kB) + własny shader lub gotowy przykład  
- [TWGL.js tunnel](https://twgljs.org/examples/tunnel.html) – lekki  
- [Three.js tunnel demos](https://github.com/pjkarlik/ThreeTunnels)

**Możliwości:**
- Tunel z teksturą (np. zdjęcia z prezentacji)
- Tunel abstrakcyjny (gradient, linie)
- Możliwość synchronizacji z muzyką (prędkość, pulsowanie)

**Integracja:** Nowy typ slajdu „Tunel” → wybór tekstury (obrazek z prezentacji, gradient, szum).

**Złożoność:** Średnia – Three.js to duża biblioteka, trzeba dodać do projektu.

---

## Opcja 3: **Particles.js** (cząsteczki – dawniej Opcja 4)

**Co to robi:** Prosty tunel 2D – koncentryczne okręgi/linie, efekt perspektywy.

**Implementacja:** Własny kod Canvas 2D, ~50–100 linii.  
- Rysowanie linii od środka do krawędzi  
- Animacja „zbliżania” przez skalowanie  
- Opcjonalnie: kolor zależny od „głośności” (Web Audio Analyser)

**Złożoność:** Niska – bez zewnętrznych bibliotek, mały rozmiar.

---

## Opcja 4: **Particles.js / tsParticles** (cząsteczki)

**Co to robi:** Chmura cząsteczek w tle – mogą reagować na dźwięk lub być statyczne.

**Biblioteka:** [tsparticles](https://particles.js.org/) – popularna, dobra dokumentacja.

**Możliwości:**
- Cząsteczki, linie łączące
- Reakcja na ruch myszy
- Możliwość podpięcia do Web Audio (rozmiar/częstotliwość)

**Złożoność:** Średnia.

---

## Opcja 5: **Minimalny equalizer w Canvas** (własna implementacja)

**Co to robi:** Proste słupki reagujące na muzykę – bez zewnętrznych bibliotek.

**Implementacja:** Web Audio API `AnalyserNode` + `getByteFrequencyData()` + rysowanie słupków w Canvas. ~80 linii kodu.

**Złożoność:** Bardzo niska – zero zależności, pełna kontrola.

---

## Rekomendacja

| Priorytet | Opcja | Powód |
|-----------|-------|-------|
| 1 | **audioMotion-analyzer** | Gotowa biblioteka, ładne efekty, mały rozmiar, zero zależności. Idealna do equalizera/spektru. |
| 2 | **Winamp (klasyczny)** | Zaimplementowane. Słupki spektrum, styl retro, zero zależności. |
| 3 | **Własny minimalny equalizer** | Jeśli nie chcesz dodawać bibliotek – szybka implementacja. |

---

## Proponowana struktura w edytorze

Nowy typ slajdu: **„Wizualizacja”**

Presety do wyboru:
- **Equalizer** – słupki LED (audioMotion-analyzer)
- **Spektrum** – wykres częstotliwości (audioMotion-analyzer)
- **Winamp** – klasyczny wizualizer w stylu Winamp 2 (słupki spektrum, zielony gradient)
- **Webvs AVS** – tunel, spektrum, fala
- **Milkdrop** – 500+ presetów (Butterchurn), wymaga WebGL 2 i internetu przy pierwszym ładowaniu

Slajd wizualizacji może być:
- Osobnym slajdem (pełny ekran wizualizacji)
- Nakładką na zdjęciu/filmie (np. equalizer na dole ekranu)

---

## Następny krok

Napisz, którą opcję chcesz wdrożyć jako pierwszą. Sugeruję zacząć od **audioMotion-analyzer** (equalizer) – daje największy efekt przy najmniejszym nakładzie.
