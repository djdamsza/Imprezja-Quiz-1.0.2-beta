# Tygodniowy „patrol” stron (OSZS, szachy, turnieje…) — osobny workflow n8n

Osobny workflow na **tym samym n8n** co automail: **raz w tygodniu** pobiera skonfigurowane **URL-e**, z HTML wyciąga **linki** (ta sama domena co strona), przy których w tekście obok widać **słowa kluczowe**; **data** przy linku jest wymagana tylko w **trybie produkcyjnym** (filtr „tylko przyszłe terminy”) — patrz niżej.

**Tryb produkcyjny (filtr daty włączony):** tylko **data turnieju / zawodów** od dziś w górę (jutro, za tydzień, rok…). **Nie** patrzymy na datę publikacji strony — byle **termin zawodów** przy linku jest **≥ dziś** (**Europe/Warsaw**). Strony bez takiej pozycji **nie trafiają** do digestu.

**Tryb podglądu / testu (filtr daty wyłączony):** w repo domyślnie `WEB_WATCH_DEFAULT_SKIP_EVENT_DATE = true` w [`_web-watch-scan-aggregate.js`](./n8n-workflows/_web-watch-scan-aggregate.js) — w digest trafiają **wszystkie** linki z trafieniem słów kluczowych (także **bez daty** w kontekście i z datami przeszłymi); w treści i w **temacie** maila widać oznaczenie podglądu. Aby wrócić do samych przyszłych terminów: w n8n ustaw **`WEB_WATCH_IGNORE_EVENT_DATE=0`** (lub `false` / `no`) albo zmień stałą na `false` i uruchom ponownie `node docs/n8n-workflows/_embed-web-watch.js`.

Formaty dat w tekście: m.in. `15.03.2026`, `2026-03-15`, `12 marca 2026`. Jeden mail, opcjonalnie **deduplikacja** tygodnia (hash w static data). Node **HTTP_Resend_Digest** używa **`$json.digest_subject`** (z **`Code_AggregateDigest`**), z fallbackiem do starego wzorca.

Plik do importu: **[`docs/n8n-workflows/web-watch-weekly.json`](./n8n-workflows/web-watch-weekly.json)**.

Domyślnie w **`SITES`**: **OSZS** strona z wykazem zawodów (`/5146-2`; samo `/zawody` ma w treści głównej tylko stary wpis), **WZ Szach** start (`/` — ścieżka `/turnieje` zwraca 404), **Chessarbiter** bezpośrednio **`turnieje.php`** (adres `/turnieje` to sam skrypt przekierowania — node HTTP nie wykonuje JavaScriptu). **Facebook** nie jest w tablicy — patrz **[`N8N_WEB_SCRAPE_PERPLEXITY_NOCODB.md`](./N8N_WEB_SCRAPE_PERPLEXITY_NOCODB.md)** (Perplexity + NocoDB, Graph API).

Po edycji pliku JSON w repo **zaimportuj ponownie** workflow na Render (albo wklej zaktualizowany kod z **`_web-watch-scan-aggregate.js`** do node’a) — sam plik w repozytorium nie aktualizuje już działającego n8n. Jeśli w digestie widać nagłówek „nadchodzące turnieje”, a oczekujesz trybu podglądu bez daty, sprawdź czy w env nie masz **`WEB_WATCH_IGNORE_EVENT_DATE=0`**.

## Jak dodać kolejną stronę

1. Otwórz node **`Code_WebWatchConfig`**.
2. W tablicy **`SITES`** dopisz obiekt:

```javascript
{
  id: 'unikalny_skrot',
  name: 'Czytelna nazwa',
  url: 'https://example.com/',
  // opcjonalnie: jeśli kiedyś RSS zacznie działać — najpierw próba GET tutaj (tekst/XML)
  rssUrl: '',
  // STRINGI (wzorzec RegExp, flaga zawsze `i` w node Code_ScanKeywords).
  // Nie wstawiaj tu literałów /regex/i — między node'ami n8n gubi typ RegExp → błąd re.test.
  keywords: [
    'szach',
    'turniej',
    'mistrzostw',
    'zawod',
    'igrzysk',
  ],
  maxSnippetChars: 600,
},
```

3. Zapisz workflow.

