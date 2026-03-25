# Scraping stron bez RSS → Perplexity (jak automail) → NocoDB

Schemat z tutoriali typu *„Scrape and summarize posts… save to NocoDB”* da się u Ciebie złożyć w **n8n** tak samo jak **automail**: **HTTP Request → Perplexity** (`https://api.perplexity.ai/chat/completions`, credential **Header Auth** `Bearer pplx-…`), potem **Code** (parsowanie JSON z odpowiedzi) i **NocoDB** (node lub REST API).

Ten dokument: **Twoje źródła** (OSZS, WZ Szach, Chessarbiter, FB), **ograniczenia selektorów**, **prompt**, **tabela w NocoDB**.

---

## 1. Przepływ (wysoki poziom)

```
Schedule (np. raz dziennie / tygodniowo)
  → Code_SOURCES (tablica: url, nazwa, filtry tekstowe, opcjonalnie wycinek HTML)
  → HTTP Request GET (html, responseFormat: text, neverError)
  → Code_PrepareForAi (obetnij HTML do ~12–20k znaków; opcjonalnie regex pod stronę)
  → HTTP Perplexity (system + user: „wyciągnij JSON z poniższego HTML…”)
  → Code_ParsePerplexity (strip ```json, JSON.parse, 1 item na rekord lub batch)
  → [opcjonalnie] If (items.length > 0)
  → NocoDB Create Row / HTTP POST do API
```

**Koszt:** jedno wywołanie Perplexity **na stronę na przebieg** (przy małej liczbie stron OK). Alternatywa: najpierw **słowa kluczowe w Code** (jak [`web-watch-weekly.json`](./n8n-workflows/web-watch-weekly.json)) i **tylko wtedy** wołaj Perplexity — taniej.

---

## 2. Credential Perplexity

Tak jak w **automail**: node **HTTP Request**, **Authentication → Generic Credential Type → Header Auth**, nagłówek **`Authorization`** = **`Bearer pplx-…`**.

W body **nie** dodawaj `response_format: json_object` jeśli powoduje u Ciebie 400 — wymuszaj JSON **w prompcie** i parsuj w **Code** (jak **ParseAndRoute** w automail).

---

## 3. Twoje źródła — mapowanie na implementację

| Źródło | URL (pełny) | Cel | Uwagi techniczne |
|--------|-------------|-----|------------------|
| OSZS zawody | `https://www.oszs.info/zawody` | Terminy szachów szkolnych | W **Code** możesz wyciąć fragmenty: linki z `href*="szach"`, klasy `.post-title` — w czystym JS **nie** masz jQuery; użyj **regex** na surowym HTML lub zostaw cały (obcięty) HTML dla Perplexity. |
| WZ Szach Poznań | `https://wzszach.poznan.pl/turnieje` | Turnieje juniorskie, Ostrów | Selektor `td:contains("Ostrów")` to **Playwright/Cypress**, nie działa w n8n **Code**. Zrób: `html.split('<tr')` / regex `Ostrów` w wierszach tabeli albo **przekaż HTML do Perplexity** z instrukcją: *„tylko wiersze zawierające Ostrów lub Kalisz”*. |
| Chessarbiter | `https://chessarbiter.com/turnieje` | Filtrowanie region | `tr:has-text(...)` — znowu **Playwright**. Ten sam sposób: regex na `<tr>…</tr>` lub Perplexity z listą słów: *szachy dzieci*, *Ostrów*, *Kalisz*. |
| FB: Ostrowskie TS | — | Posty o juniorach | **Scraping HTML FB** jest niestabilny i łamie ToS. **Meta Graph API** (`/{page-id}/posts`) wymaga **Page access token**, aplikacji w Meta Developer i często **App Review** do produkcji. Praktyczne obejścia: ręczny **RSS** z narzędzia typu RSS-Bridge (self-host, ryzyko blokady), lub **pominąć FB** w automacie i dodać później. |

---

## 4. Prompt systemowy (szablon PL)

Wklej jako **`messages[0].content`** (system), dostosuj listę słów:

