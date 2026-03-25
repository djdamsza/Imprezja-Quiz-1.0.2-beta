# Głos → Perplexity → głos (tylko operator, Telegram + n8n)

**Założenie:** z Perplexity rozmawiasz **Ty** (whitelist `chat_id`). Klienci nie używają tego kanału.

## Plik workflow

- [n8n-workflows/imprezja-telegram-voice-perplexity.json](n8n-workflows/imprezja-telegram-voice-perplexity.json) — szkielet: trigger → whitelist → pobranie pliku głosowego.

## Env

| Zmienna | Opis |
|---------|------|
| `TELEGRAM_BOT_TOKEN` | Jak w HITL |
| `TELEGRAM_OPERATOR_CHAT_ID` | Twój `chat_id` |
| `OPENAI_API_KEY` | Whisper + TTS (lub tylko Whisper, Perplexity osobno) |
| Perplexity | Ten sam **Header Auth** co w automail (`Bearer pplx-…`) |

`N8N_BLOCK_ENV_ACCESS_IN_NODE` nie może blokować `$env`, jeśli używasz zmiennych w node **HTTP Request** / **Code**.

## Przepływ docelowy (do domknięcia w n8n)

1. **Telegram Trigger** — zdarzenia `message`.
2. **Code** — odrzuć, jeśli `message.from.id` ≠ `TELEGRAM_OPERATOR_CHAT_ID` lub brak `message.voice` / `message.audio`.
3. **HTTP** `GET https://api.telegram.org/bot<TOKEN>/getFile?file_id=<file_id>` — z `message.voice.file_id`.
4. **HTTP** `GET https://api.telegram.org/file/bot<TOKEN>/<file_path>` — **pobranie binarne** (opcja *Response Format* / zapis jako binary w n8n).
5. **Whisper** — `POST https://api.openai.com/v1/audio/transcriptions` (multipart: `file`, `model=whisper-1`). W n8n: node **OpenAI** (Transcribe) jeśli dostępny, albo **HTTP Request** z `multipart-form-data`.
6. **Perplexity** — `POST https://api.perplexity.ai/chat/completions` jak w automail, ale prompt **konwersacyjny** (krótka odpowiedź po polsku, bez wymuszania JSON leadu).
7. **TTS** — `POST https://api.openai.com/v1/audio/speech` (`model: gpt-4o-mini-tts` lub `tts-1`, `input`: tekst z kroku 6). Wynik: plik audio.
8. **Telegram** — `sendVoice` wymaga **OGG Opus**; API OpenAI zwraca mp3/wav — albo **sendAudio** / **sendDocument**, albo konwersja (FFmpeg na serwerze / zewnętrzny serwis). Najszybciej: **sendDocument** z plikiem mp3 — działa w każdej wersji klienta.

## Koszt

Każda tura: STT + Perplexity + TTS. Ustaw niskie `max_tokens` w body Perplexity.

## Import JSON

Szkielet w repo celowo kończy się przed Whisper — wersje n8n różnią się obsługą **binary**. Dokończ 2–3 node’y w UI po imporcie; powyższa lista jest checklistą.

Powiązane: [N8N_TELEGRAM_HITL_ZAPYTANIA.md](N8N_TELEGRAM_HITL_ZAPYTANIA.md).
