# Party Quiz — plan nowego trybu (hybryda Quiz + Familiada)

> Wersja robocza planu. Większość punktów zrealizowana w v1.2.5–1.2.7.
> Kod źródłowy: `/Users/test/Documents/VoteBattle/`

---

## UPDATE 2026-04-20 — pivot na „jeden edytor, jeden plik"

Po pierwszej iteracji REUSE-FIRST, w której Party Quiz miał być **scenario-builderem** delegującym edycję do trzech osobnych edytorów (Imprezja/Familiada/Statki Solo), zdecydowaliśmy o zmianie kierunku — trzy zakładki byłyby dla użytkownika niezrozumiałe i niewygodne.

**Nowy kierunek (user-friendly):**

- **Jeden edytor** — `/party-quiz/editor.html` — jest **forkiem** `/editor.html` (edytor Imprezja Quiz).
- **Jeden plik JSON** trzyma wszystkie pytania w polu `questions[]`.
- **Familiada to po prostu nowy typ pytania** obok QUIZ / MUSIC / OPEN / LETTER / ESTIMATION / SHIPS. W palecie „+ Dodaj pytanie" dochodzi przycisk **„🎤 Familiada"** z inline-edytorem listy odpowiedzi `[{text, points}]` (dokładnie format plików z `familiada-data.json`).
- **Statki Solo** — korzystają z istniejącego inline-editora planszy, który już jest w `editor.html` (`initShipsEditor`, `renderShipsBoard`). Nic nie wymyślamy.
- **Usunięte z forka:** Speedrun, Eliminacja, dogrywka TAK/NIE, typy wymagające głosowania z telefonu (VOTE, VOTE_IMG, HOT_OR_NOT) i tryby turniejowe (WYBORCZY, HNC). Pole czasu jest ukryte (Party Quiz nie ma limitu).
- **Dodano:** pole „Domyślne punkty za pytanie" (meta) + opcjonalny override „Punkty za pytanie" w karcie QUIZ/MUSIC/OPEN/LETTER/ESTIMATION + „Punkty za trafienie" w karcie SHIPS. Marker `gameMode: 'party'` w zapisanym JSON-ie.
- **Pliki:** osobny katalog serwera `party-quizzes/` (obok `quizzes/`). Socket-eventy edytora zostały zduplikowane jako `party_editor_*` (get_files, load_file, save_file, get_related_files, delete_file) + odpowiedniki po stronie serwera.

**Zrealizowane w tym kroku (Krok 2 — edytor + backend plików):**

- ✅ Fork `public/editor.html` → `public/party-quiz/editor.html` (zastąpił wcześniejszy scenario-builder).
- ✅ Usunięte nieprzydatne typy pytań i checkboxy Speedrun/Eliminacja.
- ✅ Dodany typ `FAMILIADA` (paleta, legenda, szablon karty, `collectData`, `validateQuizData`, helpery `addFamRow/removeFamRow/updateFamSum`).
- ✅ Domyślne punkty (`defaultPoints`) + override per-pytanie (`points` / `pointsPerHit`).
- ✅ Socket-eventy klienta przemianowane z `editor_*` na `party_editor_*`.
- ✅ Serwer: `partyQuizzesDir`, `getPartyQuizFiles`, `loadPartyQuestions`, 5 socket-handlerów `party_editor_*`.

**Do zrobienia dalej:**

1. **Ekran powitalny** w edytorze — logo + muzyka + tytuł/podtytuł (globalna metadana pliku), zapisuje się pod `welcome: {...}`.
2. **Admin panel** `party-quiz/admin.html` — uruchamianie pytań z wczytanego pliku, drużyny, QR do przycisków, Daj Suchara, Złota Lista.
3. **Screen.html** — gałąź `gameMode === 'party'` z paskiem drużyn i rendererem per typ pytania (delegacja do istniejących widoków Quizu i Familiady).
4. **Serwer** — stan rozgrywki Party Quiz (teams, aktualne pytanie, score), routing buzzera z Familiady.
5. **Integracja z orphan-scanner** — żeby skanował też `party-quizzes/`.

---

## 0. Założenia (uzgodnione)

