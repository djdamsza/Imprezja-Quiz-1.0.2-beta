# n8n + e‑maile (hosting na Render i podobnych)

Na Renderze **SMTP (port 587/465) często nie działa** — tak jak przy stripe-shop: **wysyłaj przez HTTP API** (np. **Resend**). Odbiór robisz **IMAP-em** albo **Gmail / Outlook** w n8n.

---

## A. Wysyłka e‑maili (zalecane: Resend + HTTP)

Masz już opis Resend w [`STRIPE_RESEND_RENDER.md`](./STRIPE_RESEND_RENDER.md) (klucz API, domena, DNS).

### 1. Klucz API w n8n (bezpiecznie)

1. W n8n: **Settings** (koło zębate) → **Credentials** → **Add credential**.
2. Wybierz np. **Header Auth** albo **Generic Credential Type** z nagłówkiem:
   - Name: `Authorization`
   - Value: `Bearer re_TWOJ_KLUCZ`  
   (albo użyj typu dedykowanego do API, jeśli masz w swojej wersji n8n.)

Lepsza praktyka: trzymaj sam klucz w **Credential**, a w workflow tylko odwołanie do credential — **nie wklejaj `re_...` w node Set**.

### 2. Workflow „wyślij maila”

1. **Add node** → **HTTP Request**.
2. **Method:** `POST`  
   **URL:** `https://api.resend.com/emails`
3. **Authentication:** dołącz credential z nagłówkiem `Authorization: Bearer …` (lub w **Headers** ręcznie z credential).
4. **Body** → **JSON**, np.:

```json
{
  "from": "Ty <kontakt@twoja-domena.pl>",
  "to": ["klient@example.com"],
  "subject": "Odpowiedź z automatyzacji",
  "html": "<p>Treść HTML</p>",
  "reply_to": "kontakt@twoja-domena.pl"
}
```

5. Podłącz przed tym node np. **Webhook**, **Schedule**, **IMAP Email** — żeby coś **wyzwalało** wysyłkę.

