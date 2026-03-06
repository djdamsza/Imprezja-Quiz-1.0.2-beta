# PageSpeed Insights – imprezja.pl (20 lutego 2026)

**Raport:** 20 lut 2026, 15:46 | Mobile (Moto G Power, 4G)

**Aktualizacja:** Zamiana obrazu na WebP → **97%** na mobile i desktop. ✅

---

## Wyniki (przed optymalizacją)

| Metryka | Wartość | Ocena |
|---------|---------|-------|
| **Wydajność** | **49** → **97** ✅ | Słabo → Świetnie |
| **Ułatwienia dostępu** | 95 | Dobrze |
| **Sprawdzone metody** | 69 | Średnio |
| **SEO** | 100 | Świetnie |

| Metryka | Wartość |
|---------|---------|
| FCP | 0,9 s |
| LCP | **6,5 s** |
| TBT | **1050 ms** |
| CLS | 0 |
| Speed Index | 6,3 s |

---

## Priorytet 1: Obraz LCP – fetchpriority + rozmiar

### Problem
- Obraz hero (453...n-1-1.jpg) – **78,6 KiB**, wyświetlany 634×423, plik 960×568
- **Lazy loading** na obrazie LCP – spowalnia wykrycie LCP
- Brak `fetchpriority="high"`

### Rozwiązanie
1. **fetchpriority="high"** – dodaj do obrazu LCP w bloku UAGB/Gutenberg
2. **loading="eager"** – NIE używaj lazy loading dla obrazu above-the-fold (hero)
3. **Responsive** – użyj mniejszego rozmiaru (np. 640×427) na mobile – oszczędność ~31 KiB

**Gdzie:** Edytor strony głównej → blok z obrazem „kreatywne prowadzenie imprez” → ustaw loading="eager", fetchpriority="high". W UAGB/Spectra może być w ustawieniach bloku.

---

## Priorytet 2: Logo – za duży rozmiar

### Problem
- logo-imprezja-zlote-768x249.png (18,1 KiB) wyświetlane 297×96
- Oszczędność: ~15 KiB – użyj 300×97 lub podobnego

### Rozwiązanie
- Wgraj wersję 300×97 do Media Library
- Lub w motywie (Blocksy) ustaw mniejszy rozmiar logo w nagłówku
- Regenerate Thumbnails jeśli dodajesz nowy rozmiar

---

## Priorytet 3: Cache zewnętrznych skryptów (32 KiB)

| Źródło | Rozmiar | Cache |
|--------|---------|-------|
| trustindex.io | 21 KiB | None |
| clarity.js (Microsoft) | 26 KiB | 1 dzień |
| doubleclick.net | 1 KiB | 15 min |
| gstatic.com | 3 KiB | 7 dni |

**Uwaga:** Trustindex i Clarity – nie masz kontroli nad ich cache. Można:
- Odłożyć ładowanie (defer) – ładuj po załadowaniu strony
- Rozważyć usunięcie Clarity jeśli nie jest krytyczny

---

## Priorytet 4: font-display (10 ms)

Google Fonts – ustaw `font-display: swap` lub `optional`.

**Wtyczka OMGF** lub **Local Google Fonts** – hostuj fonty lokalnie z `font-display: swap`.

---

## Priorytet 5: Wymuszone przeformatowania (110 ms)

- **YouTube** (www-embed-player) – 86 ms
- **8e6d66f….js** (imprezja.pl) – 41 ms

**YouTube:** Użyj lite-youtube (thumbnail + klik) zamiast pełnego embed – duża oszczędność.

---

## Priorytet 6: Nieużywany kod

- **JavaScript:** 1149 KiB do usunięcia/optymalizacji
- **CSS:** 133 KiB nieużywane

**LiteSpeed** → JS/CSS Minify, Load Deferred. Wyklucz skrypty które się psują.

---

## Ułatwienia dostępu (95)

- **Kontrast** – kolory tła i tekstu mają niewystarczający kontrast
- **Nagłówki** – elementy h1–h6 nie w kolejności malejącej

---

## Sprawdzone metody (69)

- Pliki cookie innych firm (4)
- Błędy w konsoli przeglądarki
- Obrazy o niepoprawnym współczynniku proporcji
- CSP, HSTS, COOP, XFO – zabezpieczenia (opcjonalne, wymagają konfiguracji serwera)

---

## Kolejność działań

| # | Działanie | Szac. efekt |
|---|-----------|-------------|
| 1 | Obraz LCP: fetchpriority="high", loading="eager" | LCP -1–2 s |
| 2 | Obraz LCP: mniejszy rozmiar na mobile (640px) | ~31 KiB |
| 3 | Logo: wersja 300×97 | ~15 KiB |
| 4 | OMGF / font-display: swap | 10 ms |
| 5 | YouTube: lite-youtube lub lazy load | TBT -500 ms |
| 6 | Odłóż Trustindex, Clarity (defer) | Mniej TBT |

---

## Związek z poprzednią analizą

Zobacz też: `PAGESPEED_ANALIZA_IMPREZJA.md`, `NAPRAWA_OBRAZOW_PAGESPEED.md`
