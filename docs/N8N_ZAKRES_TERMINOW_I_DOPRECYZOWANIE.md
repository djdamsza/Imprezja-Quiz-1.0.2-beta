# n8n automail — zapytania o **zakres dat** i **automatyczne doprecyzowanie**

Powiązany workflow: [`n8n-workflows/automail-imap-fixed.json`](./n8n-workflows/automail-imap-fixed.json).

---

## 1. Dwa typy zapytań o czas

| Typ | Przykład | Co robi workflow |
|-----|----------|------------------|
| **Konkretny dzień** | „31.12.2026” | `date_ok` → jak wcześniej: jeden dzień → Google **Availability** → oferta wolny/zajęty. |
| **Miesiąc / sezon / „jakie terminy”** | „Co macie wolnego w sierpniu?”, „latem 2026”, „w tym sezonie” | Perplexity zwraca `date_inquiry_type: month_or_season` + `event_date_start` / `event_date_end`. `date_range_ok` → lista **wszystkich dni kalendarzowych** w tym zakresie (nie tylko sobót) → **osobne sprawdzenie kalendarza dla każdego dnia** (limit **62** dni na jeden przebieg) → jeden mail z dniami **wolnymi** + dzień tygodnia po polsku. |

Ograniczenia (żeby nie wysyłać kilometrowej listy i nie męczyć API):

- maks. **~3 miesiące (92 dni)** zakresu — szersze zapytania (np. **cały rok 2027**, „wszystkie weekendy w roku”) **nie** dostają auto-listy dni; idzie **mail z prośbą o węższy okres** (konkretny miesiąc / 2–3 miesiące, dzień tygodnia, miejsce).
- Heurystyka w **ParseAndRoute** łapie też frazy w stylu *cały 20XX*, *rok 20XX*, *wszystkie soboty w …* — wtedy `date_range_ok` = false.
- maks. **62 dni** sprawdzanych w jednej odpowiedzi (jeśli zakres ma więcej dni — mail informuje, że to pierwsza część).

**Łagodniejsze traktowanie (ParseAndRoute + Perplexity):** nie trzeba podawać **jednego dnia** — wystarczy np. *wesele w lipcu 2027*, *lipiec i sierpień 2027*, albo sam miesiąc (*czerwiec* — rok dobiera się od daty maila). W treści wykrywane są **polskie nazwy miesięcy** (w tym **kilka miesięcy** w jednym zdaniu) i budowany jest zakres `month_or_season` → **lista wolnych dni** jak wyżej. **Zapisy względne do miesiąca** (np. *druga sobota czerwca*, *ostatni piątek maja*) — **Perplexity** w promptcie **Perplexity_Analyze** ma je mapować na `single_day` i konkretną datę ISO; heurystyka miesięcy w **ParseAndRoute** **nie** rozszerza całego miesiąca, gdy wykryje wzorzec „pierwsza/druga/… + dzień tygodnia”. **Miasto** z listy lub **województwo / „okolice X”** ustawia `venue_or_city` i **podbija** `location_confidence`.

Święta narodowe **nie są** osobną listą dni wolnych w kodzie — w mailu jest zdanie o **długich weekendach i świętach** (szybciej znikają terminy). Możesz później dodać bibliotekę świąt PL i np. oznaczać soboty przed świętem osobno.

---

## 2. Pola z Perplexity (nowe / ważne)

W promptcie **Perplexity_Analyze** dopisane są m.in.:

- **`date_inquiry_type`**: `single_day` | `month_or_season` | `none`
- **`event_kind_clear`** (boolean) — czy z maila wynika typ imprezy (wesele vs inna).
- **`location_clear`** (boolean) — czy jest miejsce (miasto / sala / region).
- **`client_asks_overbroad_availability`** (boolean) — np. cały rok bez miesiąca / wszystkie soboty w roku.
- **`client_wants_unreasonable_scope`** (boolean) — nadmierny zakres (np. wiele lat, nierealna prośba) → **`needs_human_review`** / gałąź **human**.

