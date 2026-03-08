# Cennik Stripe na stronie produktu Imprezja Quiz

Instrukcja: umieszczenie cennika Stripe w treści strony produktu i wyłączenie WooCommerce (koszyk, zakupy) dla tego produktu.

**Strona:** https://nowajakoscrozrywki.pl/produkt/imprezja-quiz/

---

## Część 1: Wyłączenie WooCommerce dla produktu Imprezja Quiz

### Opcja A: Code Snippets (zalecana)

1. Zainstaluj wtyczkę **Code Snippets** (jeśli nie masz)
2. **Snippety** → **Dodaj nowy**
3. **Tytuł:** np. „Wyłącz WooCommerce dla Imprezja Quiz”
4. **Kod:** (bez `<?php` – Code Snippets dodaje to automatycznie)

```php
// Ukryj przycisk "Dodaj do koszyka" i cenę WooCommerce dla produktu Imprezja Quiz
add_action('wp', function() {
    if (is_product() && (get_post_field('post_name') === 'imprezja-quiz' || get_the_ID() === 123)) {
        remove_action('woocommerce_single_product_summary', 'woocommerce_template_single_add_to_cart', 30);
        remove_action('woocommerce_single_product_summary', 'woocommerce_template_single_price', 10);
    }
});
```

5. Zamień `123` na ID produktu (opcjonalnie – slug `imprezja-quiz` zwykle wystarczy)
6. **Uruchom wszędzie:** Tak
7. **Zapisz** i **Aktywuj**

### Opcja B: functions.php motywu

1. **Wygląd** → **Edytor motywów** → **functions.php** (lub **Edytor plików**)
2. Na końcu pliku (przed `?>`) wklej:

```php
// Wyłącz WooCommerce dla Imprezja Quiz – płatności przez Stripe
add_action('wp', function() {
    if (is_product('imprezja-quiz')) {
        remove_action('woocommerce_single_product_summary', 'woocommerce_template_single_add_to_cart', 30);
        remove_action('woocommerce_single_product_summary', 'woocommerce_template_single_price', 10);
    }
});
```

3. Zapisz

---

## Część 2: Dodanie cennika Stripe do treści produktu

**WAŻNE – aby przewijanie na komórce działało:**
1. **USUŃ** wszystkie stare bloki z cennikiem (mogą być zduplikowane lub z innej wersji)
2. Wklej **JEDEN** blok – całą zawartość z `stripe-cennik.html` lub `imprezja-quiz-produkt-pelna-tresc.html`
3. Jeśli nadal nie przewija się na mobile: skopiuj zawartość `imprezja-cennik-additional-css.css` do **Wygląd → Dostosuj → Dodatkowy CSS**

**Kroki:**
1. **WooCommerce** → **Produkty** → znajdź **Imprezja Quiz**
2. Kliknij **Edytuj**
3. **Usuń** stare bloki cennika (szukaj duplikatów „Prosty cennik”, wielu bloków Własny HTML z cennikiem)
4. Przewiń do sekcji, gdzie ma być cennik
5. Kliknij **+** → **Własny HTML**
6. Wklej całą zawartość z **`stripe-cennik.html`** (albo fragment cennika z `imprezja-quiz-produkt-pelna-tresc.html`)
7. **Zapisz** / **Zaktualizuj**
8. Wyczyść cache (LiteSpeed, przeglądarka)

---

## Część 3: Opcjonalnie – ukrycie koszyka w menu

Jeśli chcesz ukryć ikonę koszyka w menu dla całej witryny (gdy wszystkie zakupy idą przez Stripe):

**Wygląd** → **Customizuj** → **Menu** → wybierz menu → usuń element „Koszyk”

Lub zostaw koszyk – będzie pusty, gdy nie ma produktów WooCommerce w koszyku.

---

## Cron keep-alive (dhosting)

1. **Plik** `cron.php` – wrzuć do `public_html/` (np. `/nowajakoscrozrywki.pl/public_html/cron.php`)
2. **Zawartość** – tylko: `<?php file_get_contents('https://imprezja.onrender.com/api/prices');`
3. **Ścieżka w CRON** – ustaw: `~/nowajakoscrozrywki.pl/public_html/cron.php` (z `public_html` w ścieżce)
4. **Interwał** – co 10 minut

---

## Przyspieszenie pierwszego kliknięcia (Render.com cold start)

Na darmowym planie Render serwis „zasypia” po ~15 min bez ruchu. Pierwsze kliknięcie może trwać 30–60 s.

**Rozwiązania:**
1. **Preconnect** – już dodany w `stripe-cennik.html` (preconnect + dns-prefetch do API)
2. **Cron ping** – skonfiguruj UptimeRobot lub cron.co, aby co 10–14 min wysyłał GET na `https://imprezja.onrender.com/api/prices` lub `/health` (po redeployu) – serwis pozostanie „obudzony”
3. **Płatny plan Render** – wyłącza cold start

---

## Cennik na komórce – przewijanie poziome

Na ekranach ≤600px cennik używa **przewijania poziomego** – przesuń palcem w lewo, żeby zobaczyć kolejne plany (1 miesiąc → 3 miesiące → 12 miesięcy → Dożywotnia).

**Jeśli nie przewija się na telefonie:**
1. Sprawdź, czy nie masz **zduplikowanych** bloków cennika – usuń stare/duplikaty
2. Skopiuj zawartość pliku **`imprezja-cennik-additional-css.css`** do **Wygląd → Dostosuj → Dodatkowy CSS** → Zapisz
3. Wyczyść cache (LiteSpeed: Opróżnij wszystko)
4. Sprawdź na telefonie w trybie incognito

---

## Sprawdzenie

1. Wejdź na https://nowajakoscrozrywki.pl/produkt/imprezja-quiz/
2. Nie powinno być przycisku „Dodaj do koszyka” ani ceny WooCommerce (450 zł)
3. Powinien być widoczny cennik Stripe (30, 80, 290, 500 PLN) z przyciskami „Wybierz” / „Kup”
4. Kliknij „Wybierz” → przekierowanie do Stripe Checkout

---

## Uwaga o ID produktu

Jeśli `is_product('imprezja-quiz')` nie działa (np. inny slug), sprawdź slug produktu:
- **Produkty** → **Imprezja Quiz** → w adresie edycji zobaczysz `post=XXX` – to ID
- Użyj: `get_the_ID() === XXX` zamiast slug
