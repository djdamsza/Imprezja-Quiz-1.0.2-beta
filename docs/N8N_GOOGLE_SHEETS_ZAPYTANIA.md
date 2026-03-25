# Arkusz Google — zbiór zapytań (automail / formularz)

Propozycja **kolumn**, **ujednolicenia daty** i **integracji z n8n** (workflow `automail`).

---

## 1. Najważniejsze: jedna „prawda” o terminie

Źródło techniczne w workflow to zawsze **`event_date_start`** z AI (ISO, np. `2026-08-15T00:00:00+02:00`). W arkuszu trzymaj to w czytelnej postaci:

| Kolumna (nagłówek) | Typ / format | Znaczenie |
|---------------------|--------------|-----------|
| **`data_termin_iso`** | Tekst `YYYY-MM-DD` lub pusty | **Kanoniczna data dnia imprezy** — sortowanie, filtry, pivoty. Wypełnij z `event_date_start`: pierwsze 10 znaków, jeśli regex `^\d{4}-\d{2}-\d{2}$`. |
| **`data_termin_pl`** | Tekst `DD.MM.RRRR` lub pusty | Wyświetlanie po polsku (generuj w n8n tak jak w `PrepareOfertaMails`). |
| **`pewnosc_daty`** | `high` / `medium` / `low` | Z pola `date_confidence` — przy `low` **nie ufaj** samemu `data_termin_iso` (często puste). |
| **`data_termin_zakres_do`** | ISO data lub pusty | Z `event_date_end` (wielodniowe / weekend). |
| **`termin_tekst_z_maila`** | Tekst | Krótki opis z maila gdy data niepewna: np. `raw_quote` lub wycinek z `emailBody` (opcjonalnie drugi node / ręcznie). |

**Zasady:**

- Sortowanie i kalendarz w Arkuszach: trzymaj **`data_termin_iso`** jako stały format `RRRR-MM-DD` (jako tekst też sortuje się poprawnie).
- Gdy `pewnosc_daty` = `low` i brak dnia — **`data_termin_iso` zostaw puste**, a sens w **`termin_tekst_z_maila`**.
- Nie mieszaj w jednej komórce „15.08.2026” i „lipiec 2026” — osobne kolumny.

---

## 2. Propozycja nagłówków (jeden wiersz = jedno zapytanie)

Kolejność pod **automatyczny zapis z n8n** (od A w prawo):

| # | Kolumna | Źródło (workflow) |
|---|---------|-------------------|
| 1 | `zapisano_at` | `{{ $now.toISO() }}` lub strefa PL |
| 2 | `data_termin_iso` | Z `event_date_start` (10 znaków) |
| 3 | `data_termin_pl` | Obliczone w Code |
| 4 | `pewnosc_daty` | `date_confidence` |
| 5 | `data_termin_zakres_do` | `event_date_end` (10 znaków lub pusto) |
| 6 | `typ_imprezy` | `event_kind` → `wedding` / `other` |
| 7 | `klient_imie` | `client_name` lub `wp_form_name` |
| 8 | `email` | `client_to_email` |
| 9 | `telefon` | `wp_form_phone` |
| 10 | `miejscowosc` | `venue_or_city` |
| 11 | `pewnosc_lokalizacji` | `location_confidence` |
| 12 | `zapytanie_o_impreze` | `is_event_inquiry` (true/false) |
| 13 | `reczna_obsluga` | `human` |
| 14 | `data_ok` | `date_ok` |
| 15 | `lokalizacja_ok` | `location_ok` |
| 16 | `kalendarz_wolny` | `demo_termin_wolny` (po **Code_MergeCalendarAvailability**) |
| 17 | `notatka_kalendarz` | `calendar_check_note` jeśli jest |
| 18 | `temat_maila` | `emailSubject` |
| 19 | `nadawca_naglowek` | `emailFrom` |
| 20 | `tresc_skrocona` | Pierwsze N znaków `emailBody` lub `wp_form_message` |
| 21 | `workflow_run` | Opcjonalnie URL / ID wykonania n8n |
| 22–24 | `wyslana_akcja`, `temat_wyslanej`, `data_wyslania` | Na przyszłość (log wysłanych maili) — na razie puste |
| 25 | `check_date_ymd` | Dzień sprawdzany w Google Calendar (`YYYY-MM-DD`) z **Code_BuildCalWindow** |
| 26 | `resend_to` | E-mail klienta użyty jako `to` w Resend (ten sam co w ofercie) |
| 27–28 | `subject_wolny`, `subject_zajety` | Tematy gotowych szablonów (krótki tekst, **bez HTML**) |

**Opcjonalnie później** (drugi etap albo drugi arkusz „Wysłane”):

- `wyslana_akcja`: `oferta_wolna` | `oferta_zajeta` | `doprecyzowanie` | `tylko_powiadomienie_dj`
- `temat_wyslanej` / `data_wyslania`

