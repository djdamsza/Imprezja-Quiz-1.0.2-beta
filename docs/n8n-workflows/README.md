# Workflowy n8n (import JSON)

## Pliki workflowów

### Agent wielokanałowy / HITL Telegram (import osobno)

| Plik | Opis |
|------|------|
| [schema-lead-queue.sql](./schema-lead-queue.sql) | Postgres: `lead_queue`, `lead_events` |
| [imprezja-hitl-enqueue.json](./imprezja-hitl-enqueue.json) | Webhook + INSERT + Telegram (Akceptuj/Odrzuć) |
| [imprezja-hitl-telegram-callback.json](./imprezja-hitl-telegram-callback.json) | Callback → UPDATE status + `answerCallbackQuery` |
| [imprezja-telegram-voice-perplexity.json](./imprezja-telegram-voice-perplexity.json) | Szkielet: tylko Twój głos → `getFile` (dokończ Whisper → Perplexity → TTS) |

Dokumentacja: [N8N_TELEGRAM_HITL_ZAPYTANIA.md](../N8N_TELEGRAM_HITL_ZAPYTANIA.md), [N8N_VOICE_PERPLEXITY_TELEGRAM.md](../N8N_VOICE_PERPLEXITY_TELEGRAM.md), szkic Meta/WA → [N8N_META_WA_INGRESS_STUB.md](../N8N_META_WA_INGRESS_STUB.md).

### `automail-imap-fixed.json` — **automail (główny)**

**automail:** IMAP (`biuro@`) **lub** ręczny test **`Start_Test_FormWP`** → **Filter** (formularz WP) → **Perplexity_Analyze** → **ParseAndRoute** → gałęzie Resend.

- Po **`date_ok`:** **Code_BuildCalWindow** → **If_CalendarRangeOk** → **Google_Calendar_EventsForColorCheck** → **Code_MergeCalendarAvailability** → **PrepareOfertaMails** → **If_TerminWolny** → **Resend** (wolny / zajęty). **Zajęty** = tylko wydarzenie **„Cały dzień”** w Google (API: `start.date`, bez `start.dateTime`); **bez** kolorów i **`CALENDAR_BUSY_COLOR_IDS`**. Szczegóły: [`../N8N_GOOGLE_CALENDAR_COLOR_BUSY.md`](../N8N_GOOGLE_CALENDAR_COLOR_BUSY.md).
- Po **`date_range_ok`:** **Code_BuildRangeEventsQuery** → **Google_Calendar_RangeEventsForColor** → **Code_CompactRangeEventsForColor** → **Code_ListSaturdayCalWindows** → **If_RangeSaturdayListOk** → **Code_RollupRangeSaturdays** → arkusz + mail: w liście **głównie wolne piątki i soboty** (max 10 pozycji), przy braku wolnych weekendów — prośba o sprawdzenie przed/po okresem; opcjonalnie skrót innych wolnych dni. **Do klienta jedna wiadomość:** **Code_MergeAskClarification** nie łączy się już równolegle z **Resend_AskClarification** — najpierw **Code_BuildSheetRowZapytania**, potem **If_SkipClientOfferResend** → albo **Resend_AskClarification** (sam doprecyzowanie), albo **Resend_WolnyTermin** / **Resend_TerminZajety** (oferta/zakres z **locNote** / blokiem o miejscu w **Code_RollupRangeSaturdays**).
- **Doprecyzowanie:** **Code_AskContextForAi** → **Perplexity_AskClarification** → **Code_MergeAskClarification** → **Resend_AskClarification** (+ arkusz).

