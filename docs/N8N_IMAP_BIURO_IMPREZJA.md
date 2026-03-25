# Skrzynka `biuro@imprezja.pl` jako wejście do n8n + akceptacja wysyłki

## 0. Czy **„PrzykladMaila”** zadziała po samym IMAP w credentialach?

**Nie wystarczy sam credential IMAP.** Credential tylko **loguje** n8n do serwera — **nie** podstawia danych do workflowu.

- Node **„PrzykladMaila”** w plikach JSON to zwykły **Set** z **ręcznie wpisanym** przykładem — służy do testów z **Manual Trigger**.
- Gdy włączasz **prawdziwą** skrzynkę, robisz tak:
  1. **Usuń** (lub odłącz) **Start** + stary **Set** „PrzykladMaila” z przykładowymi wartościami.
  2. Na początku daj **Email Trigger (IMAP)** / **IMAP Email** z credentialu IMAP.
  3. **Zaraz za nim** dodaj node **Set** i nazwij go dokładnie **`PrzykladMaila`** (tak samo jak w workflow) — wtedy **Code** w **ParseAndRoute** / **ParseJSON** z `$('PrzykladMaila')` **działa bez zmiany kodu**.
  4. W tym Set mapujesz pola z IMAP na nazwy oczekiwane dalej:

| Pole w dalszej części workflowu | Wartość w Set (wyrażenie — dostosuj do podglądu IMAP) |
|----------------------------------|--------------------------------------------------------|
| `emailSubject` | `={{ $json.subject }}` (czasem `json.headers.subject`) |
| `emailBody` | `={{ $json.text }}` lub `={{ $json.textPlain }}`; jeśli jest tylko HTML: użyj **Code** żeby wyciągnąć tekst z `html` |
| `emailFrom` | `={{ $json.from.value[0].address }}` lub `={{ $json.from }}` — **sprawdź** w **Execute node** na jednym mailu, jak wygląda struktura |
| `emailReplyTo` | **WP Mail SMTP** często ustawia **`From: biuro@…`** a **adres klienta w `Reply-To`** — w **`automail-imap-fixed.json`** node **`PrzykladMaila1`** (Code) wyciąga to do `emailReplyTo` |
| `x_mailer` | opcjonalnie z nagłówka **`X-Mailer`** (np. `WPMailSMTP/...`) — używane w **`Filter_WP_Formularz`** jako dodatkowy sygnał „mail z WP” |
| `mailDate` | `={{ $json.date }}` lub `={{ $now.toISO() }}` jeśli brak sensownej daty |

**Alternatywa:** zostaw dowolną nazwę node (np. `Mail_z_IMAP`) i w **ParseAndRoute** / **ParseJSON** zamień `$('PrzykladMaila')` na `$('Mail_z_IMAP')`.

Przykład z Twojej konfiguracji: host **imap.dpoczta.pl**, port **993**, SSL **włączone**, user **biuro@imprezja.pl** — to jest poprawny typ ustawień dla poczty **dPoczta**; reszta to mapowanie pól jak wyżej.

---

## 1. Podłączenie skrzynki (IMAP)

Domena **imprezja.pl** — host IMAP bierzesz z **panelu poczty/hostingu**. U Ciebie (dPoczta) często jest **`imap.dpoczta.pl`** (jak na screenie) — zawsze **potwierdź w dokumentacji dostawcy**.

Typowe wartości (**potwierdź w panelu**):

| Pole | Często bywa |
|------|-------------|
| **Serwer** | np. **`imap.dpoczta.pl`** (dPoczta) albo `mail.imprezja.pl` u innych operatorów |
| **Port** | `993` |
| **SSL / TLS** | włączone (IMAPS) |
| **Użytkownik** | pełny adres: `biuro@imprezja.pl` |
| **Hasło** | hasło skrzynki lub **hasło aplikacji**, jeśli dostawca wymaga |

W n8n:

