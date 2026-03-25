# Imprezja.pl – menu i obrazki „nie działają” (LiteSpeed + cache)

Objawy zbliżone do Twoich:
- rozwijane menu desktop nie reaguje,
- hamburger / menu mobilne nie działa,
- część obrazków się nie ładuje.

**To zwykle nie wynika z samego „Dodatkowego CSS”.** W konsoli widać wtedy **LiteSpeed**: `Lazy Load`, `Load JS Delayed` – skrypty motywu (Blocksy `main.js`, jQuery) startują z opóźnieniem i menu/hamburger nie inicjalizują się od razu; lazy load potrafi zostawić puste `<img>` aż do zdarzenia, które nie następuje.

---

## Purge All / czyszczenie cache „nic nie daje”, a po wyłączeniu i włączeniu wtyczki jest OK

To **znany schemat** przy LiteSpeed Cache:

1. **Purge All** czyści głównie **strony HTML w cache** (i często CDN), ale **nie zawsze** usuwa **zbite / zminifikowane pliki CSS i JS** zapisane na dysku (`wp-content/litespeed/…` lub podobny katalog). Te pliki mogą być **uszkodzone**, **przeterminowane względem motywu** albo powstać po zmianie Dodatkowego CSS, gdy optymalizacja nie przebudowała ich poprawnie.

2. **Wyłączenie wtyczki** zdejmuje reguły z `.htaccess`, wyłącza hooki, część **transientów** i stanu wewnętrznego znika. **Ponowne włączenie** wymusza **odświeżenie konfiguracji** i przy następnym wejściu na stronę LiteSpeed **generuje od nowa** zoptymalizowane assety – stąd „nagle wszystko działa”.

3. **Dodatkowy CSS** mógł być niewinny – problem leżał w **warstwie cache/optymalizacji**, nie w samych regułach.

### Co robić następnym razem (zamiast od razu wyłączać wtyczkę)

Wypróbuj **w tej kolejności** (zależnie od wersji wtyczki, nazwy mogą się minimalnie różnić):

| Krok | Gdzie | Działanie |
|------|--------|-----------|
| A | **LiteSpeed Cache → Toolbox → Purge** | Oprócz **Purge All** poszukaj osobnych opcji w stylu **Purge CSS/JS** lub **Delete local cache** – jeśli jest, użyj ich **przed** kolejnym testem. |
| B | **Toolbox** | Czasem jest **Database** / czyszczenie zoptymalizowanych danych – bezpieczniejsze niż pełna deaktywacja. |
| C | **Page Optimization** | Na chwilę **wyłącz** łączenie/minifikację **CSS** i **JS** → zapisz → **Purge All** → sprawdź stronę → włącz z powrotem pojedynczo i testuj. |
| D | Pliki na FTP (ostrożnie) | Po **kopii zapasowej**: folder z cache LSC w `wp-content` (np. `litespeed`) – nie usuń całego katalogu wtyczki, tylko ewentualnie podfoldery typu **css**, **js**, **ucss** jeśli dokumentacja LSC na to pozwala. **Bezpieczniej zostawić to hostingowi / kopii przed zmianą.** |
| E | Ostateczność | **Wyłącz → włącz** wtyczkę (tak jak u Ciebie) – skuteczne, ale warto potem ustalić **wykluczenia JS** (Blocksy), żeby problem rzadziej wracał. |

**Test diagnostyczny:** otwórz stronę z parametrem  
`https://twoja-domena.pl/?LSCWP_CTRL=before_optm`  
Jeśli **wtedy** menu i obrazki są OK, a bez parametru nie – problem leży w **optymalizacji** (CSS/JS/delay), nie w samym motywie.

---

## Co zrobić (kolejność)

1. **Wyczyść cache**
   - LiteSpeed Cache → Toolbox → **Purge All** (lub „Purge All – LSCache”).
   - Opcjonalnie: wyłącz na chwilę cache w przeglądarce / okno incognito.

2. **Page Optimization → JavaScript**
   - Wyłącz **Delay JavaScript** (lub **Load JS Deferred**) i zapisz → sprawdź stronę.
   - Jeśli po wyłączeniu jest OK: włącz z powrotem i dodaj **wykluczenia** (Excluded JavaScript / Delayed exclusions), np.:
     - `jquery.min.js`
     - `jquery-core`
     - `blocksy`
     - `ct-scripts`
     - `main.js` (ścieżka z motywu Blocksy)

3. **Page Optimization → Media**
   - Tymczasowo wyłącz **Lazy Load Images** → sprawdź obrazki.
   - Jeśli pomaga: zostaw lazy load, ale dodaj **wykluczenia** dla pierwszych obrazków (above the fold) lub dla klas widocznych w hero.

4. **CSS**
   - Używaj wersji podmenu z **`imprezja-dodatkowy-css-pelny.css`**: blok **tylko w `@media (min-width: 1000px)`** i **tylko `#header-menu-1`** – nie wklejaj starych, szerokich reguł na `.sub-menu` / `[data-row="middle"]` bez `#header`.

5. **Gdy nadal źle**
   - W DevTools → **Network**: czy `main.js` / jQuery mają status 200 i nie są blokowane?
   - **Console**: czy są czerwone błędy (nie tylko szare logi LiteSpeed)?

---

*Dokument pomocniczy do projektu VoteBattle / imprezja.pl.*