```
Jesteś ekstraktorem informacji ze stron o szachach dla regionu Ostrów/Kalisz i szachów młodzieżowych.
Dostaniesz SUROWY HTML (może być obcięty). Zwróć WYŁĄCZNIE jeden JSON — bez markdown, bez komentarzy.

Struktura:
{
  "source_id": "string — przekażemy z zewnątrz",
  "items": [
    {
      "title": "string|null",
      "summary_pl": "1-3 zdania po polsku",
      "link": "string|null — pełny URL jeśli widać w HTML",
      "date_text": "string|null — jak na stronie",
      "tags": ["szachy","turniej","dzieci","młodzież", ...],
      "relevance": "high|medium|low",
      "evidence": "max 120 znaków cytatu z treści"
    }
  ]
}

Zasady:
- Tylko wpisy związane z: szachy, turniej, dzieci, młodzież, szkoła, OSZS, Ostrów, Kalisz (według kontekstu źródła).
- Jeśli nic nie pasuje: "items": [].
- Nie wymyślaj linków — tylko z HTML.
- Jedna pozycja w "items" = jeden logiczny komunikat (turniej / artykuł / wiersz tabeli).
```

**User message:**  
`Źródło: {{ $json.site_name }} ({{ $json.site_url }})\nsource_id: {{ $json.site_id }}\n\nHTML:\n` + `String($json.html_for_ai || '').slice(0, 18000)`

---

## 5. Code po Perplexity (skrót)

Ten sam wzorzec co w automail: weź `choices[0].message.content`, usuń otoczkę \`\`\`json, `JSON.parse`, potem **Split Out** na `items` albo pętla `items.map` → wiele itemów do NocoDB.

---

## 6. NocoDB — tabela przykładowa

Kolumny (typy orientacyjne):

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | Auto ID | — |
| `source_id` | Single line | np. `oszs_zawody`, `wzszach_turnieje` |
| `source_url` | URL | strona pobrana |
| `title` | Long text | — |
| `summary_pl` | Long text | z Perplexity |
| `link` | URL | — |
| `date_text` | Single line | — |
| `tags` | Long text | JSON string lub CSV |
| `relevance` | Single line | high/medium/low |
| `evidence` | Long text | cytat |
| `fetched_at` | DateTime | `={{ $now.toISO() }}` w n8n |
| `content_hash` | Single line | FNV/hash skrótu `title+link` — deduplikacja |

**Unikalność:** ustaw w NocoDB **Unique** na `(source_id, content_hash)` albo na `link` jeśli zawsze obecny — wtedy przy imporcie **upsert** (n8n: najpierw Search, potem Create) lub jeden **Code** łączący z API.

**API (REST):** w NocoDB: *Team & Settings → Tokens*, potem np.  
`POST /api/v2/tables/{tableId}/records`  
nagłówek `xc-token: …` (dokładna ścieżka zależy od wersji NocoDB — sprawdź w *API Snippets* w UI).

W n8n możesz użyć gotowego node **NocoDB** (jeśli masz w instancji) zamiast surowego HTTP.

---

## 7. Połączenie z istniejącym `web-watch-weekly`

- **Wariant A (prosty):** zostaw **regex + mail** w [`web-watch-weekly.json`](./n8n-workflows/web-watch-weekly.json) — zero kosztów AI.
- **Wariant B (Perplexity → mail, gotowiec):** osobny import [`web-watch-perplexity-weekly.json`](./n8n-workflows/web-watch-perplexity-weekly.json) — opis: [`N8N_WEB_WATCH_PERPLEXITY.md`](./N8N_WEB_WATCH_PERPLEXITY.md). Regeneracja: `node docs/n8n-workflows/build-web-watch-perplexity.js`.
- **Wariant C (hybryda):** sklonuj workflow, **wstaw** Perplexity **między** `HTTP_FetchPage` a agregacją: np. tylko gdy `has_keyword_hit` **lub** zawsze dla krótkiej listy URL-i.
- **Wariant D (NocoDB):** za **Code_ParsePerplexity** dodaj **NocoDB** zamiast lub obok **Resend**.

---

## 8. Checklist wdrożenia

1. [ ] Tabela w NocoDB + token API.  
2. [ ] Credential Perplexity (Header Auth) w n8n.  
3. [ ] `Code_SOURCES` z URL-ami z sekcji 3 (FB opcjonalnie wyłączony).  
4. [ ] Limit rozmiaru HTML + timeout HTTP (45–60 s).  
5. [ ] Obsługa błędów: **Continue On Fail** na HTTP, żeby jedna strona nie zatrzymywała reszty.  
6. [ ] Deduplikacja (`content_hash` lub static data jak w web-watch).

---

## Powiązane

- [`N8N_WEB_WATCH_WEEKLY.md`](./N8N_WEB_WATCH_WEEKLY.md) — prostszy patrol bez AI.  
- [`n8n-workflows/automail-imap-fixed.json`](./n8n-workflows/automail-imap-fixed.json) — wzorzec **Perplexity_Analyze** (HTTP + prompt + JSON).  
- [`RENDER_N8N.md`](./RENDER_N8N.md) — env, blokada `$env`.