1. **Credentials** → **IMAP** → host, port, user, hasło, SSL.  
2. Dodaj node **Email Trigger (IMAP)** (w JSON workflowu: `emailReadImap`) jako **pierwszy** node produkcyjny — tak jest w **`automail-imap-fixed.json`** jako **`IMAP_Biuro_Imprezja`**.  
3. Wybierz skrzynkę **INBOX**. **Jak to działa:** serwer zwykle wysyła powiadomienie **IMAP IDLE** — nowy mail uruchamia workflow **w momencie dostawy**, a nie „co N minut”.  
4. W **Options** node’a IMAP ustaw **Force Reconnect Every Minutes** na **10** (w eksporcie z repo jest już `forceReconnect: 10`): co 10 minut n8n **odświeża połączenie** z serwerem — to pomaga przy zrywanych sesjach; **to nie jest** zamiana IDLE na sprawdzanie tylko co 10 min.  
5. **Nie** commituj hasła do Git — tylko credential w n8n.

**Czy da się „tylko co 10 minut sprawdź skrzynkę” bez IDLE?** W **wbudowanym** n8n trigger IMAP jest jeden (push/IDLE + opcjonalny force reconnect). Żeby **ścisły harmonogram** np. co 10 min bez ciągłego nasłuchu, potrzebny byłby osobny scenariusz: **Schedule Trigger** + node **pobierający** maile (np. community / własny skrypt HTTP) — poza tym jednym plikiem JSON.

### Mapowanie pól → reszta workflowu

Obecne workflowy startują od **Set** „PrzykladMaila” z polami: `emailSubject`, `emailBody`, `emailFrom`, `mailDate`.

Po IMAP **usuń** (lub obejś) ręczny Set i wstaw **Set** (lub **Code**) mapujący wyjście IMAP:

| Twoje pole | Skąd w IMAP (nazwy bywają różne — sprawdź w podglądzie node) |
|------------|------------------------------------------------------------------|
| `emailSubject` | `subject` |
| `emailBody` | `text` lub `textPlain` albo z HTML: strip tagów w **Code** |
| `emailFrom` | `from` (czasem obiekt — weź `.value` / pierwszy adres) |
| `mailDate` | `date` / `internalDate` → `={{ $json.date }}` lub `$now` jeśli brak |

Następnie połącz wyjście tego **Set** do **Filter_WP_Formularz** (a stamtąd przez **Code_DedupAndTerminGuard** do **Perplexity_Analyze**) — jak w **`automail-imap-fixed.json`**.

**Duplikaty / ten sam mail dwa razy:** w **`automail-imap-fixed.json`** node **`Code_DedupAndTerminGuard`** zapisuje w **`$getWorkflowStaticData('global').automailDedupTermin.processedMsgIds`** znormalizowany nagłówek **`Message-ID`** (z **`PrzykladMaila1` → `imap_message_id`**) — powtórne uruchomienie z tym samym ID w ciągu **14 dni** kończy się **`return []`** (bez Perplexity). Dodatkowo ten sam node liczy **zapytania o terminy** per **`wp_form_client_email`**; od **3.** takiego maila workflow idzie w **human** i **Resend_NotifyDJ** dostaje w treści **skróty wcześniejszych zapytań** — szczegóły: `docs/N8N_AUTOMAIL_DEDUP_TERMIN.md`. Oprócz tego możesz na serwerze pocztowym włączyć **oznacz jako przeczytany** / folder „Przetworzone”. **Action IMAP = Nothing** — n8n **nie usuwa** maili ze skrzynki.

---

## 1b. Maile „znikały” ze skrzynki — czy to n8n?

**Oficjalny Email Trigger (IMAP) w n8n nie kasuje wiadomości** i nie przenosi ich do kosza. Może jedynie (przy **Mark as read**) dodać flagę przeczytania. Przy **Nothing** zostawia wiadomość taką, jaką pobrał z serwera.

Jeśli w **Odebranych** (i w koszu) **nie ma** maili z formularza, sprawdź po kolei:

| Możliwa przyczyna | Co zrobić |
|-------------------|-----------|
| **Ten sam adres From i To** (`biuro@` → `biuro@`) przy WP Mail SMTP | Część serwerów **nie pokazuje** takiej wiadomości w Odebranych (traktuje jak wysłaną do siebie / deduplikacja). **Rozwiązanie:** w **WP Mail SMTP** ustaw **From** na inny adres w domenie (np. `wordpress@imprezja.pl`, `formularz@…`, `noreply@…`), a **Reply-To** zostaw na klienta. |
| **POP3** na innym urządzeniu / Gmail „pobierz pocztę” | Opcja **usuń z serwera po pobraniu** usuwa z IMAP — wyłącz lub przejdź na samo IMAP. |
| **Filtry / reguły** w panelu dPoczta / webmail | Sprawdź przekierowania, auto-archiwizację, antyspam. |
| **Widok „tylko nieprzeczytane”** | Mail jest, ale oznaczony przeczytany przez inny klient. |

