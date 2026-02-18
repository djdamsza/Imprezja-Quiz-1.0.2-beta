# Konfiguracja Stripe Dashboard – co sprawdzić gdy nie działa

Gdy płatności nie działają, sprawdź te ustawienia w [Stripe Dashboard](https://dashboard.stripe.com).

---

## 1. Metody płatności (ważne)

**Settings** → [Payment methods](https://dashboard.stripe.com/settings/payment_methods)

- [ ] **Cards** – włączone (domyślnie)
- [ ] **Przelewy24** – włącz, jeśli chcesz P24 (Polska)
- [ ] **BLIK** – opcjonalnie

Bez włączonej metody płatności Checkout nie zadziała.

---

## 2. Stripe Checkout (Settings → Checkout)

**Settings** → [Checkout](https://dashboard.stripe.com/settings/checkout)

Te ustawienia zwykle **nie blokują** płatności. Możesz zostawić domyślne:

- **Customer information** – Email (wymagane), Name, Address – według potrzeb
- **Payment method configuration** – domyślnie Stripe pokazuje dostępne metody
- **Branding** – logo, kolory – opcjonalnie

**Nie musisz nic specjalnie zmieniać** – Checkout działa z domyślnymi ustawieniami.

---

## 3. Managed Payments – wyłącz dla BLIK/Klarna

Aby BLIK i Klarna były widoczne w Checkout:

**Render** (lub Railway) → **Environment** → dodaj:
```
MANAGED_PAYMENTS=false
```

Stripe Shop wtedy jawnie oferuje: card, BLIK, Klarna.

---

## 4. Produkty i ceny

**Products** → sprawdź, czy masz 4 ceny z **Lookup keys**:
- `imprezja-1m`
- `imprezja-3m`
- `imprezja-12m`
- `imprezja-lifetime`

Bez lookup keys strona cennika nie znajdzie cen.

---

## 5. Klucze API

**Developers** → **API keys**

- Używasz **trybu testowego**? → `sk_test_...`
- Używasz **produkcji**? → `sk_live_...`

Klucz musi być skopiowany do Railway jako `STRIPE_SECRET_KEY`.

---

## 6. Webhook

**Developers** → **Webhooks**

- Endpoint URL: `https://[TWOJ-URL-RAILWAY]/webhook`
- Zdarzenia: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
- Signing secret → `STRIPE_WEBHOOK_SECRET` w Railway

---

## Szybka diagnostyka „nie działa”

| Problem | Co sprawdzić |
|--------|--------------|
| Nie przekierowuje na Checkout | URL w WordPress – czy `STRIPE_API_URL` wskazuje na **Railway** (nie Render)? |
| Błąd „p24 invalid” | Settings → Payment methods → włącz Przelewy24 |
| Błąd Managed Payments / tax | Railway → `MANAGED_PAYMENTS=false` |
| „Nie znaleziono ceny” | Products → ceny mają lookup keys? |
| CORS / błąd połączenia | Railway → `CORS_ORIGIN` = `https://nowajakoscrozrywki.pl` |
