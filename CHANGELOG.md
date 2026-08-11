# Changelog – Imprezja Quiz

---

## v1.4.1 (sierpień 2026) — Party Quiz PWA: lista pytań

### Party Quiz — panel admina (PWA)

- **Lista pytań** — naprawione znikanie pozycji po rozwinięciu jednego wiersza; wszystkie pytania pozostają widoczne i przewijalne.
- **Sterowanie na żywo** — pod aktywnym pytaniem (jak w Familiadzie), bez sticky paska zasłaniającego listę.
- **Szybka lista** — przyciski +5 pkt widoczne, gdy pytanie jest na tablicy (niezależnie od rozwiniętego wiersza).

---

## v1.4.0 (sierpień 2026) — Party Quiz TV, szybka lista, Milkdrop, build Beta

### Party Quiz — ekran TV

- **Pasek punktów jako overlay** — popup u góry ekranu; treść pytania nie jest już przesuwana w dół (`padding-top` usunięty).
- **Tło animowane Milkdrop (Butterchurn)** — włączane w panelu admina; działa przy pytaniach, na **ekranie startowym** Party i na **ekranie końcowym z wynikami** (półprzezroczyste tło nad wizualizacją). Wyłączone podczas Familiady na TV.
- **Czcionka pytania** — jak tekst odpowiedzi quizu (systemowa), większy rozmiar; bez Pixelify Sans i złotego gradientu.
- **Statki** — naprawiona dolna kreska planszy (overflow), lepsze skalowanie siatki.
- **Szybka lista (FAST_LIST)** — dźwięki: **Pokaż odp.** → `stats_show`, **Następne** → `question_open`; punkty nadal `correct_answer`.

### Party Quiz — panel admina (PWA)

- **Brak przewijania** po rozwinięciu pytania — delikatne `scrollIntoView` bez skoku całej strony.
- **Dżingiel Familiady** — przycisk 🔔 pod dużym X (ŚRODEK) w pytaniach FAMILIADA.
- **Lista boczna vs klasyczna** — przełącznik w edytorze; migracja starych plików bez flagi `partySideList`.

### Imprezja Quiz Beta (osobny build)

- **Imprezja Quiz Beta** — osobna aplikacja (`Imprezja Quiz Beta.app`) z integracją **Imprezja Booth** (prezentacja zdjęć `_ai` z iPada na TV). Publiczny build bez Booth.

---

## v1.3.8 (sierpień 2026) — licencja: popup sukcesu + stabilniejszy trial

### Licencja

- **Popup po aktywacji** — po wklejeniu klucza i kliknięciu „Aktywuj licencję” pojawia się okno z potwierdzeniem (start.html i license-required.html).
- **Trial i Machine ID** — HW UUID jako główne ID; trial akceptuje te same alternatywy co klucze licencyjne (zmiana nazwy Maca nie blokuje okresu testowego).
- **Cache licencji** — wymaga fingerprintu klucza i Machine ID (bez fałszywej „bezterminowej” z cache).

---

## v1.3.7 (sierpień 2026) — instrukcje AI do tworzenia quizów

### Dokumentacja dla modeli językowych

- **Party Quiz** — `PARTY_QUIZ_LLM_INSTRUKCJA.md` (typy pytań, szybka lista, familiada, dopytywanie o braki).
- **Quiz klasyczny** — `QUIZ_LLM_INSTRUKCJA.md` (11 typów, telefony, speedrun, JSON do `/editor.html`).
- **Familiada** — `FAMILIADA_LLM_INSTRUKCJA.md` (lista z punktami, import tekst/XML, złota lista).
- Pliki do pobrania z aplikacji: edytory + menu ⚙️ Poradniki; dołączone do buildu Electron.
- Reguły Cursor: `.cursor/rules/party-quiz-llm.mdc`, `quiz-llm.mdc`, `familiada-llm.mdc`.

---

## v1.3.6 (sierpień 2026) — listy boczne SL: punkty, edytor, Ania i Maks

### Party Quiz

- **Prefiks `SL - `** w nazwach plików list bocznych — łatwe wyszukiwanie w edytorze; migracja starych plików przy starcie.
- **Zakładki list bocznych pionowo** w panelu PWA (jedna pod drugą).
- **Fix punktów na listach SL:** LETTER respektuje `defaultPoints` pliku; poprawione cofanie/przełączanie punktów między pytaniami SL.
- **Fix edytora:** checkbox „Lista boczna” wczytuje się z pliku; zapis nie gubi flagi `partySideList`.
- **Nowy quiz weselny:** `Ania i Maks - wesele.json` — szybka lista (15 pytań), główna lista rozgrywki.

---

## v1.3.5 (lipiec 2026) — listy boczne = normalny plik JSON

### Party Quiz

- **Koniec z `party-quiz-side-lists.json`** — lista boczna to zwykły plik quizu z `"partySideList": true` w JSON (edytowalny w Edytorze Party Quiz, checkbox „Lista boczna w rozgrywce”).
- Zakładka w panelu rozgrywki pojawia się automatycznie dla każdego pliku z tą flagą — jak złota lista, przy każdym wczytanym quizie weselnym.
- **Punkty** z listy bocznej biorą `defaultPoints` z tego pliku (nie z głównego quizu).
- Stary config migruje się automatycznie przy pierwszym starcie.

