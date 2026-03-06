# Audyt imprezja.pl – luty 2025

Analiza na podstawie kodu źródłowego strony. Masz FTP i panel WP – możesz wprowadzić zmiany.

---

## Stan techniczny

| Metryka | Wartość |
|---------|---------|
| Rozmiar HTML (strona główna) | ~160 KB |
| Pliki CSS (link) | 22 |
| Skrypty JS | 31 |
| Czas odpowiedzi serwera | ~0,1 s (OK) |

---

## Wtyczki wykryte na stronie

| Wtyczka | Użycie | Rekomendacja |
|---------|--------|--------------|
| **Kadence Blocks** | Galeria, formularz, karuzela | Zostaw – używana |
| **Ultimate Addons (Spectra/UAG)** | Bloki, mapa Google | Zostaw – używana |
| **Blocksy Companion Pro** | Motyw Pro (video, divider) | Zostaw – rozszerza motyw |
| **FileBird Pro** | Galeria (filebird-block) | Sprawdź – czy galeria na stronie używa FileBird |
| **SP Blog Designer** | Slick carousel, style bloga | Sprawdź – czy masz blog/aktualności |
| **Yoast SEO** | Meta, schema | Zostaw |
| **Site Kit (Google)** | Analytics, Tag Manager | Zostaw |
| **CookieYes** | Banner cookies | Zostaw |
| **Microsoft Clarity** | Heatmapy | Zostaw (jeśli używasz) |

**Motyw:** Blocksy

---

## Problemy do naprawy

### 1. Duplikacja builderów blokowych
- **Kadence Blocks** + **Spectra (UAG)** = dwa zestawy bloków
- Sprawdź w edytorze stron: czy wszystkie bloki pochodzą z jednego źródła
- Jeśli np. galeria jest z Kadence, a mapa ze Spectra – zostaw obie
- Jeśli coś jest tylko z jednej wtyczki – rozważ usunięcie drugiej (test na kopii!)

### 2. Blok „Terminarz” ukryty (z poprzedniego audytu)
- Klasy: `uag-hide-desktop`, `uag-hide-tab`, `uag-hide-mob`
- **Efekt:** kalendarz niewidoczny na wszystkich urządzeniach
- **Naprawa:** Edytor strony → blok z kalendarzem → ustawienia widoczności → usuń „Ukryj na” lub zostaw tylko mobile

### 3. Ogromny inline CSS (global-styles)
- WordPress ładuje dziesiątki presetów kolorów i gradientów (większość nieużywana)
- To standard WP 6.x – trudno zmniejszyć bez zmiany motywu
- **Opcja:** motyw Blocksy ma ustawienia – wyłącz nieużywane „block patterns” jeśli są

### 4. SP Blog Designer
- Ładuje Slick carousel (slider)
- **Pytanie:** Czy masz blog/aktualności na imprezja.pl?
- Jeśli NIE – dezaktywuj i usuń **sp-blog-designer**

### 5. FileBird Pro
- Używany do galerii w blokach
- **Pytanie:** Czy galeria na stronie używa FileBird?
- W edytorze: blok galerii → sprawdź czy to „FileBird Gallery”
- Jeśli używasz Kadence Gallery – FileBird może być zbędny

---

## Kroki w panelu WordPress (FTP nie jest potrzebne na start)

### Krok 1: Backup
- Wtyczka **UpdraftPlus** lub backup z panelu hostingu
- Pełna kopia przed zmianami

### Krok 2: Lista wtyczek
- **Wtyczki** → Zainstalowane
- Zrób listę: nazwa, aktywna/nieaktywna
- Dla nieaktywnych: czy na pewno nie potrzebujesz? → usuń

### Krok 3: Sprawdź Terminarz
- **Strony** → edytuj stronę główną
- Znajdź blok z kalendarzem Google
- Ustawienia bloku → „Ukryj na” → usuń wszystkie lub zostaw tylko „Mobile”

### Krok 4: Test SP Blog Designer
- Dezaktywuj **SP Blog Designer**
- Odśwież stronę – czy coś się zepsuło?
- Jeśli nie – usuń wtyczkę

### Krok 5: Test FileBird
- Jeśli galeria używa Kadence – dezaktywuj FileBird
- Sprawdź stronę z galerią – czy działa
- Jeśli nie – włącz z powrotem

### Krok 6: Yoast – fraza kluczowa
- Edytor strony głównej → panel Yoast (prawa kolumna)
- Ustaw frazę np. „DJ wodzirej wesele” lub „DJ na wesele”

### Krok 7: Cache
- Jeśli masz **LiteSpeed** lub inny cache – po zmianach: **Purge All**
- Sprawdź czy formularz kontaktowy nadal działa

---

## Co sprawdzić przez FTP (opcjonalnie)

### Folder `wp-content/plugins/`
- Wylistuj foldery – każdy = wtyczka (aktywna lub nie)
- Usunięte wtyczki czasem zostawiają puste foldery – można usunąć

### Folder `wp-content/uploads/`
- Duże pliki (np. > 500 KB) – warto skompresować
- Stare wersje obrazków (np. `-scaled`, `-150x150`) – WordPress je tworzy, nie usuwaj ręcznie

### Plik `wp-config.php`
- `WP_DEBUG` – w produkcji powinno być `false`
- `WP_DEBUG_LOG` – `false`

---

## Podsumowanie priorytetów

| Priorytet | Działanie | Czas |
|-----------|-----------|------|
| 1 | Backup | 5 min |
| 2 | Napraw Terminarz (ukryty blok) | 5 min |
| 3 | Usuń nieaktywne wtyczki | 10 min |
| 4 | Test: dezaktywuj SP Blog Designer | 5 min |
| 5 | Yoast – fraza kluczowa | 2 min |
| 6 | WP-Optimize – czyszczenie bazy | 10 min |
| 7 | Cache – Purge All | 1 min |

**Szacowany czas:** ok. 40 minut

---

## Po zmianach

- Test formularza kontaktowego
- Test na telefonie
- [PageSpeed Insights](https://pagespeed.web.dev/) – wpisz imprezja.pl