| Temat | Dokument |
|--------|----------|
| Import, Resend `$env`, Render | [`IMPORT_AUTOMAIL_RESEND_ENV.md`](./IMPORT_AUTOMAIL_RESEND_ENV.md) |
| Resend, `from`, testy | [`../N8N_RESEND_SETUP_IMPREZJA.md`](../N8N_RESEND_SETUP_IMPREZJA.md) |
| IMAP, filtr Kadence | [`../N8N_IMAP_BIURO_IMPREZJA.md`](../N8N_IMAP_BIURO_IMPREZJA.md) |
| Google Calendar (Event list + OAuth) | [`../N8N_CALENDAR_FREEBUSY.md`](../N8N_CALENDAR_FREEBUSY.md), [`../N8N_GOOGLE_OAUTH_KONSOLA.md`](../N8N_GOOGLE_OAUTH_KONSOLA.md), [`../N8N_GOOGLE_CALENDAR_COLOR_BUSY.md`](../N8N_GOOGLE_CALENDAR_COLOR_BUSY.md) |
| Tygodniowy patrol stron (HTML + słowa kluczowe) | [`web-watch-weekly.json`](./web-watch-weekly.json), [`../N8N_WEB_WATCH_WEEKLY.md`](../N8N_WEB_WATCH_WEEKLY.md) |
| Patrol stron szachowych **Perplexity → mail** (bez regex) | [`web-watch-perplexity-weekly.json`](./web-watch-perplexity-weekly.json), [`../N8N_WEB_WATCH_PERPLEXITY.md`](../N8N_WEB_WATCH_PERPLEXITY.md) |
| Patrol → Perplexity → NocoDB (bez RSS, selektory) | [`../N8N_WEB_SCRAPE_PERPLEXITY_NOCODB.md`](../N8N_WEB_SCRAPE_PERPLEXITY_NOCODB.md) |
| Anty-duplikat: max 1 mail oferty (20 min) + zakres 1 item | [`../N8N_AUTOMAIL_DUPLICATE_RESEND.md`](../N8N_AUTOMAIL_DUPLICATE_RESEND.md) |
| Logika biznesowa (schemat) | [`../N8N_MECHANIZM_JEDEN_ZAPYTANIE_IMPREZA.md`](../N8N_MECHANIZM_JEDEN_ZAPYTANIE_IMPREZA.md) |
| Arkusz **73** kolumny, follow-up (3 dni) | [`../N8N_FOLLOWUP_3D_SHEETS.md`](../N8N_FOLLOWUP_3D_SHEETS.md), [`../N8N_GOOGLE_SHEETS_ZAPYTANIA.md`](../N8N_GOOGLE_SHEETS_ZAPYTANIA.md) |

### Po imporcie — obowiązkowo

1. **Credentials:** **Perplexity** (Header Auth) → **oba** node’y: **Perplexity_Analyze** i **Perplexity_AskClarification** (ten sam `Bearer pplx-…`). **Google Calendar OAuth2** → **Google_Calendar_EventsForColorCheck** i **Google_Calendar_RangeEventsForColor** (n8n może poprosić o przypisanie, jeśli ID z repo nie istnieje u Ciebie).
2. W obu node’ach **Event → Get Many** ustaw **Calendar** na właściwy kalendarz (ID: e-mail konta Google lub `…@group.calendar.google.com`).
3. **`CALENDAR_BUSY_COLOR_IDS`** — **nie jest już używane** do zajętości; możesz usunąć z env. Zajęty dzień = tylko **całodniowy** wpis w kalendarzu.
4. **`RESEND_API_KEY`** na Renderze + **`N8N_BLOCK_ENV_ACCESS_IN_NODE`** ≠ `true` (jeśli używasz `$env` w Resend i opcjonalnie **`CALENDAR_BUSY_TZ_OFFSET`** w **Code**).

Starsze, uproszczone JSON-y (`wedding-*`, duplikat `automail-resend-via-env`) **usunięto** — główna logika jest w **`automail-imap-fixed.json`**; follow-up dziennie w **`automail-followup-2d.json`** (domyślnie **2 dni** do wysyłki).

### Perplexity — krótko

- Credential **Header Auth:** nagłówek **`Authorization`** = **`Bearer pplx-…`**.
- W body **HTTP Request** **nie** dodawaj `response_format: json_object` (częsty błąd 400 u Perplexity).
- **Perplexity_Analyze:** JSON wymusza prompt; **ParseAndRoute** obcina code fence.
- **Perplexity_AskClarification:** osobny prompt (temat + HTML doprecyzowania); **Code_MergeAskClarification** parsuje JSON i ma **fallback** szablonu, gdy model zwróci śmieci.

Powiązane: [`../N8N_AUTOMATION_RECIPES.md`](../N8N_AUTOMATION_RECIPES.md) · [`../RENDER_N8N.md`](../RENDER_N8N.md)
