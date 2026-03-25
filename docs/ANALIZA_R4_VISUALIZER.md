# Analiza R4 Visualizer – możliwości wykorzystania w Imprezja Quiz

**Cel:** Sprawdzenie, czy R4 Visualizer (darmowy, 200+ scen 3D) da się wykorzystać w webowym wizualizerze Imprezji.

---

## 1. Co to jest R4

- **Twórca:** Gordon Williams (RabidHaMsTeR.Org)
- **Strona:** https://www.rabidhamster.org/R4/
- **Pobieranie:** https://www.rabidhamster.org/R4/download.php
- **Wersja:** R4 v1.25 (Windows .exe)
- **Licencja:** Darmowy do użytku niekomercyjnego. Na imprezach zarobkowych wymagana rejestracja / kontakt z twórcą.

**Funkcje:**
- 200+ wbudowanych scen 3D (OpenGL)
- Pliki scen `.r4` – własny format z modułami (TEXTURE, MEDUSA, SNAKECUBE, TUNNEL itd.)
- Skrypt w stylu C do sterowania reakcją na dźwięk
- Wbudowany serwer WWW do zdalnego sterowania
- R4Construct – narzędzie do tworzenia scen (źródło: `r4construct_r1.zip`)

---

## 2. Czy istnieje wersja webowa R4?

**Nie.** Nie ma portu R4 na JavaScript/WebGL ani WebAssembly.

| Źródło | Wynik |
|--------|--------|
| GitHub | Brak repozytorium R4 ani portu webowego |
| Emscripten/WASM | Brak projektu portującego R4 |
| WinampVisWASM | Portuje **klasyczny** wizualizer Winamp (słupki), nie R4 |
| Butterchurn | Port **Milkdrop**, nie R4 |

R4 to zamknięta aplikacja Windows (OpenGL). Licencja zabrania reverse‑engineerowania samego R4 (ale pozwala na reverse‑engineerowanie scen w katalogu `predefine`).

---

## 3. Co jest dostępne

### 3.1 R4Construct – kod źródłowy

- **Plik:** https://www.rabidhamster.org/R4/r4construct_r1.zip
- **Opis:** „visual scene constructor sourcecode R1 BETA”
- **Zastosowanie:** Narzędzie do budowania scen, nie silnik wizualizacji. Można analizować format `.r4`, ale nie daje gotowego silnika do przeglądarki.

### 3.2 Format plików .r4

Sceny są w plikach `.r4` z własną składnią:

```
scene (
   "name" = "Medusa Example";
   "author" = "Your Name";
   SOLID black();
   TEXTURE img();
   MEDUSA med(black,img);
)

void init() { 
   strcpy(img.filename,"envmap_sky.jpg");
}

void render() {
   med.kick = sounda;  // bass
}
```

Moduły: TEXTURE, MEDUSA, SNAKECUBE, TUNNEL, SOLID itd. – specyficzne dla silnika R4. Żeby to odtworzyć w WebGL, trzeba by zaimplementować cały silnik od zera.

### 3.3 Pakiety scen

- **Rovastar's Scene Pack:** https://www.rabidhamster.org/R4/R4UpdateRova1.exe
- **DeviantArt:** https://deviantart.com – wyszukaj „R4 visualization” (sceny .r4)

---

## 4. Możliwe kierunki

### A. Użycie R4 na Windows (nie w przeglądarce)

- Uruchomić R4 na komputerze z Windows
- Ustawić źródło dźwięku (np. Wave Out / Record Master)
- Wyświetlać okno R4 na ekranie / projektorze
- **Ograniczenie:** Działa tylko na Windows, nie w aplikacji webowej.

### B. Kontakt z twórcą – licencja / port

- **Email:** gw@rabidhamster.org lub gfwilliams@rabidhamster.org
- **Pytania:** Czy można użyć R4 na imprezach komercyjnych? Czy jest plan portu webowego? Czy można udostępnić specyfikację formatu `.r4`?
- **Usługi:** Twórca oferuje m.in. custom sceny i „self-contained boxes” dla imprez.

### C. Inspiracja – podobne wizualizacje webowe

- **R4:** 3D, tunele, meduzy, tekstury – wszystko w OpenGL
- **Milkdrop (Butterchurn):** już w Imprezji – 500+ presetów, podobny klimat
- **Orpheus 3D:** https://github.com/wolfkanglim/orpheus3D-music-visualizer – Three.js, MIT
- **Particula:** https://github.com/humprt/particula – cząsteczki, MIT, 2025
- **MusicVisualizer:** https://github.com/LeeBingler/MusicVisualizer – shadery, MIT

---

## 5. Podsumowanie

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy R4 ma wersję webową? | **Nie** |
| Czy da się łatwo dodać R4 do Imprezji? | **Nie** – brak portu |
| Czy można portować R4? | Teoretycznie tak, ale wymagałoby to pełnej implementacji silnika w WebGL |
| Co warto zrobić? | Użyć R4 na Windows lub skontaktować się z twórcą; w webie – rozszerzyć Butterchurn lub dodać inne wizualizacje (Orpheus, Particula itd.) |

---

## 6. Linki

- R4: https://www.rabidhamster.org/R4/
- Pobierz R4: https://www.rabidhamster.org/R4/download.php
- R4Construct: https://www.rabidhamster.org/R4/r4construct_r1.zip
- Tutorial scen: https://www.rabidhamster.org/R4/tut_simple.php
- Jussi's R4 Tutorial (PDF): https://www.rabidhamster.org/R4/R4tut10.pdf