- **Nazwa trybu:** Party Quiz.
- **Styl rozgrywki:** hybryda Imprezja Quiz + Familiada, wszystko dzieje się na **TV + telefonie admina + fizycznych przyciskach Familiady**.
- **Bez telefonów graczy** — `vote.html` nieużywane w tym trybie.
- **Brzęczyk:** fizyczne przyciski Familiady (1:1 z istniejącym `familiada/buttons.html`) — kto pierwszy, ten odpowiada ustnie.
- **Przyznawanie punktów:** robi admin (panel). Drużyna Niebieska i Czerwona. Zamiana stron jak w Familiadzie.
- **Bez czasu i bez bonusu za czas.**
- **Bez dogrywki** (brak UI i logiki playoff).
- **Tryby pytań w edytorze Party Quiz:** wszystkie z Quizu (klasyczny ABCD, literka, otwarte, szacowanie, statki) **oraz** pytania typu Familiada.  
  Niedostępne w edytorze Party Quiz: Speedrun, Eliminacja.
- **Z panelu admina (Party Quiz) usuwamy tylko dla tego trybu:** Generator QR WiFi, QR lokalny / Pokaż QR, Tunel LTE, „Obrazki na telefon”, „Pokaż QR admin na telefonach”.
- **QR do fizycznych przycisków** — dostępny jak w Familiadzie (panel admina generuje QR po starcie pytania; używamy 1:1 mechanizmu Familiady: `familiada_request_qr_admin` + `familiada_qr_buttons`).
- **Ekran powitalny:** logo „Imprezja Quiz” (domyślne) + muzyka czekania (ta sama co w Imprezja Quiz: `/uploads/sfx/intro_loop.mp3`) + zmiana logo/muzyki w edytorze.
- **Kolorystyka:** niebieska/czerwona z przełącznikiem swap (jak Familiada) — reużyjemy klasy `familiada-swap-side-colors`.
- **Złota lista** i **„Daj suchara”** — 1:1 skopiowane z Familiady (ten sam bank danych na start).
- **Punktacja:**
  - Quiz ABCD — 10 pkt za prawidłową odp (konfigurowalne w edytorze).
  - Familiada — punkty zgodnie z odpowiedzią na ekranie.
  - Statki — 5 pkt za trafienie (konfigurowalne w edytorze).
  - Literka / otwarte / szacowanie — admin przyznaje punkty (szacowanie: admin wpisuje odpowiedzi drużyn, punkty wg zasady odległości — preset przeliczenia).

---

## 1. Mapa istniejącego kodu (co wykorzystujemy, co pomijamy)

> **Topologia wejść:** kafelek „Party Quiz" w `start.html` prowadzi **tylko do edytora na komputerze**.
> Panel admina (`party-quiz/admin.html`) i widok ekranu TV (`screen_switch: 'party'`) dostępne są z **Admin PWA** (`admin-pwa.html`) — sekcja „📺 Ekran" + karta SETUP „Admin Party Quiz".

| Obszar | Plik | Rola w Party Quiz |
|---|---|---|
| Menu trybów | `public/start.html` | **Dodamy kafelek** „Party Quiz” → `/party-quiz/editor.html`. |
| Admin PWA | `public/admin-pwa.html` | **Dodamy kafelek Party Quiz** w sekcji „📺 Ekran" (`screen_switch: 'party'`) i kartę „Admin Party Quiz" w SETUP (link do `/party-quiz/admin.html`). |
| Ekran TV | `public/Screen.html` | **Nowy tryb** `gameMode === 'party'` — odrębne stany renderowania. |
| Panel admina (bazowy) | `public/admin.html` | Nie modyfikujemy — zbyt duży. **Tworzymy nowy** `public/party-quiz/admin.html`. |
| Edytor | `public/editor.html` | **Tworzymy nowy** `public/party-quiz/editor.html` (reużywamy `css/admin-editor-shared.css` i część komponentów), bo edytor quizu ma inne pola (speedrun/eliminacja, dogrywka). |
| Familiada: brzęczyk + QR | `public/familiada/buttons.html`, `buttons-manifest.json`, serwerowa logika `familiada_button_press` / `_flash`, `familiada_request_qr_admin` | **Reużywamy** `buttons.html` (ten sam URL i QR). W Party Quiz podpinamy ten sam mechanizm w ramach trybu `party`. |
| Familiada: suchary | `public/familiada/suchary.js` | **Kopiujemy 1:1** do Party Quiz (ten sam bank). |
| Familiada: złota lista | `public/familiada/familiada-golden.json` + UI w `familiada/admin.html` | Tryb **Familiada** — osobna lista |
| Party Quiz: złota lista | `public/party-quizzes/party-quiz-golden.json` + sekcja w `party-quiz/admin.html` | Tryb **Party Quiz** — **osobny plik** (nie `familiada-golden.json`); sync z `public/`; patrz [PARTY_QUIZ_ZLOTA_LISTA.md](./PARTY_QUIZ_ZLOTA_LISTA.md) |
| Statki solo: siatka admina | `public/statki-solo/admin.html` (`#s-col`, `#s-row`, `.grid-picker`) | **Wzorzec do skopiowania** dla pytań typu „Statki” w Party Quiz. |
| SFX quizu | `/uploads/sfx/*.mp3` (intro_loop, clock_loop, correct_answer, question_open, win_*, leaderboard, stats_show, seabattle, podjum) | Reużywamy. **Wyłączamy** clock_loop (brak czasu). |
| SFX Familiady | `public/familiada/sounds/` (bad, correct, intro, jingle, outro, win_round) | Reużywamy dla pytań typu Familiada. |
| Welcome / branding | `public/welcome-editor.html` + `welcome_update` w `server.js` | **Rozszerzymy** o osobny preset `welcomeParty` (logo + muzyka intro + tekst). |

