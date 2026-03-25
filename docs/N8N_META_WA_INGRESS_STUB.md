# Meta Messenger / Instagram DM / WhatsApp → ten sam HITL (szkic)

Gdy masz już działający [webhook enqueue](N8N_TELEGRAM_HITL_ZAPYTANIA.md):

1. **Osobny workflow** z triggerem **Webhook** (GET verify + POST) zgodnie z dokumentacją Meta / WhatsApp Cloud API.
2. Node **Code** mapuje payload na jeden obiekt z polami zgodnymi z tym, co zapisujesz w `payload_json` z maila, np.:
   - `emailSubject` — skrót lub „Wiadomość z Messenger”
   - `emailBody` / `emailBodyForAi` — tekst od klienta
   - `emailFrom` — identyfikator nadawcy (PSID / numer WA — do logów; **nie** wysyłaj Resend na ten identyfikator bez osobnej logiki)
   - `client_to_email` — jeśli nie ma, zostaw puste i w gałęzi Resend użyj szablonu „prosimy o maila” albo **human** = true
3. **HTTP Request** `POST` na URL **imprezja-hitl-enqueue** z tym samym `Authorization: Bearer` i body `{ "source": "messenger", "payload_json": { … } }`.

**Uwaga:** pełna automatyczna odpowiedź do klienta na Messengerze wymaga **wysyłki przez API Meta** (osobny node HTTP), nie przez Resend. HITL w Telegramie nadal działa jako Twoja akceptacja treści / decyzji.

Szczegóły uprawnień aplikacji Meta poza zakresem tego repo — zob. [Meta Developers](https://developers.facebook.com/docs/messenger-platform).
