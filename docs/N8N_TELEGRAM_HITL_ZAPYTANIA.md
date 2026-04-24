# Telegram HITL — kolejka zatwierdzeń zapytań (n8n + Postgres)

Powiązane: [mechanizm maila](N8N_MECHANIZM_JEDEN_ZAPYTANIE_IMPREZA.md), [automail JSON](n8n-workflows/automail-imap-fixed.json).

## Co jest w repozytorium

| Plik | Opis |
|------|------|
| [n8n-workflows/schema-lead-queue.sql](n8n-workflows/schema-lead-queue.sql) | Tabele `lead_queue`, `lead_events` |
| [n8n-workflows/imprezja-hitl-enqueue.json](n8n-workflows/imprezja-hitl-enqueue.json) | Webhook → Perplexity (propozycja odpowiedzi) → zapis + Telegram: pełna treść zapytania, draft, 3 przyciski |
| [n8n-workflows/imprezja-hitl-telegram-callback.json](n8n-workflows/imprezja-hitl-telegram-callback.json) | Jeden trigger: przyciski **lub** wiadomość po **Modyfikuj** (instrukcje w `operator_telegram_append` — **nie** w treści maila do klienta) |

## Zmienne środowiskowe (Render / n8n)

| Zmienna | Przykład | Opis |
|---------|----------|------|
| `HITL_WEBHOOK_SECRET` | długi losowy string | Wspólny sekret: nagłówek `Authorization: Bearer …` do webhooka enqueue |
| `HITL_ENQUEUE_WEBHOOK_URL` | opcjonalnie — pełny Production URL z node **Webhook_Enqueue** | Jeśli **puste**, automail złoży adres z `WEBHOOK_URL` + `/webhook/imprezja-hitl-enqueue` (workflow enqueue musi być **Active**) |
| `WEBHOOK_URL` | `https://twoja-instancja.onrender.com` | **Tylko** origin instancji n8n, **bez** `/webhook/...`. Nie ustawiaj tu ścieżki pojedynczego webhooka. |
| `TELEGRAM_BOT_TOKEN` | `123456:ABC…` | Token bota z @BotFather |
| `TELEGRAM_OPERATOR_CHAT_ID` | np. `123456789` lub `-100…` | **Chat**, do którego bot wysyła powiadomienia HITL (DM: Twój `chat_id` z @userinfobot; **grupa:** ID grupy, zwykle ujemne) |
| `TELEGRAM_OPERATOR_USER_ID` | np. `123456789` | **Wymagane przy grupie:** Twój numeryczny `id` użytkownika (nie grupy). Bez tego dopisek po **Modyfikuj** jest **odrzucany** (`from.id` ≠ `chat_id` grupy → cisza). W DM możesz zostawić **puste** — wtedy autoryzacja = `from.id === TELEGRAM_OPERATOR_CHAT_ID`. |
| `PERPLEXITY_API_KEY` lub `PPLX_API_KEY` | `pplx-…` | Bearer do **HTTP_Perplexity_DraftReply** w workflow enqueue (jak w automailu) |
| `HITL_ALLOW_PERPLEXITY_FALLBACK_CLIENT_SEND` | (puste / `false`) | Gdy **`true`**: przy braku szablonu wolny/zajęty callback **wyśle** do klienta szkic SI + PDF (**HTTP_Resend_HitlApproved**). **Domyślnie wyłączone** — wtedy tylko **Telegram** z treścią roboczą, bez auto-maila do klienta. |

`RESEND_API_KEY`, Perplexity i Postgres — jak w [IMPORT_AUTOMAIL_RESEND_ENV.md](n8n-workflows/IMPORT_AUTOMAIL_RESEND_ENV.md). Dla `$env` w node **HTTP_HITL_EnqueueEveryMail** ustaw **`N8N_BLOCK_ENV_ACCESS_IN_NODE`** ≠ `true`.

### Błąd „Invalid JSON in response body” przy 200

Często gdy w **Respond to Webhook** masz **Respond With: JSON** i w polu body dajesz **`JSON.stringify(...)`** — n8n serializuje drugi raz i klient (np. **HTTP Request** w automailu) dostaje **niepoprawny lub pusty** JSON. W eksporcie repo **Respond_OK** / **Respond_401** używają obiektu: `={{ { ok: true, lead_id: ... } }}` (bez `JSON.stringify`).

