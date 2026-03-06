# Optymalizacja WordPress – imprezja.pl

Przewodnik krok po kroku: porządki po wtyczkach, wydajność i utrzymanie.

---

## CZĘŚĆ 1: Audyt i porządki (najpierw to!)

### Krok 1.1: Lista wtyczek

1. **WordPress Admin** → **Wtyczki** → **Zainstalowane wtyczki**
2. Zrób zrzut ekranu lub zapisz listę (nazwa, status: aktywna/nieaktywna)
3. Dla każdej wtyczki zadaj pytanie: **„Czy naprawdę jej używam?”**

### Krok 1.2: Wtyczki do usunięcia

Usuń (dezaktywuj → usuń) wtyczki, które:
- są **nieaktywne** od miesięcy
- zostały zastąpione innymi (np. dwa cache’e, dwa formularze)
- nie pamiętasz, po co je dodałeś
- mają rating < 4.0 lub nie są aktualizowane od roku

**Uwaga:** Przed usunięciem zrób **kopię zapasową** (backup) strony!

### Krok 1.3: Porządki w bazie danych

Po usunięciu wtyczek w bazie często zostają stare tabele i opcje.

**Opcja A – wtyczka do sprzątania (najprostsza):**
- Zainstaluj **WP-Optimize** lub **Advanced Database Cleaner**
- Uruchom „Usuń dane po usuniętych wtyczkach”
- Usuń stare rewizje (np. zostaw ostatnie 5)
- Uruchom optymalizację tabel

**Opcja B – ręcznie (jeśli masz phpMyAdmin):**
- Nie usuwaj tabel ręcznie – ryzyko błędu
- Lepiej użyj wtyczki z punktu A

### Krok 1.4: Motyw i bloki

- Z audytu: używasz **Spectra (UAG)** i prawdopodobnie **Kadence**
- Sprawdź, czy **nie masz dwóch blokowych builderów** – jeśli tylko Spectra, usuń Kadence Blocks (jeśli nie używasz)
- Upewnij się, że blok „Terminarz” nie ma ustawień `uag-hide-desktop`, `uag-hide-tab`, `uag-hide-mob` (patrz AUDYT_IMPREZJA.md)

---

## CZĘŚĆ 2: Wydajność (Performance)

### Krok 2.1: Cache (LiteSpeed)

Masz już LiteSpeed Cache – sprawdź:

- **Cache** → włączone dla strony głównej, stron, postów
- **Ekskluzje** – wyklucz strony z formularzem (np. kontakt) – cache może blokować wysyłanie
- **Purge** – po każdej zmianie treści: **Purge All** (lub w górnym pasku: „Wyczyść cache”)

### Krok 2.2: Obrazy

- **Obrazy przed wgraniem:** kompresuj (TinyPNG, Squoosh) – oryginały ~5 MB to za dużo
- **Format:** WebP – LiteSpeed może automatycznie konwertować (Image Optimization)
- **Lazy loading:** włącz w LiteSpeed (Image Optimization → Lazy Load)

### Krok 2.3: CSS i JavaScript

- **LiteSpeed** → **Page Optimization**:
  - **CSS Minify** – włącz
  - **JS Minify** – włącz (testuj – czasem psuje formularze)
  - **Load CSS Asynchronously** – włącz (może poprawić LCP)
  - **Load JS Deferred** – włącz (jeśli strona działa poprawnie)

### Krok 2.4: Hosting

- **PHP:** jeśli hosting pozwala, ustaw PHP 8.1 lub 8.2 (szybsze niż 7.x)
- **CDN:** jeśli masz dużo odwiedzin z różnych krajów – Cloudflare (darmowy) przyspiesza

---

## CZĘŚĆ 3: Minimalne zestawienie wtyczek

| Cel | Wtyczka | Uwagi |
|-----|---------|-------|
| Cache | LiteSpeed Cache | Już masz |
| SEO | Yoast SEO | Ustaw frazę kluczową |
| Formularz | Contact Form 7 / WPForms | Wystarczy jedna |
| Bezpieczeństwo | Wordfence / iThemes Security | Jedna |
| Backup | UpdraftPlus / BackWPup | Regularne kopie |
| Recenzje | Trustindex | Już masz |
| reCAPTCHA | Wtyczka reCAPTCHA | Już masz |

**Unikaj:** wielu wtyczek do tego samego (np. 2× cache, 2× SEO).

---

## CZĘŚĆ 4: Checklist przed uruchomieniem optymalizacji

- [ ] Zrób backup (pełna kopia + baza)
- [ ] Zapisz listę aktywnych wtyczek
- [ ] Sprawdź, czy formularz kontaktowy działa
- [ ] Sprawdź, czy strona działa na mobile

---

## CZĘŚĆ 5: Kolejność działań (zalecana)

1. **Backup** (np. UpdraftPlus – pełna kopia)
2. **Usuń nieużywane wtyczki** (dezaktywuj → usuń)
3. **WP-Optimize** – wyczyść bazę
4. **LiteSpeed** – sprawdź ustawienia cache i optymalizacji obrazów
5. **Yoast** – ustaw frazę kluczową
6. **Sprawdź stronę** – formularz, mobile, wszystkie podstrony
7. **Test szybkości** – [PageSpeed Insights](https://pagespeed.web.dev/) – wpisz imprezja.pl

---

## CZĘŚĆ 6: Jeśli masz dostęp do plików (FTP/SFTP)

Możesz sprawdzić:

- `wp-content/plugins/` – ile folderów (każda wtyczka = folder)
- `wp-content/uploads/` – czy są stare, duże pliki
- `wp-config.php` – czy nie ma `WP_DEBUG` na true (w produkcji powinno być false)

---

## Potrzebujesz pomocy?

- **Hosting:** zapytaj support, czy mają LiteSpeed, PHP 8.x, optymalizację
- **Backup:** wiele hostów ma automatyczne backup – sprawdź panel
- **Problemy po zmianach:** przywróć backup i zmieniaj po jednej rzeczy naraz