W eksporcie **`IMAP_Biuro_Imprezja`** jest jawne: **Format simple**, **postProcessAction: nothing**, **`customEmailConfig: []` (puste)** + **`trackLastMessageId: true`** — n8n dobiera maile po **UID**, nie po UNSEEN (żeby odpowiedzi przeczytane w innym kliencie nadal wchodziły w workflow). Bez usuwania z serwera.

### Formularz WordPress na `biuro@` — tylko te maile (Kadence / CF7)

W eksporcie workflow **`docs/n8n-workflows/automail-imap-fixed.json`** po mapowaniu IMAP (**`PrzykladMaila1`**) jest node **`Filter_WP_Formularz`** (Code). **Inne maile niż z formularza nie trafiają do Perplexity** — node zwraca pustą listę (`return []`), więc gałąź się kończy.

**Logika (domyślnie):**

1. **Sygnał „ze strony”** — spełniony, gdy **temat** zawiera którykolwiek fragment z tablicy `SUBJECT_INCLUDES_ONE_OF` *albo* treść pasuje do któregoś regexu z `BODY_FINGERPRINTS` (Kadence, CF7, „form submission” itd.).
2. **Struktura formularza** — domyślnie w treści muszą być rozpoznane **co najmniej 2 pola** spośród: Imię, E-mail, Telefon, Treść **albo** (wyjątek pod **WP Mail SMTP**) jest **sensowny `Reply-To` klienta** *i* treść pasuje do **`BODY_FINGERPRINTS`** (np. „Wysłane z Imprezja”, „treść zapytania”) — wtedy jedno pole z treści wystarczy. Obsługiwane są:
   - format **`Etykieta: wartość`** w jednej linii,
   - format **etykieta w osobnej linii, wartość pod spodem** (częste w HTML z WordPressa),
   - format **jedna linia po `stripHtml`**: `Imię Damian Email … Treść zapytania … Wysłane z Imprezja` (np. z `&nbsp;` zamiast spacji — normalizowane w filtrze); dodatkowo uproszczony regex na **zepsute UTF-8 w etykiecie „Imię”** (np. `ImiÄ™` przy złym dekodowaniu),
   - stopka **`Wysłane z Imprezja`** (regex w `BODY_FINGERPRINTS`),
   - nagłówek **`X-Mailer: …WPMailSMTP…`** jako dodatkowy sygnał w połączeniu z tematem / treścią.
   **Telefon** musi zawierać cyfrę — pusty telefon nie „zjada” następnego pola (np. „Skąd o mnie wiecie?”).
3. **E-mail klienta** — kolejność: pole **E-mail** z treści → pierwszy sensowny adres w treści → **`emailReplyTo`** z nagłówka (gdy **`From`** to np. `biuro@imprezja.pl`, a klient jest w **Reply-To**). Wyłączenia: `noreply`, `wordpress@`, **`biuro@imprezja.pl`** itd.

**WP Mail SMTP:** maile z formularza często mają **`From: biuro@imprezja.pl`**, **`Reply-To: klient@gmail.com`**, **`Subject: Zapytanie formularz`**, treść **HTML** bez osobnego `text/plain`. Workflow **`PrzykladMaila1` + `Filter_WP_Formularz`** jest pod to dopasowany — po imporcie JSON **nie musisz** ręcznie kopiować nagłówków; wystarczy, że IMAP zwraca `headers` / `replyTo` (sprawdź jednym **Execute** na żywym mailu).

**Co dopasować po jednym prawdziwym mailu z formularza:**

- Otwórz w n8n **`Filter_WP_Formularz`** i edytuj na górze skryptu:
  - **`SUBJECT_INCLUDES_ONE_OF`** — wklej unikalny fragment tematu z maila WP (np. nazwa formularza z Kadence).
  - **`BODY_FINGERPRINTS`** — jeśli w treści jest stały tekst (stopka „wysłane z…”), dodaj prosty regex.
