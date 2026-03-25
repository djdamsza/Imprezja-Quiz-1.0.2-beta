# Instrukcja: Resend – wysyłka kluczy licencyjnych na e-mail

SMTP nie działa na Render (blokada portów). Resend używa API HTTPS – działa bez problemu.

---

## Panel Resend (nowe menu) — co musisz „wypełnić”, a co pominąć

Po zalogowaniu widzisz m.in.: **Emails**, **Broadcasts**, **Templates**, **Audience**, **Metrics**, **Domains**, **Logs**, **API Keys**, **Webhooks**, **Settings**.

| Sekcja | Czy musisz coś ustawiać? | Krótko |
|--------|---------------------------|--------|
| **Emails** | Nie na start | Lista pojedynczych wysyłek z API — **uzupełni się sama**, gdy aplikacja lub n8n wyśle maila. |
| **Broadcasts** | Zwykle **nie** | Masowe maile marketingowe — **pomijasz**, jeśli tylko transakcyjne maile (klucz licencji, odpowiedzi z automatu). |
| **Templates** | **Opcjonalnie** | Możesz trzymać HTML w kodzie (Stripe-shop, n8n) — **nie jest wymagane** wypełnianie szablonów w panelu. |
| **Audience** | Zwykle **nie** | Lista odbiorców pod broadcasty — **pomijasz** przy zwykłym `to:` z API. |
| **Metrics** | Tylko podgląd | Statystyki — **nic nie wpisujesz**, tylko czytasz. |
| **Domains** | **TAK (produkcja)** | **Dodaj domenę** (`imprezja.pl` / `nowajakoscrozrywki.pl`), wklej rekordy DNS u operatora, **Verify**. Bez tego nie wyślesz z `biuro@…` / `licencje@…` — tylko test z `onboarding@resend.dev`. |
| **Logs** | Tylko diagnostyka | Gdy mail nie dochodzi: tu widać błędy / status. |
| **API Keys** | **TAK** | **Create API Key** → uprawnienia **Sending** → skopiuj `re_…` **raz** → wklej w Render (**Environment**) jako `RESEND_API_KEY` lub w n8n jako **Header Auth** (`Authorization: Bearer re_…`). **Nie udostępniaj klucza** (czat, zrzuty ekranu, Git). |
| **Webhooks** | **Opcjonalnie** | Zdarzenia (bounce, delivered) — **pomijasz**, dopóki nie potrzebujesz automatów na podstawie statusu. |
| **Settings** | Minimalnie | Profil konta, ewentualnie billing — bez tego wysyłka przez API działa po kluczu + domenie. |

### Ekran „Send your first email” / Onboarding

To jest **szybki test**: pokazuje przykład z **`onboarding@resend.dev`** i kluczem. **Nie musisz** tam nic „wypełniać” na stałe — ważniejsze jest:

1. **API Keys** — własny klucz (po ujawnieniu w czacie **unieważnij stary** i wygeneruj nowy).
2. **Domains** — Twoja domena **Verified**.
3. W **Render** → **Environment** — `RESEND_API_KEY` + `LICENSE_EMAIL_FROM` (adres z **zweryfikowanej** domeny).

Test z kodu Node (`Resend('re_…')`) jest równoważny wysyłce z Twojej aplikacji — **nie zapisuj klucza w repozytorium**, tylko w zmiennych środowiska.

---

## Domena: CyberFolks + dhosting

- **CyberFolks** – rejestracja domeny, w panelu masz pola **dns1** i **dns2** (nameservery)
- **dhosting** – hosting, serwer strony

**dns1 i dns2** – to adresy serwerów DNS (np. `dns1.dhosting.pl`). **Nie zmieniaj ich** – wskazują, gdzie są przechowywane rekordy DNS.

Rekordy TXT/CNAME dla Resend dodajesz w panelu, który **zarządza strefą DNS** – czyli tam, gdzie wskazują dns1/dns2 (dhosting lub CyberFolks).

---

## Krok 1: Załóż konto Resend

1. Wejdź na **https://resend.com/signup**
2. Zarejestruj się (e-mail + hasło)
3. Potwierdź e-mail, jeśli wymagane