---

## v1.3.4 (lipiec 2026) — listy boczne widoczne w edytorze

### Party Quiz

- **Pliki list bocznych w edytorze** — np. `Test wiedzy o młodej parze.json` pojawia się na liście plików w Edytorze Party Quiz (normalna edycja JSON). W panelu rozgrywki nadal dostępne jako zakładka listy bocznej, bez mieszania z główną listą pytań.
- Szablon `Test wiedzy o młodej parze.json` dołączony do aplikacji — tworzy się automatycznie przy pierwszym starcie, jeśli go nie ma.

---

## v1.3.3 (lipiec 2026) — fix startu aplikacji (listy boczne)

### Naprawa

- **Biały ekran / „Serwer nie wystartował w czasie”** — błąd inicjalizacji list bocznych przy starcie (`partySideListsConfig` przed deklaracją). Naprawione.

---

## v1.3.2 (lipiec 2026) — Party Quiz: listy boczne (zakładki)

### Party Quiz

- **Listy boczne z zakładkami** — obok złotej listy Familiady można mieć dodatkowe zestawy pytań (np. „Test wiedzy o młodej parze”) dostępne w panelu Party Quiz bez mieszania z główną listą.
- Konfiguracja w `party-quiz-side-lists.json` — nowe zakładki dodajesz edycją tego pliku (bez kolejnego builda).
- Pliki przypisane do list bocznych mogą być ukryte w głównym wyborze pliku quizu.

---

## v1.3.1 (lipiec 2026) — Party Quiz: złota lista po szybkiej liście

### Party Quiz

- **Szybka lista → złota lista** — zakończenie ostatniej pozycji (przycisk **ZAKOŃCZ**) zamyka listę i nie blokuje złotej listy ani kolejnych pytań (aż do tablicy wyników).
- Wyjście z nierozstrzygniętej szybkiej listy (start innego pytania / złotej) zamyka ją automatycznie, bez blokującego modala.

---

## v1.3.0 (lipiec 2026) — Party Quiz: szybka lista na żywo

### Party Quiz – edytor i rozgrywka

- **Szybka lista bez odpowiedzi** — brak prawidłowej odpowiedzi nie jest błędem zapisu (ważne przy pytaniach na żywo). Przy zapisie pojawia się ostrzeżenie, ale można zapisać z pustymi polami.
- **POKAŻ ODP.** — bezpieczne przy pustej odpowiedzi (admin + TV); nie wywala rozgrywki.
- **Lista pytań** — kliknięcie / rozwinięcie pytania tylko otwiera panel; bez auto-przewijania do niewłaściwego miejsca.

---

## v1.2.9-beta.1 (lipiec 2026) — build Beta (Party Quiz UX)

Build kanału **Imprezja Quiz Beta** (`pl.imprezja.votebattle.beta`) z poprawkami Party Quiz z 1.2.8–1.2.9 (modal wyniku, szybka lista, powitanie).

---

## v1.2.9 (lipiec 2026) — Party Quiz: modal wyniku + szybka lista

### Party Quiz – admin PWA

- **Modal wyniku** — przed przejściem do innego pytania (Quiz / Familiada / itd.): Niebiescy / Czerwoni / Bez punktów. Szybka lista: **NASTĘPNE** = 0 pkt za pozycję (bez modala).
- **Detal pytania** — zawsze w rozwiniętym panelu (nie znika po zwinięciu).
- **Szybka lista** — góra = nr `1/15` + treść (−10% czcionki); linia **Odpowiedź?** → odpowiedź po **POKAŻ ODP.**; przyciski w jednej linii; kompresja w fullscreenie na telefonie.

---

## v1.2.8 (lipiec 2026) — Party Quiz PWA UX

### Party Quiz – admin PWA

- **Powitanie** — „Pokaż powitanie” pokazuje tytuł quizu + logo, nie długie notatki z edytora (`subtitle`).
- **Scroll** — po „Następne pytanie” widok skacze do góry pytania, nie do końca listy odpowiedzi.
- **Statusy** — usunięte „na antenie / na żywo”; zamiast tego ostrzeżenie: przyznaj punkty jednej drużynie albo „Bez punktów”.
- **Odpowiedzi** — pełna lista bez wewnętrznego przewijania (np. Alkohol 8 pozycji).
- **Szybka lista** — kolejność i skróty: **POKAŻ ODP.** / **NASTĘPNE**.

---

## v1.2.7 (maj 2026) — wydanie stabilne

### Audio — uproszczenie i wyrównanie głośności

