# n8n — gotowe receptury pod automatyzacje (Imprezja / obsługa zapytań)

Założenia: n8n na **Render**, **Postgres** podpięty, wysyłka maili przez **Resend** ([`N8N_EMAIL_SETUP.md`](./N8N_EMAIL_SETUP.md)).

---

## Dlaczego przy terminach wesela prawie zawsze potrzebujesz AI

Pary piszą daty **w dowolnej formie**: „20 września 2026”, „20.09”, „za rok w sobotę”, „lipiec”, „sierpień lub wrzesień”, „weekend 15–16.11”.  
**Regex ani stały szablon** tego nie ogarną — **model językowy** najpierw ma wyciągnąć sens, a Ty zapisujesz wynik jako **ustrukturyzowany JSON** (do kalendarza i warunków).

**Wzorzec w n8n:** osobny krok **tylko ekstrakcji** (strict JSON), potem **Code** / **IF** / **Google Calendar** na podstawie pól — nie ufaj „wolnemu tekstowi” z jednego promptu na wszystko.

### Krok „parsowanie daty” — co ma zwrócić model (przykładowe pola JSON)

Użyj w node **OpenAI** / **Anthropic** opcji **Structured Output** / JSON schema (nazwy mogą być inne — dostosuj do swojej wersji n8n):

| Pole | Typ | Znaczenie |
|------|-----|-----------|
| `event_date_start` | string (ISO 8601) | Początek imprezy w strefie **`Europe/Warsaw`**; np. `2026-09-20T16:00:00+02:00` jeśli w tekście jest godzina, inaczej `2026-09-20` (cały dzień). |
| `event_date_end` | string lub null | Koniec, jeśli podany („do niedzieli”). |
| `date_confidence` | `high` / `medium` / `low` | Gdy `low` lub brak daty → gałąź: **„proszę o doprecyzowanie terminu”** (Resend), **nie** sprawdzaj kalendarza. |
| `raw_quote` | string | Fragment maila, z którego wynika data (do logów / ręcznej weryfikacji). |
| `client_email` | string | Z treści lub z nagłówka IMAP (`from`). |
| `client_name` | string lub null | Imiona / jak się zwrócić. |

**System prompt (szkic, po polsku):**

> Jesteś ekstraktorem danych z maili o wesele/DJ. Dzisiejsza data (referencyjna): {{ $now }} w strefie Europe/Warsaw.  
> Wyciągnij proponowany termin imprezy z dowolnego zapisu po polsku (słownie, cyframi, przedziały).  
> Jeśli podano tylko miesiąc lub „lato 2026”, ustaw `date_confidence`: low i `event_date_start`: null.  
> Zwróć **wyłącznie** JSON zgodny ze schematem, bez markdown.

Dane wejściowe user message: **temat + treść + data nadania** maila z IMAP.

**Potem:** gałąź **IF** na `date_confidence === high|medium` → Google Calendar; inaczej → krótki mail z prośbą o konkretną datę.

---

## Receptura A: „Nowy mail → szkic odpowiedzi (AI) → Ty wysyłasz lub auto-wysyłka”

**Cel:** Co X minut sprawdź skrzynkę; dla nowych maili z tematem zawierającym np. „termin” wygeneruj odpowiedź i wyślij przez Resend (albo tylko zapisz do Google Sheets jako „do akceptu”).

| Krok | Node (szukaj w n8n) | Uwagi |
|------|---------------------|--------|
| 1 | **Email Trigger (IMAP)** lub **IMAP Email** | Credential IMAP, interwał np. 3–5 min. |
| 2 | **IF** / **Filter** | Np. tylko jeśli `subject` zawiera słowa kluczowe lub nadawca nie jest `no-reply`. |
| 3a | **OpenAI** / **Anthropic** — **tylko ekstrakcja JSON** | Jak wyżej: data, pewność, cytat, email. |
| 3b | **OpenAI** / **Anthropic** — **treść odpowiedzi** | Osobny node: na wejściu masz już sparsowaną datę + oryginalny mail. System: asystent DJ/wodzirej, krótko po polsku. |
| 4a | **HTTP Request** → Resend | `POST https://api.resend.com/emails` — jak w [`N8N_EMAIL_SETUP.md`](./N8N_EMAIL_SETUP.md). `reply_to` = Twój adres. |
| 4b | *albo* **Google Sheets** | Append wiersz: data, od, temat, treść odpowiedzi AI — **człowiek wysyła** z Gmaila. |

**Bezpieczeństwo:** pierwszy miesiąc warto robić **4b** lub w IF wysyłaj tylko gdy `from` jest na liście (Set + warunek).

---

## Receptura B: „Sprawdź kalendarz Google → zajęty / wolny → odpowiedź mailowa”

**Cel:** Klient pisze z proponowaną datą; automat sprawdza **Free/Busy** i odsyła gotową wiadomość.

| Krok | Node | Uwagi |
|------|------|--------|
| 1 | Trigger jak w A (IMAP) **lub** **Webhook** (jeśli mail wpadnie przez Mailgun/Inbound) | |
| 2 | **OpenAI** z **Structured Output** / JSON | Ten sam krok ekstrakcji co w sekcji wyżej (`event_date_start`, `date_confidence`, …). Kalendarz **tylko** gdy `high`/`medium`. |
| 3 | **Google Calendar** — *Get availability* / *Event* (zależnie od wersji node) | Credential OAuth Google; kalendarz „imprezy”. Użyj zakresu czasu z kroku 2. |
| 4 | **IF** | Jeśli kolizja → gałąź „termin zajęty”; jeśli nie → „wolne + pytania o miejsce i rodzaj”. |
| 5 | **HTTP Request** (Resend) | Dwie gałęzie = dwa szablony HTML (krótkie, po polsku). |

