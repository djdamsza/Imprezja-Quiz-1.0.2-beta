# Automail (n8n) — uruchomienie na produkcji

Checklist: **formularz WP → skrzynka biuro → n8n → Arkusz + maile (klient / Ty)**.

---

## 1. Co musi być „włączone” w n8n

| Element | Akcja |
|--------|--------|
| **Workflow `automail`** | **Active** (zielony) — bez tego **Email Trigger (IMAP)** nie działa. |
| **Credential IMAP** | Skrzynka, z której czytasz maile (np. `biuro@imprezja.pl` na `imap.dpoczta.pl:993`). |
| **IMAP — opcje** | W node **`IMAP_Biuro_Imprezja`**: **Action = Nothing** — n8n **nie usuwa** maili ani nie oznacza (testy). **Force Reconnect = 10** min. **Custom Email Rules = `[]` (puste)** — bez `UNSEEN`, żeby odpowiedzi **przeczytane w Thunderbirdzie** też szły w workflow (UID + `trackLastMessageId`). Jeśli maile „znikały” — często **From = biuro@** jak **To**; zmień **From** w WP Mail SMTP (np. `wordpress@…`). Szczegóły: `N8N_IMAP_BIURO_IMPREZJA.md` § 1b. |
| **Credential Google** | OAuth2: **Calendar** + **Sheets** (ten sam plik / arkusz co w node’ach). |
| **Perplexity** | Header Auth na **dwóch** node’ach: `Perplexity_Analyze` **i** `Perplexity_AskClarification` (`Bearer pplx-…`). |
| **Resend** | Na hoście (np. Render): zmienna **`RESEND_API_KEY`** = klucz `re_…`. **`N8N_BLOCK_ENV_ACCESS_IN_NODE`** nie może blokować `$env` (np. `false` lub nie ustawione). |
| **Domena nadawcy w Resend** | Wysyłka z `Biuro Imprezja <biuro@imprezja.pl>` wymaga **zweryfikowanej domeny** `imprezja.pl` w Resend. |

---

## 2. Wejście z formularza WordPress — co zrobić na stronie

1. **Adres docelowy formularza**  
   Formularz (Kadence / CF7 / inny) musi wysyłać powiadomienie na skrzynkę podłączoną do **IMAP w n8n** (zwykle **`biuro@imprezja.pl`**).  
   **To nie jest** adres `nowaczykdamian@gmail.com` — ten Gmail to tylko **odbiorca powiadomień „do ogarnięcia”** z workflowu (skrzynka biuro@ zostaje wejściem IMAP).

2. **Jeden raz przetestuj wysyłkę**  
   Wyślij test z www → sprawdź, czy mail **wchodzi na biuro@** (webmail).

3. **Dopasuj filtr w n8n**  
   Node **`Filter_WP_Formularz`** przepuszcza tylko maile „z formularza”. Po pierwszym prawdziwym mailu:
   - **Execute** na IMAP → **PrzykladMaila1** (lub Twój Set po IMAP) → skopiuj **temat** i fragment **treści**.
   - W **`Filter_WP_Formularz`** uzupełnij `SUBJECT_INCLUDES_ONE_OF` (np. dokładny fragment tematu z `[Imprezja] …`) i ewentualnie `BODY_FINGERPRINTS`.

4. **Pola w treści**  
   Filtr domyślnie wymaga **min. 2 sparsowanych pól** (np. `Imię:`, `E-mail:`) **albo** innych ścieżek (Reply-To, odpowiedź „Doprecyzowanie…”, krótki `Re:` od klienta). **Dodatkowo:** jeśli w treści jest **odcisk formularza** (np. „Wysłane z Imprezja”, „Treść zapytania”) **i** temat pasuje do `SUBJECT_INCLUDES_ONE_OF` **i** w treści jest **e-mail klienta** — mail przechodzi także przy **From = biuro@imprezja.pl** i jednym bloku tekstu bez dwukropków. Szczegóły regexów: `N8N_IMAP_BIURO_IMPREZJA.md`.

---

## 3. Łańcuch techniczny (skrót)

```
IMAP (biuro@) → mapowanie pól (PrzykladMaila1) → Filter_WP_Formularz → Perplexity_Analyze → ParseAndRoute → …
```

- **`ParseAndRoute`** ustawia m.in. `dj_notify_email` — **powiadomienia „do ręcznej obsługi”** idą na **`nowaczykdamian@gmail.com`** (stała `DJ_NOTIFY_EMAIL` + fallback w **Resend_NotifyDJ**).
- Node **`Resend_NotifyDJ`** wysyła na `dj_notify_email` (fallback ten sam co wyżej).
- **Oferta / doprecyzowanie** do klienta idą na **`resend_to`** / `client_to_email` — nie na Twój Gmail.

---

## 4. Po uruchomieniu — co sprawdzić

| Test | Oczekiwane |
|------|------------|
| Wysyłka formularza z www | Nowy wiersz w **Arkuszu** (**73** kolumny jak `zapytania-imprezja-pelne-dane.csv`; follow-up: `N8N_FOLLOWUP_3D_SHEETS.md`). |
| Zapytanie z „lukami” (data/miejsce) | Mail **do klienta** (doprecyzowanie), `reply_to` = biuro. |
| `human = true` lub nie-impreza | Mail **`[n8n] Do ręcznej obsługi`** na **Twój Gmail** + wiersz w arkuszu. |
| Błąd w node | **Executions** w n8n → stack trace; często OAuth, Resend, Perplexity. |
| Mail **„Do ręcznej obsługi”** z **undefined** (temat / treść / Od) | Zwykle **test pojedynczego node’a** (np. tylko **Resend_NotifyDJ** lub **ParseAndRoute**) bez pełnego łańcucha — `ParseAndRoute` czyta metadane maila z **Code_DedupAndTerminGuard** / **Filter_WP_Formularz**. Uruchom workflow **od triggera** (IMAP lub **Start_Test_FormWP**) albo zaimportuj workflow z repo (jest **fallback** na **Filter** i **PrzykladMaila1**). W **Filter_WP_Formularz** zwracaj **`...row`** (żeby **emailSubject**, **emailBody**, **emailFrom** szły dalej) + **`wp_form_client_email`** **po** `...parsed`, żeby pola formularza nie nadpisały adresu klienta. |

---

## 5. Pliki w repo

| Plik | Znaczenie |
|------|-----------|
| `docs/n8n-workflows/automail-imap-fixed.json` | Workflow do importu. |
| `docs/N8N_IMAP_BIURO_IMPREZJA.md` | IMAP, mapowanie, filtr WP. |
| `docs/N8N_GOOGLE_SHEETS_ZAPYTANIA.md` | Arkusz, kolumny (73). |
| `docs/N8N_FOLLOWUP_3D_SHEETS.md` | Kolumny follow-up + plan workflow Schedule. |
| `docs/N8N_GOOGLE_OAUTH_KONSOLA.md` | Google Cloud / OAuth. |
| `docs/N8N_ZAKRES_TERMINOW_I_DOPRECYZOWANIE.md` | Zapytania o miesiąc/sezon → **wszystkie dni** w zakresie (limit w workflow); doprecyzowanie przez **Perplexity + fallback**. |
| `docs/RESEND_INSTRUKCJA.md` | Resend + env na Renderze. |

---

## 6. Zmiana adresu „do ogarnięcia”

W n8n: node **ParseAndRoute** (Code) — stała **`DJ_NOTIFY_EMAIL`** = `nowaczykdamian@gmail.com`.  
W node **Resend_NotifyDJ** w wyrażeniu `to:` jest ten sam fallback — trzymaj **spójnie**.