- **Dwa suwaki zamiast miksera wielokanałowego** — wspólna głośność **Gry** (`gamesVolume`: Quiz, Familiada, Party Quiz, Sampler, Śpiewaj Dalej, Bitwa wokalna, Statki, Prezentacja, Whitney) oraz osobno **Imprezator**. Zapis w `imprezja-volumes.json` jako `{ games, imprezator }` z migracją ze starego formatu master × kanały.
- **Sufit cyfrowy −3 dB** — `digitalOutputClamp` na wyjściu (serwer + `public/lib/digital-output-cap.js`) ogranicza szczyty po normalizacji.
- **Admin PWA** — dwa suwaki na dole strony (`#pwa-audio-dock`); usunięty rozbudowany mikser z ekranu konfiguracji.
- **Panele admina gier** — dolny suwak **🎮 Gry** (`public/lib/games-volume-bar.js`) w Familiada, Quiz (`admin.html`), Party Quiz i Statki Solo — bez wychodzenia do PWA przy zmianie głośności w trakcie imprezy.
- **Telefony / panele muzyczne** — usunięte zbędne suwaki głośności (Sampler, Śpiewaj Dalej, Bitwa, Whitney, Imprezator); w PWA wystarczą suwaki na dole.
- **Bitwa wokalna ≈ Śpiewaj Dalej** — serwer liczy `normalizedGain` przez ffmpeg (`volumedetect`, cel −3 dB) dla plików lokalnych (`.vdjsample`, `/uploads/`, bank VDJ) przy odtwarzaniu i zapisie configu; działa też w Electronie, gdzie klient nie normalizuje samodzielnie.

### Familiada

- **Złota lista** — poprawki punktów, edytor, synchronizacja z serwerem po reloadzie configu.
- **Wake Lock** — ekran admina Familiady nie gaśnie w trakcie rozgrywki (HTTPS / localhost).

### Śpiewaj Dalej / Bitwa wokalna — banki

- **Synchronizacja banków** między PWA, ekranem TV i telefonami; spójna nazwa **„Bank”** w UI.

### HTTPS, Wake Lock, QR (Admin PWA)

- **Certyfikaty HTTPS** w `userData` dla spakowanej aplikacji — Wake Lock i secure context na telefonach bez ręcznej konfiguracji.
- **Auto-przekierowanie HTTP → HTTPS** w Admin PWA (z ostrzeżeniem w `admin-pwa-qr.html` gdy cert wygasł).
- **Ostrzeżenia** przy wygasającym/wygasłym certyfikacie na serwerze.

### UI telefonów (gry muzyczne)

- Usunięte strzałki ←→ i napis „przesuń w lewo/prawo” z `phone.html` i paneli w Admin PWA — nawigacja wyłącznie swipe; to samo w Samplerze.

### Ekrany TV / quiz

- Aktualizacja odbioru głośności na ekranach: `Screen.html`, Familiada, Statki, Prezentacja, tryby muzyczne — spójnie z `gamesVolume` / `imprezatorVolume`.

### Strona sklepu / WordPress / Stripe-shop

- Linki pobierania i znaczniki wersji do **v1.2.7** — m.in. `stripe-shop/public/pobierz.html`, `stripe-shop/public/success.html`, `docs/wordpress/*.html`, `docs/wordpress/LINKI-1.2.7-WORDPRESS.md`.

---

## v1.2.6 (kwiecień 2026) — wydanie stabilne

### Party Quiz (`/party-quiz/admin.html`, `Screen.html`)

- **Złota lista — panel sterowania** — po uruchomieniu pytania ze złotej listy pełny blok sterowania (jak przy liście głównej): slot szczegółu w rozwiniętym wierszu, `mountPartyQuestionDetailHost` + odświeżenie po `party_golden_list` (wcześniej `party_state` przychodził przed listą — brak wpisu w `partyGoldenList` blokował widok). Komunikat przy ładowaniu listy; przewinięcie do aktywnego wiersza złotej listy.
- **FAST_LIST ze złotej listy — punkty** — widoczny panel **+5 pkt** (nie chowany przez warunek `openPartyListIdx` — przy złotej liście jest `null`); przyznawanie działa jak z listy głównej.
- **FAST_LIST — typografia TV** — większy numer rundy i treść pytania (oraz spójnie większa odsłona odpowiedzi / tytułu rundy) dla czytelności z dystansu.
- **FAST_LIST — panel admina** — tylko numer pozycji jak na TV (`np. 3 / 12`, bez napisu „Sterowanie TV — pozycja …”), treść pytania w dużej skali (dopasowana do widoku TV, następnie **−40 %** dla komfortu w panelu); większa linia z podpowiedzią do odpowiedzi.

### Strona sklepu / WordPress / Stripe-shop

- Zaktualizowane linki pobierania i znaczniki wersji do **v1.2.6** — m.in. `stripe-shop/public/pobierz.html`, `stripe-shop/public/success.html`, wybrane `docs/wordpress/*.html`, `docs/wordpress/LINKI-1.2.6-WORDPRESS.md`.

---

## v1.2.5 (kwiecień 2026) — wydanie stabilne

