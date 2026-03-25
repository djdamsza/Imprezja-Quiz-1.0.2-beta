# Google Calendar — reguła „impreza = cały dzień + zajęty” (n8n)

Twoja konwencja w UI Kalendarza Google (jak na screenie):

| W interfejsie Google | Znaczenie w automatyzacji |
|---------------------|---------------------------|
| **Cały dzień** ✓ | W API to wydarzenie ma **`start.date`** / **`end.date`** (bez godzin), a nie `start.dateTime`. |
| **Zajęty** (nie „Dostępny”) | W API: **`transparency`** jest **`opaque`** albo **brak pola** (domyślnie = zajęty). „Dostępny” = `transparency: transparent` — **nie** liczysz jako blokady imprezowej. |

**Reguła biznesowa:** uznajesz termin za **na 100% zajęty**, gdy w danym dniu jest wydarzenie spełniające **obie** cechy: **całodniowe** + **zajęte (opaque)**.  
Jeśli **nie ma** takiego wydarzenia w sprawdzanym dniu → traktujesz slot jako **wolny** (wg Twojej logiki ofertowej).

*(Inne spotkania 1h „Busy” nadal blokują w free/busy — jeśli chcesz ignorować wszystko poza całodniówkami, filtruj wyłącznie jak w sekcji „Kod” poniżej.)*

---

## Ważne: nie „API key”, tylko **OAuth 2.0**

Do **Twojego** kalendarza (DJ Damian itd.) Google **nie** daje dostępu samym **API key** z Cloud Console.  
**API key** służy głównie do danych publicznych; kalendarz osobisty = **OAuth**:

1. Google Cloud Console → włącz **Google Calendar API**.  
2. **Credentials → OAuth 2.0 Client ID** (typ zwykle **Web application** albo zgodnie z [dokumentacją n8n dla Google](https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/)).  
3. W n8n: credential **Google Calendar OAuth2** → **Client ID** + **Client secret** → połączenie konta (raz autoryzujesz dostęp do kalendarza).

„Znajdę API key” → szukaj w Cloud Console sekcji **OAuth** (Client ID / Secret), nie samego „API keys” dla tego use case.

**Co dokładnie wpisać w formularzu klienta OAuth (origins + redirect URI):** [`N8N_GOOGLE_OAUTH_KONSOLA.md`](./N8N_GOOGLE_OAUTH_KONSOLA.md).

---

## Mapowanie UI → JSON API (przykład)

Całodniowe wydarzenie 28.03.2026, zajęte:

```json
{
  "summary": "40 urodziny …",
  "start": { "date": "2026-03-28" },
  "end": { "date": "2026-03-29" },
  "transparency": "opaque"
}
```

Uwaga: przy **całym dniu** data **`end.date` jest wyłączna** (exclusive) — jeden dzień 28.03 to często `start: 2026-03-28`, `end: 2026-03-29`.  
Jeśli pola **`transparency`** nie ma — Google traktuje jako **zajęte** (`opaque`).

Wydarzenie **„Dostępny”** w UI:

```json
"transparency": "transparent"
```

Takich **nie** używasz jako „100% zajęte imprezą” w Twojej regule.

---

## Pobranie wydarzeń w n8n (zalecane podejście)

### Opcja A — node **Google Calendar**

- Operacja typu **Get All** / **Get Many** (nazwa zależy od wersji n8n) dla wybranego kalendarza (**DJ Damian Nowaczyk** itd.).
- Zakres czasu: **początek dnia** i **koniec dnia** (lub +1 dzień) dla `event_date_start` z maila (po **ParseJSON**).

### Opcja B — **HTTP Request** (OAuth2)

`GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events`

Query (przykład — dostosuj `timeMin` / `timeMax` i strefę):

- `timeMin` — początek sprawdzanego dnia w RFC3339, np. `2026-03-28T00:00:00+01:00`
- `timeMax` — koniec okna, np. `2026-03-29T00:00:00+01:00`
- `singleEvents=true`
- `orderBy=startTime`

Nagłówek autoryzacji obsługuje credential OAuth2 w n8n.

`calendarId` znajdziesz w ustawieniach kalendarza w Google (często email lub `...@group.calendar.google.com`).

---

## Kod w node **Code** (JavaScript) — czy dzień jest „100% zajęty” Twoją definicją

Wejście: tablica `items` z odpowiedzi `events` API (albo zmapuj z node Google Calendar do jednego obiektu z polem `items`).

Parametr z poprzedniego node: **`checkDate`** = string `YYYY-MM-DD` (wyciągnij z `event_date_start` przed Code, np. pierwsze 10 znaków ISO).

```javascript
// Dzień do sprawdzenia: 'YYYY-MM-DD' — ustaw z $json.event_date_start
const checkDate = ($json.event_date_start || '').slice(0, 10);
if (!checkDate || checkDate.length !== 10) {
  return [{ json: { ...$json, impreza_zajmuje_caly_dzien: false, calendar_check_error: 'brak_daty' } }];
}

const items = $input.first().json.items || $input.first().json || [];
const list = Array.isArray(items) ? items : (items.items || []);

function dateInAllDayEvent(isoDay, event) {
  const s = event.start;
  if (!s || !s.date) return false; // nie całodniowe (jest dateTime) → Twoja reguła: nie liczy jako ten typ imprezy
  const e = event.end?.date;
  if (!e) return false;
  // all-day: end exclusive
  return isoDay >= s.date && isoDay < e;
}

function isBusyImpreza(event) {
  if (event.transparency === 'transparent') return false;
  return true; // opaque lub brak pola
}

let blocked = false;
let matched = null;

for (const ev of list) {
  if (!dateInAllDayEvent(checkDate, ev)) continue;
  if (!isBusyImpreza(ev)) continue;
  blocked = true;
  matched = { summary: ev.summary, start: ev.start, end: ev.end };
  break;
}

return [{
  json: {
    ...$json,
    calendar_check_date: checkDate,
    impreza_zajmuje_caly_dzien: blocked,
    matched_event: matched,
  }
}];
```

Następnie **IF** na `{{ $json.impreza_zajmuje_caly_dzien }}` → gałąź Resend „termin zajęty” vs „wygląda na wolny”.

---

## Uproszczenie: tylko **freeBusy** (bez filtrowania „tylko całodniówki”)

`freeBusy.query` **nie** zwraca `transparency` ani rozróżnienia „cały dzień” vs 1 h — zwraca tylko przedziały **busy**.  
Jeśli chcesz **dokładnie** regułę „tylko całodniowe + zajęte”, użyj **`events.list`** + **Code** jak wyżej.  
Jeśli w kalendarzu **wszystko** co wpisujesz jako blokadę jest istotne — freeBusy może wystarczyć (prostsze, bez filtrowania).

---

## Checklist

- [ ] OAuth Calendar w n8n (nie sam API key).  
- [ ] Kalendarz wybrany ten sam co w UI (np. „DJ Damian Nowaczyk”).  
- [ ] Dla daty z maila: okno `timeMin` / `timeMax` na **jeden dzień** w **Europe/Warsaw**.  
- [ ] **Code** + **IF** + dwa szablony **Resend**.  
- [ ] W mailu do klienta zastrzeżenie: „wg kalendarza” / potwierdzenie ręczne.

---

## Powiązane

- Ogólny opis free/busy i Availability: [`N8N_CALENDAR_FREEBUSY.md`](./N8N_CALENDAR_FREEBUSY.md)  
- Deploy n8n: [`RENDER_N8N.md`](./RENDER_N8N.md)  
- Resend: [`N8N_EMAIL_SETUP.md`](./N8N_EMAIL_SETUP.md)
