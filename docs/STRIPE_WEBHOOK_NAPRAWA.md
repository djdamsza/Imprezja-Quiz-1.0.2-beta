# Naprawa webhooka Stripe – błędy na Render

## Problem

Stripe zgłasza: *"25 requests had other errors"* dla endpointu:
`https://imprezja-quiz-1-0-2-beta.onrender.com/webhook`

Stripe wymaga odpowiedzi HTTP 200–299, aby uznać webhook za dostarczony. Błędy „other” to zwykle: **timeout**, **connection refused**, **connection reset** – nie błędy 4xx/5xx z serwera.

---

## Najbardziej prawdopodobna przyczyna: Cold Start na Render

**Render Free Tier** wyłącza serwis po ~15 minutach braku ruchu. Gdy Stripe wysyła webhook:

1. Serwer jest uśpiony
2. Render budzi kontener (cold start: 30–60 s)
3. Stripe czeka ~30 s i dostaje **timeout**
4. Stripe traktuje to jako błąd i ponawia próby

---

## Rozwiązania

### 1. Ping co 10–14 minut (zalecane, darmowe)

Użyj **UptimeRobot** (lub innego cronu), aby serwis nie zasypiał:

1. Załóż konto na [uptimerobot.com](https://uptimerobot.com) (darmowe)
2. **Add New Monitor**
3. **Monitor Type:** HTTP(s)
4. **URL:** `https://imprezja-quiz-1-0-2-beta.onrender.com/health`
5. **Monitoring Interval:** 5 minut (lub 10 min – ważne, żeby było krócej niż 15 min)
6. Zapisz

Serwer stripe-shop ma już endpoint `/health` – Render będzie pingowany regularnie i nie będzie cold startu.

---

### 2. Sprawdź STRIPE_WEBHOOK_SECRET (tryb Live)

Jeśli używasz **Live mode** w Stripe:

1. Stripe Dashboard → **Developers** → **Webhooks**
2. Kliknij endpoint `https://imprezja-quiz-1-0-2-beta.onrender.com/webhook`
3. Upewnij się, że endpoint jest w trybie **Live** (nie Test)
4. Skopiuj **Signing secret** (`whsec_...`)
5. Render → **Environment** → upewnij się, że `STRIPE_WEBHOOK_SECRET` = ten sam `whsec_...`

**Test i Live mają różne webhook secrets** – jeśli są pomylone, dostaniesz błąd weryfikacji sygnatury (400).

---

### 2b. Błąd „No signatures found” – użyj klasycznych Webhooks

Jeśli masz webhook w **Workbench → Event destinations** i nadal dostajesz 400, spróbuj **klasycznego** interfejsu:

1. Wejdź bezpośrednio: **https://dashboard.stripe.com/webhooks**
2. Kliknij **Add endpoint** (lub „Dodaj endpoint”)
3. **Endpoint URL:** `https://imprezja-quiz-1-0-2-beta.onrender.com/webhook`
4. Wybierz eventy: `checkout.session.completed`, `invoice.paid`, `customer.subscription.*` itd.
5. **Add endpoint**
6. Skopiuj **Signing secret** (Reveal → skopiuj `whsec_...`)
7. Render → Environment → `STRIPE_WEBHOOK_SECRET` = ten secret
8. **Usuń** stary webhook z Workbench (żeby nie było duplikatów)

Klasyczne webhooks są w pełni kompatybilne z Node.js SDK.

---

### 3. Sprawdź logi w Render

1. Render → serwis **imprezja-quiz-1-0-2-beta** → **Logs**
2. Sprawdź, czy przy próbach Stripe pojawiają się wpisy (np. „✅ Płatność zakończona”)
3. Jeśli **brak wpisów** – webhook prawdopodobnie nie dociera (cold start / timeout)
4. Jeśli są błędy – skopiuj treść i zdiagnozuj

---

### 4. Test webhooka w Stripe

#### Opcja A: Dashboard (gdzie szukać „Send test webhook”)

1. Wejdź na **https://dashboard.stripe.com/webhooks** (Live) lub **https://dashboard.stripe.com/test/webhooks** (Test)
2. Kliknij **swój endpoint** (ten z URL Render) – otworzy się strona szczegółów
3. Szukaj przycisku **„Send test webhook”** lub **„Wyślij testowy webhook”** – zwykle:
   - u góry po prawej, albo
   - w sekcji „Overview” / „Przegląd”, albo
   - w menu „⋮” (trzy kropki)
4. Wybierz event `checkout.session.completed` → **Send**
5. Sprawdź status – powinien być **Succeeded** (zielony)

#### Opcja B: Stripe CLI (jeśli nie ma przycisku w Dashboard)

```bash
# Zainstaluj: https://stripe.com/docs/stripe-cli
stripe trigger checkout.session.completed --live
```

To wyśle event do wszystkich webhooków w trybie Live. Sprawdź logi Render.

#### Opcja C: Prawdziwa płatność testowa

Zrób minimalną płatność (np. 1 PLN) – webhook wyśle się automatycznie.

---

### 5. Płatny plan Render (opcjonalnie)

Na płatnym planie Render serwis **nie zasypia**. Jeśli nie chcesz używać UptimeRobot, upgrade usuwa problem cold startu.

---

## Sprawdzenie płatności po awarii

Stripe zaleca sprawdzić, czy wszystkie płatności zostały zrealizowane:

1. Stripe Dashboard → **Payments** → filtruj od 22 lutego 2026
2. Dla każdej płatności „Succeeded” sprawdź, czy klient dostał e-mail z instrukcją
3. Jeśli nie – użyj ręcznego wysłania klucza: [STRIPE_ZARZADZANIE_ZAMOWIENIAMI.md](STRIPE_ZARZADZANIE_ZAMOWIENIAMI.md#ręczne-wysłanie-klucza)

---

## Termin

Stripe przestanie wysyłać webhooki do tego endpointu **3 marca 2026** o 14:00 UTC, jeśli problem nie zostanie naprawiony. Po naprawie Stripe automatycznie wznowi wysyłanie.
