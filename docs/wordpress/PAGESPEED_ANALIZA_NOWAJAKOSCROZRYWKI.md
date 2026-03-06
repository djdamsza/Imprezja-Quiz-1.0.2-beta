# PageSpeed Insights – analiza nowajakoscrozrywki.pl

**Data:** 20 lutego 2026

---

## Wyniki

| | Mobile (przed) | Mobile (po) |
|---|----------------|-------------|
| **Performance** | 49 | **98** |
| FCP | 9,7 s | **1,7 s** |
| LCP | 12,8 s | **1,8 s** |
| TBT | 280 ms | **0 ms** |
| CLS | 0,084 | **0** |
| Speed Index | 9,7 s | **3,5 s** |

**Kluczowa zmiana:** Wyłączenie **Połącz JS** (Combine JS) – powodowało puste bloki WooCommerce.

---

## Priorytet 1: Konflikt cache + blokujący skrypt edytora

### A) Dwa pluginy cache – konflikt
- **LiteSpeed Cache** – włączony
- **WP Fastest Cache** – włączony

**Działanie:** Zostaw tylko **LiteSpeed Cache**, wyłącz i usuń WP Fastest Cache.

### B) Block editor na froncie (~500 KiB, ~6 s)
Na stronie głównej ładują się skrypty edytora Gutenberga:
- `block-editor.min.js` – 251 KiB
- `components.min.js` – 236 KiB
- `blocks.min.js` – 51 KiB
- `users/me?context=edit` – zapytanie REST API edytora

To nie powinno występować na stronie sklepu. Możliwe przyczyny:
- Blok WooCommerce „Featured Product” lub inny ładuje zależności edytora
- Wtyczka ładuje skrypty edytora na froncie
- Strona jest w trybie „edytuj” dla zalogowanych

**Działanie:**
1. Sprawdź, czy na stronie głównej jest blok „Featured Product” (WooCommerce) – może wymagać optymalizacji
2. LiteSpeed → **Exclude JS** – dodaj np. `block-editor`, `components.min`, `blocks.min` do wykluczeń z defer, jeśli strona się nie psuje
3. Upewnij się, że PageSpeed testuje wersję dla niezalogowanych (tryb incognito)

---

## Priorytet 2: LiteSpeed – optymalizacja JS i CSS

### Render-blocking (~9,6 s)
Wiele plików JS/CSS blokuje renderowanie.

**LiteSpeed Cache → Page Optimization:**
1. **Load JS Deferred** – włącz (Delayed lub Deferred)
2. **Load CSS Asynchronously** – włącz (wymaga QUIC.cloud)
3. **JS Combine** – testuj (może kolidować z WooCommerce)
4. **Exclude JS** – wyklucz: `wc-cart`, `wc-checkout`, `jquery`, reCAPTCHA, Google (accounts.google.com) – jeśli po deferze coś się psuje

---

## Priorytet 3: Skrypty do odłożenia / ograniczenia

| Źródło | Rozmiar | Czas | Uwagi |
|--------|---------|------|-------|
| block-editor.min.js | 251 KiB | 3150 ms | Nie powinien być na froncie |
| components.min.js | 236 KiB | 3300 ms | Zależność edytora |
| Google gsi/client | 91,9 KiB | 3920 ms | reCAPTCHA / logowanie – lazy load |
| tutor.min.css + tutor-front | ~55 KiB | ~2100 ms | Tylko na stronach kursów |
| WooCommerce blocks | ~150 KiB | ~5 s | Ogranicz do stron sklepu/koszyka |

---

## Priorytet 4: LCP – obraz „Imprezja Quiz”

- Obraz LCP: `imprezja-quiz-pro...` (Featured Product)
- **fetchpriority="high"** – brak
- Lazy load – nie stosowany (OK dla LCP)

**Działanie:** Ustaw `fetchpriority="high"` dla obrazu w bloku Featured Product (np. filtr PHP lub ustawienia bloku).

---

## Priorytet 5: Wtyczki – rekomendacje

| Wtyczka | Akcja |
|---------|-------|
| **WP Fastest Cache** | Wyłącz i usuń (zostaw LiteSpeed) |
| **Smush Pro** | Sprawdź konflikt z LiteSpeed Lazy Load – użyj jednej metody |
| **Converter for Media** | OK – zostaw (albo LiteSpeed Image Optimization, nie obie) |
| **reCaptcha** | Lazy load – ładowanie dopiero przy otwarciu formularza |
| **PixelYourSite** | Odłóż ładowanie (defer) |
| **Simple Social Page Widget** | Ładuj tylko tam, gdzie jest widget |

---

## Priorytet 6: WooCommerce – ładowanie bloków

Bloki WooCommerce (cart, checkout, all-products) ładują się na stronie głównej. Jeśli strona główna to sklep z produktami:
- Rozważ **All-in-One WP Migration** lub **Asset CleanUp** – wyłącz niepotrzebne skrypty na wybranych stronach
- Lub **Perfmatters** / **Flying Scripts** – odłożenie wybranych skryptów

---

## Kolejność działań

| # | Działanie | Szac. efekt |
|---|-----------|-------------|
| 1 | Wyłącz WP Fastest Cache (zostaw LiteSpeed) | Mniej konfliktów |
| 2 | LiteSpeed: Load JS Deferred + Load CSS Asynchronously | ~5–8 s |
| 3 | Zidentyfikuj przyczynę block-editor na froncie | ~500 KiB, ~6 s |
| 4 | reCAPTCHA lazy load | ~90 KiB, ~4 s |
| 5 | fetchpriority="high" dla obrazu LCP | Szybszy LCP |
| 6 | Wyklucz zbędne skrypty na stronie głównej (Tutor, część WC) | ~100+ KiB |

---

## Lista wtyczek (24 włączone)

Cache: LiteSpeed, WP Fastest Cache (konflikt)  
Obrazy: Converter for Media, Smush Pro (możliwy konflikt)  
Sklep: WooCommerce, imoje, Flexible Checkout, Payment Methods…  
Kursy: Tutor LMS, Tutor LMS Pro  
Inne: Blocksy Companion, Spectra, reCaptcha, PixelYourSite, Yoast SEO, Site Kit, Lazy Load for Videos, WP YouTube Lyte…

---

## ✅ Podsumowanie (20.02.2026)

**Wynik: 98/100** – strona działa szybko.

**Co pomogło:**
- Wyłączenie **Połącz JS** (Combine JS) – przywróciło zawartość bloków WooCommerce
- Wyłączenie Object Cache (Redis nie działał)
- Dostosowanie ustawień LiteSpeed

**Opcjonalne dalsze poprawki (~600 ms):**
- LiteSpeed: **Load CSS Asynchronously** (jeśli QUIC.cloud OK) – zmniejszy render-blocking 113 KiB CSS
- Yoast SEO: dodaj **metaopis** dla strony głównej (SEO 92→100)
- Kontrast kolorów (Ułatwienia dostępu 95)