**`keywords`:** tablica **stringów** (treść wzorca, np. `'ostr[oó]w'`). W **`Code_ScanKeywords`** budowany jest `new RegExp(wzorzec, 'i')`. Musi wystąpić w **tekście linku / URL / krótkim kontekście** wokół linku (w trybie z filtrem daty dodatkowo musi być **przyszła data zawodów** przy tym linku; w trybie podglądu wystarczy samo trafienie słów kluczowych). Node **`Code_ScanKeywords`** ma tryb **Run once for all items** — jedna pętla po wszystkich odpowiedziach HTTP w tej samej kolejności co **`Code_WebWatchConfig`** (patrz `$input.all()` × `$('Code_WebWatchConfig').all()`).

### Zmienna środowiskowa `WEB_WATCH_IGNORE_EVENT_DATE`

Ustaw w n8n (env workflow lub globalnie), jeśli nie chcesz zmieniać pliku źródłowego:

| Wartość | Efekt |
|--------|--------|
| `1`, `true`, `yes` | Pomijaj filtr daty (jak podgląd). |
| `0`, `false`, `no` | **Tylko przyszłe terminy** (produkcja), niezależnie od `WEB_WATCH_DEFAULT_SKIP_EVENT_DATE`. |
| (pusta / brak) | Obowiązuje **`WEB_WATCH_DEFAULT_SKIP_EVENT_DATE`** w skrypcie. |

**Edycja logiki skanera:** źródło w repo — [`docs/n8n-workflows/_web-watch-scan-aggregate.js`](./n8n-workflows/_web-watch-scan-aggregate.js); po zmianie uruchom `node docs/n8n-workflows/_embed-web-watch.js`, żeby wstawić kod do `web-watch-weekly.json` (albo wklej ręcznie do node’a w n8n).

## Harmonogram

Node **`Schedule_Weekly`** — w UI ustaw np. **co 1 tydzień**, dzień i godzinę (po imporcie sprawdź strefę czasową serwera n8n).

Do testów użyj **`Manual Trigger`** (połączony jak w JSON lub ręcznie z **`Code_WebWatchConfig`**).

## Mail (Resend)

Node **`HTTP_Resend_Digest`:** nagłówek `Authorization` bierze **`RESEND_API_KEY`** lub **`RESENDAPIKEY`** z env (jak automail), albo możesz zastąpić to **credential → Header Auth** — w HTTP Request ustaw **Authentication = None**. Ustaw też w **`Code_AggregateDigest`** (na górze pliku w node):

- `DIGEST_TO` — adres e-mail docelowy (w repo domyślnie `nowaczykdamian@gmail.com`),
- `DIGEST_FROM` — nadawca zweryfikowany w Resend.

Możesz zamiast tego podmienić node na **Gmail** / **SMTP** — wtedy usuń HTTP Resend i wklej własny node po **`If_HasHits`**.

## Deduplikacja (opcjonalna)

W **`Code_AggregateDigest`** jest prosty **hash** treści trafień zapisywany w **`$getWorkflowStaticData('global').webWatchDedup`**. Jeśli tydzień do tygodnia strona się nie zmieni — mail **nie poleci** ponownie. Wyczyść static data w n8n, jeśli chcesz wymusić ponowną wysyłkę.

## Ograniczenia

- **HTML się zmienia** — przy dużej przebudowie strony może być potrzebna korekta **strip tagów** w **`Code_ScanKeywords`**.
- **Nie łam robots.txt** / nadmiernie nie obciążaj serwera — **raz w tygodniu** jest OK dla małych stron typu [oszs.info](https://www.oszs.info/).
- Jeśli strona blokuje boty (403), rozważ **ręczny RSS** w hostingu lub **proxy** — poza zakresem tego szablonu.

## Powiązanie z automail

Ten workflow **nie** modyfikuje **automail** — tylko współdzieli serwer n8n i opcjonalnie ten sam **Resend**.

## Wariant z Perplexity i NocoDB (streszczenia + baza)

Jeśli zamiast samego regex + mail chcesz **ekstrakcję JSON przez Perplexity** i zapis do **NocoDB** (np. bez RSS, selektory typu Playwright), opis jest w **[`N8N_WEB_SCRAPE_PERPLEXITY_NOCODB.md`](./N8N_WEB_SCRAPE_PERPLEXITY_NOCODB.md)** — ten sam credential Perplexity co w automail.
