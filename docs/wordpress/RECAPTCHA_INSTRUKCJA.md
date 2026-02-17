# Wyśrodkowanie reCAPTCHA v2 na imprezja.pl

## Krok 1: Dodaj CSS w WordPress

1. Zaloguj się do panelu WordPress imprezja.pl
2. Wejdź w **Wygląd → Dostosuj**
3. Otwórz **Dodatkowy CSS**
4. Wklej zawartość pliku `recaptcha-center.css`
5. Kliknij **Opublikuj**

## Krok 2: Sprawdź formularz

Jeśli reCAPTCHA nadal nie jest wyśrodkowana:

- Upewnij się, że formularz ma klasę `g-recaptcha` (WordPress domyślnie ją dodaje)
- W edytorze bloków sprawdź, czy widget reCAPTCHA nie jest otoczony blokiem z ograniczoną szerokością

## Jeśli używasz bloku HTML / shortcode

Owiń reCAPTCHA w div:

```html
<div style="display: flex; justify-content: center; margin: 1rem 0;">
  [tu shortcode lub kod reCAPTCHA]
</div>
```

## Możliwe problemy

| Problem | Rozwiązanie |
|---------|-------------|
| CSS nie działa | Sprawdź w DevTools (F12), czy `.g-recaptcha` ma `display: flex` |
| Konflikt z motywem | Dodaj `!important` do `margin: 0 auto !important` |
| Widget jest w iframe | Upewnij się, że stylujesz nadrzędny kontener, nie iframe |
