# Imprezja Quiz – wbudowanie w WordPress

## Szybki start

1. **Sekcja pobierania** – skopiuj zawartość `01-pobierz.html` i wklej jako blok „Własny HTML” na stronie głównej lub utwórz stronę „Pobierz”.
2. **FAQ** – skopiuj `02-faq.html` → nowa strona → dodaj blok „Własny HTML” → wklej.
3. **Polityka prywatności (RODO)** – skopiuj `03-polityka-prywatnosci.html` → nowa strona.
4. **Polityka cookies** – skopiuj `04-polityka-cookies.html` → nowa strona.
5. **Regulamin** – skopiuj `05-regulamin.html` → nowa strona.

## Struktura stron w WordPress

| Strona | Plik | Uwagi |
|--------|------|-------|
| Pobierz (lub sekcja na stronie głównej) | 01-pobierz.html | Linki do GitHub Releases |
| FAQ | 02-faq.html | Najczęściej zadawane pytania |
| Polityka prywatności | 03-polityka-prywatnosci.html | RODO – wymagane prawnie |
| Polityka cookies | 04-polityka-cookies.html | Wymagana przy używaniu cookies |
| Regulamin | 05-regulamin.html | Warunki sprzedaży/licencji |
| **Pasek z linkami** | 06-pasek-linkow.html | Menu z linkami (FAQ, RODO, cookies, regulamin, kontakt) – wstaw **pod** sekcją pobierania |

## Jak wkleić w WordPress (Gutenberg)

1. Otwórz stronę do edycji.
2. Kliknij **+** (dodaj blok).
3. Wyszukaj **„Własny HTML”** lub **„Custom HTML”**.
4. Wklej zawartość pliku .html.
5. Zapisz i opublikuj.

## Aktualizacja linków do pobrania

Gdy stworzysz nowy Release na GitHubie (np. v1.0.3), zaktualizuj linki w `01-pobierz.html`:
- Zamień `1.0.2` na `1.0.3` w adresach URL.
- Zamień nazwy plików w tekście.

## Footer / stopka

Dodaj w stopce strony linki do:
- Polityka prywatności
- Polityka cookies
- Regulamin
- FAQ
- Kontakt: biuro@imprezja.pl

## Grafiki

W folderze `docs/wordpress/grafiki/` znajdziesz:
- **imprezja-hero-banner.png** – baner na górę strony (nad pobieraniem)
- **imprezja-icon.png** – ikona / logo
- **imprezja-dj-promo.png** – „QUIZ DLA DJ-ÓW I WODZIREJÓW” – do social media

Przed wstawieniem na stronę warto skompresować pliki (TinyPNG, Squoosh) – oryginały są duże (~5 MB).

---

## Pełna wersja treści

Jeśli potrzebujesz pełnej treści FAQ (wszystkie pytania) lub dłuższych wersji dokumentów prawnych, są one w folderze `docs/`:
- `docs/FAQ.md` – pełny FAQ (można skonwertować do HTML)
- `docs/POLITYKA_PRYWATNOSCI.md` – pełna polityka prywatności
- `docs/POLITYKA_COOKIES.md` – pełna polityka cookies
- `docs/REGULAMIN.md` – pełny regulamin
