# Integracja Stripe – subskrypcje Imprezja Quiz

Integracja z [Stripe Billing](https://docs.stripe.com/billing/quickstart) dla modelu subskrypcyjnego: 1 miesiąc, 3 miesiące, 12 miesięcy oraz licencja dożywotnia (jednorazowa płatność).

---

## 📋 Checklist – od zera do działającej strony

**Zacznij tutaj:** [STRIPE_CHECKLIST.md](STRIPE_CHECKLIST.md) – lista kroków do wykonania w kolejności.

---

## 1. Konfiguracja Stripe Dashboard

### Produkty i ceny

1. Zaloguj się do [Stripe Dashboard](https://dashboard.stripe.com)
2. Przejdź do **Products** → **Add product**
3. Utwórz produkt **Imprezja Quiz** (nazwa dowolna)
4. Dodaj **6 cen** (Prices): subskrypcja 1m, 3m; jednorazowe 1m-onetime, 3m-onetime, 12m-onetime, lifetime:

| Plan | Lookup key | Typ | Cena | Interwał |
|------|------------|-----|------|----------|
| 1 miesiąc | `imprezja-1m` | Recurring | 30 PLN | monthly |
| 3 miesiące | `imprezja-3m` | Recurring | 80 PLN | every 3 months |
| 1 miesiąc (jednorazowo) | `imprezja-1m-onetime` | One-time | 29 PLN | — |
| 3 miesiące (jednorazowo) | `imprezja-3m-onetime` | One-time | 79 PLN | — |
| 12 miesięcy (jednorazowo) | `imprezja-12m-onetime` | One-time | 249 PLN | — |
| Dożywotnia | `imprezja-lifetime` | One-time | 500 PLN | — |

**Lookup key** ustaw w Price → **Additional options** → **Lookup key**.

### Webhook

**Szczegółowa instrukcja dla WordPress (nowajakoscrozrywki.pl):** [STRIPE_WEBHOOK_WORDPRESS.md](STRIPE_WEBHOOK_WORDPRESS.md)

1. **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://[gdzie-działa-stripe-shop]/webhook` (np. `https://shop.nowajakoscrozrywki.pl/webhook`)
3. Zaznacz zdarzenia:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Skopiuj **Signing secret** (whsec_...) do `.env` jako `STRIPE_WEBHOOK_SECRET`

---

## 2. Instalacja i uruchomienie

### Opcja A: Deploy na Railway (zalecane)

**Instrukcja krok po kroku:** [STRIPE_RAILWAY_DEPLOY.md](STRIPE_RAILWAY_DEPLOY.md)

### Opcja B: Lokalnie

```bash
cd stripe-shop
npm install
cp .env.example .env
# Edytuj .env – wklej klucze z Stripe Dashboard
npm start
```

Serwer startuje na porcie 4242. Otwórz: http://localhost:4242/checkout.html

---

## 3. Zmienne środowiskowe (.env)

| Zmienna | Opis |
|---------|------|
| `STRIPE_SECRET_KEY` | Klucz sekretny (sk_test_... lub sk_live_...) |
| `STRIPE_PUBLISHABLE_KEY` | Klucz publiczny (pk_test_... lub pk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret z webhooka (whsec_...) |
| `STRIPE_DOMAIN` | Domena sklepu, np. https://nowajakoscrozrywki.pl |
| `STRIPE_PORT` | Port serwera (domyślnie 4242) |

---

## 4. Integracja z WordPress / stroną sklepu

### Opcja A: Strona na tym samym serwerze

Jeśli `stripe-shop` działa na tej samej domenie co sklep (np. jako reverse proxy):

- Strona cennika: `https://twoja-domena.pl/checkout.html`
- Endpoint Checkout: `POST https://twoja-domena.pl/create-checkout-session`

### Opcja B: Osobna domena / subdomena

Np. `shop.nowajakoscrozrywki.pl` – wtedy ustaw `STRIPE_DOMAIN` i `success_url`/`cancel_url` na pełne URL-e.

### Opcja C: Osadzenie w WordPress

Wstaw przyciski z `data-lookup` i skrypt:

```html
<button onclick="checkout('imprezja-1m')">1 miesiąc – 30 PLN</button>
<script>
async function checkout(lookup) {
  const res = await fetch('https://twoja-api.pl/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lookup_key: lookup,
      success_url: 'https://twoja-domena.pl/sukces/',
      cancel_url: 'https://twoja-domena.pl/cennik/'
    })
  });
  const { url } = await res.json();
  if (url) window.location.href = url;
}
</script>
```

---

## 5. Webhook – generowanie klucza licencyjnego

Po udanej płatności (`checkout.session.completed`) możesz:

1. Pobrać `session.customer_email`
2. Wygenerować klucz licencyjny (np. przez `scripts/generate-license-key.js`)
3. Wysłać email z kluczem do klienta

Przykład w `stripe-shop/server.js` – rozszerz case `checkout.session.completed`:

```javascript
case 'checkout.session.completed': {
  const session = event.data.object;
  const email = session.customer_email;
  // Wywołaj generator klucza, zapisz do bazy, wyślij email
  break;
}
```

---

## 6. Customer Portal (zarządzanie subskrypcją)

Klient może anulować subskrypcję lub zmienić kartę przez Stripe Customer Portal:

```javascript
// Wymaga customer_id z Checkout Session
const res = await fetch('/create-portal-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customer_id: 'cus_xxx',
    return_url: 'https://twoja-domena.pl/moje-konto/'
  })
});
const { url } = await res.json();
window.location.href = url;
```

`customer_id` otrzymasz w webhooku `checkout.session.completed` lub z `session_id` na stronie sukcesu.

---

## 7. Karty testowe Stripe

| Scenariusz | Numer karty |
|------------|-------------|
| Płatność udana | 4242 4242 4242 4242 |
| Wymaga 3D Secure | 4000 0025 0000 3155 |
| Odrzucona | 4000 0000 0000 9995 |

---

## Linki

- [Stripe Billing Quickstart](https://docs.stripe.com/billing/quickstart)
- [Stripe Checkout](https://docs.stripe.com/payments/checkout)
- [Stripe Customer Portal](https://docs.stripe.com/customer-management/portal-deep-dive)