**ParseAndRoute** ustawia też heurystykę z treści maila oraz pole **`narrow_range_request`**, gdy klient podał zbyt szeroki zakres — wtedy inny ton maila doprecyzowania (krótszy okres, dzień tygodnia, miejsce).

### Kiedy **human** (Resend_NotifyDJ), a kiedy tylko doprecyzowanie?

- **Mail doprecyzowania** — szeroki zakres czasu, brak miesiąca, „cały rok” itd.
- **Human** — m.in. `client_wants_unreasonable_scope`, bardzo chciwe regexy (np. *wszystkie wolne terminy*, *każdą sobotę* w sensie listingu na lata, *5 / 10 lat*), lub ogólne `needs_human_review` z AI.

---

## 3. Mail doprecyzowania (termin, miejsce, typ imprezy) — **Perplexity + fallback**

**Code_AskContextForAi** → **Perplexity_AskClarification** → **Code_MergeAskClarification** → **Resend_AskClarification** (+ arkusz), gdy:

- nie ma ani konkretnej daty (`date_ok`), ani sensownego zakresu (`date_range_ok`), **albo**
- zakres jest, ale **nie da się zbudować listy dni** (błędne daty, za długi zakres itd.),
- **Perplexity** generuje **temat** i **HTML** na podstawie znanego kontekstu (flagi + skrót treści) — krótszy, dopasowany nagłówek (np. *Doprecyzuj termin*) i treść bez powtarzania tego, co już wiemy.
- **Code_MergeAskClarification** parsuje JSON `{ subject, html }`; przy błędzie / pustej odpowiedzi używa **tego samego szablonu co wcześniej** (tablica `needs` + fallback trzech punktów).

**Lista w mailu (fallback):** jak dawniej — **okres lub datę** (żeby sprawdzić **kalendarz**, nie „tylko soboty”), **miejscowość**, **typ imprezy** według flag.

Temat z AI bywa np. *„Doprecyzuj termin”* / *„Potrzebuję miesiąca i miejsca”*; przy szerokim zakresie nadal sensowny ton *węższego okresu*.

### Reply-To przy mailu doprecyzowania

**Resend_AskClarification** ustawia **`reply_to: biuro@imprezja.pl`** (nie adres DJ na Gmailu), żeby przycisk „Odpowiedz” szedł na **skrzynkę biura** czytaną w IMAP — także gdy testowo wyślesz maila na swój Gmail.

### Arkusz Google (73 kolumny)

Po **Code_MergeAskClarification** idą **równolegle**: **Resend_AskClarification** oraz **Code_BuildSheetRowZapytania** → … — w arkuszu m.in. `wyslana_akcja` = `ask_clarification`, pole pomocnicze **`ask_clarification_source`**: `perplexity` lub `fallback_template`.

**If_SkipClientOfferResend** — gdy `skip_client_offer_resend` (po ask), **nie** wysyła drugiego maila oferty (wolny/zajęty); arkusz i tak się zapisuje.

---

## 4. Odpowiedź klienta na doprecyzowanie

Kolejny mail w wątku zwykle **znów wpadnie na IMAP** jako **nowa wiadomość**. Ten sam workflow:

1. Wyciąga treść (formularz / cytat odpowiedzi),
2. Perplexity ponownie wypełnia pola,
3. Jeśli tym razem jest konkretny dzień lub zakres — idzie właściwa gałąź.

### Dlaczego odpowiedź „Re: Doprecyzowanie…” mogła nie wejść w workflow

**Filter_WP_Formularz** na początku **przepuszcza tylko** maile wyglądające jak **formularz WordPress** (słowa kluczowe w temacie + „odciski” w treści + min. pola / e-mail klienta). Zwykła odpowiedź z Gmaila na *Doprecyzowanie zapytania…* **nie ma** tych odcisków — wcześniej kończyło się na `return []`.

W **`automail-imap-fixed.json`** jest wyjątek: jeśli w temacie jest **`doprecyzowanie`** (np. *Re: Doprecyzowanie zapytania — …*) **oraz** uda się ustalić **adres klienta** z **From** / treści, mail jest traktowany jak kontynuacja zapytania i idzie dalej do Perplexity.

