# E-maile na Render – Resend (SMTP nie działa)

Na Render (i podobnych platformach) SMTP zwykle **nie działa** (porty 25/587 zablokowane). Użyj **Resend** – wysyła przez API HTTP.

---

## 1. Załóż konto Resend

1. Wejdź na [resend.com](https://resend.com)
2. Zarejestruj się (darmowy plan: 100 e-maili/dzień)
3. **API Keys** → **Create API Key** → skopiuj klucz (`re_...`)

---

## 2. Zweryfikuj domenę (nadawca)

Resend wymaga zweryfikowanej domeny dla nadawcy.

1. Resend → **Domains** → **Add Domain**
2. Wpisz domenę (np. `nowajakoscrozrywki.pl`)
3. Dodaj rekordy DNS (TXT, MX) – Resend pokaże, co dodać
4. W DNS hostingu (np. domena.pl) dodaj te rekordy
5. Poczekaj na weryfikację (zwykle kilka minut)

**Jeśli nie masz własnej domeny:** Resend pozwala wysyłać z `onboarding@resend.dev` – tylko do testów, nie na produkcję.

---

## 3. Zmienne na Render

**Render** → Twój serwis stripe-shop → **Environment** → **Add Environment Variable**

| Klucz | Wartość |
|-------|---------|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` (z Resend) |
| `LICENSE_EMAIL_FROM` | `licencje@nowajakoscrozrywki.pl` (lub `onboarding@resend.dev` do testów) |
| `SUCCESS_PAGE_URL` | `https://nowajakoscrozrywki.pl/sukces/` |
| `IMPREZJA_LICENSE_PRIVATE_KEY` | (klucz RSA do licencji) |

**Usuń** zmienne SMTP, jeśli były: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.

---

## 4. Sprawdzenie

1. Zapisz zmienne – Render zrobi redeploy
2. Zrób testową płatność (Stripe test mode)
3. Sprawdź logi Render – powinna być linia „📧 E-mail z instrukcją wysłany”
4. Sprawdź skrzynkę (adres z płatności)

---

## 5. Nadawca – opcje

| Opcja | Nadawca | Wymagania |
|-------|---------|-----------|
| Własna domena | `licencje@nowajakoscrozrywki.pl` | Zweryfikowana domena w Resend |
| Test Resend | `onboarding@resend.dev` | Tylko do testów, limitowany |
