# Głos → Perplexity → głos (tylko operator, Telegram + n8n)

**Założenie:** z Perplexity rozmawiasz **Ty** (ta sama autoryzacja co dopisek HITL: `TELEGRAM_OPERATOR_USER_ID` / `TELEGRAM_OPERATOR_CHAT_ID`). Klienci nie używają tego kanału.

## Gdzie to jest wdrożone

**Produkcja:** pełna ścieżka jest w **[imprezja-hitl-telegram-callback.json](n8n-workflows/imprezja-hitl-telegram-callback.json)** (jeden webhook z tekstem i callbackami — patrz [N8N_TELEGRAM_HITL_ZAPYTANIA.md](N8N_TELEGRAM_HITL_ZAPYTANIA.md)). Po imporcie tego pliku **nie** aktywuj osobnego workflowu z drugim **Telegram Trigger** na tego samego bota.

- [n8n-workflows/imprezja-telegram-voice-perplexity.json](n8n-workflows/imprezja-telegram-voice-perplexity.json) — tylko **szkielet referencyjny** (nie importować równolegle na ten sam bot).

## Env

| Zmienna | Opis |
|---------|------|
| `TELEGRAM_BOT_TOKEN` | Jak w HITL |
| `TELEGRAM_OPERATOR_CHAT_ID` / `TELEGRAM_OPERATOR_USER_ID` | Jak w HITL (autoryzacja operatora) |
| `PERPLEXITY_API_KEY` lub `PPLX_API_KEY` | To samo co refine oferty / automail |

**Bez `OPENAI_API_KEY`** w aktualnym eksporcie gałęzi głosu — cała ścieżka idzie przez Perplexity.

`N8N_BLOCK_ENV_ACCESS_IN_NODE` nie może blokować `$env`, jeśli używasz zmiennych w node **HTTP Request** / **Code**.

## Jak to działa w repo (bez Whispera OpenAI)

Perplexity **nie udostępnia** osobnego endpointu typu Whisper. W **`imprezja-hitl-telegram-callback.json`** używane jest **jedno** `POST /chat/completions` z treścią użytkownika typu **tablica**: tekst instrukcji + **`file_url`** z **base64** pliku audio (wg [Media & Attachments — Sending Files](https://docs.perplexity.ai/docs/sonar/media); oficjalnie wymienione są głównie PDF/DOC/TXT — **nagrania głosowe `.ogg` z Telegrama mogą być odrzucone**; wtedy w odpowiedzi zobaczysz komunikat błędu z API).

**Odpowiedź do operatora** jest wysyłana **tylko jako tekst** (`sendMessage`) — Perplexity API **nie** generuje pliku mowy (TTS).

## Koszt

Jedna tura Perplexity na wiadomość głosową (większy payload przez base64). Ustaw rozsądnie `max_tokens`.

## Import JSON

W **`imprezja-hitl-telegram-callback.json`** po imporcie sprawdź węzeł **Code_VoiceBuildPerplexityBody** (binary **`data`** po **HTTP_Telegram_DownloadVoice**) oraz **HTTP_Perplexity_VoiceFromAudio**.

Stary szkielet **`imprezja-telegram-voice-perplexity.json`** nie trzeba importować do działania głosu.

Powiązane: [N8N_TELEGRAM_HITL_ZAPYTANIA.md](N8N_TELEGRAM_HITL_ZAPYTANIA.md).
