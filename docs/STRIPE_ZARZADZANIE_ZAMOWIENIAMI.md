# Zarządzanie zamówieniami Imprezja Quiz

## 1. Flow po płatności

1. **Klient płaci** → Stripe Checkout
2. **Webhook** `checkout.session.completed` → serwer wysyła **e-mail z podziękowaniem** + link do strony z formularzem Machine ID
3. **Klient wchodzi na stronę sukcesu** (np. /sukces/) → widzi formularz „ID komputera”
4. **Klient podaje Machine ID** → POST `/api/license/deliver` → serwer generuje klucz i **wysyła e-mail z kluczem**

## 2. Co musi być skonfigurowane

| Zmienna | Opis |
|---------|------|
| `RESEND_API_KEY` | **Zalecane** – na Render/Railway SMTP nie działa. Instrukcja: [STRIPE_RESEND_RENDER.md](STRIPE_RESEND_RENDER.md) |
| `SMTP_*` | Alternatywa – na Render zwykle nie działa (porty zablokowane) |
| `SUCCESS_PAGE_URL` | Link w e-mailu po płatności (np. `https://nowajakoscrozrywki.pl/sukces/`) |
| `IMPREZJA_LICENSE_PRIVATE_KEY` | Potrzebny do generowania klucza przy `/api/license/deliver` |

## 3. Zarządzanie zamówieniami – Stripe Dashboard

Wszystkie płatności i subskrypcje są w **Stripe Dashboard**:

- **Payments** → lista płatności (e-mail klienta, kwota, status)
- **Customers** → klienci (e-mail, historia płatności)
- **Subscriptions** → subskrypcje (przedłużenia, anulowania)

**Nie ma osobnego panelu w stripe-shop** – Stripe jest źródłem prawdy.

### Ręczne wysłanie klucza

Jeśli klient zapłacił, ale nie dostał klucza (np. nie wypełnił formularza):

1. Stripe Dashboard → **Payments** → znajdź płatność → skopiuj **Checkout Session ID** (cs_...)
2. Klient musi podać **Machine ID** (z programu)
3. Możesz wywołać API ręcznie:
   ```bash
   curl -X POST https://TWOJA-API.pl/api/license/deliver \
     -H "Content-Type: application/json" \
     -d '{"session_id":"cs_xxx","machine_id":"MACHINE_ID_OD_KLIENTA"}'
   ```
4. Lub poproś klienta, żeby wrócił na stronę sukcesu z linkiem:  
   `https://twoja-domena.pl/sukces/?session_id=cs_xxx`

## 4. Sprawdzenie, czy e-maile działają

1. **Webhook:** Stripe Dashboard → Webhooks → wybierz endpoint → **Send test webhook** → `checkout.session.completed`
2. Sprawdź logi stripe-shop – powinna być linia „📧 E-mail z instrukcją wysłany”
3. Sprawdź skrzynkę (adres e-mail z testowego klienta Stripe)

## 5. Strona sukcesu na WordPress

Treść strony `/sukces/` – wklej z `docs/wordpress/stripe-sukces.html`.

**Ważne:** W pliku stripe-sukces.html ustaw `STRIPE_API_URL` na URL stripe-shop (np. Railway).
