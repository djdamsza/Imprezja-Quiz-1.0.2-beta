# Follow-up po 2 dniach — kolumny w arkuszu + drugi workflow (plan)

Powiązanie: [`n8n-workflows/automail-imap-fixed.json`](./n8n-workflows/automail-imap-fixed.json), **[`n8n-workflows/automail-followup-2d.json`](./n8n-workflows/automail-followup-2d.json)** (gotowy workflow — domyślnie **2 dni / 48 h** do follow-upu), [`google-sheets/zapytania-imprezja-pelne-dane.csv`](./google-sheets/zapytania-imprezja-pelne-dane.csv).

---

## 1. Co robi **automail** dziś

Przy zapisie wiersza (ścieżka z ofertą do klienta, **bez** `skip_client_offer_resend` i **bez** `human`) workflow uzupełnia:

| Kolumna | Przykład | Znaczenie |
|---------|----------|-----------|
| **`followup_candidate`** | `TRUE` / `FALSE` | Czy sensownie planować follow-up (jest e-mail klienta, była oferta wysłana z automatu). |
| **`followup_eligible_at`** | ISO UTC | **Nie wcześniej niż ten moment** wyślij follow-up. W **automail** ustawiane jako `zapisano_at` + **`FOLLOWUP_DELAY_HOURS`** (domyślnie **48 h = 2 dni**) lub + `FOLLOWUP_DELAY_DAYS×24` gdy ustawisz tylko dni. |
| **`followup_sent`** | `FALSE` | Przy pierwszym zapisie zawsze `FALSE`. Drugi workflow ustawi `TRUE` po wysyłce. |
| **`followup_sent_at`** | puste | Timestamp wysłania follow-upu (wypełnia workflow 2). |
| **`followup_offer_variant`** | `termin_wolny` / `termin_zajety` / `range_list` / `none` | Rodzaj ostatniej oferty — pod dobór tonu w przyszłym mailu. |
| **`subject_followup_3d`** | tekst | Gotowy temat Resend (uniwersalny: wesele i inna impreza). |
| **`html_followup_3d`** | HTML | Gotowa treść maila (Facebook / Instagram / telefon). |
| **`ask_clarification_source`** | `perplexity` / `fallback_template` / puste | Tylko ścieżka doprecyzowania; przy ofercie zwykle puste. |

Ścieżka **tylko doprecyzowanie** (`skip_client_offer_resend`): `followup_candidate` = `FALSE`, pola follow-up puste.

Po **Resend_WolnyTermin** jest node **NoOp_FollowUp3d_SheetHint** (przepuszcza dane) — przypomnienie, że **wysyłka** follow-upu = osobny workflow.

---

## 2. Workflow 2 — **import z pliku** (`automail-followup-2d.json`)

W repozytorium jest gotowy workflow: **[`n8n-workflows/automail-followup-2d.json`](./n8n-workflows/automail-followup-2d.json)**.

| Krok | Node | Uwagi |
|------|------|--------|
| 1 | **Schedule_Daily_10** | Raz dziennie o **10:00** w **timezone workflowu** (`Europe/Warsaw` w `settings` importu). |
| 2 | **GoogleSheets_ReadZapytania** | Ten sam dokument / **Arkusz1** co append w automail. |
| 3 | **Code_FilterFollowupEligible** | Zob. poniżej — adres z `resend_to` / `client_to_email` / `wp_form_client_email` / `emailFrom`; gdy `followup_eligible_at` puste, wyliczenie z `zapisano_at` + **`FOLLOWUP_DELAY_DAYS`** (env). |
| 4 | **Resend_Followup3d** | `$env.RESEND_API_KEY`; `from`/`reply_to` z wiersza lub domyślne jak w automail. |
| 5 | **Code_AfterFollowupResendForSheet** | Po **udanym** Resend — przygotowanie pól pod update. |
| 6 | **GoogleSheets_UpdateFollowupFlags** | Dopasowanie po **`workflow_run`** → `followup_sent` = `TRUE`, `followup_sent_at` = ISO. |

