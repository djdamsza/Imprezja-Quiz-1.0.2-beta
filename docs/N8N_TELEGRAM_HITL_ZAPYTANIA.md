# Telegram HITL — kolejka zatwierdzeń zapytań (n8n + Postgres)

Powiązane: [mechanizm maila](N8N_MECHANIZM_JEDEN_ZAPYTANIE_IMPREZA.md), [automail JSON](n8n-workflows/automail-imap-fixed.json).

## Co jest w repozytorium

| Plik | Opis |
|------|------|
| [n8n-workflows/schema-lead-queue.sql](n8n-workflows/schema-lead-queue.sql) | Tabele `lead_queue`, `lead_events` |
| [n8n-workflows/imprezja-hitl-enqueue.json](n8n-workflows/imprezja-hitl-enqueue.json) | Webhook zapis + wiadomość Telegram z przyciskami |
| [n8n-workflows/imprezja-hitl-telegram-callback.json](n8n-workflows/imprezja-hitl-telegram-callback.json) | Trigger Telegram → `answerCallbackQuery` + UPDATE status |

## Zmienne środowiskowe (Render / n8n)

| Zmienna | Przykład | Opis |
|---------|----------|------|
| `HITL_WEBHOOK_SECRET` | długi losowy string | Wspólny sekret: nagłówek `Authorization: Bearer …` do webhooka enqueue |
| `TELEGRAM_BOT_TOKEN` | `123456:ABC…` | Token bota z @BotFather |
| `TELEGRAM_OPERATOR_CHAT_ID` | np. `123456789` | **Twój** numeryczny `chat_id` (whitelist); @userinfobot |

`RESEND_API_KEY`, Perplexity i Postgres — jak w [IMPORT_AUTOMAIL_RESEND_ENV.md](n8n-workflows/IMPORT_AUTOMAIL_RESEND_ENV.md).

## Krok 1: baza danych

Na Postgresie (np. ta sama instancja co n8n na Render) uruchom:

```bash
psql "$DATABASE_URL" -f docs/n8n-workflows/schema-lead-queue.sql
```

W n8n dodaj **credential Postgres** i przypisz go do node **Postgres_InsertLead** / **Postgres_UpdateStatus** po imporcie JSON.

### Gdy `queryReplacement` w Postgres nie działa

W Twojej wersji n8n tablica w `options.queryReplacement` bywa ignorowana. Zamień node **executeQuery** na:

- **Insert** / **Update** z mapowaniem kolumn w UI, **albo**
- Jeden node **Code** budujący bezpieczne parametry i osobny **Postgres** z zapytaniem wklejonym ręcznie (bez string interpolation treści maila — tylko parametry).

## Krok 2: bot Telegram

1. @BotFather → `/newbot` → zapisz token → `TELEGRAM_BOT_TOKEN`.
2. Import **imprezja-hitl-enqueue.json** i **imprezja-hitl-telegram-callback.json**.
3. W callback workflow: **Telegram Trigger** → credential **Telegram API** (ten sam token).
4. Aktywuj oba workflowy. Skopiuj **Production URL** webhooka z node **Webhook_Enqueue** (ścieżka `/webhook/imprezja-hitl-enqueue/...` zależnie od hosta).

## Krok 3: wywołanie z automail (bez edycji całego JSON ręcznie)

Po node **ParseAndRoute** (gałąź, która **nie** jest `human` i ma sens wysłać ofertę — np. powiel logikę z istniejących **IF**):

1. Dodaj **IF** `HITL_ENABLED`: np. `{{ $env.HITL_TELEGRAM === '1' }}`.
2. **True** → **HTTP Request**:
   - Method: `POST`
   - URL: pełny URL webhooka z enqueue
   - Header: `Authorization` = `Bearer {{ $env.HITL_WEBHOOK_SECRET }}`
   - Body (JSON):

```json
{
  "source": "mail",
  "payload_json": "={{ $json }}",
  "ai_json": "={{ { is_event_inquiry: $json.is_event_inquiry, event_date_start: $json.event_date_start, date_ok: $json.date_ok, raw_quote: $json.raw_quote } }}"
}
```

W **Expression** w n8n `payload_json` ustaw jako obiekt z `$json` (cały output ParseAndRoute), nie podwójnego stringify — webhook i tak serializuje body.

3. **False** → istniejące połączenie (jak dziś) do kalendarza / Resend.

**Uwaga:** jeśli HITL = true, **nie** idź równolegle od razu w Resend — inaczej klient dostanie maila przed Twoją akceptacją. Chodzi o **albo** HITL **albo** auto dla danego przebiegu.

## Krok 4: po kliknięciu „Akceptuj”

Workflow **imprezja-hitl-telegram-callback** ustawia `status` na `approved` / `rejected`. **Nie uruchamia** jeszcze automaila — to świadomie do dopracowania:

- **Wariant A:** Node **Execute Workflow** z **podworkflowem**, który przyjmuje `lead_id`, robi **SELECT** z `lead_queue`, odtwarza item jak po `ParseAndRoute` i łączy w istniejące node’y (wymaga skopiowania fragmentu automaila).
- **Wariant B:** Ręczna obsługa: po akceptacji dostajesz `id` w bazie; pierwsza wersja HITL i tak zastępuje wysyłkę **powiadomieniem**, żeby nic nie poszło do klienta bez Twojej decyzji — dokończenie wysyłki z panelu lub drugi krok w n8n.

Możesz dodać node **Postgres** `SELECT * FROM lead_queue WHERE id = $1` po UPDATE i **Telegram** z podsumowaniem „Zaakceptowano — wyślij ofertę ręcznie z szablonu”.

## Callback_data a limit 64 bajtów

Przyciski używają `ap:<uuid>` / `rj:<uuid>` (36 znaków UUID + 3 = 39) — mieści się w limicie Telegram.

## Bezpieczeństwo

- Nie udostępniaj publicznie `HITL_WEBHOOK_SECRET` ani `TELEGRAM_BOT_TOKEN`.
- Webhook enqueue bez poprawnego `Bearer` zwraca **401**.
- Callback obsługuje tylko `TELEGRAM_OPERATOR_CHAT_ID`.

## Meta / WhatsApp (później)

Ten sam **HTTP Request** do enqueue możesz wywołać z workflowu **Webhook** Meta / WhatsApp z `source: "messenger"` i `payload_json` zmapowanym na te same pola co mail (temat, treść, nadawca).
