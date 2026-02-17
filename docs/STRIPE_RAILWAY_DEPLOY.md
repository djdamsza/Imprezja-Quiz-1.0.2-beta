# Deploy stripe-shop na Railway

Instrukcja wdrożenia Imprezja Quiz Stripe na [Railway](https://railway.app) – darmowy plan wystarczy na start.

---

## Krok 1: Konto i projekt

1. Wejdź na [railway.app](https://railway.app) i zaloguj się (GitHub, Google)
2. **New Project** → **Deploy from GitHub repo**
3. Połącz konto GitHub (jeśli jeszcze nie)
4. Wybierz repozytorium z projektem VoteBattle/Imprezja Quiz

---

## Krok 2: Konfiguracja projektu

Railway wykryje strukturę projektu. Musisz wskazać **root directory** i **start command**:

1. W ustawieniach serwisu (Settings):
   - **Root Directory:** `stripe-shop` (jeśli repo ma folder stripe-shop w głównym katalogu)
   - **Build Command:** `npm install` (domyślne)
   - **Start Command:** `npm start` (domyślne)

2. Jeśli całe repo to tylko stripe-shop – Root Directory zostaw puste.

---

## Krok 3: Zmienne środowiskowe

W Railway: **Variables** → **Add Variable** (lub **Raw Editor**):

| Zmienna | Wartość | Uwagi |
|---------|---------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_...` lub `sk_live_...` | Z [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Ustawisz po utworzeniu webhooka (Krok 5) |
| `STRIPE_DOMAIN` | `https://xxx.up.railway.app` | URL Twojej aplikacji na Railway (po Krok 4) |
| `CORS_ORIGIN` | `https://nowajakoscrozrywki.pl` | Domena WordPress |

**Uwaga:** `STRIPE_DOMAIN` i `STRIPE_WEBHOOK_SECRET` ustawisz po pierwszym deployu, gdy poznasz URL.

---

## Krok 4: Domena (URL aplikacji)

1. W Railway: **Settings** → **Networking** → **Generate Domain**
2. Skopiuj URL, np. `https://imprezja-stripe-production-xxxx.up.railway.app`
3. Wklej do zmiennej `STRIPE_DOMAIN`
4. Zapisz – Railway zrobi redeploy

---

## Krok 5: Webhook w Stripe

1. [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL:** `https://[TWOJ-URL-RAILWAY]/webhook`  
   np. `https://imprezja-stripe-production-xxxx.up.railway.app/webhook`
3. **Events:** zaznacz:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. **Add endpoint**
5. Kliknij endpoint → **Reveal** przy **Signing secret**
6. Skopiuj `whsec_...` i wklej w Railway jako `STRIPE_WEBHOOK_SECRET`
7. Redeploy (Railway zrobi to automatycznie po zapisie zmiennych)

---

## Krok 6: WordPress – konfiguracja

W pliku `docs/wordpress/stripe-cennik.html` zmień:

```javascript
const STRIPE_API_URL = 'https://imprezja-stripe-production-xxxx.up.railway.app';
```

na Twój URL z Railway.

Wklej zaktualizowany blok HTML na stronę cennika w WordPress.

---

## Krok 7: Test

1. Otwórz stronę cennika na nowajakoscrozrywki.pl
2. Kliknij „Wybierz” przy dowolnym planie
3. Powinieneś trafić na Stripe Checkout
4. Użyj karty testowej: `4242 4242 4242 4242`

---

## Deploy z lokalnego folderu (bez GitHub)

Jeśli nie chcesz używać GitHub:

1. Zainstaluj Railway CLI: `npm i -g @railway/cli`
2. Zaloguj się: `railway login`
3. W folderze `stripe-shop`:
   ```bash
   cd stripe-shop
   railway init
   railway up
   ```
4. Ustaw zmienne: `railway variables set STRIPE_SECRET_KEY=sk_xxx`
5. Wygeneruj domenę: `railway domain`

---

## Limit darmowego planu Railway

- Około 500 godzin/miesiąc na darmowym planie
- Dla małego sklepu (kilkadziesiąt transakcji) zwykle wystarczy
- Po przekroczeniu limitu – płatny plan od ~5 USD/mies.

---

## Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---------|-------------|
| 502 Bad Gateway | Sprawdź logi w Railway (Deployments → View Logs) |
| Webhook nie działa | Zweryfikuj URL, sprawdź STRIPE_WEBHOOK_SECRET |
| CORS error | Ustaw CORS_ORIGIN na `https://nowajakoscrozrywki.pl` |
| „Nie znaleziono ceny” | Utwórz produkty w Stripe z lookup_key (imprezja-1m, imprezja-3m itd.) |
