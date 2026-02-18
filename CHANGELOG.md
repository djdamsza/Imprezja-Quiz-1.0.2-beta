# Changelog – Imprezja Quiz

## v1.0.4 (2026-02-18)

### Tryb Familiady

- **Nowy tryb gry** – Familiada: gra drużynowa z tablicą odpowiedzi, pilot na telefonie, ekran na TV
- **Strona startowa** (`/` lub `/start.html`) – wybór między Imprezja Quiz a Familiada
- **Ekran TV** – `/familiada/screen.html` – tabela z pytaniami i odpowiedziami (odkrywanymi przez admina)
- **Panel admina** – `/familiada/admin.html` – sterowanie rundą, przyznawanie punktów, odsłanianie odpowiedzi
- **Przyciski graczy** – `/familiada/buttons.html` – dwa pola (niebieskie/czerwone), kto pierwszy naciśnie – odpowiada
- **Złota Lista** – max 10 ulubionych pytań (☆)
- **API** – `/api/familiada/*` – pliki, dane, zapis, złota lista

### Edytor Familiady – parser tekstu

- **Format „Pytanie? + lista odpowiedzi”** – wklej tekst w formacie: linia z `?` = pytanie, kolejne linie = odpowiedzi (punkty rozdzielane automatycznie)
- Obsługa: `Pytanie 1: ...`, `Odpowiedź - 40`, JSON, XML
- Przycisk „Wklej JSON” – rozpoznawanie formatu po pytajniku lub „Pytanie N:”

### Materiały marketingowe

- **`docs/marketing/`** – logo, badge „14 DNI ZA DARMO”, grafiki 1:1, 16:9, 9:16 (Quiz + Familiada + Statki)
- **`docs/marketing/SOCIAL_MEDIA_POSTY.md`** – gotowe posty na social media

### Dokumentacja

- **`docs/FAMILIADA_QUIZ_KONFLIKTY.md`** – analiza: brak konfliktów między trybem Quiz a Familiada

### Buildy

- **Wersja 1.0.4** – tylko DMG (macOS), bez ZIP
- **3 pliki:** Windows (exe), macOS ARM64 (dmg), macOS Intel (dmg)

---

## v1.0.3 (2026-02-11)

### Naprawa menu kontekstowego w panelu admina

- **Problem:** Po kliknięciu pytania panel kontrolny (Statystyki, Odpowiedź, Ranking) czasami się nie pojawiał – zwłaszcza przy pierwszym kliknięciu i przy kolejnych pytaniach.
- **Przyczyna:** Po `renderQuestionsList()` element panelu był usuwany z DOM; `getElementById('question-control')` zwracał `null` dla odłączonego elementu, więc panel nie był ponownie wstawiany.
- **Rozwiązanie:** `placeQuestionControlUnderActive(panelRef)` przyjmuje opcjonalną referencję panelu; referencja jest pobierana przed usunięciem i przekazywana z `renderQuestionsList`, `startQuestion` oraz handlera `update_state`.

### Lista pytań – rozegrane pytania znikają

- Rozegrane pytania są usuwane z listy (zamiast odznaczania ✓).
- Aktualnie wyświetlane pytanie pozostaje widoczne.

### Pytanie z literą (LETTER)

- **Usunięto literę V** z dozwolonych pierwszych liter – nie będzie już losowana.
- **Naprawa znikania tekstu** – po wpisaniu czegokolwiek na daną literę pole się czyściło i nie dało się wysłać odpowiedzi. Przyczyna: `update_state` co ~120 ms wywoływał `showVotingScreen`, co przeładowywało widok i czyściło pola. Rozwiązanie: nie przeładowywać widoku LETTER, gdy pola do wpisywania już istnieją (`hasLetterInputs`).

---

## v1.0.2 – Optymalizacja sieci (10+ telefonów)

- **Throttling broadcastu** – debounce 120 ms dla telefonów (zmienna `IMPREZJA_BROADCAST_DEBOUNCE_MS`)
- **Priorytet admina** – `ADMIN_ROOM`, admin dostaje `update_state` od razu, telefony z opóźnieniem
- **Retry dla menu pytań** – `placeQuestionControlUnderActive` z retry (3× co 150 ms)
- **Synchronizacja pytań po odświeżeniu** – `questions` z `state.questions` po refreshu
- **Banner rozłączenia** – czerwony komunikat „Utracono połączenie – odśwież stronę”
- **Try-catch w `update_state`** – jeden błąd nie blokuje kolejnych aktualizacji