To wymaga albo **Merge** kilku ścieżek końcowych, albo osobnego krótkiego workflowa po webhooku — pełna tabela to **1–73** (`zapytania-imprezja-pelne-dane.csv`); krótszy wariant to **1–28** (`zapytania-imprezja-import.csv`).

### Gotowy plik do importu (CSV)

| Plik | Zawartość |
|------|-----------|
| **[google-sheets/zapytania-imprezja-import.csv](./google-sheets/zapytania-imprezja-import.csv)** | Nagłówki + **2 przykładowe wiersze** (wesele z datą ISO + zapytanie z `low` i pustą datą). |
| **[google-sheets/zapytania-imprezja-tylko-naglowki.csv](./google-sheets/zapytania-imprezja-tylko-naglowki.csv)** | Tylko **jeden wiersz nagłówków** (pusty arkusz pod n8n). |
| **[google-sheets/zapytania-imprezja-pelne-dane.csv](./google-sheets/zapytania-imprezja-pelne-dane.csv)** | **Jedna tabela: wejście + AI + kalendarz + wyjście (HTML, tematy) + CRM + follow-up** — **73 kolumny**, UTF-8 z BOM, **3 przykładowe wiersze** (w tym styl jak mail z formularza WP). |

#### Import „pełnych danych” i podmiana tego samego arkusza

1. Otwórz docelowy arkusz (np. `Zapytania_Imprezja_2026`).
2. **Plik → Importuj → Prześlij** → wybierz `zapytania-imprezja-pelne-dane.csv`.
3. Ustaw separator: **przecinek**.
4. Jako miejsce importu wybierz **Zastąp bieżący arkusz** / **Replace current sheet** (albo **Zastąp dane w wybranym arkuszu** — zależnie od wersji UI) — **usuniesz dotychczasowe wiersze** w tej zakładce i wstawisz nagłówek + przykłady.
5. Po imporcie **usuń wiersze 2–4** (przykłady), jeśli chcesz zacząć od pustych danych — **zostaw wiersz 1 (nagłówki)**.

**Kolumny w `zapytania-imprezja-pelne-dane.csv` (kolejność):**

| Blok | Pola (skrót) |
|------|----------------|
| Wejście | `zapisano_at`, `workflow_run`, `emailSubject`, **`emailBody` (pełna treść)**, `emailFrom`, `mailDate`, `wp_form_*` |
| AI | `is_event_inquiry` … `human` (jak z ParseAndRoute) |
| Wewnętrzne | `dj_notify_email`, `mail_from_notify`, `client_to_email` |
| Kalendarz | `calStart`, `calEnd`, `check_date_ymd`, `calendar_query_until_exclusive`, `calendar_check_note`, `demo_termin_wolny`, `google_calendar_available`, `google_calendar_warning` |
| Oferta (wyjście) | `event_kind_used`, `mail_from`, `reply_to`, `offer_pdf_url`, `subject_wolny`, `subject_zajety`, **`html_wolny`, `html_zajety` (pełny HTML)**, `resend_to` |
| CRM (jak arkusz) | `data_termin_iso` … `tresc_skrocona`, `wyslana_akcja`, `temat_wyslanej`, `data_wyslania` |
| Diagnostyka + follow-up (końcówka CSV) | `ask_clarification_source`, `followup_candidate`, `followup_eligible_at`, `followup_sent`, `followup_sent_at`, `followup_offer_variant`, `subject_followup_3d`, `html_followup_3d` — opis: [`N8N_FOLLOWUP_3D_SHEETS.md`](./N8N_FOLLOWUP_3D_SHEETS.md) |

Wartości logiczne w przykładach: `TRUE` / `FALSE` (tekst), żeby Arkusze nie gubiły znaczenia przy imporcie.

**Uwaga do n8n:** workflow `automail-imap-fixed.json` zapisuje przez **Code_SheetColumnsOnly** **wszystkie 73 kolumny** zgodnych z `zapytania-imprezja-pelne-dane.csv` (w tym pełny `emailBody`, `html_wolny` / `html_zajety`, **`ask_clarification_source`** oraz pola **follow-upu**). **Kolejność nagłówków w arkuszu musi być taka sama** jak w CSV.

**`ask_clarification_source`:** `perplexity` \| `fallback_template` \| puste — tylko przy mailu doprecyzowania. **Follow-up:** gotowe `subject_followup_3d` / `html_followup_3d` i `followup_eligible_at` (domyślnie **+48 h / 2 dni**; env `FOLLOWUP_DELAY_HOURS` / `FOLLOWUP_DELAY_DAYS`) gdy `followup_candidate` = `TRUE` — szczegóły: [`N8N_FOLLOWUP_3D_SHEETS.md`](./N8N_FOLLOWUP_3D_SHEETS.md).

