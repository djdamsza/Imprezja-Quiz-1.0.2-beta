# Checklist – strona płatności Imprezja Quiz

Kolejność kroków, aby uruchomić stronę z płatnościami na nowajakoscrozrywki.pl.

---

## CZĘŚĆ 1: Stripe Dashboard

### 1.1 Konto Stripe
- [ ] Wejdź na [dashboard.stripe.com](https://dashboard.stripe.com)
- [ ] Zaloguj się lub załóż konto
- [ ] Na start użyj **trybu testowego** (przełącznik w lewym górnym rogu)

### 1.2 Produkt i ceny
- [ ] **Products** → **Add product**
- [ ] Nazwa: **Imprezja Quiz**
- [ ] Dodaj **4 ceny** (każda w tym samym produkcie lub osobne produkty):

| Plan | Lookup key | Typ | Cena | Interwał |
|------|------------|-----|------|----------|
| 1 miesiąc | `imprezja-1m` | Recurring | 29 PLN | Monthly |
| 3 miesiące | `imprezja-3m` | Recurring | 74 PLN | Every 3 months |
| 12 miesięcy | `imprezja-12m` | Recurring | 249 PLN | Yearly |
| Dożywotnia | `imprezja-lifetime` | One-time | 399 PLN | — |

- [ ] Dla każdej ceny: **Additional options** → **Lookup key** → wpisz dokładnie jak w tabeli

### 1.3 Klucze API
- [ ] **Developers** → **API keys**
- [ ] Skopiuj **Secret key** (`sk_test_...`) – przyda się w Kroku 2.3

---

## CZĘŚĆ 2: Railway (stripe-shop)

### 2.1 Repozytorium (projekt na GitHubie)

Railway pobiera kod z GitHuba. Musisz mieć projekt VoteBattle w repozytorium na GitHubie.

**Szczegółowa instrukcja (co kliknąć):** [STRIPE_GITHUB_KROK_PO_KROKU.md](STRIPE_GITHUB_KROK_PO_KROKU.md)

**Jeśli projekt NIE jest jeszcze na GitHubie:**

1. Wejdź na [github.com](https://github.com) i zaloguj się
2. Kliknij **+** (plus) w prawym górnym rogu → **New repository**
3. **Repository name:** np. `Imprezja-Quiz` lub `VoteBattle`
4. Zostaw **Public**, **Add a README** możesz wyłączyć
5. Kliknij **Create repository**
6. Na komputerze otwórz terminal w folderze projektu (np. `Documents/VoteBattle`)
7. Wykonaj (zamień `TWOJA-NAZWA` i `NAZWA-REPO` na swoje):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TWOJA-NAZWA/NAZWA-REPO.git
   git push -u origin main
   ```
8. Odśwież stronę GitHub – powinieneś zobaczyć pliki projektu, w tym folder `stripe-shop`

**Jeśli projekt JUŻ jest na GitHubie:**
- [ ] Sprawdź, czy w repozytorium jest folder `stripe-shop` (z plikami: server.js, package.json, public/)

### 2.2 Deploy
- [ ] Wejdź na [railway.app](https://railway.app) → zaloguj się (GitHub)
- [ ] **New Project** → **Deploy from GitHub repo**
- [ ] Wybierz repozytorium z projektem
- [ ] W **Settings** serwisu ustaw **Root Directory:** `stripe-shop`
- [ ] Poczekaj na pierwszy deploy (może potrwać 1–2 min)

### 2.3 Domena
- [ ] **Settings** → **Networking** → **Generate Domain**
- [ ] Skopiuj URL, np. `https://votebattle-stripe-production-xxxx.up.railway.app`

### 2.4 Zmienne środowiskowe
- [ ] **Variables** → dodaj:

| Zmienna | Wartość |
|---------|---------|
| `STRIPE_SECRET_KEY` | `sk_test_...` (z Kroku 1.3) |
| `STRIPE_DOMAIN` | URL z Kroku 2.3 |
| `CORS_ORIGIN` | `https://nowajakoscrozrywki.pl` |

- [ ] Zapisz – Railway zrobi redeploy

### 2.5 Webhook w Stripe
- [ ] Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**
- [ ] **Endpoint URL:** `https://[URL-Z-RAILWAY]/webhook`  
  (np. `https://votebattle-stripe-production-xxxx.up.railway.app/webhook`)
- [ ] **Events to send** → **Select events** → zaznacz:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- [ ] **Add endpoint**
- [ ] Kliknij nowy endpoint → **Reveal** przy **Signing secret**
- [ ] Skopiuj `whsec_...`
- [ ] Railway → **Variables** → dodaj `STRIPE_WEBHOOK_SECRET` = `whsec_...`
- [ ] Zapisz (Railway zrobi redeploy)

---

## CZĘŚĆ 3: WordPress (nowajakoscrozrywki.pl)

### 3.1 Strona cennika
- [ ] W WordPress utwórz nową stronę (np. „Cennik” lub „Kup licencję”)
- [ ] Dodaj blok **Własny HTML** (Custom HTML)
- [ ] Otwórz plik `docs/wordpress/stripe-cennik.html` z projektu
- [ ] Skopiuj całą zawartość
- [ ] **Zmień linię 43** – zamień `https://TWOJA-DOMENA.pl` na URL z Railway (Krok 2.3):
  ```javascript
  const STRIPE_API_URL = 'https://votebattle-stripe-production-xxxx.up.railway.app';
  ```
- [ ] Wklej do bloku HTML w WordPress
- [ ] Opublikuj stronę

### 3.2 Strona sukcesu (opcjonalnie)
- [ ] Utwórz stronę „Sukces” lub „Dziękujemy”
- [ ] Treść np.: „Płatność zakończona. Klucz licencyjny zostanie wysłany na Twój adres e-mail.”
- [ ] Zapisz jej adres (np. `https://nowajakoscrozrywki.pl/sukces/`)
- [ ] W pliku stripe-cennik.html zmień `success_url` w skrypcie na ten adres (domyślnie używa `window.location.origin + '/sukces/'` – upewnij się, że taka strona istnieje)

---

## CZĘŚĆ 4: Test

### 4.1 Test płatności
- [ ] Otwórz stronę cennika na nowajakoscrozrywki.pl
- [ ] Kliknij „Wybierz” przy dowolnym planie
- [ ] Powinieneś trafić na stronę Stripe Checkout
- [ ] Użyj karty testowej: `4242 4242 4242 4242`
- [ ] Data: dowolna przyszła, CVC: dowolne 3 cyfry
- [ ] Dokończ płatność
- [ ] Sprawdź, czy przekierowało na stronę sukcesu

### 4.2 Test webhooka
- [ ] Stripe Dashboard → **Webhooks** → kliknij swój endpoint
- [ ] **Send test webhook** → wybierz `checkout.session.completed` → **Send**
- [ ] Railway → **Deployments** → **View Logs** – powinna być linia „✅ Płatność zakończona”

---

## Podsumowanie – co masz na końcu

| Element | URL / Lokalizacja |
|---------|-------------------|
| Strona cennika | nowajakoscrozrywki.pl/cennik/ (lub inna ścieżka) |
| API stripe-shop | xxx.up.railway.app |
| Webhook | xxx.up.railway.app/webhook |
| Stripe Checkout | checkout.stripe.com (automatycznie) |

---

## Przejście na produkcję (prawdziwe płatności)

Gdy wszystko działa w trybie testowym:

1. Stripe Dashboard → przełącz na **Live** (wyłącz tryb testowy)
2. Skopiuj **Live** Secret key
3. Railway → zmień `STRIPE_SECRET_KEY` na klucz live
4. Stripe → utwórz **nowy** webhook dla trybu Live (ten sam URL)
5. Railway → zmień `STRIPE_WEBHOOK_SECRET` na secret z nowego webhooka
6. W Stripe utwórz produkty/ceny w trybie Live (lub skopiuj z testów)