---

## 2. Architektura REUSE-FIRST (po rewizji 2026-04-20)

> **Zasada naczelna:** Party Quiz **nie** wprowadza nowych typów pytań, **nie** duplikuje edytorów, **nie** renderuje pytań na nowo. Jest cienką warstwą orkiestracji nad istniejącymi komponentami (Imprezja Quiz, Familiada, Statki Solo).

### 2.1 Plik Party Quiz = scenariusz + drużyny (nie nowy format pytań)

```json
{
  "title": "Urodziny Ani — Party Quiz",
  "welcome": { "title": "Party Quiz", "subtitle": "...", "logoUrl": "/img/logo_imprezja.png", "introMusicUrl": "/uploads/sfx/intro_loop.mp3" },
  "teams": { "blueName": "Niebiescy", "redName": "Czerwoni" },
  "scenario": [
    { "kind": "quiz",      "file": "Quiz ciekawostki.json",   "questionIndex": 0, "pointsOverride": 10 },
    { "kind": "familiada", "file": "Pytania Imprezja.json",   "questionIndex": 2 },
    { "kind": "statki",    "source": "global" },
    { "kind": "statki",    "source": "inline", "board": { "boardSize": 8, "ships": [...], "pointsPerHit": 5 } },
    { "kind": "suchar" },
    { "kind": "golden",    "questionIndex": 1 }
  ]
}
```

Pytania edytujesz w **istniejących** edytorach (`/editor.html`, `/familiada/editor.html`, `/statki-solo/editor.html`). Party Quiz trzyma tylko **referencje** do plików i indeksów oraz ewentualne override'y (punkty, limity).

### 2.2 Edytor Party Quiz = builder scenariusza (`public/party-quiz/editor.html`)

**Bez własnego edytora pytań.** Trzy sekcje:

- **„Pytania do użycia"** — 3 duże przyciski: „✎ Edytuj Quiz", „✎ Edytuj Familiadę", „✎ Edytuj Statki" → otwierają istniejące edytory **w nowej karcie**.
- **„Scenariusz"** — lista kroków z drag&drop. Dodawanie kroku przez modal/dropdown: Quiz → wybór pliku (dynamicznie z `editor_get_files`) → wybór pytania (dynamicznie z `editor_load_file`); Familiada → analogicznie z `/api/familiada/files` + `/api/familiada/data?file=`; Statki → wybór `global`/`inline`; Suchar → bez parametrów; Golden → wybór pytania z `familiada-golden.json`.
- **„Powitanie + drużyny"** — meta (nazwy drużyn, logo, muzyka).

Każdy krok ma pola: `kind`, referencję (file/index), **opcjonalny** `pointsOverride`, `notes`.

### 2.3 Panel admina Party Quiz = orkiestracja (`public/party-quiz/admin.html`)

**Rdzeń UI drużyn kopiowany 1:1 z `familiada/admin.html`** (sekcja ~574–767: odpowiedzi, X/X/X, mnożniki ×1/×2/×3, `add_points`, swap kolorów).

**Bieżący krok scenariusza** wyświetla się jako kompaktowy pasek. Przycisk **„▶ Uruchom krok"** deleguje do istniejących mechanik:

