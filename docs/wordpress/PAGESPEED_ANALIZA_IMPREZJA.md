# PageSpeed Insights – analiza imprezja.pl

**Data:** 19 lutego 2026

**Nowy raport (20.02.2026):** Zobacz `PAGESPEED_IMPREZJA_20-02-2026.md` – fetchpriority dla LCP, rozmiary obrazów, cache.

**Aktualizacja (20.02.2026):** Zamiana obrazu na WebP → **97%** na mobile i desktop. ✅

---

## Wyniki

| | Desktop | Mobile |
|---|---------|--------|
| **Performance** | **97** (świetnie) | **97** (świetnie) ✅ |
| FCP | 0,6 s | ~1 s |
| TBT | 0 ms | poprawione |
| Speed Index | 0,6 s | poprawione |
| LCP | 1,3 s | poprawione (WebP) |
| CLS | 0 | 0 |

**Wniosek:** Zamiana obrazu hero na WebP rozwiązała problem LCP. Strona ~97% na mobile i desktop.

---

## Priorytet 1: Obrazy (szac. oszczędność ~693 KiB)

### Problem
- **JR-344-2.jpg** – 897 KiB (blok UAGB) → **brak WebP** – blok może używać tła/cover, omija optymalizację. Zobacz `NAPRAWA_OBRAZOW_PAGESPEED.md`
- **453...n-1.jpg** (hero) – ✅ już AVIF 32 KiB (było 105 KiB JPEG)

### Co zrobić
1. **LiteSpeed Cache** → Image Optimization → włącz **WebP** (lub AVIF)
2. **Ręcznie:** skompresuj obrazy przed wgraniem – [TinyPNG.com](https://tinypng.com/) lub [Squoosh.app](https://squoosh.app/)
3. Dla hero na stronie głównej – użyj mniejszego rozmiaru na mobile (responsive images)

---

## Priorytet 2: Zasoby blokujące renderowanie (~300 ms)

### Problem
- CSS (58 KiB) – blokuje pierwsze wyświetlenie
- Google Fonts (fonts.googleapis.com) – 780 ms

### Co zrobić
1. **LiteSpeed** → Page Optimization → **Load CSS Asynchronously** (jeśli strona wygląda OK)
2. **Google Fonts** – rozważ:
   - Hostowanie fontów lokalnie (wtyczka „OMGF” lub „Local Google Fonts”)
   - Lub `font-display: swap` – font ładuje się w tle, tekst widać od razu

---

## Priorytet 3: CookieYes (~34 KiB „zmarnowanych” bajtów)

### Problem
Skrypt `cdn-cookieyes.com` ładuje dużo kodu, z którego strona nie korzysta.

### Co zrobić
1. **CookieYes** → ustawienia – sprawdź czy można **odłożyć ładowanie** (defer) – banner nie musi blokować strony
2. Lub rozważ lżejszą alternatywę (np. własny prosty banner cookies)
3. **LiteSpeed** → JS Options → wyklucz cookieyes z minifikacji, ale dodaj **Defer** (testuj!)

---

## Priorytet 4: reCAPTCHA i YouTube (duże obciążenie CPU)

### Problem
- **reCAPTCHA** – ~866 ms CPU (ciężki skrypt)
- **YouTube embed** – ~1340 ms CPU łącznie

### Co zrobić
1. **reCAPTCHA** – ładuj tylko gdy użytkownik otworzy formularz (lazy load) – wymaga zmiany w formularzu
2. **YouTube** – użyj **lite-youtube** lub ładuj iframe dopiero po kliknięciu (thumbnail + play) – oszczędza ~1 s na mobile
3. Jeśli YouTube jest na stronie głównej – rozważ przeniesienie na osobną podstronę

---

## Priorytet 5: Główny wątek (Main Thread)

### Problem
- imprezja.pl (HTML + inline JS): 952 ms
- Różne skrypty WordPress: 483 ms, 369 ms

### Co zrobić
1. **LiteSpeed** → JS Minify + **Load JS Deferred** (testuj – formularz musi działać!)
2. Usuń nieużywane wtyczki (mniej skryptów)
3. **LiteSpeed** → „Exclude JS” – wyklucz reCAPTCHA, CookieYes z defer jeśli się psują

---

## Status optymalizacji obrazów (weryfikacja 19.02.2026)

| Obraz | Lokalizacja | JPEG | WebP/AVIF (Chrome) | Status |
|-------|-------------|------|--------------------|--------|
| **JR-344-2.jpg** | blok UAGB (tło/cover) | **897 KiB** | 897 KiB (brak konwersji) | ❌ **Do naprawy** |
| hero (453...n-1.jpg) | strona główna LCP | 105 KiB | **32 KiB** AVIF | ✅ OK |
| 525943983...jpg | strona główna | 231 KiB | AVIF | ✅ OK |
| PM-330-edited.jpg | strona główna | 163 KiB | **45 KiB** WebP | ✅ OK |
| 7C1A0173-edited.jpg | strona główna | 30 KiB | 30 KiB | ✅ OK (mały) |
| dsc06200-1024x683.jpg | /o-mnie/ | 95 KiB | AVIF | ✅ OK |

**Wniosek:** JR-344-2 i hero mogą omijać optymalizację (blok UAGB, konflikt wtyczek). Zobacz `NAPRAWA_OBRAZOW_PAGESPEED.md`.

---

## Kolejność działań (od najprostszych)

| # | Działanie | Szac. efekt | Trudność |
|---|-----------|-------------|----------|
| 1 | ~~LiteSpeed – włącz WebP dla obrazów~~ | ✅ Działa | — |
| 2 | **JR-344-2:** zmień blok / skompresuj ręcznie. Rozwiąż konflikt LiteSpeed vs Converter for Media | ~620 KiB mniej | Średnia |
| 3 | LiteSpeed – Load CSS Asynchronously | ~300 ms | Średnia (testuj) |
| 4 | CookieYes – defer / odłóż ładowanie | Mniej TBT | Średnia |
| 5 | YouTube – lazy load (thumbnail + klik) | ~1 s | Trudniejsza |
| 6 | reCAPTCHA – ładowanie przy focus formularza | Mniej TBT | Trudniejsza |

---

## Podsumowanie

**Desktop 97** – zostaw w spokoju.

**Mobile 39** – główne przyczyny:
1. **Obrazy** – za duże, brak WebP
2. **LCP 19,2 s** – hero image + wolne połączenie
3. **TBT 720 ms** – CookieYes, reCAPTCHA, YouTube
4. **CSS/Fonts** – blokują renderowanie

Zacznij od **obrazów** i **LiteSpeed WebP** – to da największy efekt przy najmniejszym wysiłku.