### Party Quiz (admin, TV, buzzery)
- **Buzzery Familiady (`/familiada/buttons.html`) przy aktywnym Party Quiz** – dla pytań **FAMILIADA / LETTER / FAST_LIST** działają jak opcjonalne buzzery Party (bez modyfikacji stanu klasycznej Familiady); synchronizacja z `party_state` (`activePartyQuestionType`, `buttonUsedThisRound`).
- **Rejestracja buzzerów Familiady** – przy roli `buttons` brak rozgłaszania `familiada_request_intro_state` do całego pokoju (mniej kolizji z TV podczas Party).
- **LETTER / FAST_LIST** – po „Następna litera” / „Następna pozycja” (szybka lista) reset buzzera i `party_buttons_reset` tam, gdzie potrzeba.
- **Złota lista – panel admina** – nagłówek i podgląd odpowiedzi jak przy rozwiniętym wierszu listy pytań; drobne zmniejszenie czcionek w tym bloku.
- **TV – ekran końcowy** – przed outrem wyłączana jest m.in. muzyka tła szybkiej listy i pozostałe kanały dźwięku kolidujące z outrem.
- **Serwer** – `getActivePartyQuestionForParty()` najpierw uwzględnia pytanie ze złotej listy (`currentGoldenIndex`).

### Sklep Stripe / licencje (jak w 1.2.4)
- Bez zmian funkcjonalnych względem opisu w **v1.2.4** (odnowienia, Machine ID, idempotencja webhooka).

### Strona sklepu / WordPress / Stripe-shop
- Zaktualizowane linki pobierania i znaczniki wersji do **v1.2.5** – m.in. `stripe-shop/public/pobierz.html`, `stripe-shop/public/success.html`, `docs/wordpress/sukces.html`, `sukces-wklej.html`, `stripe-cennik.html`, `imprezja-quiz-produkt-pelna-tresc.html`, `imprezja-quiz-sklep-pelna-strona.html`, `09-pobierz-1.2.5.html`, `LINKI-1.2.5-WORDPRESS.md`.

---

## v1.2.4 (kwiecień 2026) — wydanie stabilne

### Sklep Stripe / licencje (stripe-shop, backend)
- **Odnowienie subskrypcji** – po opłaceniu faktury (`invoice.paid`) dla `subscription_cycle`, `subscription_update` i `subscription_threshold` serwer generuje **nowy klucz RSA** (ten sam typ co plan) i wysyła go e-mailem; wcześniej odnowienie w Stripe nie przedłużało licencji w programie.
- **Zapis Machine ID w Stripe** – po odebraniu klucza przez `/api/license/deliver` identyfikator jest zapisywany w metadanych **klienta** i **subskrypcji** (`imprezja_machine_id`), co umożliwia automat przy kolejnych płatnościach.
- **Idempotencja webhooka** – pole `imprezja_last_license_invoice_id` na subskrypcji zapobiega podwójnej wysyłce przy retry Stripe.
- **Brak Machine ID w metadanych** – dedykowany e-mail z instrukcją (np. subskrypcje sprzed wdrożenia lub zmiana komputera).

### Uwaga (licencja / wiele systemów)
- **Machine ID jest inny na Windows i na macOS** (do identyfikatora wchodzi m.in. platforma OS). Klucz trzeba zamówić / wygenerować dla ID z **tego samego systemu**, na którym uruchamiany jest program. Planowana późniejsza poprawka UX lub wspólny fingerprint sprzętowy.

---

## v1.2.3 (kwiecień 2026) — wydanie stabilne

### Familiada
- **Przyciski (buzzery) jako PWA** – możliwość dodania `buttons.html` jako skrótu na ekranie głównym tabletu / telefonu (osobny manifest, ikony, tryb standalone).
- **Auto-reconnect po restarcie serwera** – przyciski automatycznie łączą się ponownie i pobierają aktualny stan rundy (widoczny wskaźnik „Łączenie…”, pełnoekranowy overlay w razie utraty łączności).
- **Podmiana kolorów (zamiana stron niebieski/czerwony)** rozszerzona na wszystkie elementy admina (przyciski X / XX / XXX, ×2, ×3, przyznanie punktów) oraz na fizyczne buzzery – kolor „niebieski”/„czerwony” zawsze zgodny z aktualnym wyglądem TV.
- **Oryginalna czcionka Familiada (LED)** – self-hosted, rozmieszczone kropki (naprawione nakładanie), pełny alfabet polski. Ekran renderuje napisy bez rozmyć.
- **Redesign ekranu jako tablica z lampami** – ciemne tło, siatka „nieaktywnych” lamp, miękki blask dla zapalonych odpowiedzi, usunięta biała ramka.
- **Dynamiczne skalowanie pytań** – JS dopasowuje rozmiar i letter-spacing pytania tak, by zawsze mieściło się w polu bez obcinania (wcześniejsze statyczne klasy zastąpione pętlą auto-fit).