| `kind` | Co emituje admin Party | Jak Screen renderuje |
|---|---|---|
| `quiz` | `admin_start_question` (ten sam event co klasyczny admin Quizu) po uprzednim `admin_load_quiz(file)` | istniejący renderer ABCD/Open/Letter/Estimation/Ships — **bez zmian** |
| `familiada` | `select_question(idx)` (jak admin Familiady) z pliku wczytanego przez `familiada_load_file` | istniejący renderer Familiady — **bez zmian** |
| `statki` | `ships_solo_init(config)` → `ships_solo_aim` → `ships_solo_shot` | istniejący flow Statki Solo |
| `suchar` | klient-only: `suchary.js` (kopia z familiady) + ewentualny overlay na TV | ten sam mechanizm co Familiada |
| `golden` | `select_golden_question(idx)` (jak Familiada) | ten sam renderer |

**Przechwytywanie punktów:** w trybie `party` admin nie opiera się na `send_answer` (nie ma telefonów graczy). Po każdej odpowiedzi admin klika ręcznie „+X 🔵" / „+X 🔴" / „X 🔵" / „X 🔴" — analogicznie do Familiady.

**Buzzer** = **istniejący** `familiada_button_press` / `_flash` + `familiada_request_qr_admin`. Zero zmian w `buttons.html`, poza jednym `if` dla routingu w przyszłym kroku.

### 2.4 Ekran TV — minimalna wstawka w `Screen.html`

Gdy `gameMode === 'party'`:
- Na górze renderuje się **pasek drużyn** (🔵 score / 🔴 score + X X X) z klasą `familiada-swap-side-colors` (już istnieje).
- Pod spodem — **istniejące** widoki trybów (ABCD quizu, tablica Familiady, plansza Statków) renderują się **bez zmian**.
- Timer wyłączony (serwer nie ustawia `question.time` gdy tryb party).

### 2.5 Serwer — cienka warstwa koordynacji

Sekcja `// === Party Quiz ===` w `server.js`:

- `partyState = { gameMode: 'party', teams: { blueScore, redScore, blueErrors, redErrors }, colorSidesSwapped, scenario, currentStepIndex, scenarioFile }`.
- `party_load_scenario(filename)` — ładuje z `party-quizzes/`.
- `party_run_step(stepIndex)` — wewnętrznie woła istniejące handlery (`admin_load_quiz` + `admin_start_question`, albo `familiada_load_file` + `select_question`, albo `ships_solo_init`...) i broadcastuje `party_state`.
- `party_award({ team, points })`, `party_mark_error({ team })`, `party_toggle_color_sides`, `party_reset_round`, `party_end_game`.
- **Przekierowanie buzzera:** w `familiada_button_press` dodajemy `if (gameMode === 'party') → party handler`.
- **Blokowanie kolidujących mechanik w trybie party:** dogrywka, speedrun queue, eliminacja, bonus za czas, broadcast do telefonów (już zrobione).

### 2.6 Co piszemy od zera — minimalna lista

| Plik | Rola | Rozmiar (szac.) |
|---|---|---|
| `public/party-quiz/editor.html` | Builder scenariusza + 3 przyciski do istniejących edytorów | ~600 linii |
| `public/party-quiz/admin.html` | Panel drużyn + „Uruchom krok" + skróty do istniejących mechanik | ~800 linii |
| `public/party-quiz/party-team-bar.js` | Wstawka paska drużyn do Screen.html | ~100 linii |
| `public/party-quiz/suchary.js` | Kopia `/familiada/suchary.js` (1:1) | bez zmian |
| `public/Screen.html` | Wstrzyknięcie paska drużyn + `gameMode === 'party'` guards | +50 linii |
| `public/familiada/buttons.html` | Jeden `if` dla routingu buzzera | +10 linii |
| `server.js` | Sekcja `// === Party Quiz ===` | ~400 linii |

**Razem: ~2000 linii nowego kodu**, wobec ~8000+ linii istniejących komponentów, których NIE trzeba duplikować.

### Faza C — Panel admina (rdzeń)
Plik: `public/party-quiz/admin.html`.
- **Sekcja Powitanie:** miniatura logo, wybór pliku logo, wybór muzyki intro, „Start powitanie (TV)”, „Stop muzyka”.
- **Sekcja wyboru quizu:** lista plików z `party-quizzes/` + wczytaj + lista pytań.
- **Sekcja Drużyny:**
  - Dwie kolumny: Niebieska / Czerwona z punktami i licznikami szans (X X X) per runda Familiada.
  - Przełącznik „Zamień strony kolorów” → `party_toggle_color_sides`.
  - Reset rundy / reset punktacji.