**Dokumentacja API:** [resend.com/docs](https://resend.com/docs) (endpoint `POST /emails`).

### 3. Node „Send Email” (SMTP) na Render

Węzeł **Send Email** / SMTP **może nie działać** z instancji na Render — testuj, ale **nie buduj na tym** głównej ścieżki produkcyjnej.

---

## B. Odbiór e‑maili (nowe wiadomości do skrzynki)

### Opcja 1 — **IMAP Email** (uniwersalna)

Działa z wieloma skrzynkami (o ile dostawca włącza IMAP).

1. **Add node** → szukaj **IMAP Email** (czasem pod nazwą **Email Trigger (IMAP)**).
2. **Credentials** → nowe **IMAP**:
   - Host (np. `imap.gmail.com`, `outlook.office365.com`, host z panelu hostingu),
   - Port (często `993`),
   - SSL: włączony,
   - User / hasło **lub** hasło aplikacji (Gmail wymaga [hasła aplikacji](https://myaccount.google.com/apppasswords), nie zwykłego hasła).
3. Ustaw **Mailbox** (np. `INBOX`), **Action** (np. oznacz jako przeczytane po pobraniu — według potrzeb).
4. **Polling** — interwał (np. co 1–5 min). Na **free Render** częste odpytywanie **budzi** serwis — OK przy małym ruchu.

**Uwaga:** Niektóre tanie skrzynki **nie dają IMAP** albo blokują z zewnątrz — wtedy opcja 2.

**Skrzynka `biuro@imprezja.pl`:** mapowanie IMAP → pola workflowu, **PrzykladMaila vs IMAP**, **automat vs akceptacja** — [`N8N_IMAP_BIURO_IMPREZJA.md`](./N8N_IMAP_BIURO_IMPREZJA.md).  
**Resend od zera (domena imprezja.pl, klucz API, n8n):** [`N8N_RESEND_SETUP_IMPREZJA.md`](./N8N_RESEND_SETUP_IMPREZJA.md).

### Opcja 2 — **Gmail** / **Microsoft Outlook**

W n8n są dedykowane triggery / node’y pod Gmail lub Outlook — **OAuth2** w kreatorze credentiali. Wygodne, jeśli cała komunikacja jest na Gmailu / Microsoft 365.

### Opcja 3 — e‑mail → **webhook** (zaawansowane)

Dostawca poczty (np. Mailgun, SendGrid Inbound, inni) parsuje przychodzące i robi **HTTP POST** na URL z n8n (**Webhook** node). Wymaga konfiguracji po stronie dostawcy i stabilnego publicznego URL (`WEBHOOK_URL` w env n8n — patrz `RENDER_N8N.md`).

---

## C. Checklista pod Twoją wcześniejszą automatyzację (terminy / kalendarz)

| Krok | Co zrobić |
|------|-----------|
| 1 | **WEBHOOK_URL** w Renderze = `https://twoj-n8n.onrender.com/` (ze slashem). |
| 2 | Wysyłka = **HTTP Request → Resend** (lub inne API). |
| 3 | Odbiór = **IMAP** lub **Gmail** — credential osobno, interwał rozsądny (nie co 10 s na free). |
| 4 | Treść maila z **LLM** = node **OpenAI** / **Anthropic** między triggerem a HTTP Request — z surowcem z IMAP (`text` / `html`). |
| 5 | Stan rozmowy (żeby **follow-up po 3 dniach**) = **baza** (Postgres / Google Sheets) + **Schedule** — osobny temat, ale warto od razu planować jedną tabelę „wątki”. |

---

## D. Bezpieczeństwo

- Nie wklejaj **API keys** do workflow jako zwykły tekst w node **Set** — używaj **Credentials**.
- Ogranicz **dostęp do n8n** (hasło ownera, ewent. Basic Auth na reverse proxy — opcjonalnie zmienne `N8N_BASIC_AUTH_*` na Renderze).

---

## Powiązane pliki w repo

- [`STRIPE_RESEND_RENDER.md`](./STRIPE_RESEND_RENDER.md) — Resend, domena, klucz  
- [`N8N_IMAP_BIURO_IMPREZJA.md`](./N8N_IMAP_BIURO_IMPREZJA.md) — IMAP `biuro@imprezja.pl`, PrzykladMaila, akceptacja vs auto-Resend  
- [`N8N_RESEND_SETUP_IMPREZJA.md`](./N8N_RESEND_SETUP_IMPREZJA.md) — Resend: domena, DNS, klucz, n8n, `from` / `reply_to`  
- [`RENDER_N8N.md`](./RENDER_N8N.md) — deploy, `WEBHOOK_URL`, Postgres, free tier  
- [`N8N_AUTOMATION_RECIPES.md`](./N8N_AUTOMATION_RECIPES.md) — gotowe receptury workflow (mail, kalendarz, follow-up)  
- [`N8N_CALENDAR_FREEBUSY.md`](./N8N_CALENDAR_FREEBUSY.md) — Google Calendar / Graph: wolny–zajęty po ekstrakcji terminu z maila  
- [`N8N_GOOGLE_CALENDAR_ALLDAY_BUSY.md`](./N8N_GOOGLE_CALENDAR_ALLDAY_BUSY.md) — imprezy: całodniowe + „zajęty” w API + snippet Code  
- [`N8N_GOOGLE_OAUTH_KONSOLA.md`](./N8N_GOOGLE_OAUTH_KONSOLA.md) — Google Cloud: origins + redirect URI pod n8n (Render)  
- [`n8n-workflows/automail-imap-fixed.json`](./n8n-workflows/automail-imap-fixed.json) — **jedyny eksport workflowu**: IMAP / test WP, Perplexity, **Google Calendar** (wolny/zajęty), Resend — opis [`n8n-workflows/README.md`](./n8n-workflows/README.md)  
