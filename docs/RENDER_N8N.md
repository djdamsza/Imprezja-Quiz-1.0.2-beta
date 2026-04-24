# n8n na Render (plan darmowy + Postgres)

Krótki przewodnik pod osobny projekt na Render (jak u Was stripe-shop). **Bez Postgres workflowy i credentials znikną** po restarcie — Postgres jest obowiązkowy.

---

## 1. Nowy workspace na Render (opcjonalnie)

Osobne konto lub osobny **Team/Project** w Render — izolacja od produkcji.

---

## 2. Baza PostgreSQL

1. **Dashboard** → **New +** → **PostgreSQL**
2. **Name:** np. `n8n-db`
3. **Plan:** Free (sprawdź aktualne zasady wygaśnięcia darmowej bazy w [dokumentacji Render](https://docs.render.com/free))
4. **Create** — po utworzeniu pobierz dane połączenia (patrz poniżej: **Gdzie w Render jest hostname Postgres**).

### Gdzie w Render jest hostname / Internal URL (Postgres)

Ścieżka w [dokumentacji Render](https://docs.render.com/postgresql-creating-connecting):

1. [dashboard.render.com](https://dashboard.render.com) → na liście zasobów kliknij **bazę PostgreSQL** (ikona/typ **Postgres**), **nie** serwis `n8n-automation`.
2. Otworzy się strona bazy — zwykle widok **Info** (informacje).
3. **Prawy górny róg** strony bazy: menu **Connect** — tam są **Internal** i **External** URL (`postgresql://…`).
4. Alternatywnie: przewiń w dół strony bazy — sekcja z **internal connection** / szczegółami prywatnymi (hostname, port, user, database).

Z **Internal URL** (dla usług w **tym samym regionie** co baza) wyciągasz:

- host = fragment **między** `@` a **`:5432`** (bez ukośnika i bez nazwy bazy),
- `DB_POSTGRESDB_PORT` = `5432`,
- user / hasło / database = jak w URL (albo skopiuj osobne pola, jeśli Render je pokazuje).

Przykład:  
`postgresql://n8n_user:HASLO@dpg-xxxxx-a.frankfurt-postgres.render.com:5432/n8n_db`  
→ **host** = `dpg-xxxxx-a.frankfurt-postgres.render.com` (tylko to wklejasz do `DB_POSTGRESDB_HOST`).

### Nie widzę bazy na liście, a Render pisze „tylko jedna darmowa baza”

- **Wejdź w projekt** (np. **My project**) — Postgres często nie jest w sekcji *Ungrouped*.  
- Sprawdź zakładki **Suspended** / **All** — free baza po wygaśnięciu może zniknąć z *Active*, ale slot bywa nadal zajęty.  
- Przełącz **workspace** (menu u góry) — limit free Postgres jest **per workspace**; baza mogła powstać w innym workspace niż serwis n8n.  
- Szukaj po nazwie w **Search services** (`postgres`, `dpg`).  
- Prefix hosta `dpg-…` w starych zmiennych środowiskowych oznacza, że instancja Postgres na Render **kiedyś istniała** — poszukaj jej w innych projektach/workspace.

---

## 3. Web Service (obraz Docker n8n)

1. **New +** → **Web Service**
2. Wybierz **Deploy an existing image from a registry**
3. **Image URL:** `docker.io/n8nio/n8n:latest`  
   (na produkcji możesz przypiąć tag wersji, np. `n8nio/n8n:1.123.4`)
4. **Name:** np. `n8n-automation`
5. **Region:** **ten sam** co Postgres
6. **Instance type:** Free
7. **Docker Command — ważne dla obrazu `n8nio/n8n`**  
   Oficjalny obraz ma **ENTRYPOINT** (`tini` → `docker-entrypoint.sh`), który uruchamia **`exec n8n "$@"`**.  
   Jeśli w **Docker Command** wpiszesz `sh -c "export N8N_PORT=… && n8n start"`, te słowa trafiają **jako argumenty do `n8n`**, a nie do powłoki → typowo **deploy pada z kodem 127** („command not found”).

   **Zalecenie (jak [oficjalny szablon Render](https://github.com/render-examples/n8n)):**  
   - **Wyczyść pole Docker Command** (zostaw **puste**) — start z domyślnego obrazu.  
   - W **Environment** dodaj **`PORT`** = **`5678`**, żeby Render kierował ruch na port, na którym n8n domyślnie nasłuchuje ([opis portów](https://docs.render.com/web-services#port-binding)).  
   - Opcjonalnie dla pewności: **`N8N_PORT`** = **`5678`**.

   **Tylko jeśli musisz nadpisać entrypoint** (np. zaawansowane scenariusze): na Renderze ustawiasz wtedy inny entrypoint + komendę według ich dokumentacji — to nie jest potrzebne przy standardowym n8n + Postgres.

   Jeśli trzymasz **Internal Database URL** w zmiennej `INTERNAL_DB_URL` (Blueprint), użyj `docs/render-n8n-blueprint.yaml` — tam `startCommand` jest wieloliniowy **bez** psucia entrypointu tylko wtedy, gdy Blueprint faktycznie zastępuje sposób startu (sprawdź zachowanie Render dla `runtime: image`).

   **Po utworzeniu usługi:** **Settings** → sekcja obrazu / Docker → **Docker Command** → opróżnij → **Save Changes**.

8. **Dysk (Disks)** — na planie **Free** w menu **nie ma** pozycji **Disks**; trwały volume jest od planów płatnych. **Dla n8n + Postgres dysk nie jest potrzebny** — trzymaj workflowy w bazie, nie na lokalnym dysku instancji.

### Log: `Exited with status 127` / `... not found`

Najczęściej przy **`n8nio/n8n`**: w **Docker Command** jest **`sh -c "..."`**, a entrypoint obrazu i tak woła `n8n` z tymi tokenami jako argumentami CLI — **nie** uruchamia powłoki. **Rozwiązanie:** opróżnij **Docker Command** i ustaw **`PORT=5678`** (oraz opcjonalnie `N8N_PORT=5678`) w Environment.

Starszy błąd typu `sh: export N8N_PORT=10000 && n8n start: not found` zwykle znaczy, że do `sh` nie trafiło `-c` (cały ciąg potraktowany jako nazwa polecenia).

### Nie widzę Start Command w kreatorze

- Szukaj **na dole formularza** przed przyciskiem utworzenia — często jest schowane pod **Advanced**.
- Nazwa pola bywa **`Docker Command`** (to zastępuje domyślne `CMD` z obrazu Dockera).
- Ekran **Environment Variables** to **tylko** zmienne — tam **nie** wpisuje się komendy startu.

---

## 4. Zmienne środowiskowe (Environment)

Dodaj w **Environment** serwisu WWW:

| Klucz | Wartość / skąd |
|--------|----------------|
| `DB_TYPE` | `postgresdb` |
| `DB_POSTGRESDB_HOST` | **Pełny** hostname z **Connect → Internal** (np. `dpg-xxxxx-a.frankfurt-postgres.render.com`). **Nie** wystarcza skrót `dpg-xxxxx-a` — DNS zwraca `ENOTFOUND` i n8n nie wstanie. |
| `DB_POSTGRESDB_PORT` | `5432` (lub z panelu) |
| `DB_POSTGRESDB_DATABASE` | nazwa bazy z panelu |
| `DB_POSTGRESDB_USER` | użytkownik z panelu |
| `DB_POSTGRESDB_PASSWORD` | hasło z panelu |
| **`DB_POSTGRESDB_SSL_ENABLED`** | **`true`** — **obowiązkowe na Render Postgres**; bez tego w logach: **`SSL/TLS required`** / **`There was an error initializing DB`**, n8n się nie podniesie i Render zgłosi **„Port scan timeout”** (nic nie nasłuchuje, bo proces pada przy starcie). |
| **`DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED`** | Zwykle najpierw **nie dodawaj** (domyślnie `true`). Jeśli po włączeniu SSL pojawi się błąd **certyfikatu** / **self signed**, ustaw **`false`** ([dokumentacja n8n](https://docs.n8n.io/hosting/configuration/environment-variables/database/)). |
| **`DB_POSTGRESDB_CONNECTION_TIMEOUT`** | Na **free** (wolny CPU, „zimna” baza) często **`60000`**–**`120000`** (ms). Domyślnie n8n ma **`20000`** — przy pierwszym połączeniu po uśpieniu Web Service / Postgres bywa za mało → **`Database connection timed out`**. |
| `N8N_ENCRYPTION_KEY` | **losowy** sekret — np. `openssl rand -base64 32` — **zapisz poza Render**; bez tego credentials w n8n są bezużyteczne po utracie klucza |
| `N8N_PROTOCOL` | `https` |
| `N8N_HOST` | host **bez** `https://`, np. `n8n-automation.onrender.com` (dokładnie jak w URL Render) |
| `WEBHOOK_URL` | pełny URL z końcówką `/`, np. `https://n8n-automation.onrender.com/` |
| `GENERIC_TIMEZONE` | np. `Europe/Warsaw` |
| `TZ` | opcjonalnie `Europe/Warsaw` |
| `N8N_PROXY_HOPS` | `1` — Render stoi za load balancerem; bez tego bywa błąd **express-rate-limit** / `X-Forwarded-For` / `trust proxy` w logach. |
| `N8N_TRUST_PROXY` | opcjonalnie `true` — alternatywa / dodatek przy problemach z proxy (zależnie od wersji n8n). |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE` | **`true` blokuje wszystkie `$env` w node’ach** → błąd *access to env vars denied* przy m.in. `$env.RESEND_API_KEY` (automail / Resend) oraz opcjonalnie `$env.CALENDAR_BUSY_TZ_OFFSET` w **Code**. Zajętość kalendarza: **tylko wydarzenia „Cały dzień”** (`start.date`); **`CALENDAR_BUSY_COLOR_IDS` nie jest używane**. **Usuń** `N8N_BLOCK_ENV_ACCESS_IN_NODE` albo ustaw **`false`**, jeśli potrzebujesz `$env`. Perplexity w **automail** jest przez **Header Auth** — nie wymaga `$env`. |
| `AUTOMAIL_DISABLE_MESSAGE_ID_DEDUP` | Opcjonalnie **`1` / `true`** — **tylko testy**: wyłącza odrzucanie duplikatu po **Message-ID** w **Code_DedupAndTerminGuard** (ten sam mail z IMAP może wielokrotnie wejść w Perplexity). **Na produkcji nie ustawiaj.** Zamiast tego: wyczyść **static data** / `processedMsgIds` ([`N8N_AUTOMAIL_DEDUP_TERMIN.md`](./N8N_AUTOMAIL_DEDUP_TERMIN.md)). |

**Bezpieczeństwo (zalecane na start):**  
W panelu n8n ustaw **owner account** przy pierwszym wejściu; rozważ też zmienne `N8N_BASIC_AUTH_ACTIVE`, `N8N_BASIC_AUTH_USER`, `N8N_BASIC_AUTH_PASSWORD` (żeby nie zostawić otwartego UI).

Po zapisaniu zmiennych Render zrobi deploy — pierwsze uruchomienie może trwać kilka minut.

### n8n: „access to env vars denied” (Perplexity / Resend / HTTP Request)

- **Przyczyna:** **`N8N_BLOCK_ENV_ACCESS_IN_NODE=true`** w Environment Rendera ([dokumentacja n8n](https://docs.n8n.io/hosting/configuration/environment-variables/security/)).
- **Rozwiązanie A (gdy używasz `RESEND_API_KEY` w automail):** **usuń** `N8N_BLOCK_ENV_ACCESS_IN_NODE` **lub** ustaw **`false`** → **Save and deploy**. Wartość `RESEND_API_KEY` ma być **sam** `re_…` (**bez** `Bearer` — dopisuje je wyrażenie w node’ie: `'Bearer ' + $env.RESEND_API_KEY`).
- **Rozwiązanie B:** zostaw `N8N_BLOCK_ENV_ACCESS_IN_NODE=true` i **nie używaj `$env` dla sekretów** — w n8n **Credentials → Header Auth** dla Perplexity / Resend (albo inny typ auth) zamiast `$env` w node’ach **HTTP Request** / **Code** (patrz [`n8n-workflows/IMPORT_AUTOMAIL_RESEND_ENV.md`](./n8n-workflows/IMPORT_AUTOMAIL_RESEND_ENV.md)).

**Jak sprawdzić, że n8n naprawdę używa Postgres:** w **Logs** przy starcie nie powinno być długotrwałego „tylko SQLite”; przy błędzie połączenia z bazą często są timeouty / retry. W Postgres (Render → baza → **Metrics** / narzędzie SQL) po pierwszym wejściu do UI powinny pojawić się tabele n8n (np. z prefiksem zależnym od wersji).

### Log: `SSL/TLS required` + `There was an error initializing DB` + „Port scan timeout”

**Przyczyna:** PostgreSQL na Renderze **wymaga połączenia przez SSL**; n8n domyślnie ma `DB_POSTGRESDB_SSL_ENABLED=false`.

**Co zrobić:** w **Environment** serwisu n8n dodaj:

1. **`DB_POSTGRESDB_SSL_ENABLED`** = **`true`**
2. **Save** → poczekaj na deploy.

Skoro n8n **nie startuje** (pętla przy init DB), **żaden port nie jest zbindowany** — stąd komunikat Render **„no open ports detected”**. To **nie** znaczy, że źle ustawiłeś `PORT`/`5678`; najpierw napraw **bazę + SSL**.

Jeśli po tym zobaczysz błąd typu **certificate** / **UNABLE_TO_VERIFY_LEAF_SIGNATURE**, dodaj **`DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED`** = **`false`** i zdeployuj ponownie.

### Log: `getaddrinfo ENOTFOUND dpg-…`

W **`DB_POSTGRESDB_HOST`** wklej **cały** host z pola **Hostname** przy **Internal Database URL** (zwykle końcówka **`.frankfurt-postgres.render.com`**, **`.oregon-postgres.render.com`** itd. — zgodnie z regionem). Sam identyfikator `dpg-xxxxx-a` **nie rozwiązuje się** przez DNS w kontenerze → `There was an error initializing DB`.

### Log: `ENOTFOUND postgresql://użytkownik:hasło@…`

Do **`DB_POSTGRESDB_HOST`** **nigdy** nie wklejasz **całego** connection stringa `postgresql://…` — tylko **sam hostname** (jedna domena). User, hasło, port i nazwa bazy to osobne zmienne: `DB_POSTGRESDB_USER`, `DB_POSTGRESDB_PASSWORD`, `DB_POSTGRESDB_PORT`, `DB_POSTGRESDB_DATABASE`. Inaczej n8n traktuje cały URL jako „nazwę hosta” i DNS zwraca `ENOTFOUND`.

### Log: `No encryption key found - Auto-generating`

Brakuje **`N8N_ENCRYPTION_KEY`** w Environment — n8n generuje klucz na ulotnym dysku; po restarcie/redeployu **inny** klucz psuje zaszyfrowane dane. Ustaw trwały klucz: `openssl rand -base64 32` i **nie zmieniaj** bez świadomej migracji.

### Log: `X-Forwarded-For` / `express-rate-limit` / `trust proxy`

Ustaw **`N8N_PROXY_HOPS=1`** (Render = jeden reverse proxy przed aplikacją). Zapisz, redeploy.

### Log: `No open ports detected` → `n8n ready on ::, port 5678` → `Your service is live` → zaraz `SIGTERM`

Często to **normalny przebieg redeployu** na Renderze, a nie awaria n8n:

1. **`No open ports detected`** — health check / skan portu odpala **zanim** n8n skończy start (migracje, Postgres). Po chwili pojawia się **`n8n ready … port 5678`** — **OK**.
2. **`Your service is live`** — Render uznał usługę za gotową.
3. **`Received SIGTERM` / `Stopping n8n`** — **stary** kontener jest **zatrzymywany**, gdy kończy się **nowy** deploy (wymiana instancji) albo kolejna próba deployu. **Przewiń logi w dół** po SIGTERM: zwykle zaraz jest **kolejny** start (`Initializing n8n process`) — to już **nowy** proces, który ma zostać.

**Kiedy martwić się:** jeśli **w kółko** (co minutę) widzisz tylko start → live → SIGTERM **bez** stabilnego działania w UI — wtedy sprawdź **Events** / **Deploy** w Renderze (failed health check, crash) oraz czy **`PORT`** i **`N8N_PORT`** to **`5678`**.

### Log: `User attempted to access a workflow without permissions`

Zwykle **nie** jest to błąd serwera Postgres. Ktoś (przeglądarka, stara zakładka, ping, skrypt) wołał **konkretny workflow** (URL z ID) przy **braku uprawnień** — np. **inny użytkownik** po świeżym setupie, **stary link** z poprzedniej bazy, wygasła sesja. **Rozwiązanie:** wejdź na **główny** URL `https://…onrender.com/`, **wyloguj / zaloguj**, ewentualnie **okno incognito**; nie otwieraj zapisanych linków do **starych** workflowów po resecie bazy.

---

## 4b. Zniknęły workflowy / znów prosi o założenie konta właściciela

To zwykle znaczy, że n8n wstał **jak świeża instancja** — dane **nie** były zapisane w trwałej bazie (albo wskazuje **inną / pustą** bazę).

| Przyczyna | Co zrobić |
|-----------|-----------|
| **Brak Postgres lub złe zmienne `DB_*`** | Workflowy poszły w **SQLite na dysku kontenera** — na Render free dysk jest **ulotny** (redeploy, nowy kontener, czasem restart) → **wszystko ginie**. Ustaw **wszystkie** zmienne z sekcji 4 (Internal host, user, password, database, port), **Save** → redeploy. |
| **Zmiana / skasowanie `N8N_ENCRYPTION_KEY`** | Inny klucz = inna „tożsamość” szyfrowania credentiali; przy pełnym resecie bazy zobaczysz znowu setup. **Nigdy nie zmieniaj** tego klucza bez świadomości konsekwencji — zapisz go w menedżerze haseł. |
| **Nowa baza Postgres / nowy serwis n8n** | Pusta baza = kreator od zera. Sprawdź, czy Web Service nadal jest **połączony** z **tą samą** instancją Postgres co wczoraj (to samo `DB_POSTGRESDB_HOST` / ta sama baza w panelu). |
| **Wygasła darmowa baza Render** | Free Postgres ma limit czasu ([dokumentacja Render](https://docs.render.com/free)) — po wygaśnięciu n8n może nie mieć dokąd pisać. |
| **Log: `Processed 0 draft workflows, 0 published workflows`** | n8n faktycznie widzi **pustą** bazę (albo **nową** bazę / **inny** `DB_POSTGRESDB_DATABASE`). To nie jest „zgubiony UI” — danych w tej bazie nie ma. Sprawdź w panelu **Postgres** (Render), czy to **ta sama** instancja co wcześniej; czy **hasło / user / nazwa bazy** w env nie zmieniły się przy „reset credentials”; czy nie utworzyłeś **drugiej** bazy i n8n nie wskazuje na nią przez pomyłkę. |
| **E-mail z „kluczem licencyjnym”** | To zwykle **onboarding / trial n8n** (produkt n8n), **nie** licencja Imprezja. Pojawia się przy **pierwszym** uruchomieniu świeżej instancji. |

### Log / konsola: `Unexpected server response: 403` (często z wersją np. `2.12.3`)

Zwykle **WebSocket** (push / live updates w edytorze) albo **inny klient** dostaje **403** zamiast upgrade połączenia. Przy hostingu za proxy:

1. **`N8N_PROTOCOL`** = **`https`**, **`N8N_HOST`** = **dokładnie** host z paska adresu (**bez** `https://`), np. `n8n-automation-l1yt.onrender.com`.
2. **`WEBHOOK_URL`** = `https://TEN-SAM-HOST/` (końcówka `/`).
3. **`N8N_PROXY_HOPS`** = **`1`** (już masz w docu); przy problemach dodaj **`N8N_TRUST_PROXY`** = **`true`**.
4. Wchodzisz w UI **tym samym** URL co w zmiennych (nie mieszaj `http` z `https`, innej subdomeny).
5. Jeśli masz **`N8N_BASIC_AUTH_*`** — czasem przeglądarka / rozszerzenia gubią sesję; sprawdź logowanie basic auth.

**403 nie kasuje workflowów z bazy** — jeśli jednocześnie widzisz **0 workflows** i **setup od zera**, priorytetem jest **sprawdzenie Postgres** (sekcja 4b powyżej), nie sam 403.

**Profilaktyka:** po skonfigurowaniu Postgres regularnie **Eksportuj workflowy** (n8n → menu workflow / backup). Na produkcji rozważ **płatną** bazę + ewentualnie wyższy plan Web Service, żeby uniknąć przypadkowych utrat danych przy limitach free.

---

## 5. Spin-down na free — ping co ~10–15 min

Darmowy Web Service **zasypia** po ~**15 minutach** bez HTTP.  
**Jeden cron dziennie** (jak przypomnienia w stripe-shop) **nie** trzyma instancji wybudzonej.

- Ustaw zewnętrzny ping **co 10–14 minut** na np. `https://TWOJ-SERWIS.onrender.com/` albo lekki endpoint (n8n odpowiada na głównym URL).
- Narzędzia: [cron-job.org](https://cron-job.org), UptimeRobot (free), lub cron z hostingu **o ile** pozwala na interwał **krótszy niż 15 min** (wiele paneli ma minimum 1 h — wtedy ping z zewnętrznej usługi).

### dPanel (dhosting) + PHP — częste przyczyny, że „cron jest”, a Render i tak śpi

1. **Interwał `*/15` na granicy limitu** — Render budzi się po ~15 min bez ruchu; opóźnienie crona + cold start sprawiają, że **co 15 minut bywa za rzadko**. Ustaw **`*/10 * * * *`** lub **`*/12 * * * *`**. **Dwa** zadania co 15 min w **tych samych** minutach **nie** zwiększają częstotliwości.
2. **Ścieżka z `~` w CRON** — część środowisk **nie rozwija** tyldy do katalogu domowego; wtedy PHP **w ogóle nie uruchamia** Twojego pliku (albo uruchamia inny). Wpisz **pełną ścieżkę** z panelu (np. `/home/LOGIN/imprezja.pl/public_html/cron-ping-n8n.php`) — ścieżkę zwykle podaje **FTP/SSH** lub pomoc dhosting.
3. **Katalog roboczy** — ustaw na **katalog, w którym leży skrypt** (np. `.../public_html`), spójnie z polem ŚCIEŻKA; rozjazd `public_html` vs katalog wyżej bywa mylący przy innych skryptach.
4. **Zły `$url` w pliku** — w szablonie z repo był przykładowy host; musi być **dokładnie** URL Web Service z Render (HTTPS, aktualna nazwa `*.onrender.com`).
5. **Skrypt „działa”, ale nie wychodzi na sieć** — na CLI czasem `allow_url_fopen=Off` i brak cURL; szablon w [`docs/examples/cron-ping-n8n-render-dhosting.php`](./examples/cron-ping-n8n-render-dhosting.php) najpierw używa **cURL**, potem `file_get_contents`. **Diagnostyka:** po każdym uruchomieniu powstaje **`cron-n8n-ping-last.txt`** (nadpisywany) — OK/FAIL, kod HTTP, URL, opcjonalnie **`src=nazwa-pliku.url`** i ewentualny błąd. Opcjonalnie pusty plik **`cron-ping-n8n.debug`** → dopisywanie do **`cron-n8n-ping.log`**. Adres Rendera: plik **`cron-ping-n8n.url`** *albo* **`NAZWA-TAKA-JAK-PHP.url`** (np. `cron-ping-n8n-render-dhosting.url` obok `cron-ping-n8n-render-dhosting.php`) — jedna linia, pełny `https://…onrender.com/`. Bez tego skrypt zostaje na placeholderze `TWOJ-SERWIS` i zawsze kończy się błędem.
6. **Limit czasu PHP w cronie (~30 s)** — na części hostingów **cron PHP** jest ubijany po ok. **30 sekundach**, niezależnie od `set_time_limit` w skrypcie. Cold start n8n na Renderze często trwa **dłużej** → w **`cron-n8n-ping-last.txt`** zobaczysz **FAIL** i np. pusty `http=-` lub timeout. **Rozwiązania:** (a) poproś dhosting o zwiększenie limitu czasu dla zadań CRON / PHP-CLI, (b) jeśli w panelu jest **cron „powłoka”** (bash) zamiast PHP, ustaw np.  
   `*/10 * * * * curl -fsS --max-time 120 "https://TWOJ-SERWIS.onrender.com/" -o /dev/null`  
   (ścieżka do `curl` wg panelu, czas max zgodny z limitem hostingu), (c) zostań przy PHP, ale **upgrade Render** (brak spin-down) albo krótszy cold start — wtedy odpowiedź zmieści się w 30 s.

---

## 6. E-mail na Render

Outbound SMTP z PaaS często jest zablokowany — tak jak przy stripe-shop używajcie **Resend** (API) w node’ach n8n albo innego dostawcy HTTP. Zob. `docs/STRIPE_RESEND_RENDER.md`.

**Konfiguracja krok po kroku (wysyłka + odbiór w n8n):** [`docs/N8N_EMAIL_SETUP.md`](./N8N_EMAIL_SETUP.md).

---

## 7. Wejście w n8n

Po deployu: `https://<twoja-nazwa>.onrender.com` — konfiguracja konta właściciela, potem workflowy.  
Tekst w logach `Editor is now accessible via: http://localhost:5678` dotyczy **wnętrza kontenera** — w przeglądarce używaj adresu **onrender.com**.

---

## 7a. Typowe logi (free / wolny start)

| Komunikat | Znaczenie |
|-----------|-----------|
| `[license SDK] Skipping renewal…` | Licencja komercyjna n8n — **do zignorowania** przy self-host bez enterprise. |
| `Database connection timed out` (raz lub w pętli) | **Postgres / sieć / limit czasu.** Ustaw **`DB_POSTGRESDB_CONNECTION_TIMEOUT`** = **`90000`** lub **`120000`** (ms). Upewnij się, że **`DB_POSTGRESDB_SSL_ENABLED=true`**. **Ten sam region** co baza; host **Internal** (pełna domena `…-postgres.render.com`). Na free po **uśpieniu** pierwsze połączenie bywa wolne — ping co ~10–15 min (sekcja 5) pomaga trzymać Web Service; Postgres free też może być wolny przy „budzeniu”. |
| Deprecacja: **`N8N_RUNNERS_ENABLED` → Remove this environment variable** | W **nowszych** wersjach n8n tej zmiennej **nie dodawaj** — jeśli jest w Render **Environment**, **usuń ją całkowicie** (n8n sam loguje, że już nie jest potrzebna). Nie ustawiaj `=false` „żeby wyłączyć” — po prostu **brak wpisu**. |
| `Failed to start Python task runner` / `Python 3 is missing` | Obraz **`n8nio/n8n`** często **nie ma** Pythona — **Python Code node** w trybie wewnętrznym nie wstanie. **JavaScript** w **Code node** zwykle działa inaczej (task broker / JS). Jeśli **nie** używasz Pythona w workflow — **zignoruj**. Potrzebujesz Pythona → [external task runners](https://docs.n8n.io/hosting/configuration/task-runners/) / osobny obraz. |
| `n8n Task Broker ready on 127.0.0.1, port 5679` | Lokalny broker dla runnerów — **normalne**; to **nie** jest port, który Render musi wystawić na zewnątrz (tylko **5678**). |
| `Task runner` / `grant token` / `5679` / `403` | Przy starcie na wolnym free bywa kilka prób — często potem **OK**. Nie ustawiaj przestarzałych zmiennych `N8N_RUNNERS_ENABLED` — patrz wiersz wyżej. |
| **`invalid or expired grant token`** + **`Failed to connect to n8n task broker at 127.0.0.1:5679`** + **`403`** (na początku logu) | **Wyścig przy starcie:** runner łączy się, zanim broker w pełni przyjmie token jednorazowy. Jeśli **potem** w tym samym starcie widzisz **`n8n Task Broker ready`**, **`Registered runner "JS Task Runner"`** i **`n8n ready`** — **zwykle możesz zignorować** te pierwsze błędy. Gdyby **Code node (JS)** w runtime zwracał błędy runnera — zaktualizuj **n8n** do nowszej wersji (n8n poprawiał timing auth broker/runner) albo sprawdź [forum n8n — 403 task runner](https://community.n8n.io/search?q=task%20runner%20403). |
| **`Received SIGTERM`** → **`Database connection timed out`** | Przy **zatrzymywaniu** kontenera (nowy deploy, rotacja, spin-down na free) Postgres przestaje odpowiadać w czasie shutdown — **często normalne** w logach **po** `SIGTERM`, nie oznacza samo z siebie uszkodzonej bazy. Jeśli timeouty są **przy zwykłym działaniu** (bez deployu), zwiększ timeout (wiersz `Database connection timed out` powyżej) + ping bazy / ten sam region. |
| `Unexpected server response: 403` (konsola / overlay) | Patrz sekcja **„Unexpected server response: 403”** w **4b** — proxy / `N8N_HOST` / `WEBHOOK_URL` / WebSocket. Upewnij się, że masz **`N8N_HOST`** = sam host jak w przeglądarce (np. `n8n-automation-l1yt.onrender.com`), spójny z **`WEBHOOK_URL`**. |
| `No open ports` → `live` → `SIGTERM` | Patrz sekcja powyżej (**„No open ports detected → … SIGTERM”**) — często **rotacja kontenera** przy deployu; sprawdź logi **po** SIGTERM. |
| `User attempted to access a workflow without permissions` | Stary URL workflowu / inna sesja — sekcja z tym samym tytułem w części **4** (powyżej 4b). |
| `Database connection recovered` | Po chwilowym problemie połączenie z Postgres wróciło — **OK**, o ile potem nie widzisz pustej instancji (wtedy to może być **inna** baza lub świeży volumen). |
| `Detected a new open port HTTP:5678` | Render wykrył nasłuch — **OK**. |

---

## 8. Później: upgrade bez przepisywania

Gdy przejdziesz na **paid** Web Service (bez spin-down), możesz **wyłączyć** agresywny ping; Postgres i te same zmienne zostają.

---

## Blueprint (opcjonalnie)

W repozytorium jest przykład [`render-n8n-blueprint.yaml`](./render-n8n-blueprint.yaml) — skopiuj jako `render.yaml` do **osobnego** małego repo (sam n8n) albo wklej zawartość w **Render → Blueprints**. Blueprint podstawia Postgres (`host` / `user` / `password` / `database` z `fromDatabase`) oraz **`DB_POSTGRESDB_SSL_ENABLED=true`** (wymagane na Render). Szczegóły SSL: sekcja **„Log: SSL/TLS required”** powyżej i [dokumentacja n8n (Postgres)](https://docs.n8n.io/hosting/configuration/environment-variables/database/).