- **Sekcja Buzzer:**
  - Pokaż „QR do przycisków” (reużywamy `familiada_request_qr_admin`).
  - Badge „Kto nacisnął pierwszy: 🔵 / 🔴 / -”.
  - Przycisk „Reset buzzera” → `party_reset_buzzer`.
- **Sekcja Aktywne pytanie** (zmienia layout zależnie od typu):
  - **ABCD:** pytanie, 4 odpowiedzi z zaznaczoną prawidłową ⭐, po odpowiedzi „Prawidłowa → +X pkt dla 🔵/🔴”, „Błędna → X szansa dla drużyny”.
  - **Familiada:** lista odpowiedzi `{text, points}` z podświetleniem „ujawnione”; klik ujawnia (jak admin Familiady); kolumny mnożników ×1/×2/×3; X X X dla każdej drużyny; panel „transfer puli”.
  - **Statki:** podgląd planszy z rozłożonymi statkami; siatka `grid-picker` do wybierania pola; po trafieniu +5 pkt dla drużyny, która pierwsza przyciśnie (lub dla tej, która aktualnie gra — do uzgodnienia w Fazie C2). Licznik trafień per drużyna.
  - **Literka:** pytanie, pole „Aktualna litera” (losuj/wpisz), przyciski „+X pkt 🔵/🔴”.
  - **Otwarte:** pytanie, sugerowana odpowiedź (tylko dla admina), przyciski „+X pkt 🔵/🔴”.
  - **Szacowanie:** pytanie, prawidłowa wartość, dwa pola „odpowiedź Niebieskich / Czerwonych”, przycisk „Przelicz i przyznaj” (auto rozkład wg odległości).
- **Sekcja Złota lista** (w dolnej części, zwijana) — lista z `golden[]` lub `familiada-golden.json`.
- **Sekcja Suchary** (zwijana) — panel 1:1 z Familiady.
- **Sekcja Audio:** master volume, „Muzyka czekania (intro)”, „Stop muzyka”, „Odtwarzaj dźwięk: dobra/zła/jingle/outro” (reużycie `play_sound_event` Familiady, osobny namespace `party_play_sound`).
- **Sekcja Koniec gry:** przycisk „Pokaż wynik końcowy” (zwycięzca po punktach) + „Zakończ rozgrywkę”.

**Co usuwamy (vs. klasyczny `admin.html`):** Generator QR WiFi, QR lokalny, Tunel, Pokaż QR admin na telefonach, obrazki na telefon, kontrole czasu, dogrywka, speedrun queue, eliminacja.

### Faza D — Ekran TV
`Screen.html`: nowy blok `#party-screen` aktywny gdy `gameMode === 'party'`.
- **Powitanie:** logo + subtelna animacja + muzyka loop (intro).
- **Widok rozgrywki:** dwa panele (lewy niebieski / prawy czerwony) z punktami + licznik szans (X X X) na rundę Familiada. Swap kolorów działa jak w Familiadzie (`familiada-swap-side-colors`).
- **Widoki per typ pytania:**
  - **ABCD:** duże pytanie + 4 kafelki A/B/C/D; brak timera; po przyznaniu pkt — animacja „poprawna/błędna” + dźwięk quizu.
  - **Familiada:** tablica Familiady (reużywamy style z familiady screen).
  - **Statki:** plansza z podświetleniem strzałów + legenda statków.
  - **Literka:** wielka litera + kategoria.
  - **Otwarte:** pytanie + animacja oczekiwania.
  - **Szacowanie:** pytanie + (po ujawnieniu) prawidłowa wartość + odpowiedzi drużyn.
- **Suchar:** overlay z tekstem sucharu (animacja wjazdu).
- **Koniec gry:** zwycięzca + muzyka outro.

