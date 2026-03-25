# Import `automail` — Resend przez `RESEND_API_KEY` (wariant 2)

## Uwaga: zepsuty eksport z n8n

Jeśli po **Download** z UI brakuje triggerów (**`Start_Test_FormWP`**, **`IMAP`**) albo połączeń do **Filter** / **Perplexity** (analiza **i** doprecyzowanie) — to często **niepełny eksport**. **Importuj** ponownie z repo: [`automail-imap-fixed.json`](./automail-imap-fixed.json).

---

Plik workflowu: **[`automail-imap-fixed.json`](./automail-imap-fixed.json)** (IMAP / test, **Perplexity ×2** — `Perplexity_Analyze` + `Perplexity_AskClarification`, **Google Calendar Availability**, Resend przez `$env`).

## Co jest zmienione

Wszystkie node’y **`Resend_NotifyDJ`**, **`Resend_AskClarification`**, **`Resend_WolnyTermin`**, **`Resend_TerminZajety`**:

- **Authentication:** `None` (brak credentialu Resend w n8n).
- **Headers:** `Authorization` = `={{ 'Bearer ' + $env.RESEND_API_KEY }}`, `Content-Type` = `application/json`.

**Perplexity** używa **Header Auth** na **dwóch** node’ach HTTP — przypisz **ten sam** credential do **`Perplexity_Analyze`** i **`Perplexity_AskClarification`** (po imporcie drugi bywa bez credentialu). **Nie usuwaj** tego typu credentialu z n8n.

## Render (serwis n8n)

| Zmienna | Wartość |
|---------|---------|
| `RESEND_API_KEY` | sam klucz `re_…` (**bez** słowa `Bearer`, **bez** cudzysłowów w polu wartości) |

### Obowiązkowe, jeśli masz `access to env vars denied`

W workflow nagłówek to `={{ 'Bearer ' + $env.RESEND_API_KEY }}` — **Bearer dopisuje n8n w wyrażeniu**, w Renderze trzymasz **tylko** `re_…`.

Jeśli w Environment masz **`N8N_BLOCK_ENV_ACCESS_IN_NODE`** = **`true`** (jak na typowym screenie z Rendera) — **usuń tę zmienną całkowicie** (kosz) **albo** ustaw wartość **`false`**, potem **Save and deploy**.  
Dopóki jest `true`, **`$env.RESEND_API_KEY` w ogóle nie działa** w node’ach (to nie błąd klucza, tylko blokada n8n).

Szczegóły: [`RENDER_N8N.md`](../RENDER_N8N.md) → sekcja *access to env vars denied*.

**Uwaga:** `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` **nie wystarczy**, jeśli problemem jest **401**, brak **`RESEND_API_KEY`** na liście zmiennych albo zły adres **`from`**. Tabela „false a nadal nie działało”: [`N8N_RESEND_SETUP_IMPREZJA.md`](../N8N_RESEND_SETUP_IMPREZJA.md) (sekcja pod wariantem `$env`).

Po każdej zmianie Environment: **Save and deploy**.

## W n8n po imporcie

1. **Usuń** credential **Resend API** (jeśli już niepotrzebny).
2. Zaimportuj JSON workflowu (lub nadpisz istniejący).
3. Uruchom test — jeśli w logu jest „access to env vars denied”, sprawdź `N8N_BLOCK_ENV_ACCESS_IN_NODE` na Renderze.

Pełna checklista błędów 401: [`N8N_RESEND_SETUP_IMPREZJA.md`](../N8N_RESEND_SETUP_IMPREZJA.md).

## Google Calendar (po imporcie)

1. **Credentials → Google Calendar OAuth2** — Client ID / Secret z GCP, redirect URI jak w [`N8N_GOOGLE_OAUTH_KONSOLA.md`](../N8N_GOOGLE_OAUTH_KONSOLA.md); włącz **Google Calendar API** w projekcie.  
   Jeśli Google pisze, że aplikacja *nie przeszła weryfikacji* / **403 `access_denied`** — w **OAuth consent screen** dodaj swój Gmail w **Test users** (projekt w trybie *Testing*). Szczegóły: sekcja **0** w tym samym pliku.
