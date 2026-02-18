# Strona cennika w WordPress – krok po kroku

Instrukcja tworzenia strony z płatnościami Imprezja Quiz na nowajakoscrozrywki.pl.

---

## Krok 1: Zaloguj się do WordPress

1. Wejdź na **https://nowajakoscrozrywki.pl/wp-admin** (lub Twoja-domena/wp-admin)
2. Zaloguj się

---

## Krok 2: Utwórz nową stronę

1. W lewym menu kliknij **Strony** (Pages)
2. Kliknij **Dodaj nową** (Add New)
3. W polu **Tytuł** wpisz np. **Cennik** lub **Kup licencję Imprezja Quiz**

---

## Krok 3: Dodaj blok Własny HTML

1. Kliknij **+** (Dodaj blok) – ikona plus w lewym górnym rogu lub w środku strony
2. Wyszukaj **„Własny HTML”** lub **„Custom HTML”**
3. Kliknij ten blok, aby go dodać

---

## Krok 4: Wklej kod cennika

1. Otwórz plik **`docs/wordpress/stripe-cennik.html`** z projektu (w edytorze kodu lub Notatniku)
2. **Skopiuj całą zawartość** (od `<div` do `</script>`)
3. Wklej do bloku Własny HTML w WordPress

---

## Krok 5: Zmień adres API

W wklejonym kodzie znajdź linię:

```javascript
const STRIPE_API_URL = 'https://TWOJ-URL.up.railway.app';
```

Zamień na **URL stripe-shop z Railway** (np. `https://votebattle-stripe-production-xxxx.up.railway.app`)

---

## Krok 6: Opcjonalnie – strona sukcesu

Strona sukcesu pokazuje się po udanej płatności. Możesz:

**Opcja A:** Zostaw domyślnie – skrypt użyje `window.location.origin + '/sukces/'`, więc utwórz stronę o adresie **/sukces/** z treścią np. „Dziękujemy za zakup. Klucz licencyjny zostanie wysłany na Twój e-mail.”

**Opcja B:** Zmień w kodzie `success_url` na konkretny adres, np. `'https://nowajakoscrozrywki.pl/dziekujemy/'`

---

## Krok 7: Opublikuj

1. Kliknij **Opublikuj** (Publish) w prawym górnym rogu
2. Potwierdź **Opublikuj**

---

## Krok 8: Sprawdź adres strony

Po publikacji zobaczysz adres strony, np.:
- `https://nowajakoscrozrywki.pl/cennik/`
- lub `https://nowajakoscrozrywki.pl/kup-licencje/`

Dodaj link do tej strony w menu (np. **Wygląd** → **Menu**).

---

## Gotowy kod do wklejenia (z poprawnym URL)

Plik **`docs/wordpress/stripe-cennik.html`** zawiera placeholder.  
Skopiuj całą zawartość i **zamień** `https://TWOJ-URL.up.railway.app` na URL stripe-shop z Railway.

---

## Checklist

- [ ] Strona utworzona i opublikowana
- [ ] Blok Własny HTML z kodem cennika dodany
- [ ] Link do strony cennika w menu
- [ ] (Opcjonalnie) Strona /sukces/ utworzona dla przekierowania po płatności