**Po imporcie:** przypisz credential **Google Sheets** (jak w automail). Włącz workflow (**Active**). Test: **Manual_Trigger_FollowupTest**.

### Dlaczego **Code_FilterFollowupEligible** zwraca puste wyjście

1. **Wiersz nie z automailu** — brak kolumn `followup_candidate`, `followup_eligible_at`, `subject_followup_3d`, `html_followup_3d` (albo są puste). Automail uzupełnia je przy zapisie oferty; ręczny wiersz w arkuszu ich nie ma.
2. **`followup_candidate`** nie jest `TRUE` / `1` albo **`followup_eligible_at`** jest jeszcze w przyszłości względem czasu serwera (UTC).
3. **Brak adresu** — w arkuszu nie ma sensownego `resend_to` / `client_to_email` / `wp_form_client_email` ani `emailFrom` z `@`.

**Domyślnie (po ostatniej poprawce JSON):** jeśli **`followup_candidate`** jest **puste** (brak kolumny lub komórki), a **`is_event_inquiry`** jest prawdą i **nie** ma `human` / `needs_human_review` / `skip_client_offer_resend` — wiersz może przejść. Brak **`subject_followup_3d` / `html_followup_3d`** uzupełnia się **krótkim szablonem** (chyba że `FOLLOWUP_NO_MINIMAL_TEMPLATE=1`). **Jawne `followup_candidate=FALSE`** zawsze wyłącza follow-up. **Ścisły tryb** tylko z `TRUE` w arkuszu: `FOLLOWUP_STRICT_CANDIDATE=1`. **`FOLLOWUP_DELAY_HOURS=0`** — w filtrze follow-upu eligible od momentu `zapisano_at` (bez dodawania godzin; test).  
**`FOLLOWUP_DELAY_DAYS`** — jeśli ustawione (a `FOLLOWUP_DELAY_HOURS` puste), w automailu i filtrze traktowane jako **×24 godziny**.  
**`FOLLOWUP_BYPASS_ELIGIBLE_DATE=1`** — pomiń sprawdzanie „eligible w przeszłości” (gdy zegar serwera vs daty w arkuszu są niespójne).  
**`FOLLOWUP_BCC`** — adres e-mail: **kopia ukryta (BCC)** follow-upu na Twoją skrzynkę (Resend). **To:** nadal adres klienta z `resend_to` — jeśli „nic nie dotarło”, sprawdź skrzynkę **klienta** (np. `kasia@example.com`) lub ustaw **FOLLOWUP_BCC**.

**Uwaga:** jeśli klient odpisał wcześniej, idealnie **nie** wysyłaj follow-upu — na start możesz filtrować ręcznie lub później dodać lookup IMAP / kolumnę „ostatnia odpowiedź”.

---

## 3. Arkusz już istniejący (migracja)

Masz **65** kolumn → dodaj **8** nagłówków **w tej kolejności** na końcu wiersza 1:

`ask_clarification_source`, `followup_candidate`, `followup_eligible_at`, `followup_sent`, `followup_sent_at`, `followup_offer_variant`, `subject_followup_3d`, `html_followup_3d`

Albo **import** zaktualizowanego [`zapytania-imprezja-pelne-dane.csv`](./google-sheets/zapytania-imprezja-pelne-dane.csv) (uwaga: nadpisze przykładowe wiersze — zrób kopię danych).

---

## 4. Test ręczny

1. Uruchom automail na zapytaniu z **wolnym** terminem → w arkuszu sprawdź: `followup_candidate=TRUE`, `followup_eligible_at` ~ **+2 dni** (48 h) od `zapisano_at`, `subject_followup_3d` / `html_followup_3d` wypełnione.
2. Uruchom na **doprecyzowaniu** → `followup_candidate=FALSE`, follow-up puste.
3. **Follow-up:** tymczasowo ustaw w teście `followup_eligible_at` w przeszłości (np. wczoraj) i **Manual_Trigger_FollowupTest** w `automail-followup-2d` — powinien pójść mail i w arkuszu `followup_sent=TRUE`.
