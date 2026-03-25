# Resend + n8n (Render) — krok po kroku dla **imprezja.pl**

Wysyłka z n8n na Renderze przez **HTTPS API** (Resend). Odbiór dalej może być z **IMAP** (`biuro@imprezja.pl`) — to są **dwa niezależne** kanały.

---

## Krok 1 — Konto i klucz API

1. Wejdź na **https://resend.com** → **Sign up** / zaloguj się.  
2. Menu **API Keys** → **Create API Key** → nazwa np. `n8n-imprezja` → skopiuj wartość zaczynającą się od **`re_`** (pokazuje się **raz**).

---

## Krok 2 — Domena `imprezja.pl` w Resend

1. **Domains** → **Add Domain** → wpisz **`imprezja.pl`** (bez `www`, chyba że taką dodajesz osobno).  
2. Resend wyświetli rekordy **DNS** (SPF/DKIM, czasem DMARC).  
3. W panelu, gdzie **zarządzasz DNS** domeny (CyberFolks, dhosting, OVH, Cloudflare itd.) — dodaj rekordy **dokładnie** jak podaje Resend (typ, nazwa/host, wartość).  
4. Poczekaj na propagację (często **15–60 min**, bywa do 24 h).  
5. W Resend → **Verify** przy domenie — status **Verified**.

Szczegóły DNS (m.in. gdy masz dns1/dns2 u CyberFolks + dhosting): [`RESEND_INSTRUKCJA.md`](./RESEND_INSTRUKCJA.md) — ta sama logika, tylko domena u Ciebie to **imprezja.pl**.

---

## Krok 3 — Credential w n8n

1. **Credentials** → **Add** → **Header Auth** (lub typ zgodny z Twoim workflow).  
2. **Name:** `Authorization`  
3. **Value:** `Bearer re_TWOJ_PEŁNY_KLUCZ` (spacja po słowie `Bearer`).  
4. Zapisz jako np. **Resend API**.

W node **HTTP Request** (`POST https://api.resend.com/emails`):

- **Authentication** → **Generic Credential Type** → **Header Auth** → wybierz **Resend API**.

### Checklista credentialu (najczęstsza przyczyna błędu)

| Sprawdź | Poprawnie | Źle (da `401` / API key is invalid) |
|--------|-----------|--------------------------------------|
| Nazwa nagłówka | dokładnie **`Authorization`** (z wielką **A**) | `authorization` w złym polu, `Api-Key`, puste |
| Wartość | **`Bearer `** + **`re_…`** (jedna spacja po `Bearer`) | sam `re_…` **bez** słowa Bearer |
| Cudzysłowy | **bez** `"` w polu wartości | `\"Bearer re_…\"` albo `""Bearer…""` (jak w TXT DNS — tu **nie** stosuj) |
| Znak końca linii | tylko klucz, bez spacji na końcu / nowej linii | niewidoczna spacja po kluczu |
| Który klucz | świeży z **Resend → API Keys → Create** | stary unieważniony, skrócony przy kopiowaniu, klucz **Perplexity** zamiast Resend |
| Node HTTP | **Authentication** = wybrany **Resend API** | credential pusty / inny typ / żółty trójkąt ostrzegawczy |

**Izolacja:** w terminalu (lub Postman), z **tego samego** klucza co w n8n:

```bash
curl -sS -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer re_TWOJ_KLUCZ' \
  -H 'Content-Type: application/json' \
  -d '{"from":"Biuro Imprezja <biuro@imprezja.pl>","to":["twoj-mail@test.pl"],"subject":"Test curl","html":"<p>ok</p>"}'
```

- Jeśli **curl też** zwraca `401` → problem jest w **kluczu** (wygeneruj nowy w Resend).  
- Jeśli **curl = 200**, a n8n = 401 → problem jest w **credentialu w n8n** (nazwa/wartość nagłówka albo niewłaściwy credential przypięty do node’a).

**Region domeny (np. Ireland / eu-west-1)** — to **nie zmienia** adresu API; nadal **`https://api.resend.com/emails`**. Zweryfikowana domena nie zastępuje poprawnego klucza.

**Stary workflow na screenie** — jeśli w podglądzie wysyłki widzisz `onboarding@resend.dev` i `kontakt@twoja-domena.pl`, to **nie** jest aktualny plik **`automail-imap-fixed.json`** z repo — zaimportuj go ponownie albo zaktualizuj node’y **Code** (`ParseAndRoute`, `PrepareOfertaMails`).