## Przycisk „Nie wysyłaj obrazków na telefony”

- `gameState.sendImagesToPhones` (domyślnie `true`)
- Przycisk w panelu admina – zalecane przy wielu graczach
- W `vote.html` – sprawdzanie `sendImagesToPhones` przed ładowaniem obrazków (hero, HOT_OR_NOT, ESTIMATION, OPEN, domyślne pytania)

## Logika dogrywki – odbieranie punktów

- **Start dogrywki** – zapis graczy, którzy wpisali dane słowo (`submitters`)
- **Koniec dogrywki** – jeśli TAK < 51%, odjęcie 100 pkt od tych graczy
- Obsługa graczy rozłączonych i trybu drużynowego

## Naprawy

- **Okresowe odświeżanie stanu** – po 3 s bez aktualizacji telefon wysyła `request_state`
- **Wymuszenie `showVotingScreen`** – gdy grid odpowiedzi jest pusty przy „tym samym pytaniu”

## Edytor przenośny

- **`editor-standalone.html`** – edytor działający bez serwera
- Dla klientów: układanie pytań, wgrywanie plików, eksport ZIP
- `fileStore` – magazyn plików w pamięci przeglądarki
- Eksport/import pakietu ZIP (JSZip) – kompatybilny z importem w panelu admina
- Dokumentacja: `docs/EDITOR_STANDALONE.md`

## Generator QR – ulepszenia

- **Wpisz aktualną sieć** – przycisk pobiera nazwę połączonej sieci WiFi z systemu (macOS, Windows, Linux)
- **Zapamiętywanie** – ostatnio wpisane nazwa i hasło ładowane przy starcie; zapis przy blur i przy generowaniu
- **Uwaga:** Hasła nie da się pobrać z systemu – trzeba wpisać ręcznie (lub użyć zapamiętanego)

## QR 2.0 – sieć + hasło + link w jednym QR

- **Strona `/join`** – landing page z przyciskiem „Połącz z WiFi” (kopiuje dane) i wyborem WiFi/LTE
- **QR 2.0** – jeden kod QR prowadzi na `/join?ssid=...&pass=...`; gracz skanuje → widzi sieć i hasło → łączy się → wchodzi do gry
- **Generator w panelu admina** – sekcja „QR 2.0” w Generatorze QR WiFi; używa tych samych pól (nazwa sieci, hasło)
- **Usunięto QR 2.0** – powrót do trzech osobnych kodów
- **Nowa logika ekranu** – jeden kontener z: 1) QR WiFi, 2) QR Gra (Wi‑Fi), 3) QR LTE (gdy tunel) lub pole w drugim koloru z info „Organizator musi kliknąć czerwony przycisk „Uruchom tunel" w panelu admina"

## Edytor – przesuwanie pytań

- Przyciski **⬆️** i **⬇️** przy każdym pytaniu (edytor wewnętrzny i przenośny)
- Funkcje `moveQuestionUp()` i `moveQuestionDown()`
- Kolejność zapisywana w eksporcie JSON/ZIP

## Dokumentacja

- `docs/OPTYMALIZACJA_SIECI.md` – optymalizacja, Cudy LT400, multicast, obrazki, odświeżanie
- `docs/INSTRUKCJA_VIDEO_ADMIN.md` – scenariusz instrukcji wideo panelu admina
- `docs/EDITOR_PAKIET.md` – opis pakietów ZIP
- `docs/EDITOR_STANDALONE.md` – edytor przenośny

---

## Pliki zmodyfikowane

| Plik | Zmiany |
|------|--------|
| `server.js` | ADMIN_ROOM, sendImagesToPhones, logika dogrywki, debounce, QR 2.0; v1.0.3: usunięcie litery V z availableLetters (LETTER) |
| `public/admin.html` | Przycisk obrazków, banner rozłączenia, synchronizacja pytań, generator QR 2.0 |
| `public/vote.html` | Pomijanie obrazków, scheduleStateRefresh, gridEmpty; v1.0.3: LETTER – hasLetterInputs, brak przeładowania widoku przy pisaniu |
| `public/editor.html` | Przyciski przesuwania pytań góra/dół |
| `public/editor-standalone.html` | Nowy plik – edytor przenośny + przesuwanie pytań |
