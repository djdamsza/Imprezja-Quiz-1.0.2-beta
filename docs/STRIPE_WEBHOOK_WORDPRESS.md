# Webhook Stripe – szczegółowa instrukcja dla nowajakoscrozrywki.pl

## Ważne: Webhook to NIE strona WordPress

**Webhook** to adres URL, na który **Stripe wysyła powiadomienia** (np. „płatność zakończona”). Stripe robi to **sam z serwerów Stripe** – nie przez przeglądarkę użytkownika.

| Element | Gdzie działa | Rola |
|---------|--------------|------|
| **nowajakoscrozrywki.pl** (WordPress) | Twoja strona | Pokazuje cennik, przyciski „Kup” |
| **Stripe Checkout** | Serwery Stripe | Strona płatności (karta, BLIK itd.) |
| **Webhook** | **Twój serwer API** (stripe-shop) | Odbiera od Stripe informację „płatność OK” |

WordPress **nie obsługuje webhooka**. Webhook musi być obsłużony przez **stripe-shop** (Node.js), który musi działać na serwerze z publicznym adresem.

---

## Architektura – jak to działa razem

```
┌─────────────────────────────────────────────────────────────────────────┐
│  nowajakoscrozrywki.pl (WordPress)                                       │
│  Strona cennika z przyciskami „1 mc”, „3 mc”, „12 mc”, „Dożywotnia”     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Klik „Kup” → fetch(POST)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  shop.nowajakoscrozrywki.pl (lub api.xxx) – stripe-shop (Node.js)        │
│  POST /create-checkout-session → tworzy sesję Stripe, zwraca URL         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Redirect użytkownika
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  checkout.stripe.com – strona płatności Stripe                            │
│  Klient wpisuje kartę, płaci                                             │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
        ▼                                               ▼
┌───────────────────┐                     ┌─────────────────────────────────┐
│ Redirect do        │                     │ WEBHOOK – Stripe wysyła POST     │
│ nowajakosc.../     │                     │ na shop.../webhook               │
│ sukces/            │                     │ (checkout.session.completed)      │
└───────────────────┘                     └─────────────────────────────────┘
                                                          │
                                                          ▼
                                               Tu możesz: wygenerować
                                               klucz licencji, wysłać email
```

---

## Krok 1: Gdzie hostować stripe-shop?

Stripe webhook wymaga **publicznego URL**. Możliwości:

### A) Subdomena na Twoim hostingu (np. shop.nowajakoscrozrywki.pl)

- Jeśli masz VPS lub hosting z Node.js – wgraj `stripe-shop`, uruchom (np. przez PM2) i skonfiguruj reverse proxy (Nginx) na subdomenę.
- Webhook URL: `https://shop.nowajakoscrozrywki.pl/webhook`

### B) Railway (zalecane)

- Deploy z GitHub – szczegóły: [STRIPE_RAILWAY_DEPLOY.md](STRIPE_RAILWAY_DEPLOY.md)
- Ustaw zmienne: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_DOMAIN`.
- Dostaniesz URL np. `https://imprezja-stripe-production-xxxx.up.railway.app`
- Webhook URL: `https://[twój-url]/webhook`

### C) Render / Fly.io

- Wgraj projekt `stripe-shop` (np. z GitHuba).
- Ustaw zmienne: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_DOMAIN`.
- Dostaniesz URL np. `https://imprezja-stripe.onrender.com`.
- Webhook URL: `https://imprezja-stripe.onrender.com/webhook`

### D) VPS (np. DigitalOcean, home.pl)

- Zainstaluj Node.js, sklonuj/wgraj `stripe-shop`, uruchom przez PM2.
- Skonfiguruj Nginx + SSL (Let’s Encrypt) dla subdomeny.

---

## Krok 2: Konfiguracja webhooka w Stripe Dashboard

1. Zaloguj się: [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Developers** → **Webhooks** → **Add endpoint**
3. **Endpoint URL** – wpisz adres, na którym działa stripe-shop:
   - np. `https://shop.nowajakoscrozrywki.pl/webhook`
   - lub `https://imprezja-stripe.onrender.com/webhook`
4. **Events to send** – wybierz:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. **Add endpoint**
6. Otwórz nowy endpoint → **Reveal** przy **Signing secret**
7. Skopiuj wartość `whsec_...` i wklej do `.env` jako `STRIPE_WEBHOOK_SECRET`

---

## Krok 3: Plik .env na serwerze stripe-shop

Na serwerze, gdzie działa stripe-shop, w pliku `.env`:

```
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
STRIPE_DOMAIN=https://nowajakoscrozrywki.pl
CORS_ORIGIN=https://nowajakoscrozrywki.pl
```

**Uwaga:** Webhook musi być skonfigurowany **dla tego samego trybu** (test/live), co klucze. Dla `sk_test_...` dodaj endpoint w trybie testowym Stripe.

---

## Krok 4: Test webhooka

1. W Stripe Dashboard → Webhooks → kliknij swój endpoint
2. **Send test webhook** → wybierz `checkout.session.completed` → **Send test webhook**
3. Sprawdź logi stripe-shop – powinna pojawić się linia typu: `✅ Płatność zakończona: cs_test_...`

Jeśli Stripe pokazuje błąd (np. 400, 500) – sprawdź:
- Czy stripe-shop działa i nasłuchuje na porcie
- Czy URL webhooka jest poprawny i dostępny z internetu
- Czy `STRIPE_WEBHOOK_SECRET` jest ustawiony poprawnie

---

## Krok 5: WordPress – tylko przyciski i skrypt

Na **nowajakoscrozrywki.pl** nie konfigurujesz webhooka. Wstawiasz tylko:

1. Stronę cennika (np. z `docs/wordpress/stripe-cennik.html`)
2. W skrypcie zmieniasz `STRIPE_API_URL` na adres Twojego stripe-shop, np.:
   - `https://shop.nowajakoscrozrywki.pl`
   - lub `https://imprezja-stripe.onrender.com`

Webhook jest obsługiwany **wyłącznie** przez stripe-shop – WordPress nie ma z nim kontaktu.

---

## Podsumowanie

| Co | Gdzie |
|----|-------|
| Strona cennika, przyciski | WordPress (nowajakoscrozrywki.pl) |
| API (create-checkout-session) | stripe-shop (shop.xxx lub inny hosting) |
| Webhook URL w Stripe | `https://[gdzie-działa-stripe-shop]/webhook` |
| Signing secret | Do `.env` stripe-shop jako `STRIPE_WEBHOOK_SECRET` |

Webhook **nie jest** stroną WordPress – to endpoint na serwerze stripe-shop, do którego Stripe wysyła POST po każdej płatności.