### Prezentacje – wizualizacje audio
- **Milkdrop (butterchurn + ~500 presetów) w pełni offline** – zamiast CDN `esm.sh` biblioteki serwowane z `/lib/butterchurn` (`node_modules/butterchurn*`). Koniec z „Failed to fetch dynamically imported module”.
- **Naprawione skalowanie Milkdropa** – prawidłowe proporcje na całym ekranie (także retina/HiDPI, iframe i fullscreen), dzięki uwzględnieniu `devicePixelRatio` i `ResizeObserver`. Znika problem z wizualizacją pokazywaną tylko w lewym-dolnym rogu.
- **6 nowych trybów wizualizacji (AudioMotion)**: Radialny, Prism Radial, Luminous Bars, Reflex (odbicie w wodzie), Area Graph, Dual Stereo (L/R osobno). Łącznie 10 presetów AudioMotion cyklicznie przełączanych strzałkami.
- **Wybór gradientu kolorystycznego** (Rainbow / Prism / Classic / Orange Red / Steel Blue) per slajd wizualizacji w edytorze.
- **Strzałki ← / → przełączają tryb wizualizacji** we wszystkich presetach wizualnych (wcześniej tylko w Milkdrop / Webvs / Winamp). Strzałki na zdjęciach/wideo – dalej zmiana slajdu.

### Edytor prezentacji
- **Zgrupowane presety** wizualizacji w dropdownie (Equalizer / Zaawansowane / Klasyczne wizualizery) + nowe ikony i etykiety na liście slajdów.
- **Usuwanie i zmiana nazwy prezentacji** trwale się utrzymują po restarcie serwera – nowy mechanizm markera `.seeded` w katalogu danych użytkownika (domyślne prezentacje kopiowane tylko przy pierwszym uruchomieniu, nie re-seedowane przy każdym starcie).

### Biblioteki / zależności
- Dodane: `butterchurn@^2.6.7`, `butterchurn-presets@^2.4.7`, `audiomotion-analyzer@^4.5.4`, `@fontsource/silkscreen`, `@fontsource/jersey-10`, `@fontsource/dotgothic16`.
- Nowe trasy statyczne w serwerze: `/lib/butterchurn`, `/lib/butterchurn-presets`, `/lib/audiomotion`, `/fonts/silkscreen`, `/fonts/jersey-10`, `/fonts/dotgothic16`, `/fonts/vt323`, `/fonts/press-start-2p`.

---

## v1.2.2 (kwiecień 2026) — wydanie stabilne

### Familiada
- **Kolory stron (TV)** – w panelu admina (`/familiada/admin.html`), w sekcji audio obok głośności master, przycisk **„Kolory stron (TV)”** odwraca wizualnie tła niebieski↔czerwony na ekranie TV (body, panele, intro/finał, split overlay, błysk przycisku). Nazwy drużyn, punkty i logika team1/team2 bez zmian. Stan zapamiętywany na serwerze (`familiada-screen-prefs.json`) i synchronizowany z podłączonym ekranem przez Socket.IO.

### Strony WordPress / linki
- Zaktualizowane linki do pobrania v1.2.2 – m.in. `sukces.html`, `sukces-wklej.html`, `stripe-cennik.html`, `09-pobierz-1.2.2.html`, `imprezja-quiz-produkt-pelna-tresc.html`, `LINKI-1.2.2-WORDPRESS.md`, `stripe-shop/public/success.html`.

---

## v1.2.1 (marzec 2026) — wydanie stabilne

### Build
- **Cloudflared** – aktualizacja binarki do wersji 2026.2.0 w buildach Mac (arm64, x64) i Windows.
- Skrypty `prepare-cloudflared-for-mac-arm64.js` i `prepare-cloudflared-for-mac-x64.js` – pobierają najnowszą wersję cloudflared przed buildem.

### Audio
- **Normalizacja dźwięku** – ujednolicenie głośności odtwarzanych plików.
- **Naprawa interfejsu audio** – poprawki obsługi urządzeń audio.

### Ekran
- **Poprawiona obsługa 2 monitorów** – lepsza współpraca z konfiguracją wielomonitorową.

### Admin PWA
- **Status połączenia** – widoczny status połączenia z serwerem (Połączono / Łączenie… / Rozłączono).
- **Zwijane menu** – Kamera, Prezentacja, Powitanie w tej samej formie (rozwijane karty).
- **Mikser głośności** – Master volume na wierzchu, kanały (Quiz, Familiada itd.) po rozwinięciu.

### WiFi Analyzer
- **Szerokość kanału 20/40 MHz** – przy 40 MHz sieć zajmuje 5 kanałów (np. 1–5). Tabela pokazuje zakres, wykres liczy zajętość poprawnie.

### Wizualizacje / Prezentacja
- **Beat detection** – zakres 80–150 BPM, wsparcie dla 140 BPM (częste na imprezach).
- **Milkdrop** – throttle 30 fps (spokojniejsza animacja), gain +10 dB.