### Faza E — Serwer (`server.js`)
Dodajemy nowe handlery (bez ruszania istniejących):
- `set_game_mode('party')` → ustawia `gameMode = 'party'`, inicjalizuje `partyState`.
- `party_load_quiz(filename)` → ładuje z `party-quizzes/`.
- `party_select_question(idx)` → ustawia `activeQuestion`, reset buzzera, broadcast `party_state`.
- `party_buzzer_press({ team })` → identyczna logika jak `familiada_button_press` (pierwszy zwycięża, flaga `buzzerUsedThisRound`). Reużywamy pokoju przycisków.
- `party_reset_buzzer` → zeruje flagę.
- `party_award_points({ team, points })` → dodaje punkty.
- `party_register_miss({ team })` → X szansy (dla typu Familiada / ABCD).
- `party_reveal_answer(idx)` → Familiada — ujawnienie.
- `party_ships_aim / _shot` → bazuje na statki-solo, ale bez trybu „buciki”, stała `pointsPerHit`.
- `party_toggle_color_sides` → odpowiednik Familiady.
- `party_play_sound({ name })` → proxy do `play_sound_event` na pokoju `party`.
- `party_show_welcome / party_show_game / party_show_end`.
- **QR do przycisków:** reużycie istniejącego `familiada_request_qr_admin` (ten sam URL PWA — `buttons.html` łączy się do obu pokoi).

Struktura nowej persystencji:
- `IMPREZJA_DATA_DIR/party-quizzes/*.json`
- Opcjonalny plik `party-welcome.json` z domyślnym brandingiem.

### Faza F — Integracja buttons.html (fizyczne przyciski)
`buttons.html`:
- Po połączeniu sprawdza `gameMode` z serwera (event `game_mode_update`) i kieruje kliknięcia do:
  - `familiada_button_press` gdy tryb `familiada`,
  - `party_buzzer_press` gdy tryb `party`.
- Swap kolorów obsługujemy identycznie (ta sama klasa `swap-colors`).

### Faza G — Polish
- Skróty klawiszowe dla admina (opcjonalnie): `Q/W` = +pkt blue/red, `A/S` = X blue/red, `R` = reset buzzer, `Space` = ujawnij/aktywuj.
- Animacje wejścia/wyjścia pytania.
- Fullscreen przycisku i wake-lock na adminie (jak w `statki-solo/admin.html`).

---

## 3. Model danych — plik Party Quiz (REUSE-FIRST)

**Brak własnych typów pytań.** Plik trzyma tylko scenariusz + meta + drużyny. Wszystkie pytania żyją w plikach Quizu/Familiady oraz w globalnym config Statków Solo — Party Quiz tylko się do nich odwołuje.

```json
{
  "title": "Urodziny Ani — Party Quiz",
  "welcome": {
    "title": "Party Quiz",
    "subtitle": "Drużyny vs. fizyczne przyciski",
    "logoUrl": "/img/logo_imprezja.png",
    "introMusicUrl": "/uploads/sfx/intro_loop.mp3"
  },
  "teams": { "blueName": "Niebiescy", "redName": "Czerwoni", "colorSidesSwapped": false },
  "scenario": [
    { "kind": "quiz",      "file": "Quiz ciekawostki.json",    "questionIndex": 0, "pointsOverride": 10, "notes": "Pytanie otwierające" },
    { "kind": "quiz",      "file": "Quiz ciekawostki.json",    "questionIndex": 5 },
    { "kind": "familiada", "file": "Pytania Imprezja.json",    "questionIndex": 2 },
    { "kind": "statki",    "source": "global" },
    { "kind": "suchar" },
    { "kind": "golden",    "questionIndex": 1 },
    { "kind": "statki",    "source": "inline", "board": {
        "boardSize": 8,
        "ships": [{ "row": 0, "col": 0, "size": 4, "vertical": false }],
        "pointsPerHit": 5
    }}
  ]
}
```

**Decyzje:**
- `pointsOverride` (opcjonalny, per krok) — nadpisuje domyślne punkty typu (10 ABCD / 5 trafienie). Default: z metadanych.
- `statki.source`: `"global"` → używa zapisanej konfiguracji Statków Solo z `statki-solo-config.json`; `"inline"` → plansza zapisana w pliku Party Quiz (parametr `board`).
- **Brak** osobnych kluczy `questions[]`, `golden[]`, `suchary[]` — wszystko jest kroakiem scenariusza.

---

## 4. Nowe / zmienione pliki (REUSE-FIRST)

**Nowe (minimalne):**
- `public/party-quiz/editor.html` — builder scenariusza (3 przyciski do istniejących edytorów + lista kroków).
- `public/party-quiz/admin.html` — panel drużyn + „Uruchom krok" delegujący do istniejących handlerów.
- `public/party-quiz/party-team-bar.js` — wstawka paska drużyn na TV.
- `public/party-quiz/suchary.js` — kopia z `familiada/suchary.js` (globalny bank).

