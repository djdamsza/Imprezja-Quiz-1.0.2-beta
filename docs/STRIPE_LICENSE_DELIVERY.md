# Wysyłka klucza licencyjnego po płatności Stripe

## Przepływ

1. **Klient płaci** → Stripe Checkout → przekierowanie na stronę sukcesu z `session_id`
2. **Strona sukcesu** → formularz: „Wpisz Machine ID z programu” + przycisk
3. **Klient** uruchamia program, kopiuje Machine ID z ekranu aktywacji, wkleja na stronę
4. **Submit** → POST do stripe-shop `/api/license/deliver` z `session_id` + `machine_id`
5. **Backend** weryfikuje płatność, generuje klucz, wysyła e-mail z kluczem

## Mapowanie Stripe → typ licencji

| Lookup key        | Typ licencji |
|-------------------|--------------|
| imprezja-1m       | 1M           |
| imprezja-3m       | 3M           |
| imprezja-12m      | 1Y           |
| imprezja-lifetime | LT           |

## Wymagania techniczne

### Render (stripe-shop)

**Zmienne środowiskowe:**

| Zmienna                    | Wymagane | Opis |
|----------------------------|----------|------|
| `IMPREZJA_LICENSE_PRIVATE_KEY` | Tak | Zawartość `license-private.pem` (klucz prywatny RSA) |
| `LICENSE_EMAIL_FROM`       | Nie | Adres nadawcy (np. `licencje@nowajakoscrozrywki.pl`) |
| `CORS_ORIGIN`              | Nie | Domena WordPress. Domyślnie `*` |

**Do wysyłki e-mail – wybierz jedna z opcji:**

#### Opcja A: Resend (prostsza, zalecana)

| Zmienna | Opis |
|---------|------|
| `RESEND_API_KEY` | Klucz API z [resend.com](https://resend.com) – 100 e-maili/mies. darmowo |

1. Załóż konto na [resend.com](https://resend.com)
2. Zarejestruj domenę (np. nowajakoscrozrywki.pl) – dodaj rekordy DNS
3. Utwórz API Key w [resend.com/api-keys](https://resend.com/api-keys)
4. W Render: `RESEND_API_KEY=re_xxx`, `LICENSE_EMAIL_FROM=licencje@nowajakoscrozrywki.pl`

#### Opcja B: SMTP (dhosting)

| Zmienna | Opis |
|---------|------|
| `SMTP_HOST` | `smtp.dpoczta.pl` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | **Pełny adres e-mail** (np. `licencje@nowajakoscrozrywki.pl`) |
| `SMTP_PASS` | Hasło skrzynki e-mail |

**Gdzie znaleźć SMTP w dhosting:**
1. Zaloguj się do **dPanel** (panel hostingowy)
2. Sekcja **Poczta** → **Skrzynki pocztowe** (lub **E-mail**)
3. Utwórz nową skrzynkę, np. `licencje@nowajakoscrozrywki.pl` – ustaw hasło
4. **SMTP_USER** = pełny adres (np. `licencje@nowajakoscrozrywki.pl`)
5. **SMTP_PASS** = hasło ustawione przy tworzeniu skrzynki
6. Serwer SMTP: `smtp.dpoczta.pl`, port 587

### Klucz prywatny

Klucz z `license-private.pem` (ten sam co do `generate-license-key.js`). W Render: **Environment** → dodaj `IMPREZJA_LICENSE_PRIVATE_KEY` – wklej całą zawartość pliku (włącznie z `-----BEGIN...` i `-----END...`).

## Bezpieczeństwo

- Endpoint `/api/license/deliver` weryfikuje sesję Stripe (status `complete`, payment_status `paid`)
- Klucz generowany jest tylko dla zweryfikowanej płatności
- Machine ID walidowany (format, długość)