### Poprawki (kolejne buildy 1.2.1, marzec 2026)
- **Admin PWA – panel muzyczny** – wymuszone przeładowanie iframe (`cache-bust`), odświeżenie zakładek banków NJR Samplera po faktycznym `load` iframe oraz po ponownym połączeniu WebSocket – bez ręcznego odświeżania strony, gdy kafelki samplera lub gier muzycznych ładowały się nieprawidłowo (zwłaszcza na telefonie).
- **NJR Sampler – panel na telefonie** – po połączeniu dodatkowe pobranie konfiguracji przez `GET /api/njr-sampler/config` (`cache: no-store`, parametr anty-cache), opóźnione dociągnięcie po `njr_sampler_state` oraz po powrocie na kartę – naprawa sytuacji, w której przed pierwszym odświeżeniem widać było puste lub domyślne kafelki.
- **Familiada – ekran TV** – po „Zakończ grę” z admina: ekran z samym napisem FAMILIADA (bez starego panelu pilota z przyciskami), bez muzyki; widok na TV dalej przełączany z PWA admin. Usunięty przycisk „Zakończ” z ekranu TV (także pływający). Serwer przy końcu gry sam wysyła reset stanu i sygnał idle.
- **Quiz – pytanie Wyborcze (WYBORCZY)** – muzyka tła i overlay Wyborczego zatrzymywane po opuszczeniu pytania (następne pytanie, IDLE, ranking, podium itd.); `stopAllAudio` na ekranie TV uwzględnia audio Wyborczego (wcześniej przy pauzie grało dalej). Serwer: `wyborczy_question_media_stop` i czyszczenie sesji przy wyjściu z trybu Wyborczego.

---

## v1.2.0 (marzec 2026) — wydanie stabilne

### Familiada
- **Bank pytań uniwersalnych** – nowy plik `universal-bank.json` z ok. 275 pytaniami (jedzenie, muzyka, sport, transport, kolory, film itd.). Panel w edytorze: paginacja, przyciski „Dodaj” i „Usuń”.
- **Pytania klasyczne** – lista `Pytania klasyczne.json` z wyborem pytań z banku uniwersalnego, gotowa do użycia.
- **Przycisk „Reset przycisków”** – w panelu admina Familiady, pod DŻINGIEL. Ponowne odblokowanie przycisków na telefonach po przypadkowym naciśnięciu.

### Kamera (stream na TV)
- **Optymalizacje streamingu** – rozdzielczość 640×480, 12 kl/s, JPEG 0.5, binarny Blob zamiast base64. Wysyłka ramek tylko do ekranu TV (nie do admina/telefonów). Znacznie mniejsze obciążenie sieci lokalnej.

### Pierwsze uruchomienie
- **Instrukcja onboarding** – przy pierwszym uruchomieniu pojawia się overlay z krótką instrukcją: ekran główny, ekran prezentera, Admin PWA (jedna synchronizacja), edytor, wymagania techniczne (kamera, mikrofon, Wi‑Fi). Wymaga kliknięcia „Zapoznałem się”. Można wyświetlić ponownie przez menu ⚙️ → „Pokaż instrukcję ponownie”.

### Strony WordPress / linki
- Zaktualizowane linki do pobrania v1.2.0 – sukces.html, sukces-wklej.html, stripe-cennik.html.

---

## v1.1.9 (marzec 2026) — wydanie stabilne

**Ta wersja zastępuje 1.1.5 – naprawia krytyczny błąd rozłączania graczy.**

### Połączenie (krytyczna naprawa)
- **Naprawiono krytyczny błąd rozłączania** – wersja 1.1.5 miała poważny problem z utrzymaniem połączenia; 1.1.9 go naprawia i zajmuje jej miejsce jako stabilna.

### Panel admina
- **Przycisk „Ranking graczy”** – przywrócony we wszystkich trybach (quiz, WYBORCZY, SHIPS itd.). Ukrywany tylko podczas pytania HNC (Hot or Not Championship), zgodnie z zamierzeniem.

### Statki Solo
- **Soundtrack** – usunięto pole wyszukiwania w uploads; wybór pliku audio tylko przez systemowe okno plików.

### Statki w quizie (Screen.html, vote.html)
- **Panel floty** – liczba statków, rozmiary (np. 1×5 1×4 2×3 1×2), wizualizacja trafień per statek, licznik „Trafienia: X/Y”.
- **Panel floty i tabela trafień** – zawsze widoczne na vote.html (nie znika po „Następna runda”).

### Audio (Screen.html)
- **Głośność SHIPS** – suwak master volume w adminie zmienia teraz głośność tła statków.
- **Konflikt muzyki** – przy wejściu w pytania WYBORCZY i HNC zatrzymywane są intro, ships, podium, clock, sfx – aby nie grały równolegle.

### Stripe-shop (sklep, WordPress)
- **Linki checkout** – trasa `GET /checkout?plan=...` zarejestrowana przed `express.static`, dzięki czemu przekierowanie do Stripe działa zamiast serwowania strony checkout.html.
- **Linki w nowej karcie** – przyciski „Wybierz”/„Kup” mają `target="_blank"` – Stripe Checkout otwiera się w nowej karcie.

### Build
- **Windows** – skrypt `prepare-win-icon.js` – generuje icon.ico 256×256 z PNG przed buildem (wymagane przez electron-builder).
- **Dependency** – dodano `sharp-ico` do devDependencies.

### Strony WordPress / linki
- Zaktualizowane linki do pobrania (v1.1.9) – nazwy plików na GitHub: kropki zamiast spacji (`Imprezja.Quiz.Setup.1.1.9.exe` itd.).
- Pliki: sukces.html, sukces-wklej.html, stripe-cennik.html, 09-pobierz-1.1.6.html, imprezja-quiz-produkt-pelna-tresc.html.