---

## Krok 2: Dodaj domenę

1. Zaloguj się do Resend
2. Wejdź w **Domains** (menu po lewej) lub **https://resend.com/domains**
3. Kliknij **Add Domain**
4. Wpisz swoją domenę: `nowajakoscrozrywki.pl`
5. Kliknij **Add**

Resend pokaże rekordy DNS do dodania (SPF, DKIM, DMARC).

---

## Krok 3: Dodaj rekordy DNS (TXT, CNAME)

**Ważne:** Pola **dns1** i **dns2** w CyberFolks to **nameservery** – nie zmieniaj ich. Rekordy dla Resend dodajesz w panelu, który **zarządza strefą DNS** Twojej domeny.

### Gdzie dodać rekordy?

Sprawdź, gdzie ustawione są nameservery (dns1, dns2) w CyberFolks:

---

#### A) Jeśli dns1/dns2 wskazują na **dhosting** (np. `dns1.dhosting.pl`, `dns2.dhosting.pl`)

Rekordy dodajesz w **dhosting**:

1. Zaloguj się do **dPanel** dhosting (panel hostingowy)
2. **Domeny** → znajdź `nowajakoscrozrywki.pl`
3. **Akcje** → **Zarządzaj DNS**
4. Dodaj rekordy z Resend (TXT, CNAME) – skopiuj dokładnie nazwę i wartość
5. Zapisz zmiany

---

#### B) Jeśli dns1/dns2 wskazują na **CyberFolks** (np. `ns1.cyberfolks.pl`, `ns2.cyberfolks.pl`)

Rekordy dodajesz w **CyberFolks**:

1. Zaloguj się do **panelu klienta CyberFolks**
2. **Serwer WWW i domeny** → wybierz domenę `nowajakoscrozrywki.pl`
3. **Edycja strefy DNS** (lub **Zarządzanie DNS**)
4. **Dodaj rekord** → wybierz typ (TXT, CNAME)
5. Wpisz nazwę i wartość z Resend – skopiuj dokładnie
6. Zapisz zmiany

---

**Propagacja DNS:** 15 minut – 24 godziny (zwykle ok. 15–30 min)

---

## Krok 4: Zweryfikuj domenę w Resend

1. Wróć do Resend → **Domains**
2. Przy swojej domenie kliknij **Verify**
3. Poczekaj – Resend sprawdzi rekordy DNS
4. Gdy status zmieni się na **Verified** – możesz wysyłać e-maile z tej domeny

---

## Krok 5: Utwórz klucz API

1. W Resend wejdź w **API Keys** (menu) lub **https://resend.com/api-keys**
2. Kliknij **Create API Key**
3. Nazwa: np. `Imprezja Quiz Render`
4. Uprawnienia: **Sending access** (wystarczy)
5. Kliknij **Add**
6. **Skopiuj klucz** – wygląda jak `re_xxxxxxxxxxxxxxxx` – **zapiszesz go tylko raz**, potem nie będzie widoczny

---

## Krok 6: Ustaw zmienne w Render

1. Wejdź na **https://dashboard.render.com**
2. Otwórz swój serwis **imprezja-quiz**
3. Menu **Environment** (po lewej)
4. Dodaj zmienne:

| Key | Value |
|-----|-------|
| `RESEND_API_KEY` | `re_xxxxxxxx` (wklej swój klucz z Resend) |
| `LICENSE_EMAIL_FROM` | `licencje@nowajakoscrozrywki.pl` |

