# Instrukcja: Strona produktu Imprezja Quiz – przycisk pobierania + cennik

## Krok 1: Dodaj blok na początku treści

1. **WooCommerce** → **Produkty** → **Imprezja Quiz** → **Edytuj**
2. Na **samym początku** treści (przed pierwszym nagłówkiem) dodaj blok **Własny HTML**
3. Wklej całą zawartość z pliku **`imprezja-quiz-produkt-pelna-tresc.html`**
4. Zapisz (nie publikuj jeszcze)

---

## Krok 2: Dodaj id do sekcji pobierania

1. Przewiń w edytorze do sekcji **„Pobierz wersję testową”**
2. Znajdź blok/div z tą sekcją (z linkami do Windows, macOS)
3. W trybie **Edytor kodu** lub w bloku Własny HTML – dodaj `id="imprezja-pobierz"` do diva:

**Przed:**
```html
<div class="imprezja-pobierz">
<h2>Pobierz wersję testową</h2>
```

**Po:**
```html
<div class="imprezja-pobierz" id="imprezja-pobierz">
<h2>Pobierz wersję testową</h2>
```

4. **Zaktualizuj** produkt

---

## Efekt

- **Na górze strony:** przycisk „Pobierz 14-dniową wersję testową” (zielony, wyśrodkowany)
- Kliknięcie przycisku → przewija stronę do sekcji pobierania
- **Pod przyciskiem:** cennik Stripe (30, 80, 290, 500 PLN) z przyciskami Wybierz/Kup
- **Poniżej:** dotychczasowa treść produktu
- **Na dole:** sekcja pobierania z linkami do Windows/macOS

---

## Wyłączenie WooCommerce (jeśli jeszcze nie zrobione)

Dodaj do Code Snippets lub functions.php:

```php
add_action('wp', function() {
    if (is_product('imprezja-quiz')) {
        remove_action('woocommerce_single_product_summary', 'woocommerce_template_single_add_to_cart', 30);
        remove_action('woocommerce_single_product_summary', 'woocommerce_template_single_price', 10);
    }
});
```
