# Party Quiz — złota lista

Osobna **złota lista Party Quiz** (nie mylić z złotą listą trybu Familiada).

---

## Pliki

| Lokalizacja | Opis |
|-------------|------|
| `public/party-quizzes/party-quiz-golden.json` | Wzorcowy zestaw w repozytorium (7 pytań testowych Familiady) |
| `public/party-quizzes/złota-lista-dla-testu.json` | Pełny quiz Party do wczytania z listy plików (te same 7 pytań + meta welcome) |
| `{userData}/party-quizzes/party-quiz-golden.json` | Plik roboczy aplikacji (Electron / folder danych serwera) |

Familiada ma **własny** plik: `familiada/familiada-golden.json` — edycja i gra w trybie Familiada nie mieszają się z Party Quiz.

---

## Format wpisu (FAMILIADA)

```json
{
  "type": "FAMILIADA",
  "question": "Alkohol bez litery \"W\" w nazwie",
  "time": 0,
  "answers": [
    { "text": "Bimber", "points": 40 },
    { "text": "Rum", "points": 0 },
    { "text": "Gin", "points": 0 }
  ],
  "correct": -1
}
```

- Odpowiedzi z pustym `text` są odrzucane przy imporcie (`parsePartyQuizGoldenJson` w `server.js`).
- Maksymalnie **10** pytań na liście.
- Punkty `0` są dozwolone (odpowiedź na tablicy bez punktów w puli).

---

## Synchronizacja z repozytorium

Przy `loadPartyQuizGoldenData()` serwer:

1. Czyta `public/party-quizzes/party-quiz-golden.json`.
2. Jeśli w folderze danych jest plik ze **starszą** zawartością:
   - mniej pytań, **lub**
   - to samo pytanie (po treści) ma mniej odpowiedzi niż w `public/`,
3. Nadpisuje plik w danych wersją z `public/` i emituje `party_golden_updated`.

Sync uruchamia się przy **starcie serwera**, przy **GET `/api/party-quiz/golden`** oraz przy **każdym nowym połączeniu Socket.IO** (admin Party Quiz dostaje świeżą listę).

### Wymuszenie odświeżenia ręcznie

1. Zatrzymaj aplikację.
2. Usuń `{userData}/party-quizzes/party-quiz-golden.json`.
3. Uruchom ponownie — plik skopiuje się z `public/`.

---

## UI

| Miejsce | Działanie |
|---------|-----------|
| `/party-quiz/admin.html` | Sekcja **Złota lista** — rozwinięcie wiersza pokazuje wszystkie odpowiedzi; **Uruchom na tablicy** → `party_run_golden_question` |
| `/party-quiz/editor.html` | Otwórz plik `party-quiz-golden` lub użyj ★ przy pytaniu, aby dodać kopię na listę |
| `Screen.html` (tryb party) | Tablica Familiady TV — wszystkie odpowiedzi z pytania (bez limitu 4) |

---

## Socket / API (skrót)

- `GET /api/party-quiz/golden` — odczyt listy (z sync)
- `POST /api/party-quiz/golden` — zapis tablicy pytań
- `party_golden_list` / `party_golden_updated` — push do admina
- `party_run_golden_question(index)` — start pytania ze złotej listy na TV (`currentGoldenIndex`)

Aktywne pytanie na serwerze: `getActivePartyQuestionForParty()` — najpierw złota lista, potem indeks z wczytanego quizu.

---

## QA przed release

- [ ] Panel admina: pytanie „Alkohol…” — **8** odpowiedzi w podglądzie i na antenie.
- [ ] Po edycji w edytorze i zapisie — lista w adminie odświeża się (`party_golden_updated`).
- [ ] Stary plik w userData (np. 4 odp.) — po restarcie sync do 8.

Zobacz też: [CHECKLISTA_QA_PRZED_RELEASE.md](./CHECKLISTA_QA_PRZED_RELEASE.md).