### „Conflicting Trigger Path” / ten sam webhook co inny workflow (Telegram)

n8n zgłasza konflikt, gdy **dwa aktywne** workflowy mają trigger (np. **Telegram**) z **tą samą ścieżką** URL — w eksporcie repo to **`webhookId`: `imprezja-hitl-callback-v1`** (node **Telegram_Trigger_Callback**).

**Co zrobić:** zostaw **aktywny tylko jeden** workflow callbacku — **wyłącz** (Deactivate) starszą / zduplikowaną kopię **imprezja-hitl-telegram-callback**, potem **włącz** ten, w którym masz poprawki. Albo scal zmiany w jednym workflow i usuń duplikat z canvasu.

**Nie** uruchamiaj dwóch kopii z tym samym `webhookId` na jednej instancji n8n — Telegram i tak ma **jeden** webhook na bota; druga kopia i tak nie powinna być równolegle aktywna.

### Błąd 404: „The requested webhook … is not registered”

1. Otwórz workflow **imprezja-hitl-enqueue** i włącz go (**Active** / **Publish**). Bez tego production URL **nie istnieje**.
2. W node **HTTP_HITL_EnqueueEveryMail** ustaw **Authentication = None** i nagłówek **Authorization** = `Bearer …` z `HITL_WEBHOOK_SECRET` (pusty **Generic / Custom Auth** psuje konfigurację).
3. **`WEBHOOK_URL`** na Renderze = sam `https://…onrender.com` (poprawka, jeśli wcześniej wklejono pełną ścieżkę webhooka).

## Krok 1: baza danych

Na Postgresie (np. ta sama instancja co n8n na Render) uruchom:

```bash
psql "$DATABASE_URL" -f docs/n8n-workflows/schema-lead-queue.sql
```

W n8n dodaj **credential Postgres** i przypisz go do wszystkich node’ów **Postgres** w obu workflowach (INSERT, UPDATE status, **Modyfikuj** / dopisek).

### Gdy `queryReplacement` w Postgres nie działa

W Twojej wersji n8n tablica w `options.queryReplacement` bywa ignorowana. Zamień node **executeQuery** na:

- **Insert** / **Update** z mapowaniem kolumn w UI, **albo**
- Jeden node **Code** budujący bezpieczne parametry i osobny **Postgres** z zapytaniem wklejonym ręcznie (bez string interpolation treści maila — tylko parametry).

## Krok 2: bot Telegram

1. @BotFather → `/newbot` → zapisz token → `TELEGRAM_BOT_TOKEN`.
2. Import **imprezja-hitl-enqueue.json** i **imprezja-hitl-telegram-callback.json**.
3. W callback workflow: **Telegram Trigger** → credential **Telegram API** (ten sam token).
4. Aktywuj oba workflowy. Skopiuj **Production URL** webhooka z node **Webhook_Enqueue** (ścieżka `/webhook/imprezja-hitl-enqueue/...` zależnie od hosta).

## Krok 3: automail → HITL (wbudowane w `automail-imap-fixed.json`)

W eksporcie **[automail-imap-fixed.json](n8n-workflows/automail-imap-fixed.json)** po **ParseAndRoute** jest **HTTP_HITL_EnqueueEveryMail** → **NoOp_HITLQueuedStop**: **każdy** mail, który przeszedł **Filter** + **Perplexity** + **ParseAndRoute**, trafia na webhook **imprezja-hitl-enqueue** (Telegram z przyciskami). **Nie** leci już automatyczna ścieżka **If_HumanReview** → kalendarz → **Resend** do klienta (ta gałąź jest **odłączona**; node **If_HumanReview** zostaje osierocony — można usunąć z canvasu).

**Na Renderze dodaj** `HITL_ENQUEUE_WEBHOOK_URL` (ten sam co curl / Production URL z **Webhook_Enqueue**).

**Przywrócenie auto-oferty:** w n8n połącz z powrotem **ParseAndRoute** → **If_HumanReview** i usuń / odłącz **HTTP_HITL_EnqueueEveryMail** (albo importuj starszy commit repo).