### Pętla „znowu proszę o doprecyzowanie” (odpowiedź z Gmaila z cytatem)

Gdy klient odpisuje na *Doprecyzowanie…*, **treść maila zawiera długi cytat** poprzedniej wiadomości. Perplexity widział wtedy głównie szablon („proszę o uzupełnienie…”) i **nie wyciągał** z góry wątku fraz typu *lipiec 2027*, *Kalisz*, *restauracja Margo*, *wesele* → `date_ok` / `date_range_ok` zostawały **false** → workflow **znów** wysyłał **ten sam** mail doprecyzowania.

**Naprawa w eksporcie:**

1. **`PrzykladMaila1`** — pole **`emailBodyForAi`**: obcina cytat gdy temat ma **`doprecyzowanie`** **lub** zwykłe **`Re:`** (odpowiedź w wątku — Gmail/Outlook).
2. **`Perplexity_Analyze`** — do analizy idzie **`emailBodyForAi || emailBody`**; w promptcie systemowym jest reguła dla odpowiedzi na doprecyzowanie.
3. **`ParseAndRoute`** — **`applyClarificationReplyHeuristics()`** dla **`doprecyzowanie`** *albo* **krótkiej odpowiedzi klienta** (`client_short_followup`: **nie** wordpress/noreply/biuro, treść po obcięciu **1–280** znaków, temat **`Re:`** lub doprecyzowanie): heurystyki jak wyżej; **jedno słowo** (np. *Kalisz*) trafia w **`venue_or_city`** jeśli nie złapało miasta regexem. Gdy **nadal brak daty** → **`applyDefaultRangeAfterClientSupplement()`**: sztuczny zakres **2 miesiące** (od 1. dnia **następnego** miesiąca po dacie maila), flaga **`inferred_range_short_reply`** w outputcie (do arkusza). Dla `client_short_followup` wyłączane są **`needs_human_review`** / **`parse_error`** blokujące automat.
4. **`Filter_WP_Formularz`** — **`short_client_thread_reply`**: **`Re:`** + ta sama logika krótkiej treści z **`emailBodyForAi`** + nadawca **nie** z automatu → wpuszcza mail **bez** „odcisków” formularza WP (dopowiedź w wątku). W JSON jest **`short_client_thread_reply: true`**.

### Opcja: dopasowanie do arkusza (Google Sheets) po adresie klienta

Żeby zamiast domyślnego 2-miesięcznego zakresu **wczytać ostatnie zapytanie** tego maila z **Zapytania_Imprezja** (kolumna z e-mailem klienta, np. `wp_form_client_email` / `client_to_email`): możesz **przed** `Perplexity_Analyze` dodać gałąź **Google Sheets → Lookup** (filtr wierszy po adresie z `emailFrom` / `wp_form_client_email`) i **Merge** wyniku z treścią maila w polu przekazywanym do AI albo nadpisać `event_date_*` w **Code** po odczycie arkusza. W eksporcie tego nie ma — zależy od ID arkusza i nagłówków; opis kolumn: `N8N_GOOGLE_SHEETS_ZAPYTANIA.md`.

**Uwaga:** krótkie **`Re:`** od prawdziwego klienta mogą teoretycznie wejść w spam — ryzyko akceptowalne przy krótkiej treści i wykluczeniu nadawców systemowych.

### IMAP: dlaczego odpowiedź była „niewidoczna” mimo `X-Mozilla-Status` (np. 0001 = przeczytane)

W n8n **Email Trigger (IMAP) v2.1** kryteria z **Custom Email Rules** są **łączone przez AND** z `UID last:*` (lub `SINCE` przy pierwszym uruchomieniu). Gdy ustawione było **`["UNSEEN"]`**, szukano **UNSEEN AND UID≥last** — mail **już otwarty w Thunderbirdzie / Mozilli** traci flagę nieprzeczytany → **nie spełnia UNSEEN** → workflow go **pomijał**, nawet gdy filtr „doprecyzowanie” był OK.