- **`ParseAndRoute`** nadal używa **`$('PrzykladMaila1')`** (pełny mail); filtr tylko blokuje wejście — nie zmienia tego odwołania.

Opcjonalnie w JSON po filtrze masz pola: `wp_form_name`, `wp_form_email`, `wp_form_phone`, `wp_form_message`, `wp_form_client_email` (do debugu lub przyszłych kroków).

---

## 2. Czy odpowiedzi idą **automatycznie**, czy jest **akceptacja**?

### Jak jest teraz w plikach JSON z repozytorium

Node **HTTP Request → Resend** wysyła maila **od razu**, w tej samej execucji co analiza. **Nie ma** wbudowanego ekranu „zaakceptuj” w n8n Community — o ile sam nie dodasz kroku.

### Tryby, które możesz wdrożyć

| Tryb | Opis | Złożoność |
|------|------|-----------|
| **A. Pełna automatyzacja** | IMAP → AI → Resend (jak teraz). Klient dostaje odpowiedź bez Twojego kliknięcia. | Niska — już to masz. |
| **B. Tylko powiadomienie + Ty wysyłasz z Gmaila** | Zamiast Resend do klienta: tylko **Resend_NotifyDJ** (lub drugi szablon) z **gotową treścią odpowiedzi** w treści maila; Ty kopiujesz / wysyłasz z **biuro@imprezja.pl**. | Niska — wyłącz lub obejście node’ów Resend do klienta. |
| **C. Kolejka w arkuszu / bazie („czeka na akceptację”)** | Po wygenerowaniu HTML: **Postgres Insert** lub **Google Sheets Append** (`status=pending`, `html`, `to`). **Drugie** workflow: **Schedule** + Ty w arkuszu zmieniasz na `approved` **albo** osobny przycisk → webhook → node wysyła Resend. | Średnia — pełna kontrola przed wysyłką. |
| **D. Formularz / webhook „Wyślij”** | Node **Wait** (jeśli dostępny w Twojej wersji) na webhook z unikalnym ID; link w mailu do Ciebie. | Wyższa. |

**Rekomendacja na start:** **A** na małym ruchu + dobre filtry AI + gałąź **human** do Ciebie; albo **B** przez pierwsze tygodnie, potem **C**.

### Gdzie „klikasz akceptację” w n8n?

W standardowym **self-hosted Community** **nie ma** jednego przycisku „Approve” przy wykonaniu. Akceptacja to zwykle:

- zewnętrzny **arkusz / baza** + ręczna zmiana statusu + drugi workflow, **lub**
- **wyłączenie** automatycznej wysyłki i obsługa z **powiadomienia** na `biuro@` / `nowaczykdamian@`.

---

## 3. Spójność „z” i „do” skrzynki

- **Odbiór:** IMAP na `biuro@imprezja.pl`.  
- **Wysyłka:** nadal **Resend** z adresu **zweryfikowanego w Resend** (np. `biuro@imprezja.pl` po DNS) — wtedy klient widzi ten sam nadawca; **Reply-To** ustaw na `biuro@imprezja.pl`, żeby odpowiedzi wracały na skrzynkę, którą czytasz w IMAP.

Szczegóły Resend + domena: [`STRIPE_RESEND_RENDER.md`](./STRIPE_RESEND_RENDER.md).

---

## 4. Checklista testu

1. Credential IMAP — **Test** w n8n.  
2. Jeden mail testowy na `biuro@imprezja.pl`.  
3. **Execute workflow** (lub poczekaj na poll).  
4. Sprawdź **Executions** w n8n — czy pola `emailSubject` / `emailBody` są wypełnione.  
5. Dopiero potem włącz **Resend** do klienta (lub zostaw tylko gałąź do DJ).

Powiązane: [`N8N_EMAIL_SETUP.md`](./N8N_EMAIL_SETUP.md), [`N8N_MECHANIZM_JEDEN_ZAPYTANIE_IMPREZA.md`](./N8N_MECHANIZM_JEDEN_ZAPYTANIE_IMPREZA.md), [`RENDER_N8N.md`](./RENDER_N8N.md).