**Edytowane (minimalne):**
- `public/start.html` — kafelek „Party Quiz" → `/party-quiz/editor.html` ✓ **ZROBIONE**.
- `public/admin-pwa.html` — kafelek „Party Quiz" w sekcji „📺 Ekran" + karta „Admin Party Quiz" w SETUP ✓ **ZROBIONE**.
- `public/Screen.html` — wstrzyknięcie `<div id="party-team-bar">` + mount skryptu `party-team-bar.js` + `gameMode === 'party'` guards.
- `public/familiada/buttons.html` — jeden `if` dla routingu buzzera (party vs familiada).
- `server.js` — sekcja `// === Party Quiz ===` (stan, handlery, delegacja do istniejących funkcji `admin_start_question`, `select_question`, `ships_solo_*`).

**NIE RUSZAMY (używamy 1:1):**
- `public/editor.html` (Imprezja Quiz) — edytor pytań quiz.
- `public/familiada/editor.html` — edytor pytań Familiady.
- `public/statki-solo/editor.html` — edytor planszy Statków Solo.
- `public/admin.html` — klasyczny panel admina.
- `public/familiada/admin.html` — panel Familiady (stąd kopiujemy tylko UI drużyn, bez modyfikacji oryginału).
- `public/statki-solo/admin.html` — panel Statków.
- `public/vote.html` — nie używamy w Party Quiz.

---

## 5. Ryzyka i niewiadome

1. **Dogrywka w `server.js`** jest spleciona z pipeline'em — upewnić się, że dla `gameMode === 'party'` nie wchodzi nawet przypadkiem (gałąź `if (gameMode === 'quiz')` dla bloków playoff).
2. **Buzzer w `buttons.html`** jest PWA z `scope: /familiada/` — musimy albo:
   - zostawić ten sam scope i pokój (prościej, ale przyciski logują się do pokoju `familiada`),
   - albo rozszerzyć scope i dodać obsługę pokoju `party`.  
   *Rekomendacja:* reużyć pokój `familiada` — serwer kieruje zdarzenie do logiki party gdy `gameMode === 'party'`.
3. **Szacowanie** — preset rozkładu punktów wg odległości do uzgodnienia (proponuję: zwycięzca 100%, drugi 25%, remis 50/50; lub 100%/0%).
4. **Statki w Party Quiz** — kto strzela? Propozycja: zwycięzca buzzera strzela 1× (trafienie → kolejny strzał tej samej drużyny; pudło → buzzer wolny). Do potwierdzenia.
5. **Zamiana stron** — tylko wizualna (jak w Familiadzie), semantyka drużyn (`blue`/`red`) nie zmienia się w danych — tylko prezentacja.
6. **Edytor `PARTY_SHIPS`** — reużycie komponentu planszy ze `statki-solo/editor.html` wymaga wydzielenia go (rekomendacja: skopiować do `party-quiz/`; nie refaktoryzować globalnie).

---

## 6. Decyzje (zatwierdzone)

1. **Statki — przebieg rundy:**
   - Buzzer tylko na **pierwszy strzał** (decyduje kto zaczyna: 🔵 czy 🔴).
   - Dalej drużyny strzelają **na zmianę** (🔵 → 🔴 → 🔵 → …), niezależnie od trafienia/pudła.
   - Admin **wybiera pole** (siatka `grid-picker` jak w statki-solo).
   - Po każdym strzale admin klika jeden z **dwóch przycisków**: „Trafienie 🔵” lub „Trafienie 🔴” (liczy punkty tej drużyny). Pudło = admin nie klika nic (albo klika „Pudło”) i tura przechodzi na drugą drużynę.
   - Admin ręcznie kończy minigrę przyciskiem „Zakończ statki i przyznaj pkt” — punkty już zsumowane lecą do drużyn.
   - `pointsPerHit` default 5, konfigurowalne w edytorze.