**Import w Google Sheets (krótkie CSV 28 kolumn):** *Plik → Importuj → Prześlij* → wybierz CSV → separator **przecinek** → *Importuj dane*. Po imporcie usuń przykładowe wiersze, jeśli używasz `zapytania-imprezja-import.csv` i chcesz zacząć od zera.

Kolumny **22–24** (`wyslana_akcja`, `temat_wyslanej`, `data_wyslania`) — workflow je wypełnia przy wysyłce. Kolumny **25–73** — kalendarz, adres, HTML, follow-up itd.

### Dlaczego część kolumn bywała pusta?

- Gdy arkusz miał nagłówki z `zapytania-imprezja-pelne-dane.csv`, a w n8n **Code_SheetColumnsOnly** wysyłał tylko **28 pól** — **pozostałe kolumny zostawały puste**. **Rozwiązanie:** workflow z repo (**73 klucze** + `Code_BuildSheetRowZapytania`).
- Jeśli nagłówki w Arkuszach **nie są w tej samej kolejności** co w CSV — wartości trafią pod złe nazwy; wtedy **zaimportuj ponownie** nagłówki z `zapytania-imprezja-pelne-dane.csv` albo ręcznie ułóż kolumny jak w pierwszym wierszu tego pliku.

---

## 3. Co zrobić w Google Sheets

1. Utwórz arkusz np. **`Zapytania_Imprezja_2026`**.
2. W pierwszym wierszu wklej nagłówki z tabeli powyżej (dostosuj nazwy do swojego stylu — ważne, żeby **były identyczne** z mapowaniem w n8n).
3. **Zablokuj pierwszy wiersz** (Widok → Przypnij).
4. Kolumnę `data_termin_iso`: możesz ustawić format **Data** po imporcie — albo zostaw jako tekst ISO (najprościej przy append z n8n).
5. Udostępnij arkusz koncie usługi lub użytkownikowi, który połączysz z n8n (patrz niżej).

---

## 4. Integracja z n8n

### Krok A — credential Google

1. W n8n: **Credentials → Google Sheets OAuth2** (lub Service Account — wtedy udostępnij arkusz mailowi service account).
2. Zezwól na zakresy do edycji Arkuszy.

### Krok B — node Google Sheets

1. Dodaj node **Google Sheets → Append Row** (lub **Append or Update** jeśli kiedyś zechcesz aktualizować po `Message-ID`).
2. Wybierz **Document** (plik) i **Sheet** (zakładka).
3. **Mapowanie kolumn**: ustaw „Define Below” i przypisz każdą kolumnę do wyrażeń z JSON (najlepiej z node’a, w którym masz już **`demo_termin_wolny`** — wtedy kolumna 16 ma sens).

### Krok C — gdzie wpiąć w `automail`

W pliku **`docs/n8n-workflows/automail-imap-fixed.json`** jest już wbudowany łańcuch:

**PrepareOfertaMails** → **Code_BuildSheetRowZapytania** → **równolegle:**
1. **Code_SheetColumnsOnly** → **GoogleSheets_AppendZapytania** → **NoOp_AfterGoogleSheet**,
2. **If_TerminWolny** → Resend.

- **Dlaczego równolegle:** gdy Arkusze zwracają błąd mapowania („Values to Send”) lub inny output, **łańcuch Sheets → Resend** potrafi **zgubić** `client_to_email` / `resend_to` — wtedy Resend dostaje `to: ""`. Mail musi iść **z tego samego wyjścia co Code_BuildSheetRowZapytania**, nie z node’a Arkuszy.
- **Code_SheetColumnsOnly:** do Arkuszy trafia **dokładnie 73 kolumny** jak w `zapytania-imprezja-pelne-dane.csv` (pełny mail + HTML + follow-up). **Nie zmieniaj kolejności** nagłówków w arkuszu względem tego pliku. Wiersze są wysokie (HTML) — w Arkuszach możesz ustawić **Zawijanie → Przycinaj** na tych kolumnach.

### Już zapisane „szerokie” wiersze w Arkuszach

- **Usuń / ukryj** nadmiarowe kolumny po X (np. `html_wolny` …) albo zacznij **nową zakładkę** z samym CSV nagłówków.
- Dla istniejących komórek: zaznacz kolumny z długim tekstem → **Formatowanie** → **Zawijanie tekstu** → **Przycinaj** (Clip) — wiersz zostaje niski, treść obcięta w komórce (nadal widoczna po kliknięciu).
- **Format** → **Wysokość wiersza** → np. 21 — wymusza jednoliniowy wygląd (przy Clip).
- **Code_BuildSheetRowZapytania** dokleja pola CSV + **`resend_to`** (w tym fallback: adres z treści `E-mail: …` / pierwszy `@` w body).
- **GoogleSheets_AppendZapytania:** tryb **Auto-map**, opcja **Ignore** dla pól spoza kolumn; **`continueOnFail: true`** — przy błędzie Arkuszy mail i tak się wyśle.
- Po imporcie workflow w n8n: w node **GoogleSheets_AppendZapytania** wybierz **Credential** (Google Sheets OAuth2). W eksporcie JSON **nie ma** wbudowanego ID credentiala — jeśli wkleisz fikcyjny `REPLACE_…`, n8n pokaże **„workflow has issues”** i nie wystartuje.

