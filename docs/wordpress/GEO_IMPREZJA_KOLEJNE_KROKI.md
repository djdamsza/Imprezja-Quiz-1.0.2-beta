# Imprezja.pl – kolejne kroki po audycie GEO (AI Search)

Pliki pomocnicze w tym katalogu: **`imprezja-pl-llms.txt`** (treść do wgrania jako `/llms.txt`).

---

## 1. Bing Webmaster Tools (zalecane: ChatGPT Search opiera się m.in. na Bing)

1. Wejdź na [Bing Webmaster Tools](https://www.bing.com/webmasters).
2. Dodaj witrynę **`https://imprezja.pl`** (weryfikacja: plik HTML, meta tag lub DNS – jak w instrukcji Bing).
3. **Submit** lub zaimportuj **sitemap**: `https://imprezja.pl/sitemap_index.xml` (albo główny plik sitemap z Yoast/Rank Math).
4. Co jakiś czas sprawdzaj **URL Inspection** i ewentualne błędy indeksowania.

---

## 2. Plik `llms.txt` w katalogu głównym WordPress

**Docelowy publiczny adres:** `https://imprezja.pl/llms.txt`

1. Skopiuj treść z **`imprezja-pl-llms.txt`** w tym folderze.
2. W WordPressie:
   - **Opcja A:** FTP / menedżer plików hostingu – wgraj plik `llms.txt` do **katalogu głównego** witryny (tam gdzie leży `wp-config.php` lub `index.php` strony głównej – zależy od hostingu).
   - **Opcja B:** Wtyczka typu „File Manager” lub „Add From Server” – ten sam katalog.
   - **Opcja C:** Jeśli nie możesz dodać pliku w root – niektóre hosty mapują domenę na `/public_html` – plik musi być **obok** głównego `index.php` strony `imprezja.pl`.
3. Sprawdź w przeglądarce: `https://imprezja.pl/llms.txt` → powinien zwrócić **200** i plain text.
4. Po zmianach w ofercie – **aktualizuj** linki/sekcje w `llms.txt` (to „skrót” dla modeli).

---

## 3. Wzmianki o marce (Damian Nowaczyk / Imprezja)

To nie jest jedna zmiana w kodzie, tylko **PR i linki zewnętrzne**:

- Profile w **katalogach branżowych** (już macie m.in. Wesele z klasą – utrzymujcie aktualne).
- **Gościnne artykuły**, **wywiady**, **case studies** na portalach weselnych / eventowych z pełną nazwą i linkiem.
- **Spójna nazwa** w NIP/Facebook/Google Business: *Imprezja*, *Damian Nowaczyk* – ułatwia „złączenie encji” w modelach.

---

## 4. Wikidata / Wikipedia

- **Wikipedia** – artykuł tylko przy spełnieniu kryteriów encyklopedyczności (najczęściej **nie** dla pojedynczej firmy DJ bez wyjątkowej notatki prasowej w źródłach niezależnych).
- **Wikidata** – możliwa **encja** (organization / person) z **niezależnymi źródłami** (prasa, oficjalne rejestry); wymaga konta i znajomości modelu danych – warto skonsultować z kimś od Wikidata albo zrobić to samodzielnie po przeczytaniu [Prowadnice Wikidata](https://www.wikidata.org/wiki/Wikidata:Introduction).

To **długotrwały** sygnał; nie blokuje wdrożenia Bing + `llms.txt`.

---

## 5. Krótka checklista

| Krok | Status |
|------|--------|
| Bing Webmaster + sitemap | ☐ |
| Publiczny `https://imprezja.pl/llms.txt` | ☐ |
| Google Rich Results / schema (już macie) | ☐ |
| Aktualizacja `llms.txt` przy większych zmianach oferty | ☐ |
| (Opcjonalnie) Wikidata po zebraniu źródeł | ☐ |
