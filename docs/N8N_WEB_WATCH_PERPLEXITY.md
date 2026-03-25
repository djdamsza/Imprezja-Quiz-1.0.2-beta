# Tygodniowy patrol stron szachowych — Perplexity → e-mail

Osobny workflow n8n (**nie zastępuje** [`web-watch-weekly.json`](./n8n-workflows/web-watch-weekly.json)): dla każdej skonfigurowanej strony pobiera **HTML**, wysyła fragment do **Perplexity** (`sonar`), oczekuje **JSON** z listą trafień, składa **jeden digest** i wysyła przez **Resend** (jak stary web-watch).

**Plik:** [`docs/n8n-workflows/web-watch-perplexity-weekly.json`](./n8n-workflows/web-watch-perplexity-weekly.json) — importuj **ten plik .json**, nie `build-web-watch-perplexity.js`. W n8n: *Import from File*. Jeśli komunikat „invalid JSON”: pobierz plik ponownie z repo (pełny plik, bez kopiowania z podglądu GitHub) lub uruchom lokalnie `node docs/n8n-workflows/build-web-watch-perplexity.js` i zaimportuj wygenerowany JSON.

**Regeneracja JSON** (po edycji promptu / kodu w skrypcie):  
`node docs/n8n-workflows/build-web-watch-perplexity.js`

## Wymagania (env / credentials)

| Zmienna / credential | Opis |
|---------------------|------|
| **`PERPLEXITY_API_KEY`** lub **`PPLX_API_KEY`** | Klucz w nagłówku `Authorization: Bearer …` w node **HTTP_Perplexity** (jak w szablonie). Alternatywa: **Credential → Header Auth** z `Bearer pplx-…` — wtedy usuń/wyłącz duplikat nagłówka z wyrażenia. |
| **`RESEND_API_KEY`** lub **`RESENDAPIKEY`** | Jak w automail / [`N8N_WEB_WATCH_WEEKLY.md`](./N8N_WEB_WATCH_WEEKLY.md). |
| **`N8N_BLOCK_ENV_ACCESS_IN_NODE`** | Nie może blokować `$env`, jeśli używasz kluczy z env. |

W **Code_AggregateDigest** ustaw **`DIGEST_TO`** / **`DIGEST_FROM`** (jak w starym web-watch).

## Konfiguracja stron

Node **Code_WebWatchConfig** — tablica **`SITES`**:

- **`url`**, **`name`**, **`id`**
- **`keywords`** — zwykłe **frazy** (nie RegExp); trafiają do promptu jako „szukaj treści związanych z…”.
- **`maxHtmlChars`** — ile znaków HTML wysłać do API (domyślnie sensownie 18 000).

## Zachowanie

- **Koszt:** jedno wywołanie Perplexity **na stronę** na przebieg (np. 3 strony = 3 requesty).
- **Deduplikacja:** hash digestu w **`$getWorkflowStaticData('global').webWatchPplxDedup`** — przy identycznej treści i **są trafienia**, mail **nie** poleci ponownie (jak w regexowym web-watch).
- **Błąd parsowania JSON** z modelu: digest zawiera fragment odpowiedzi; **`has_hits`** może być true, żebyś dostał powiadomienie.
- Model **nie ma** gwarantowanego dostępu do sieci poza przekazanym HTML — dla stron renderowanych w całości w JS (pusty HTML) wynik może być pusty; wtedy rozważ inny URL lub narzędzie typu Playwright (poza zakresem tego szablonu).

## Stary vs nowy workflow

| | `web-watch-weekly` | `web-watch-perplexity-weekly` |
|--|-------------------|------------------------------|
| Logika | Regex, linki, daty w JS | Perplexity + JSON |
| Koszt | Brak API AI | Perplexity (per URL) |
| FB / ciężki JS | Słabo | Słabo (ten sam problem HTML) |

Powiązanie: ogólny opis **HTML → Perplexity → NocoDB** — [`N8N_WEB_SCRAPE_PERPLEXITY_NOCODB.md`](./N8N_WEB_SCRAPE_PERPLEXITY_NOCODB.md).