Sprawdź też **Document ID** i zakładkę (**Arkusz1**), ewentualnie **odśwież kolumny** (żółty trójkąt).

#### Zielony node, ale **brak nowego wiersza** w arkuszu

- Sprawdź **Operation**: musi być **Append Row** (albo *Append or Update Row*), **nie** *Get Row(s)*. *Get Row* tylko odczytuje dane — wtedy OUTPUT pokazuje istniejące wiersze i nic nie dopisuje.

#### Arkusze: „**At least one value has to be added under Values to Send**”

- Zwykle znaczy to, że **Operation** to nie **Append Row** albo tryb kolumn to **Define below** z pustą listą. Ustaw **Append Row** + **Auto-map input data to columns** i kliknij odświeżenie schematu kolumn (żółty komunikat). Nagłówki w arkuszu muszą zgadzać się z polami z Code (np. `zapisano_at`, `data_termin_iso`, …).

#### „Brak dostępu do Google Drive” przy wyborze dokumentu z listy

- Lista plików w n8n często korzysta z **Google Drive API**. Włącz w Google Cloud **Google Drive API** i na ekranie zgody OAuth dodaj zakres typu **`…/auth/drive.readonly`** (lub szerszy), potem **ponów Connect** credentiala.  
- **Alternatywa bez listowania Driva:** w polu dokumentu wybierz **By ID** (lub *By URL*) i wklej **sam identyfikator** z linku arkusza (fragment między `/d/` a `/edit`) — do zapisu wystarczy zwykle **Google Sheets API** + zakres **`spreadsheets`**.

| Wariant (ręczna rozbudowa) | Gdzie | Plusy / minusy |
|---------|--------|----------------|
| **A** | Tuż po **ParseAndRoute** | Pełny log także przed ofertą — duplikaty wierszy jeśli dodajesz obok istniejącego Append. |
| **B** | Tylko po Merge kalendarza | Wymaga rozgałęzienia; w JSON powyżej użyto ścieżki po **PrepareOfertaMails** (zawsze jest `demo_termin_wolny`). |
| **C** | Merge ścieżek końcowych | Daje wypełnione `wyslana_akcja` — na później. |

### Krok D — normalizacja daty w jednym Code (przed Sheets)

Mini-logika (spójna z resztą workflowu):

```javascript
const j = $input.first().json;
const raw = j.event_date_start ? String(j.event_date_start) : '';
const iso = raw.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : '';
function isoToPl(d) {
  if (!d || d.length < 10) return '';
  const p = d.slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : '';
}
const endRaw = j.event_date_end ? String(j.event_date_end) : '';
const isoEnd = endRaw.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(endRaw) ? endRaw.slice(0, 10) : '';
return [{ json: {
  ...j,
  sheet_data_termin_iso: iso,
  sheet_data_termin_pl: isoToPl(iso),
  sheet_data_termin_zakres_do: isoEnd,
  sheet_termin_tekst_z_maila: iso ? '' : String(j.raw_quote || '').slice(0, 300)
}}];
```

Podłącz ten node **bezpośrednio przed** Google Sheets Append i mapuj kolumny na `sheet_*`.

---

## 5. Spójność z AI (Perplexity)

W promptcie już wymuszasz ISO i `date_confidence`. Żeby arkusz był stabilny:

- trzymaj **`data_termin_iso`** wyłącznie z **konkretnego dnia**;
- przy widełkach bez dnia — tylko **`termin_tekst_z_maila`** + `pewnosc_daty=low`.

---

## 6. Checklista

- [ ] Arkusz z nagłówkami (wiersz 1).
- [ ] Credential Google w n8n.
- [ ] Node Append po **Code_MergeCalendarAvailability** (+ ewent. gałąź human).
- [ ] Code normalizujący `sheet_data_termin_iso` / `pl` / zakres.
- [ ] Test: mail z konkretną datą → wiersz z wypełnionym ISO i PL.
- [ ] Test: mail „latem 2026” → puste ISO, wypełniony `termin_tekst_z_maila`, `low`.

---

*Dokument dopasowany do pól z `ParseAndRoute` i `Code_MergeCalendarAvailability` w `docs/n8n-workflows/automail-imap-fixed.json`.*