### „Wywala się tylko jeden” node HTTP (Resend)

To **normalne**: w jednym uruchomieniu wykonuje się **jedna ścieżka** (np. tylko `Resend_WolnyTermin`). Reszta node’ów Resend **nie jest wołana** — nie znaczy, że działają, dopóki ich nie przetestujesz. Błąd **`Authorization failed` / 401** zawsze dotyczy **nagłówka z kluczem** w **tym** node’ie.

---

## Obejście: klucz w Render (`$env`) zamiast credentialu „Header Auth”

Czasem na **n8n 2.12+** credential **Header Auth** wygląda dobrze, a Resend i tak zwraca `401`. Wtedy:

1. **Render** (serwis **n8n**) → **Environment** → dodaj **`RESEND_API_KEY`** = sam klucz `re_…` (**bez** `Bearer`, **bez** cudzysłowów `"` w wartości zmiennej).
2. Upewnij się, że **nie** masz włączonego blokowania env w node’ach — zmienna [`N8N_BLOCK_ENV_ACCESS_IN_NODE`](https://docs.n8n.io/hosting/configuration/environment-variables/) ma być **`false`** lub **nie ustawiona** (patrz też [`RENDER_N8N.md`](./RENDER_N8N.md)).
3. W **każdym** node **HTTP Request** do Resend:
   - **Authentication** → **None** (wyłącz Header Auth credential).
   - **Send Headers** → włączone, dodaj nagłówki:

| Name | Value |
|------|--------|
| `Authorization` | `={{ 'Bearer ' + $env.RESEND_API_KEY }}` |
| `Content-Type` | `application/json` |

4. **Save** workflow → **Execute** ponownie.

Klucz nie trafia do eksportu JSON workflowu (zostaje w Render), a Resend dostaje dokładnie `Authorization: Bearer re_…`.

### `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` — a wcześniej „i tak nie działało”

Ustawienie **`false`** (lub brak zmiennej) rozwiązuje wyłącznie błąd w stylu **„access to env vars denied”**. **Nie** naprawia samo z siebie:

| Objaw | Co sprawdzić |
|--------|----------------|
| **`401` / invalid API key** | Klucz w Resend, **curl** z tej samej wartości (sekcja *Izolacja* wyżej). Często: stary klucz, literówka, spacja na końcu w Renderze. |
| **`Bearer undefined` / pusty nagłówek** | Na **tym samym** serwisie Render co n8n musi być zmienna **`RESEND_API_KEY`** (wyszukaj ją na stronie Environment — na skrócie ekranu często jej **nie widać**). Bez niej `$env.RESEND_API_KEY` jest puste. |
| Zmiana env „nie pomogła” | Po każdej zmianie: **Save and deploy**. Bez wdrożenia stary proces może nie widzieć nowej zmiennej. |
| Node HTTP ma **dwa** sposoby auth | Przy wariancie z `$env`: **Authentication → None** + nagłówek `Authorization` z wyrażeniem. Jeśli **jednocześnie** masz przypięty **Header Auth**, może być konflikt / zły nagłówek. |
| Mail „technicznie OK”, ale nie dochodzi | **`from`** musi być z **zweryfikowanej** domeny w Resend (albo test z `onboarding@resend.dev`). Patrz *Krok 5* — limity planu / dozwoleni odbiorcy. |

**Najpewniejsza diagnostyka:** zrób **Manual Trigger → HTTP Request** jak w *Krok 6* — raz z **Header Auth** (credential), raz z **`$env`**. Gdzie jest **200**, ten wariant zostaw w produkcji.

---

## Krok 4 — Pola `from` i `reply_to` w workflow

Po weryfikacji domeny możesz ustawić np.:

- **`from`:** `Biuro Imprezja <biuro@imprezja.pl>`  
- **`reply_to`:** `biuro@imprezja.pl`  

Wtedy odpowiedzi klientów wracają na skrzynkę, którą czytasz przez **IMAP**.

W plikach JSON z repo szukaj w node **Code** (`PrepareOfertaMails`, `ParseAndRoute`) lub w **HTTP** stałych `mail_from` / `reply_to` i **podmień** na powyższe po zweryfikowaniu Resend.

---

## Krok 5 — Limit darmowy / testy

- Na **darmowym** koncie Resend często możesz wysyłać **tylko na zweryfikowany adres e-mail** (Twój prywatny) albo tylko z **`onboarding@resend.dev`** jako nadawca — sprawdź aktualne zasady w panelu Resend.  
- Do testu workflowu ustaw w **PrzykladMaila** / IMAP **`emailFrom`** na adres **dozwolony** w Twoim planie Resend.  
- Po weryfikacji **imprezja.pl** nadawaj z **`biuro@imprezja.pl`** zgodnie z limitem planu.

---

## Krok 6 — Szybki test (bez całego workflowu)

1. Nowy workflow: **Manual Trigger** → **HTTP Request** `POST` `https://api.resend.com/emails`.  
2. Body JSON (np.):

```json
{
  "from": "Biuro Imprezja <biuro@imprezja.pl>",
  "to": ["twoj-test@gmail.com"],
  "subject": "Test Resend z n8n",
  "html": "<p>Działa.</p>",
  "reply_to": "biuro@imprezja.pl"
}
```

3. **Execute** — jeśli **200** i mail dotarł, ten sam credential użyj w workflowach **wesele / mechanizm**.

---

## Workflow `automail-imap-fixed.json` — jeden flow (IMAP + formularz WP)

W pliku **[`n8n-workflows/automail-imap-fixed.json`](./n8n-workflows/automail-imap-fixed.json)** jest **tylko ta ścieżka** (usunięto starą gałąź `Start` → `Perplexity_Extract` → `ParseJSON` — uproszczenie).

- **`IMAP_Biuro_Imprezja`** → **PrzykladMaila1** → **Filter_WP_Formularz** → …  
- **`Start_Test_FormWP`** → **`Set_WP_Formularz_Przyklad`** → **Filter** — test bez skrzynki; przykład jak **Kadence** (`Imię:` / `E-mail:` / `Treść:` + temat z **„Imprezja”** / **„formularza”**).
- Dalej: **Perplexity_Analyze** → **ParseAndRoute** → … przy znanej dacie: **Google Calendar** (*Availability*) → **`Resend_*`**.

**Resend w eksporcie z repo (aktualnie):** node’y **`Resend_*`** używają **`$env.RESEND_API_KEY`** w nagłówku **Authorization** (bez credentialu w n8n). **Google Calendar:** credential **OAuth2** na **Google_Calendar_EventsForColorCheck** i **Google_Calendar_RangeEventsForColor** (Event → Get Many). Instrukcja importu: [`n8n-workflows/IMPORT_AUTOMAIL_RESEND_ENV.md`](./n8n-workflows/IMPORT_AUTOMAIL_RESEND_ENV.md).  
Alternatywa Resend: credential **Header Auth** — opis w *Krok 3* i *Checklista credentialu* powyżej.

**Co zrobić przed testem**

1. Na **Renderze** ustaw **`RESEND_API_KEY`** (lub w credentialu n8n, jeśli używasz wariantu z Header Auth).
2. W **`Set_WP_Formularz_Przyklad`** ustaw **E-mail** w treści na **adres, na który Resend może wysłać** (wg planu / zweryfikowanych odbiorców).
3. Jeśli domena **nie** jest jeszcze **Verified** w Resend, w node **Code** `ParseAndRoute` i `PrepareOfertaMails` tymczasowo zmień `from` na `onboarding@resend.dev` (jak w panelu Resend).

Wysyłka do klienta używa **`client_to_email`** (pole **E-mail** z formularza), a nie adresu technicznego WordPressa.

---

## Powiązane

- [`N8N_EMAIL_SETUP.md`](./N8N_EMAIL_SETUP.md) — ogólny opis Resend + IMAP  
- [`N8N_IMAP_BIURO_IMPREZJA.md`](./N8N_IMAP_BIURO_IMPREZJA.md) — wejście `biuro@` + mapowanie pól  
- [`n8n-workflows/automail-imap-fixed.json`](./n8n-workflows/automail-imap-fixed.json) — IMAP + filtr WP + Resend + test `Start_Test_FormWP`  
- [`STRIPE_RESEND_RENDER.md`](./STRIPE_RESEND_RENDER.md) — Resend w kontekście Render (jeśli było używane przy innym projekcie)
