# n8n — kalendarz: wolny / zajęty (free/busy) przy zapytaniach o termin

Po ekstrakcji daty z maila (Perplexity → **ParseJSON** → **IF** `date_ok`) następny krok to **sprawdzenie kalendarza** i dopiero potem treść maila (Resend): „mamy wolne” vs „ten termin jest zajęty”.

---

## Rekomendacja: **Google Calendar** + natywny node n8n

Najprościej, jeśli prowadzisz terminy w **Kalendarzu Google** (jeden kalendarz „Imprezy / Wesela” albo `primary`).

### 1) Google Cloud (raz na zawsze)

1. [Google Cloud Console](https://console.cloud.google.com/) → projekt (nowy lub istniejący).
2. **APIs & Services → Library** → włącz **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** — typ *External* (test) lub *Internal* (Workspace); dodaj test usera (swoje konto), jeśli app jest w trybie testowym.
4. **Credentials → Create credentials → OAuth client ID** → typ **Web application** (dla n8n w przeglądarce często tak) albo zgodnie z [dokumentacją n8n dla Google](https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/).
5. W **Authorized redirect URIs** musi być **dokładny** redirect z n8n (po utworzeniu credentialu w n8n skopiujesz URL z panelu n8n — zwykle `https://twoj-n8n.onrender.com/rest/oauth2-credential/callback`).

### 2) Credential w n8n

1. **Credentials → Google Calendar OAuth2 API** (lub ogólne **Google OAuth2** — zależnie od wersji n8n).
2. Wklej **Client ID** i **Client secret** z Google Cloud.
3. Zapisz i **Connect** / zaloguj się — zaakceptuj uprawnienia do kalendarza.

### 3) Node **Google Calendar** — operacja **Availability** (free/busy)

Wstaw node **po** gałęzi **„data OK”** (tam gdzie masz **Stub_Kalendarz_i_oferta**):

| Pole | Przykład (dostosuj do swoich pól JSON) |
|------|----------------------------------------|
| **Resource** | *Calendar* |
| **Operation** | *Availability* (lub nazwa zbliżona — sprawdź w node; pod spodem jest [Freebusy API](https://developers.google.com/calendar/api/v3/reference/freebusy/query)) |
| **Calendar** | Wybierz kalendarz z listy (np. „Wesela”) albo ID kalendarza |
| **Start Time** | Z JSON z maila, np. `={{ $json.event_date_start }}` — musi być poprawny **ISO 8601** (ParseJSON już dąży do tego). |
| **End Time** | Jeśli masz `event_date_end`, użyj `={{ $json.event_date_end }}`. Jeśli **null**: ustaw **koniec tego samego dnia** (np. Code node przed Kalendarzem — patrz niżej) albo `Start + 8 godzin` / cały dzień. |

**Format czasu:** trzymaj się **Europe/Warsaw** przy ekstrakcji w AI (`GENERIC_TIMEZONE` / `TZ` na serwerze n8n już masz w `RENDER_N8N.md`). Jeśli `event_date_start` to sama data `2026-09-20`, Google traktuje to jak **początek dnia UTC** — bezpieczniej w **Code** zbudować zakres „od 00:00 do 23:59” w Warszawie albo „od 16:00 do 04:00+1” jeśli tak liczysz imprezy.

### 4) **IF** po Availability

- Wyjście node zwykle mówi, czy **slot jest wolny** / czy są **kolizje** (zależy od opcji *Output Format*: RAW / Booked Slots / Availability — zob. dokumentację node w Twojej wersji n8n).
- **True** (wolne) → **HTTP Request → Resend**: oferta + potwierdzenie, że termin wygląda na wolny (zastrzeżenie umowne).
- **False** (zajęte) → Resend: propozycja **alternatywnych terminów** (ręczna lista w szablonie albo drugi krok AI tylko z Twoją listą „wolnych weekendów” z arkusza — zaawansowane).

### 5) Opcjonalnie: **Code** przed Kalendarzem (jeden dzień = pełny zakres)

Gdy `event_date_end` jest puste, a `event_date_start` to data imprezy:

```javascript
// Wejście: item z ParseJSON (event_date_start, event_date_end)
const startRaw = $json.event_date_start;
if (!startRaw) return [{ json: { ...$json, calStart: null, calEnd: null, skip_calendar: true } }];

const d = new Date(startRaw);
const start = new Date(d);
start.setHours(0, 0, 0, 0);
const end = new Date(d);
end.setHours(23, 59, 59, 999);

return [{
  json: {
    ...$json,
    calStart: start.toISOString(),
    calEnd: $json.event_date_end || end.toISOString(),
  }
}];
```

Potem w Google Calendar: **Start** = `{{ $json.calStart }}`, **End** = `{{ $json.calEnd }}`.  
*(Uwaga: powyższe `setHours` jest w **lokalnej** strefie serwera kontenera; na produkcji lepiej użyć biblioteki strefy albo budować string z offsetem +02:00 — przy ISO z Perplexity często wystarczy gotowy zakres z AI.)*

---

## Alternatywa: **HTTP Request** → `freeBusy.query` (bez pełnego node)

Gdy wolisz jeden **HTTP Request** z OAuth2 (ten sam credential Google OAuth):

- **Method:** POST  
- **URL:** `https://www.googleapis.com/calendar/v3/freeBusy`  
- **Auth:** OAuth2 (Google)  
- **Body (JSON):**

```json
{
  "timeMin": "2026-09-20T00:00:00+02:00",
  "timeMax": "2026-09-20T23:59:59+02:00",
  "items": [{ "id": "TWOJ_CALENDAR_ID@group.calendar.google.com" }]
}
```

Odpowiedź: `calendars[id].busy[]` — jeśli tablica **pusta** → dzień **wolny** (w tym przedziale).  
`timeMin` / `timeMax` ustaw z wyrażeń n8n na podstawie `$json.event_date_start`.

---

## Microsoft 365 / Outlook

Jeśli kalendarz jest w **Outlook** (firmowy Microsoft 365):

- W n8n: credential **Microsoft Outlook** lub **Microsoft Graph OAuth2**.
- Graph API: np. [`getSchedule`](https://learn.microsoft.com/en-us/graph/api/calendar-getschedule) albo zapytanie o zdarzenia w oknie czasowym — wymaga **Application** lub **Delegated** permissions (`Calendars.Read`, czasem `Calendars.Read.Shared`).
- Konfiguracja jest cięższa niż Google; warto wtedy osobny mały workflow testowy tylko pod Graph.

---

## Dobre praktyki (biznesowe + techniczne)

1. **Nie obiecuj w 100%** w mailu auto — napisz np. „wg naszego kalendarza termin wygląda na wolny; potwierdzę w ciągu 24 h”.
2. **Tylko `date_ok`** — jak w Twoim workflow: przy `low` / braku daty **nie** wołaj kalendarza (unikasz sprawdzania „całego roku”).
3. **Błędy API** — gałąź **Error workflow** lub **Continue On Fail** + mail do Ciebie, żeby klient nie dostał ciszy przy wygaśnięciu OAuth.
4. **Odświeżanie OAuth na Renderze** — tokeny Google w credentialu n8n zapisują się w bazie; po backupie bazy nie gub **N8N_ENCRYPTION_KEY**.

---

## Reguła „tylko całodniowe + zajęte = 100% zajęty”

Jeśli w kalendarzu oznaczasz imprezy jak na Twoim screenie (**Cały dzień** + **Zajęty**), a inne wpisy mają być traktowane inaczej — patrz osobny plik z mapowaniem API i gotowym **Code** node: [`N8N_GOOGLE_CALENDAR_ALLDAY_BUSY.md`](./N8N_GOOGLE_CALENDAR_ALLDAY_BUSY.md).

---

## Automail (aktualnie): „Cały dzień” + kolor — zamiast samego free/busy

W **`automail-imap-fixed.json`** decyzja **wolny/zajęty** opiera się na **`events.list`**: wydarzenie musi być **całodniowe** (w API: `start.date` bez `dateTime`, odpowiednik checkboxa **„Cały dzień”**) **oraz** mieć **`colorId`** z env **`CALENDAR_BUSY_COLOR_IDS`**. Node **Availability (free/busy)** został z łańcucha **usunięty**. Szczegóły: [`N8N_GOOGLE_CALENDAR_COLOR_BUSY.md`](./N8N_GOOGLE_CALENDAR_COLOR_BUSY.md).

---

## Powiązane pliki

- Gotowy łańcuch: [`n8n-workflows/automail-imap-fixed.json`](./n8n-workflows/automail-imap-fixed.json) — **Code_BuildCalWindow** → **Google_Calendar_EventsForColorCheck** → **Code_MergeCalendarAvailability** → **PrepareOfertaMails** → Resend.
- Ogólna receptura B: [`N8N_AUTOMATION_RECIPES.md`](./N8N_AUTOMATION_RECIPES.md).
- Resend: [`N8N_EMAIL_SETUP.md`](./N8N_EMAIL_SETUP.md).