2. Node’y **Google_Calendar_EventsForColorCheck** i **Google_Calendar_RangeEventsForColor** → przypisz **Google Calendar OAuth2** → wybierz **Calendar** (ID kalendarza z imprezami). (**Availability / free-busy** nie jest już w tym workflow.)
3. Domyślny zakres dnia: **Code_BuildCalWindow** (00:00–23:59, offset **`+02:00`**). Zimą lub inna strefa: opcjonalnie na Renderze **`CALENDAR_BUSY_TZ_OFFSET`** = np. `+01:00` (wymaga **`N8N_BLOCK_ENV_ACCESS_IN_NODE=false`**, żeby Code widział `$env`).
4. **Wolny vs zajęty:** Google zwraca `{ available: true|false }`; **Code_MergeCalendarAvailability** ustawia **`demo_termin_wolny`** → **If_TerminWolny** → właściwy Resend.

Szczegóły API: [`N8N_CALENDAR_FREEBUSY.md`](../N8N_CALENDAR_FREEBUSY.md).

## Zawsze „termin zajęty” mimo wolnych dni w Google

1. **Sprawdź, który dzień naprawdę idzie do Google** — w wykonaniu otwórz **ParseAndRoute** → **`event_date_start`** oraz **Code_BuildCalWindow** → **`check_date_ymd`** / **`calStart`**. To musi się zgadzać z datą z treści maila.
2. **Błędny dzień tygodnia w mailu** — np. „sobota 8 kwietnia 2027”, a **8.04.2027 to czwartek**. Model mógł wcześniej „poprawiać” na **sobotę 10.04** przy każdym teście → zawsze ten sam dzień w kalendarzu. W aktualnym workflow prompt Perplexity mówi: **przy sprzeczności ufaj liczbom daty**, nie słowu „sobota”. W teście używaj spójnej pary: **„sobota 10 kwietnia 2027”** albo **„8 kwietnia 2027 (czwartek)”** bez słowa sobota.
3. **Node’y Google Calendar** — **Resource = Event**, **Operation = Get Many** (**Google_Calendar_EventsForColorCheck**, **Google_Calendar_RangeEventsForColor**); kalendarz **ten sam** co w aplikacji. Logika wolny/zajęty: **tylko wydarzenie „Cały dzień”** (`start.date` w API) — patrz **`N8N_GOOGLE_CALENDAR_COLOR_BUSY.md`** (bez `CALENDAR_BUSY_COLOR_IDS`).
4. Okno czasu w **Code_BuildCalWindow** / zakresie jest **[początek dnia, początek następnego dnia)** (zgodnie z API Google przy zapytaniu o wydarzenia).

## Test workflowu „kręci się” i nie kończy — co sprawdzić

1. **Który node faktycznie wisi**  
   W n8n: **Executions** (lista wykonań) → otwórz ostatnie → zobacz, na **którym** node’u execution stoi lub ile trwa. Często to **nie** Kalendarz, tylko **Perplexity_Analyze** lub **Perplexity_AskClarification** (bywa **20–60 s** i wygląda jak zawieszka).

2. **Nie uruchamiaj samego `Google_Calendar_EventsForColorCheck` („Execute step”)** bez kontekstu  
   Wyrażenia **timeMin/timeMax** biorą **`calStart` / `calEnd`** z **Code_BuildCalWindow** (`$('Code_BuildCalWindow').first().json`). Testuj **cały łańcuch** od **`Start_Test_FormWP`** albo od **Code_BuildCalWindow** z pin data.

3. **Node Google Calendar — *Event* → *Get Many***  
   Po imporcie sprawdź **Google_Calendar_EventsForColorCheck** i **Google_Calendar_RangeEventsForColor**: **Resource** = *Event*, **Operation** = *Get Many*, poprawny **Calendar** i zakres czasu.

4. **HTTP Request (Resend) — Authentication = None**  
   Przy nagłówku `Authorization` z **`$env.RESEND_API_KEY`** ustaw w każdym node Resend: **Authentication → None**. Jeśli zostanie np. „Generic Credential”, n8n może czekać na credential zamiast tylko wysłać nagłówki.

5. **OAuth „Connection successful” a workflow**  
   Zielony komunikat w przeglądarce znaczy tylko, że **token zapisał się w credentialu**. Nie oznacza, że pojedynczy **Execute** na końcu łańcucha już przeszedł — patrz punkt 1 (Executions).
