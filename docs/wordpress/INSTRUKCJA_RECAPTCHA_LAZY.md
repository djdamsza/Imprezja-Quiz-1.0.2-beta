# reCAPTCHA – lazy load (ładowanie przy przewinięciu do formularza)

reCAPTCHA (~866 ms CPU) ładuje się dopiero, gdy użytkownik przewinie do formularza lub go kliknie. Na mobile – duża oszczędność.

---

## Wymagania

- Formularz **Kadence Blocks** (blok Form) z reCAPTCHA v2
- WordPress z możliwością dodania kodu PHP (child theme lub wtyczka)

---

## Instalacja

### Opcja A: Wtyczka „Code Snippets” (najprostsza)

1. Zainstaluj wtyczkę **Code Snippets** (darmowa)
2. **Snippets** → **Add New**
3. **Tytuł:** np. „reCAPTCHA lazy load”
4. W polu **Code** wklej całą zawartość pliku **`recaptcha-lazy-load.php`** (włącznie z `<?php`)
5. **Run snippet everywhere** (lub „Only run in frontend”)
6. **Save Changes** → **Activate**

### Opcja B: Child theme (motyw potomny Blocksy)

1. Jeśli nie masz child theme: **Wygląd** → **Motywy** → **Dodaj** → wyszukaj „Blocksy Child” lub stwórz ręcznie
2. Edytor plików → `functions.php` w child theme
3. Na końcu pliku (przed `?>`) wklej zawartość **`recaptcha-lazy-load.php`**
4. Zapisz

### Opcja C: Wtyczka „WP Code” (dawniej Insert Headers and Footers Pro)

1. **WP Code** → **Code Snippets** → **Add Snippet**
2. **PHP Snippet**
3. Wklej zawartość **`recaptcha-lazy-load.php`**
4. **Activate**

---

## Jak to działa

1. Skrypt reCAPTCHA **nie ładuje się** przy otwarciu strony
2. Gdy użytkownik **przewinie do formularza** (lub formularz jest w widoku) – ładuje się reCAPTCHA
3. Kadence wywołuje `kbOnloadV2Callback` – reCAPTCHA renderuje się normalnie
4. Formularz działa tak samo jak wcześniej

---

## Test

1. Otwórz stronę z formularzem w **trybie incognito**
2. Otwórz **DevTools** (F12) → zakładka **Network**
3. Filtruj: „recaptcha” lub „google”
4. **Na początku** – nie powinno być żądania do `recaptcha/api.js`
5. **Przewiń do formularza** – pojawia się żądanie do `recaptcha/api.js`
6. Wypełnij formularz i wyślij – powinno działać

---

## Jeśli formularz nie działa

1. **Wyłącz** snippet / usuń kod
2. Sprawdź konsolę (F12 → Console) – czy są błędy
3. Upewnij się, że `kbOnloadV2Callback` jest zdefiniowane (Kadence dodaje je w `<head>`)
4. Jeśli używasz **LiteSpeed** – wyklucz `recaptcha` z „Load JS Delayed” (może kolidować)

---

## Inny klucz reCAPTCHA (site key)

Jeśli masz inny klucz w ustawieniach Kadence Form, zmień w pliku PHP linię:
```php
$sitekey = '6Lf7-iQsAAAAAOg0BD0pnMRAnD9G8B3xHUHZn8Sv';
```
na swój klucz. Klucz znajdziesz w: **Kadence Blocks** → **Form** → ustawienia reCAPTCHA.

---

## LiteSpeed Cache

Jeśli masz LiteSpeed i „Load JavaScript Deferred”:
- reCAPTCHA może być już opóźnione
- Ten snippet **zastępuje** domyślne ładowanie – reCAPTCHA ładuje się tylko przy formularzu
- W **LiteSpeed** → **Page Optimization** → **JS Settings** → w „Exclude JQuery” możesz dodać `recaptcha` jeśli są konflikty (zwykle nie trzeba)