---

## v1.1.7 (marzec 2026) — wydanie stabilne

### Imprezator (utwory do tańca)
- **Nowa wtyczka:** Imprezator – muzyka do tańca dla animatorów. Dodawanie plików i folderów z dysku, lista utworów zapisywana w JSON (tylko odwołania, pliki pozostają na dysku). Każdy użytkownik wgrywa własne pliki – build zawiera pustą domyślną listę.
- Ekran z QR do telefonu, panel na komputerze i na telefonie.

### Build
- Wykluczenie `public/imprezator-configs` z paczki – domyślna lista Imprezatora jest pusta, bez prywatnych linków.
- Skrypt `rebuild:full` – pełne przebudowanie (czyszczenie cache, reinstalacja Electron, build).

---

## v1.1.6 (marzec 2026) — wydanie stabilne

### Tunel (Mac Intel)
- **Naprawiono crash przy uruchomieniu tunelu na Mac Intel:** build Mac x64 był pakowany z binarką cloudflared dla arm64 (pobraną na Apple Silicon). Na Intel Mac spawn(arm64) wywalał program. Przed buildem Mac x64 binarka jest teraz podmieniana na darwin-amd64.

### Ekran TV (Screen.html)
- **Statystyki quizu:** naprawiono pasek procentowy – zamiast kwadratu wyświetla się teraz prawidłowy pasek odpowiadający udziałowi procentowemu odpowiedzi.
- **Pytania muzyczne z 5 odpowiedziami:** odpowiedzi wyświetlają się zawsze w 5 wierszach (1 kolumna), bez zmiennego układu.
- Animowany ranking: gracze zmieniający pozycję przesuwają się płynnie w górę lub dół (animacja FLIP, 0,9 s, etapowo co 1 s). Animacja nie pojawia się przy pierwszym otwarciu – tylko przy kolejnych zmianach.
- Naprawiono pozycję startową animacji rankingu – wiersze nie pojawiają się już za wysoko (nad napisem „Ranking").
- Przyciski (Edytor, Cofnij, Admin, Rozpocznij, Zakończ) znikają automatycznie po włączeniu trybu pełnoekranowego.
- Ekran końcowy z podziękowaniami: naprawiono układ tekstu obok obrazka – treść i logo wyświetlają się obok siebie bez nakładania.
- QR kod admina: widoczny do momentu zalogowania admina, po zalogowaniu znika i nie wraca. „Admin na komputerze" nie ukrywa QR – można jednocześnie mieć otwartego admina zdalnie i lokalnie.

### Panel admina (admin.html)
- Ranking graczy wyświetlany jest teraz wewnątrz bloku pytania (rozwijana sekcja nad przyciskiem „Następne"), a nie jako wyskakujące okno.
- Przy nickach graczy w rankingu widoczne są strzałki zmian pozycji (▲▼).
- Tabela trafień w trybie Statki: naprawiony układ kolumn (`table-layout: fixed`), długie nicki obcięte z `…`, właściwe proporcje kolumn.

### Telefony graczy (vote.html)
- Odpowiedzi QUIZ i MUZYCZNE wyświetlają się w jednej kolumnie (4 kafelki pionowo) na wszystkich urządzeniach – koniec z poziomym ściskaniem nieczytelnych kafli.
- Ranking na telefonie: styl zgodny z ekranem TV (złoto/srebro/brąz dla TOP 3, strzałki zmian, wyświetlenie po 3 sekundach od otwarcia).
- Długie nicki graczy: obcięte z `…` na końcu, strzałka zmiany pozycji zawsze widoczna obok nicku.
- Pytanie z literą: wymagana litera wyświetlana w wyraźnym, dużym polu (64×64 px) obok pola tekstowego – gracze od razu wiedzą, że mają wpisać literę, a nie ją przepisywać.
- Szacowanie: suwak startuje w losowym miejscu zamiast wskazywać prawidłową odpowiedź.
- Pytanie otwarte: naprawiono błąd, przez który naciśnięcie „Wyślij" nie wysyłało odpowiedzi (pole tekstowe było czyszczone przy ponownym renderowaniu).
- Komunikat „STRZELAJ / CZEKAJ" w trybie Statki pojawia się prawidłowo; plansza i tabela trafień wyświetlane są od góry ekranu.

### Tryb Statki (pytanie quizowe)
- Rundy liczone poprawnie: 1 runda = wszyscy gracze oddają strzał, nowa runda zaczyna się gdy admin kliknie przycisk. Trafienia nie inkrementują licznika rund.
- Ekran TV: tabela wyników graczy widoczna przez cały czas gry; banery statusu „⚡ GRACZE STRZELAJĄ!" / „📊 RUNDA ZAKOŃCZONA" / „🏁 Koniec gry".
- Panel admina: naprawiona tabela trafień (poprawne wymiarowanie, brak „rozjeżdżania się" wartości).

### Edytor
- Ostrzeżenie przy uploadzie za małego obrazka (zbyt mała rozdzielczość dla pytań quizowych lub ekranu TV).

### Dokumentacja
- Dodano informację: zminimalizowanie okna aplikacji lub karty z panelem admina może rozłączyć graczy – podczas imprezy trzymaj okno widoczne (INSTRUKCJA_UZYTKOWNIKA.md, FAQ.md).

### Statki Solo (tryb standalone)
- Ekran TV: dodano baner statusu „🎯 STRZELAJ!" / „CZEKAJ", wizualne odliczanie 10 s, licznik strzałów „Strzał X".
- Limit czasu na strzał: 10 sekund – po przekroczeniu ekran wyświetla komunikat „⏱ Czas minął" i gra przechodzi do następnej kolejki.

---

## v1.1.5 (marzec 2026) — wydanie stabilne

### Instalator
- Ekran końcowy instalatora (Windows) z checkboxem „Uruchom Imprezja Quiz" po instalacji.
- Naprawiony błąd „integrity check has failed" przy odinstalowywaniu na Windows.
- Instalator Mac: poprawiony układ okna DMG.

### Bitwa wokalna
- Gotowy zestaw „Panie VS Panowie" załadowany domyślnie przy pierwszym uruchomieniu – bez ręcznego konfigurowania.
- Przycisk „← Cofnij" na ekranie gry (znika w trybie pełnoekranowym).

### Familiada – ekran TV
- Przycisk „← Cofnij" na ekranie Familiady (znika w trybie pełnoekranowym).

### Ekran TV (Imprezja Quiz)
- Przycisk „← Cofnij" na ekranie TV (znika w trybie pełnoekranowym).

### Panel admina
- Poprawione pozycjonowanie poradnika admina – nie jest już zasłaniany przez nagłówek ze statusem i liczbą graczy.

### Tunel LTE
- Poprawione wyświetlanie stanu tunelu po zatrzymaniu w panelu admina.

---

## v1.1.5-beta (19 luty 2026)

### Tunel LTE
- Zastąpiono poprzedni tunel nowym rozwiązaniem – bez hasła, bez limitu czasu, działa na Mac i Windows.
- Panel admina poprawnie pokazuje stan tunelu po jego zatrzymaniu.

### Gry muzyczne
- Sampler: dodano gotowe banki „Odpowiedzi" i „Prezentacja".
- Bitwa Wokalna: bank „Panie VS Panowie".
- Śpiewaj Dalej: zestaw weselny.
- Wszystkie zestawy piosenek wbudowane w instalator – gotowe od pierwszego uruchomienia.

---

## v1.1.1 (luty 2026)

### Familiada
- Ekran końcowy pokazuje wyniki i nazwy drużyn.
- Dźwięk przy każdym odsłonięciu odpowiedzi.
- Nazwy drużyn na przyciskach (zamiast stałych „NIEBIESCY"/„CZERWONI").
- W dżinglu widać nazwy drużyn i punkty.

### Gry muzyczne (NJR Sampler, Śpiewaj Dalej, Bitwa wokalna)
- Poprawione ładowanie banków i zestawów.
- Po zeskanowaniu QR gra startuje automatycznie – nie trzeba klikać „Start".
- Jeden przycisk Start/Stop (zielony/czerwony).
- Jedna gra muzyczna aktywna naraz – włączenie innej zatrzymuje poprzednią.
- Przycisk **Cofnij** na każdym ekranie gry – powrót do wyboru trybu.

### Ekran
- Ekran (TV/projektor) nie gaśnie w pełnym ekranie.

### Ekran startowy
- Większe, wyśrodkowane logo.
- Na trybach muzycznych znaczek (kłódka) – wymagana pełna licencja.
- Przycisk „Zakończ" zawsze pokazuje QR admina.

### Strona licencji
- Duże logo, czytelne ID komputera w ramce, przycisk **Cofnij**.

---

## v1.0.5 (luty 2026)

- Pliki audio z Virtual DJ (`.vdjsample`, `.ogg`) działają poprawnie.
- Śpiewaj Dalej: wizualizacja odtworzonych fragmentów (kolor → szary).
- Familiada: czytelniejsze cyfry, poprawka Złotej Listy i przekazywania punktów.

---

## v1.0.4 (luty 2026)

- **Nowy tryb: Familiada** – gra drużynowa, tablica odpowiedzi, pilot na telefonie.
- Ekran startowy: wybór Quiz lub Familiada.
- Złota Lista w Familiadzie (ulubione pytania).

---

## v1.0.3 (luty 2026)

- Naprawa panelu przy pytaniach (Statystyki, Odpowiedź, Ranking).
- Rozegrane pytania znikają z listy.
- Pytanie na literę: usunięto literę V, naprawa znikania wpisanego tekstu.

---

## v1.0.2

- Lepsza praca przy wielu telefonach (10+): mniej obciążenia sieci, priorytet dla admina.
- Przycisk „Nie wysyłaj obrazków na telefony" – szybsza gra na słabszym WiFi.
- Komunikat „Utracono połączenie" gdy odpadnie sieć.
- Poprawki dogrywki i odświeżania stanu na telefonach.
- Edytor: przesuwanie pytań w górę/dół.

---

Starsze wpisy (v1.0.1 i wcześniej) – w archiwum repozytorium.
