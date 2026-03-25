# Google Calendar w automail: **tylko „Cały dzień”** (`start.date`)

## Co decyduje o „zajęty / wolny”

Automail **nie** używa API **free/busy** ani **`CALENDAR_BUSY_COLOR_IDS`**.

**`Code_MergeCalendarAvailability`** (jeden dzień) i **`Code_RollupRangeSaturdays`** (zakres) uznają dzień za **zajęty** wyłącznie wtedy, gdy w odpowiedzi **`events.list`** jest wydarzenie **całodniowe** w rozumieniu API Google Calendar:

- ma **`start.date`** (data w formacie `YYYY-MM-DD`),
- **nie** polega na `start.dateTime` (to są sloty z godziną).

Zakres całodniówki jest liczony jak w Google: **`end.date`** jest **wyłączny** (dzień końcowy nie wchodzi w blokadę, chyba że wydarzenie na niego jeszcze trwa wg reguł API).

### Wydarzenia **z godziną** (np. 9:00–10:00)

**Nie blokują** dnia w automailu. Jeśli chcesz, żeby dzień był zajęty, zaznacz w Google Calendar **Cały dzień** (albo utwórz osobne całodniowe „zajęte” na ten dzień).

### Dlaczego wcześniej było „wolne” przy zajętości

Starsza reguła wymagała **`colorId` ∈ `CALENDAR_BUSY_COLOR_IDS`**. Przy złym kolorze, braku `colorId` na evencie lub pustym env **żaden** dzień nie był blokowany. Obecna logika **nie używa kolorów**.

---

## Zmienne środowiskowe

| Zmienna | Znaczenie |
|--------|-----------|
| `CALENDAR_BUSY_TZ_OFFSET` | Opcjonalnie offset do okien czasu w **Code_BuildCalWindow** / zapytaniach (np. `+02:00`). |
| `CALENDAR_BUSY_COLOR_IDS` | **Ignorowane** przez obecną logikę zajętości (możesz usunąć z Rendera). |

`N8N_BLOCK_ENV_ACCESS_IN_NODE` nie może blokować `$env` tam, gdzie używasz `CALENDAR_BUSY_TZ_OFFSET`.

---

## Node’y w workflow

| Ścieżka | Node |
|--------|------|
| **Jeden dzień** | **Code_BuildCalWindow** → **If_CalendarRangeOk** → **Google_Calendar_EventsForColorCheck** → **Code_MergeCalendarAvailability** |
| **Zakres dat** | **Code_BuildRangeEventsQuery** → **Google_Calendar_RangeEventsForColor** → **Code_CompactRangeEventsForColor** → … → **Code_RollupRangeSaturdays** |

Nazwy node’ów z „ForColor” są historyczne — **filtr kolorów został wyłączony**.

---

## Po imporcie

1. **Google Calendar OAuth2** na obu node’ach **Get Many** (ten sam kalendarz).
2. Zarezerwowane imprezy: wpisuj jako **Cały dzień**, jeżeli ten dzień ma być **zajęty** w mailu do klienta.
3. W obu node’ach **Get Many** jest **Options → Time Zone = Europe/Warsaw** (spójnie z dniami w PL).

### „Wolny” mimo całodniowego wesela w kalendarzu

Najczęstsza przyczyna: **n8n czyta inny kalendarz** niż ten, w którym widzisz wydarzenie w aplikacji (np. wpis na **„DJ Damian Nowaczyk”**, a w node wybrany **inny** kalendarz / ID grupowy).  
**Ustawienia kalendarza w Google** → **Integracja kalendarza** / **Identyfikator kalendarza** — skopiuj **dokładnie ten sam ID** do pola **Calendar** w node w n8n.

Po wykonaniu workflow sprawdź w wyjściu **Code_MergeCalendarAvailability**:

- **`calendar_debug_events_in_window`** — ile wydarzeń zwrócił Google w oknie dnia.
- **`calendar_debug_all_day_events_parsed`** — ile z nich ma sensowne **całodniowe** `start.date` (bez `dateTime`).
- Gdy **`events_in_window` = 0** przy widocznym w kalendarzu evencie → **zły kalendarz** albo **timeMin/timeMax** nie obejmują dnia (rzadkie przy `Code_BuildCalWindow`).

---

## Pola pomocnicze w JSON (debug)

- `calendar_block_rule`: `google_all_day_only`
- `calendar_busy_by_all_day`: `true` gdy dzień zablokowany (całodniówka)
- `calendar_busy_by_all_day_color`: to samo co wyżej (nazwa pola historyczna, kompatybilność z arkuszem)
- `calendar_busy_color_ids`: pusty string
- `calendar_block_debug`: m.in. `cal_all_day_overlap` / `brak_blokady` / `brak_dnia`
- `calendar_debug_events_in_window` / `calendar_debug_all_day_events_parsed` (po **Merge**, jeden dzień)

Powiązane: [`N8N_CALENDAR_FREEBUSY.md`](./N8N_CALENDAR_FREEBUSY.md), [`N8N_AUTOMAIL_DUPLICATE_RESEND.md`](./N8N_AUTOMAIL_DUPLICATE_RESEND.md).