**Wymaga:** konto Google z kalendarzem, uprawnienia w credentialu n8n (Calendar API).

**Krok po kroku (OAuth, Availability, IF, przykłady wyrażeń):** [`N8N_CALENDAR_FREEBUSY.md`](./N8N_CALENDAR_FREEBUSY.md).  
**Reguła „cały dzień + zajęty = impreza 100% zajęta” + kod pod n8n:** [`N8N_GOOGLE_CALENDAR_ALLDAY_BUSY.md`](./N8N_GOOGLE_CALENDAR_ALLDAY_BUSY.md).

**Produkcyjny workflow (IMAP, filtr WP, Perplexity ×2 — analiza + doprecyzowanie, Google Calendar, Resend):** [`n8n-workflows/automail-imap-fixed.json`](./n8n-workflows/automail-imap-fixed.json) + [`n8n-workflows/README.md`](./n8n-workflows/README.md) + [`N8N_MECHANIZM_JEDEN_ZAPYTANIE_IMPREZA.md`](./N8N_MECHANIZM_JEDEN_ZAPYTANIE_IMPREZA.md). **Follow-up po 2 dniach** (domyślnie 48 h od zapisu) — w **automail** zapisywane są kolumny w Arkuszach (`followup_*`, szablon HTML); drugi workflow: **[`n8n-workflows/automail-followup-2d.json`](./n8n-workflows/automail-followup-2d.json)** + opis **`N8N_FOLLOWUP_3D_SHEETS.md`**.

---

## Receptura C: „Przypomnienie po 3 dniach bez odpowiedzi klienta”

**Cel:** Stan rozmowy w jednym miejscu; cron raz dziennie wysyła „czy mogę w czymś pomóc?”.

| Krok | Node / element | Uwagi |
|------|----------------|--------|
| 1 | **Postgres** (ten sam co n8n *lub* osobna mała tabela) **albo** **Google Sheets** | Kolumny: `thread_id`, `email`, `ostatnia_wiadomosc_od_klienta`, `ostatnia_akcja`, `wyslano_followup`. |
| 2 | Workflow „wejście”: po **wysłaniu oferty** (koniec A/B) → **Postgres Insert/Update** lub **Sheets** | Ustaw `ostatnia_akcja = oferta_wyslana`, `followup = false`. |
| 3 | **Schedule Trigger** — np. codziennie 10:00 | |
| 4 | **Postgres** / **Sheets Read** | Wybierz wiersze gdzie `oferta_wyslana` i `followup = false` i `data < now - 3 dni`. |
| 5 | **HTTP Request** Resend | Krótki mail follow-up; potem **Update** `followup = true`. |

**Uwaga:** pierwszy mail od klienta powinien **tworzyć** lub **aktualizować** wiersz (`ostatnia_wiadomosc_od_klienta = now`), żeby nie wysłać follow-upu gdy już odpisali.

---

## Receptura D: „Szablon + formularz (bez AI)” — tylko uzupełnienie

**Kiedy ma sens:** np. auto-odpowiedź „dziękujemy, prosimy o wypełnienie formularza z **konkretną datą w polu kalendarza**” — klient i tak musi podać datę w jednym formacie.  
**Nie zastępuje** parsowania wolnego tekstu z maila — do tego zostaje **AI** (sekcja na górze).

| 1 | **IMAP** | |
| 2 | **Set** | `html` z linkiem do Google Forms / Tally (data jako pole typu data). |
| 3 | **HTTP Request** | Resend. |

---

## Checklista środowiska (żeby receptury działały)

- [ ] `WEBHOOK_URL` w Renderze = `https://twoj-n8n.onrender.com/` (ze `/` na końcu) — jeśli używasz Webhook.
- [ ] **Credentials** osobno: IMAP, Resend (Bearer), Google (jeśli B), OpenAI/Anthropic (jeśli A/B).
- [ ] **Eksport workflow** (Download) po każdej większej zmianie — backup.
- [ ] Free Render: interwał IMAP **nie** co 30 s (budzenie + limit); 3–15 min OK przy małym ruchu.

---

## Kolejność wdrożenia (polecana)

1. **Ekstrakcja JSON z datą** (OpenAI/Anthropic) + test na 5–10 przykładowych mailach (wklejone do „Manual trigger”).  
2. **A** — IMAP + ekstrakcja + drugi prompt na treść odpowiedzi; na start **Sheets** lub ręczna wysyłka zamiast od razu Resend.  
3. **B** — podłącz **Google Calendar** na polu `event_date_start` tylko przy `date_confidence` high/medium.  
4. **C** — follow-up po 3 dniach.  
5. **D** — opcjonalnie jako drugi workflow (autoresponder z linkiem do formularza, gdy wolisz nie ruszać treści maila AI).

---

## Powiązane pliki

- [`N8N_EMAIL_SETUP.md`](./N8N_EMAIL_SETUP.md) — Resend + IMAP  
- [`RENDER_N8N.md`](./RENDER_N8N.md) — hosting, Postgres, ping  

Jeśli napiszesz: **tylko mail** czy **mail + kalendarz od razu**, można rozpisać jedną recepturę jako **dokładną listę pól** w node Set i przykładowy JSON do Resend (bez Twoich sekretów).

### Gotowy import (JSON)

W repozytorium są szkielety workflow do zaimportowania w n8n:

- **Perplexity w automail:** node’y **Perplexity_Analyze** i **Perplexity_AskClarification** — **ten sam** credential **Header Auth** (`Authorization` = `Bearer pplx-…`); w body bez `response_format: json_object` (patrz [`n8n-workflows/README.md`](./n8n-workflows/README.md)).  
- Instrukcja: [`n8n-workflows/README.md`](./n8n-workflows/README.md).