2. **Szacowanie:** admin wpisuje liczbę podaną ustnie przez 🔵 i liczbę podaną przez 🔴. Punkty liczone wg tej samej zasady co klasyczny typ ESTIMATION z `server.js` (`applyEstimationScoring()`). Przycisk „Przelicz i przyznaj”.
3. **Złota lista i Suchary — globalne.** Suchary: `suchary.js` (kopia w Party). **Złota lista Party:** osobny `party-quiz-golden.json` (nie `familiada-golden.json`); Familiada zachowuje własną listę.
4. **Folder persystencji:** `party-quizzes/` — OK.
5. **Routing fizycznych przycisków:** reużywamy pokój socket `familiada` i istniejący mechanizm — jeden quiz na imprezę, brak konfliktu. Serwer po stronie handlera sprawdza `gameMode` i kieruje zdarzenie do logiki party.
6. **Ekran powitalny:** konfigurowany **tylko w edytorze Party Quiz** (pola: `logoUrl`, `title`, `subtitle`, `introMusicUrl`). Domyślne wartości = aktualne Imprezja Quiz: `/img/logo_imprezja.png`, napis „Imprezja Quiz” (lub „Party Quiz”), muzyka `/uploads/sfx/intro_loop.mp3`.

---

## 7. Kolejność dostarczenia (REUSE-FIRST, krok po kroku)

1. **Krok 1** ✓ *ZROBIONE* — kafelek w `start.html` + kafelek/karta w `admin-pwa.html` + `gameMode 'party'` + guardy broadcastu w `server.js` + pusty panel admina.
2. **Krok 2** *(aktualny)* — builder scenariusza w `/party-quiz/editor.html`: meta, drużyny, welcome, lista kroków z ręcznym wpisem pól + 3 przyciski otwierające istniejące edytory w nowej karcie + export/import JSON + auto-save.
3. **Krok 3** — dynamiczne pickery pytań: wczytywanie listy plików Quizu (`editor_get_files`) i Familiady (`/api/familiada/files`), dropdowny z podglądem pytań w modalu dodawania kroku.
4. **Krok 4** — server.js sekcja Party Quiz: zapis/odczyt pliku scenariusza w `party-quizzes/`, stan drużyn, handler `party_run_step` delegujący do istniejących funkcji.
5. **Krok 5** — panel admina: rdzeń UI drużyn (kopia z `familiada/admin.html`), nagłówek z bieżącym krokiem, przycisk „Uruchom krok" → delegacja.
6. **Krok 6** — integracja Screen.html: pasek drużyn (`party-team-bar.js`) wstrzykiwany gdy `gameMode === 'party'`, guardy istniejących rendererów.
7. **Krok 7** — buzzer: routing `familiada_button_press` do logiki party gdy tryb party + QR dla przycisków (1:1 familiada).
8. **Krok 8** — end-to-end krok `quiz` (ABCD): uruchom → Screen renderuje → admin przyznaje +pkt 🔵/🔴.
9. **Krok 9** — end-to-end krok `familiada`: uruchom → Screen renderuje → ujawnianie odpowiedzi → +pkt.
10. **Krok 10** — end-to-end krok `statki` (global + inline): init → strzały → +5 pkt/trafienie.
11. **Krok 11** — suchary (kopia `suchary.js`) + złota lista Party (`party-quiz-golden.json`, API `/api/party-quiz/golden`, `party_run_golden_question`).

---

## 8. Stan implementacji (czerwiec 2026)

Odchodzenie od pierwotnego planu „scenariusza kroków” — **wdrożony** monolityczny Party Quiz:

- Jeden edytor pytań: `public/party-quiz/editor.html` (typy QUIZ, FAMILIADA, SHIPS, FAST_LIST, …).
- Jeden plik quizu w `party-quizzes/*.json` + **osobna** złota lista `party-quiz-golden.json`.
- Panel admina: `party-quiz/admin.html`; TV: `Screen.html` z `gameMode === 'party'`.
- Złota lista: [PARTY_QUIZ_ZLOTA_LISTA.md](./PARTY_QUIZ_ZLOTA_LISTA.md).

Plan poniżej (sekcje 2–7) pozostaje jako dokumentacja decyzji architektonicznych z fazy projektowej; część kroków REUSE-FIRST została zastąpiona bezpośrednią implementacją w `party-quiz/`.
12. **Krok 12** — pytania Quiz typu OPEN/LETTER/ESTIMATION przez istniejący flow + szacowanie dwóch wartości (🔵 + 🔴 → `applyEstimationScoring`).
13. **Krok 13** — ekran końcowy + outro, skróty klawiszowe, animacje, polish.

Po każdym kroku — weryfikacja manualna na żywej aplikacji.

---

**Koniec planu.**