### Wariant ręczny (stary opis, gdy budujesz workflow sam)

1. **IF** + **HTTP Request** `POST`, URL = webhook enqueue, nagłówek `Authorization: Bearer {{ $env.HITL_WEBHOOK_SECRET }}`, body z `source`, `payload_json: $json`, `ai_json` (skrót pól AI).
2. Bez równoległego Resend do klienta w tym samym przebiegu.

## Krok 4: po kliknięciu „Akceptuj”

Workflow **imprezja-hitl-telegram-callback** ustawia `status` na `approved` / `rejected`, od razu woła **answerCallbackQuery**, a przy **approve** kontynuuje łańcuchem:

1. **Code_PreparePayloadFromLead** — scala `payload_json` + `ai_json` z wiersza `lead_queue` (jak po **ParseAndRoute**).
2. Gdy **`date_ok === true`**: **HitlCal_*** → **HitlCal_PrepareOfertaMails** → **Code_HitlMergeAppendIntoOfferHtml** → przy niepustych instrukcjach z Modyfikuj: **If_HitlRefineOfferIfOperatorInstructions** → **HTTP_Perplexity_RefineOfferAfterModify** → **Code_HitlApplyPerplexityRefinedHtml** (nadpisuje `html_wolny` / `html_zajety`) → **If_HitlPreviewOnlyAfterMerge** (podgląd w Telegramie) / **Code_BuildSheetRowZapytania** → **HitlCal_Resend_*** → **HTTP_Telegram_NotifyClientMailSent**.
3. Gdy **`date_ok` false** albo brak `html_wolny`: po arkuszu **If_HitlNeedPerplexityResend** → **If_HitlEnvAllowPerplexityClientSend**. **Domyślnie** (bez env) → **Telegram** (**HTTP_Telegram_NotifyPerplexityNotSentToClient**) z treścią roboczą — **bez** Resend do klienta. Gdy **`HITL_ALLOW_PERPLEXITY_FALLBACK_CLIENT_SEND=true`** → **Code_HitlResendHtml** + **HTTP_Resend_HitlApproved** + powiadomienie o wysłaniu.

Pełna logika **zakresu dat** (**If_DateRangeOK**, lista sobót) jak w automailu **nie** jest jeszcze sklonowana w callback — wtedy zostaje gałąź Perplexity lub rozbudowa workflow.

Przy **reject** wykonywane są tylko Postgres + odpowiedź callback; **NoOp_AfterReject** kończy gałąź.

## Modyfikuj (instrukcje wewnętrzne — nie w mailu do klienta)

1. Klik **Modyfikuj** → w bazie `notes = 'MOD_WAIT'` dla tego leada (poprzednie `MOD_WAIT` w tym samym czacie jest czyszczone).
2. Wyślij **jedną** wiadomość tekstową (nie `/komenda`) — zapis w `operator_telegram_append` / `hitl_operator_instructions_for_ai`. Przy ścieżce z szablonem kalendarza (**`date_ok`**, HTML wolny/zajęty) workflow woła **Perplexity** (**HTTP_Perplexity_RefineOfferAfterModify**) i **przerabia treść HTML** oferty według tych instrukcji; w Telegramie widzisz **podgląd już po przeróbce** — możesz **Wyślij** (zaakceptować) albo **Zmień** (ponownie Modyfikuj + nowy podgląd). Instrukcje **nie** są doklejane jako osobny blok widoczny dla klienta. Wymaga **`PERPLEXITY_API_KEY`** (lub `PPLX_API_KEY`) w env callbacku, jak w enqueue.
3. **Postgres_FindModWaitLead** szuka leada po `telegram_chat_id IN (chat z wiadomości, TELEGRAM_OPERATOR_CHAT_ID)` — możesz dopisać **z grupy** albo **na priv do bota** (gdy powiadomienia szły do grupy, w bazie jest `chat_id` grupy).
4. **`TELEGRAM_OPERATOR_USER_ID`** to **osobna** zmienna niż `TELEGRAM_OPERATOR_CHAT_ID`. Sam numer w **CHAT_ID** (np. Twój id z @userinfobot w DM) **nie** ustawia **USER_ID** — jeśli powiadomienia są w **grupie**, dodaj **USER_ID** w Renderze osobno.
5. **Podgląd przed wysyłką:** po zapisaniu instrukcji workflow (`hitl_preview_only`) buduje ścieżkę jak **Akceptuj** i wysyła **drugą wiadomość** w Telegramie: podgląd treści **do klienta** (bez instrukcji) + osobna sekcja **Twoje instrukcje** + przyciski **Wyślij** / **Zmień**. **Wyślij** uruchamia arkusz + Resend (jak **Akceptuj**).
6. **Ponowne zatwierdzenie:** `Postgres_UpdateStatus` akceptuje **Akceptuj** / **Wyślij** także gdy lead jest już `approved` (np. drugi klik) — wcześniej `WHERE status = 'pending'` zwracało 0 wierszy i **cała wysyłka się nie wykonywała**. Dedup 20 min uwzględnia treść dopisku, żeby po zmianie dopisku mail nie był blokowany tym samym kluczem.

