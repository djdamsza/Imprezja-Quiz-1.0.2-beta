# Naprawa dostępu do PDF ofert na imprezja.pl

**Problem:** `https://imprezja.pl/Oferta-impreza-2027-Damian-Nowaczyk.pdf` zwraca 404, mimo że plik jest na serwerze.

---

## Przyczyna

WordPress (i LiteSpeed) przekierowuje **wszystkie** żądania do `index.php`. Jeśli reguły w `.htaccess` nie sprawdzają wcześniej, czy plik fizycznie istnieje, PDF trafia do WordPressa, który zwraca 404 („strona nie istnieje”).

---

## Rozwiązanie 1: Sprawdź lokalizację pliku

**Gdzie jest plik na serwerze?**

- **Opcja A:** W katalogu głównym (obok `index.php`, `wp-config.php`)  
  → URL: `https://imprezja.pl/Oferta-impreza-2027-Damian-Nowaczyk.pdf`  
  → Powinien działać, jeśli `.htaccess` jest poprawny.

- **Opcja B:** W `wp-content/uploads/`  
  → URL: `https://imprezja.pl/wp-content/uploads/Oferta-impreza-2027-Damian-Nowaczyk.pdf`  
  → (lub w podfolderze, np. `uploads/2026/02/`)

**Sprawdź przez FTP/panel:** znajdź plik i zanotuj pełną ścieżkę.

---

## Rozwiązanie 2: Popraw .htaccess

W katalogu głównym WordPressa (tam gdzie `index.php`) otwórz `.htaccess`.

**Reguły WordPress muszą zawierać** (w tej kolejności):

```apache
# BEGIN WordPress
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
# END WordPress
```

**Kluczowe:** `RewriteCond %{REQUEST_FILENAME} !-f` – jeśli plik **istnieje**, nie przekierowuj do `index.php`.

Jeśli masz inne reguły (np. WebP, cache), upewnij się, że **nie blokują** dostępu do `.pdf` i że warunek `!-f` jest **przed** przekierowaniem do `index.php`.

---

## Rozwiązanie 3: Przenieś PDF do wp-content/uploads

Jeśli plik w głównym katalogu nadal nie działa:

1. Przenieś `Oferta-impreza-2027-Damian-Nowaczyk.pdf` do `wp-content/uploads/`
2. Użyj linku: `https://imprezja.pl/wp-content/uploads/Oferta-impreza-2027-Damian-Nowaczyk.pdf`
3. Media WordPress zwykle nie blokują bezpośredniego dostępu do plików w `uploads`

---

## Rozwiązanie 4: LiteSpeed – konfiguracja serwera

Na hostingu z **LiteSpeed** czasem `.htaccess` jest ignorowany lub ma inną kolejność reguł.

1. W panelu hostingu sprawdź, czy jest **LiteSpeed Cache** lub **LiteSpeed Web Server**
2. Jeśli tak – zapytaj hostingu, czy reguły `RewriteCond %{REQUEST_FILENAME} !-f` są respektowane
3. Ewentualnie poproś o włączenie obsługi plików statycznych w katalogu głównym

---

## Szybki test

Po zmianach sprawdź w przeglądarce:

```
https://imprezja.pl/Oferta-impreza-2027-Damian-Nowaczyk.pdf
```

lub (jeśli plik jest w uploads):

```
https://imprezja.pl/wp-content/uploads/Oferta-impreza-2027-Damian-Nowaczyk.pdf
```

---

## Uwaga

**Nie modyfikowałem** `.htaccess` na imprezja.pl w tym projekcie – plik jest na serwerze hostingu. Zmiany trzeba wprowadzić przez FTP lub panel hostingu (np. cPanel → File Manager).
