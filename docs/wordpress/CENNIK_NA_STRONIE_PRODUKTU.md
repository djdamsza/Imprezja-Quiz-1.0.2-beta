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

1. **WooCommerce** → **Produkty** → znajdź **Imprezja Quiz**
2. Kliknij **Edytuj**
3. W edytorze bloków przewiń do sekcji, gdzie chcesz umieścić cennik (np. po „Pobierz wersję testową” lub przed FAQ)
4. Kliknij **+** (Dodaj blok)
5. Wyszukaj **Własny HTML** (Custom HTML)
6. Wklej całą zawartość z pliku **`docs/wordpress/stripe-cennik.html`**
7. **Zapisz** lub **Zaktualizuj**

---

## Część 3: Opcjonalnie – ukrycie koszyka w menu

Jeśli chcesz ukryć ikonę koszyka w menu dla całej witryny (gdy wszystkie zakupy idą przez Stripe):

**Wygląd** → **Customizuj** → **Menu** → wybierz menu → usuń element „Koszyk”

Lub zostaw koszyk – będzie pusty, gdy nie ma produktów WooCommerce w koszyku.

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