### „Wyślij do klienta” / `send_offer` — workflow OK, mail nie wychodzi

W **Executions** sprawdź, czy zielona ścieżka nie kończy się na **`HitlCal_NoOp_DuplicateResendSkipped`** (lub podobny NoOp). Przyczyna: **deduplikacja 20 min** w **Code_BuildSheetRowZapytania** (`automailOfferDedup`) — drugi przebieg z tym samym klientem + tą samą datą w oknie czasu jest **ucięty** zanim Resend. W eksporcie repo jest **`hitl_bypass_offer_dedup`**: włącza się przy **`snd:` (`send_offer`)** albo gdy jest **niepusty `operator_telegram_append`**, żeby jawne potwierdzenie z podglądu nie ginęło w dedup.

**If_BranchAppend:** wyjście **FALSE** idzie do **If_BranchVoice** (wiadomość głosowa operatora) albo dalej do **If_Skip** (callback `ap:` / `snd:` / …). Podpięcie **FALSE** bezpośrednio pod **NoOp „skip oferty”** zamiast **If_Skip** psuje callback i **Resend**.

## Głos w tym samym workflow (bez drugiego webhooka)

W **`imprezja-hitl-telegram-callback.json`** jest gałąź **voice** / **audio**: pobranie pliku z Telegrama → **jedno** wywołanie **Perplexity Sonar** z załącznikiem audio (**`file_url`** + base64, jak w [Media & Attachments](https://docs.perplexity.ai/docs/sonar/media)) → odpowiedź **tekstem** w czacie (**bez** OpenAI Whisper/TTS — Perplexity nie ma osobnego STT ani TTS w API). **Nie importuj** osobno **`imprezja-telegram-voice-perplexity.json`** na tego samego bota. Szczegóły: [N8N_VOICE_PERPLEXITY_TELEGRAM.md](N8N_VOICE_PERPLEXITY_TELEGRAM.md).

## Callback_data a limit 64 bajtów

Przyciski: `ap:` / `rj:` / `md:` + `<uuid>` (39 znaków) — mieści się w limicie Telegram.

**Uwaga:** Telegram pozwala na **jeden** URL webhooka na bota — dlatego **callback**, **wiadomości tekstowe** i **głos** są w **jednym** workflowie (`updates`: `callback_query` + `message`).

## Bezpieczeństwo

- Nie udostępniaj publicznie `HITL_WEBHOOK_SECRET` ani `TELEGRAM_BOT_TOKEN`.
- Webhook enqueue bez poprawnego `Bearer` zwraca **401**.
- Callback: autoryzacja nadawcy przez `TELEGRAM_OPERATOR_USER_ID` (grupa) lub `TELEGRAM_OPERATOR_CHAT_ID` (DM); dopasowanie leada MOD_WAIT także po `TELEGRAM_OPERATOR_CHAT_ID`.

## Meta / WhatsApp (później)

Ten sam **HTTP Request** do enqueue możesz wywołać z workflowu **Webhook** Meta / WhatsApp z `source: "messenger"` i `payload_json` zmapowanym na te same pola co mail (temat, treść, nadawca).