**W `automail-imap-fixed.json`:** **`customEmailConfig: []` (puste)** — bez `UNSEEN`. Nowe maile wybiera wyłącznie **`trackLastMessageId`** (UID / data aktywacji), więc **przeczytane odpowiedzi na doprecyzowanie też są przetwarzane**.

**Uwaga:** przy **`client_short_followup`** workflow **nie** kieruje na human tylko dlatego, że Perplexity zgłosił review — nadal obowiązują **greedyHuman** / **unreasonableAi** itd.

---

## 4b. Jedna wiadomość zamiast „doprecyzowanie” + lista terminów

**Problem:** To samo zapytanie (np. „lipiec 2026 / maj 2027 — wolne terminy?”) potrafiło raz pójść w **Ask** (`date_range_ok` = false), a przy drugim uruchomieniu w **zakres kalendarza** — klient dostawał **dwa** maile.

**W `ParseAndRoute`:** pole **`date_range_ok_calendar`** = true, gdy **nie** `human`, jest zapytanie o imprezę, **nie** `narrow_range_request` / overbroad / greedy, oraz są dwa sensowne końce zakresu (`event_date_start` … `event_date_end`), **1–92 dni** różnicy — **niezależnie** od tego, czy AI ustawiło klasyczne `date_range_ok`.

**`If_DateRangeOK`:** warunek **`date_range_ok` OR `date_range_ok_calendar`** (combinator **OR**). Wtedy od razu **lista weekendów + PDF + dopytanie o miejsce** w **jednym** mailu, bez osobnego „Doprecyzowanie…”.

---

## 5. Node’y do sprawdzenia po imporcie JSON

1. **Code_RollupRangeSaturdays** — w UI n8n ustaw tryb **Run Once for All Items** (w eksporcie jest `mode: runOnceForAllItems` + `language: javaScript`). **Treść maila:** w pierwszej kolejności lista **wolnych piątków i sobót** (max 10); przy braku wolnych weekendów — prośba o potwierdzenie sprawdzenia **przed/po** okresem; krótko opcjonalnie **inne wolne dni** w tym samym zakresie; pytanie o **inny dzień tygodnia** przy wybranym terminie.
2. **Google_Calendar_RangeEventsForColor** — ten sam **kalendarz** i credential co **Google_Calendar_EventsForColorCheck** (oba: **Event → Get Many**).
3. **If_DateRangeOK** / **If_RangeSaturdayListOk** — bez zmian parametrów, tylko podłączenie z importu.
4. **Perplexity_AskClarification** — ten sam **Header Auth** co **Perplexity_Analyze** (po imporcie często trzeba ręcznie przypisać credential).
5. **If_SkipClientOfferResend** — po imporcie sprawdź połączenia: **true** → **NoOp_SkipOfferAfterAsk**, **false** → **If_TerminWolny**.

---

## 6. Testy ręczne (Manual Trigger)

W **Set_WP_Formularz_Przyklad** (lub osobny test) ustaw np.:

- *„Dzień dobry, jakie macie wolne terminy w sierpniu 2026? Pozdrawiam, Jan”* (albo *„wolne soboty w sierpniu…”* — nadal miesiąc/sezon)  
  → oczekiwane: `month_or_season`, zakres 2026-08-01…2026-08-31; kalendarz nadal sprawdzany **dzień po dniu** w limicie workflow, ale **treść maila do klienta** skupia się na **wolnych piątkach i sobotach** (skrócona lista), nie na wszystkich dniach tygodnia.

- *„Czy 15.08.2026 jesteście wolni na wesele w Warszawie?”*  
  → `single_day`, dotychczasowa ścieżka jednego dnia.

- *„Czy jesteście wolni?”* (bez daty i miejsca)  
  → mail doprecyzowania.

- *„Jakie macie wolne terminy w całym 2027 roku?”*  
  → **bez** auto-listy dni — mail z prośbą o **węższy okres** (miesiąc / kwartał); wiersz w arkuszu z `ask_narrow_range` (jeśli nie pójdzie w human).

- *„Wyślij wszystkie wolne terminy na 5 lat”*  
  → raczej **human** (Resend_NotifyDJ).