5. **Usuń** (jeśli są) zmienne SMTP, żeby nie kolidowały:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`

6. Kliknij **Save Changes**

---

## Krok 7: Redeploy

1. W Render, w tym samym serwisie
2. Menu **Manual Deploy** (u góry)
3. Kliknij **Deploy latest commit**
4. Poczekaj 2–3 minuty na zakończenie deployu

---

## Krok 8: Test

1. Wejdź na stronę cennika (nowajakoscrozrywki.pl)
2. Zrób płatność testową (np. karta 4242 4242 4242 4242)
3. Na stronie sukcesu wpisz Machine ID z programu
4. Kliknij **Wyślij klucz na e-mail**
5. Sprawdź skrzynkę (również spam) – powinien przyjść e-mail z kluczem

---

## Adres nadawcy (LICENSE_EMAIL_FROM)

Musi być z Twojej zweryfikowanej domeny. Przykłady:
- `licencje@nowajakoscrozrywki.pl`
- `kontakt@nowajakoscrozrywki.pl`
- `noreply@nowajakoscrozrywki.pl`

---

## n8n + Resend (workflow **automail** na Renderze)

Klucz **`RESEND_API_KEY`** (sam `re_…`, **bez** słowa `Bearer`) trzymasz w **Environment** serwisu **n8n** na Renderze. W node’ach **HTTP Request** do Resend nagłówek to zwykle:

`Authorization` = `={{ 'Bearer ' + $env.RESEND_API_KEY }}`

Wtedy w node **HTTP Request** ustaw **Authentication → None** (żeby n8n nie czekał na osobny credential i nie mieszał dwóch sposobów logowania).

**Pełna instrukcja importu, `$env`, Google Calendar, OAuth:** [`n8n-workflows/IMPORT_AUTOMAIL_RESEND_ENV.md`](./n8n-workflows/IMPORT_AUTOMAIL_RESEND_ENV.md) oraz [`n8n-workflows/README.md`](./n8n-workflows/README.md).

### Test workflowu „kręci się” i nie kończy

1. **Executions** — otwórz ostatnie wykonanie i zobacz, **na którym** node’ie stoi czas. Często to **Perplexity_Analyze** (bywa **20–60 s**), a nie Kalendarz ani Resend.
2. **Nie uruchamiaj samego `Google_Calendar_EventsForColorCheck`** („Execute step”) bez kontekstu — zakres czasu jest z **`Code_BuildCalWindow`**. Testuj od **`Start_Test_FormWP`** albo cały łańcuch od początku.
3. **Google Calendar** — w node musi być **Resource: Calendar**, **Operation: Availability** (free/busy). Po imporcie JSON czasem brakuje `operation` w pliku — ustaw w UI i zapisz workflow (w eksporcie powinno być `"operation": "availability"`).
4. **OAuth „Connection successful”** — to tylko zapis credentialu Google w n8n; **nie** oznacza automatycznie ukończenia całego workflowu — znów patrz **Executions**.
5. **`N8N_BLOCK_ENV_ACCESS_IN_NODE`** — jeśli `true`, wyrażenia z **`$env`** w node’ach (Resend, opcjonalnie strefa w Code) nie zadziałają; usuń zmienną lub ustaw `false` na Renderze (**Save and deploy**).

Szczegółowa checklista (w tym OAuth Google, **Test users**): [`N8N_GOOGLE_OAUTH_KONSOLA.md`](./N8N_GOOGLE_OAUTH_KONSOLA.md).

---

## Gdy coś nie działa

- **Domena nie weryfikuje się** – poczekaj na propagację DNS (do 24 h), sprawdź czy rekordy są dokładnie jak w Resend
- **Błąd „Unauthorized” / `401` „API key is invalid” (aplikacja na Renderze)** – sprawdź czy `RESEND_API_KEY` jest poprawny, bez spacji i bez cudzysłowów w wartości zmiennej
- **Ten sam błąd w n8n (Header Auth)** – pełna checklista: [`N8N_RESEND_SETUP_IMPREZJA.md`](./N8N_RESEND_SETUP_IMPREZJA.md) → sekcja *Checklista credentialu* (`Authorization` + `Bearer re_…`, bez zduplikowanego `Bearer`, nie mylić z kluczem Perplexity)
- **n8n + `$env` / test automail „wisi”** – sekcja **„n8n + Resend (workflow automail)”** powyżej oraz [`IMPORT_AUTOMAIL_RESEND_ENV.md`](./n8n-workflows/IMPORT_AUTOMAIL_RESEND_ENV.md)
- **E-mail nie przychodzi** – sprawdź spam, folder Oferty; w Resend → **Logs** zobaczysz status wysyłki
