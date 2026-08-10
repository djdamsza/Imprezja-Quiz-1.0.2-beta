# Party Quiz — instrukcja dla modeli językowych

Uniwersalny przewodnik: jak zamienić **zwykłe pytania na kartce** w poprawny quiz **Imprezja Quiz (tryb Party)**.  
Docelowy format: plik JSON do edytora `/party-quiz/editor.html`.

---

## 0. Zasada nadrzędna: dopytuj, nie rób w ciemno

**Nigdy nie uzupełniaj brakujących odpowiedzi, punktów ani typu pytania „na czuja”.**

Gdy brakuje informacji albo pytanie jest niejednoznaczne:

1. **Zatrzymaj się** — nie generuj pełnego JSON od razu.
2. **Wypisz**, czego brakuje (lista punktowana).
3. **Zadaj konkretne pytania** — maks. 3–5 na raz, z propozycjami do wyboru.
4. **Dopiero po odpowiedzi** ułóż pytanie w JSON.

### Kiedy MUSISZ dopytać

| Sytuacja | Pytanie do użytkownika |
|----------|------------------------|
| Wielokrotny wybór bez wskazanej poprawnej | „Która odpowiedź jest prawidłowa — A/B/C/D?” |
| Familiada bez punktów | „Rozłożyć 100 pkt automatycznie (40/30/20/10…) czy podasz wagi?” |
| Szacowanie bez liczby | „Jaka jest prawidłowa wartość i sensowny zakres min–max?” |
| Szybka lista ON/ONA bez odpowiedzi | „Uzupełnić odpowiedzi teraz, czy zostawić puste (odpowiedź na żywo)?” |
| Nie wiadomo, quiz czy otwarte | „To ma być ABCD, odpowiedź ustna, czy familiada z listą?” |
| Pytanie ogólne („coś o muzyce”) | „Quiz z nagraniem, familiada ‚podaj tytuły’, czy szybka lista?” |

### Kiedy możesz użyć bezpiecznych domyślnych (bez pytania)

- `gameMode: "party"`, `disableTimePoints: true`
- `time: 0`, `speedrun: false`, `elimination: false`
- `correct: -1` dla typów bez auto-oceny (OPEN, LETTER, FAMILIADA, FAST_LIST, SHIPS)
- `defaultPoints: 10` (chyba że użytkownik poda inne)
- Auto-generacja `id` (np. `q_party_001`)
- Familiada: auto-rozkład 100 pkt, jeśli użytkownik napisał „standardowa familiada”

---

## 1. Tryb Party — jak działa gra

Party Quiz to **gra drużynowa na żywo** (nie telefony z punktacją automatyczną):

- Dwie drużyny (niebieska / czerwona).
- **Prowadzący** (admin) przyznaje punkty ręcznie po odpowiedzi ustnej.
- TV pokazuje pytanie; goście odpowiadają głośno.
- **Brak** speedrunu i eliminacji w Party.
- Buzzery działają dla: **FAMILIADA**, **LETTER**, **FAST_LIST**.

**Nie myl z trybem klasycznym Imprezja Quiz** (telefony, auto-punkty, speedrun) — ten dokument dotyczy **Party**.

---

## 2. Typy pytań — kiedy który wybrać

| Typ (klucz JSON) | Nazwa | Na kartce zwykle wygląda jak… | Kiedy użyć |
|------------------|-------|-------------------------------|------------|
| `QUIZ` | Quiz ABCD | Pytanie + 2–4 odpowiedzi, jedna poprawna | Wiedza, fakty, „kto wie?” |
| `MUSIC` | Muzyka | „Co to za utwór?” + opcje + plik audio | Rozpoznawanie muzyki |
| `ESTIMATION` | Szacowanie | „Ile / w którym roku / jaka odległość?” — liczba | Instynkt, liczby, lata |
| `OPEN` | Pytanie otwarte | Jedno pytanie, odpowiedź dowolna ustna | Skojarzenia, śmiech, kreatywność |
| `LETTER` | Pytanie z literą | „Podaj miasto/kraj/słowo na literę…” | Losowa litera, wiele odpowiedzi |
| `FAST_LIST` | Szybka lista | Seria krótkich pytań (np. ON/ONA, tak/nie) | Test zgodności, szybka seria |
| `FAMILIADA` | Familiada | „Podaj X rzeczy…” + lista odpowiedzi z punktami | Top 5–10 odpowiedzi z pulą |
| `SHIPS` | Statki | Gra w statki na planszy | Przerwa od quizu, element planszowy |

**Dla Party generuj tylko te 8 typów**, chyba że użytkownik wyraźnie prosi o inny.

---

## 3. Rozpoznawanie typu z luźnej kartki

### → `QUIZ`
- Jest **lista odpowiedzi** i wiadomo (lub można zapytać), która jest dobra.
- Przykład kartki: *„Ulubiony drink Pana Młodego? A) wódka B) piwo C) wino D) whisky”*

### → `MUSIC`
- Jak QUIZ, ale **trzeba odtworzyć nagranie** (ścieżka `audio`).
- Przykład: *„Fragment — który artysta?”*

### → `ESTIMATION`
- Odpowiedź to **liczba** (rok, waga, odległość, cena).
- Przykład: *„W którym roku się poznali?”*
- **Wymaga:** `correctValue`, `min`, `max` — **dopytaj**, jeśli brak.

### → `OPEN`
- Jedno pytanie, **bez sztywnej listy** odpowiedzi.
- Przykład: *„Jedno słowo: co kojarzy Wam się z dzisiejszym weselem?”*

### → `LETTER`
- Odpowiedzi zaczynają się od **wylosowanej litery**.
- Przykład: *„Podaj miasto w Polsce na wylosowaną literę”*

### → `FAST_LIST` (szybka lista)
- **Wiele krótkich pytań** pod jednym tytułem.
- Typowe formaty:
  - **ON / ONA** — *„Kto pierwszy powiedział Kocham Cię?”*
  - **Tak/Nie** — *„Czy byliście na randce w kinie?”*
  - **Krótka seria** — lista 10–40 pozycji do przeczytania z ekranu
- Każda pozycja: `{ "question": "...", "answer": "..." }`
- **Punkty:** stałe **5 pkt za pozycję** (nie konfigurowalne).
- Puste `answer` = OK — odpowiedź padnie **na żywo** (dopytaj, czy uzupełnić).

### → `FAMILIADA`
- Jedno pytanie + **lista ukrytych odpowiedzi** z punktami (suma zwykle ~100).
- Przykład kartki: *„Alkohol bez litery W w nazwie”* + lista: bimber 40, rum 30…
- Odpowiedzi to **obiekty** `{ "text": "...", "points": N }`, nie zwykłe stringi.

### → `SHIPS`
- Osobna gra — rzadko „wpada” z kartki; zwykle świadomy wybór prowadzącego.

---

## 4. Logika typów — co musi wiedzieć LLM

### 4.1 QUIZ / MUSIC

```json
{
  "type": "QUIZ",
  "question": "Jaki alkohol Pan Młody lubi najbardziej?",
  "answers": ["Wino", "Tequila", "Wódka", "Piwo"],
  "correct": 1,
  "time": 0,
  "speedrun": false,
  "elimination": false
}
```

- `correct` = **indeks od 0** (0 = pierwsza odpowiedź).
- MUSIC: dodatkowo wymagane `"audio": "/uploads/.../utwor.mp3"`.
- Admin wybiera kafelek A/B/C/D na TV i przyznaje punkty drużynie.

### 4.2 ESTIMATION (szacowanie)

```json
{
  "type": "ESTIMATION",
  "question": "W którym roku poznali się Państwo Młodzi?",
  "correctValue": 2014,
  "min": 1990,
  "max": 2030,
  "answers": [],
  "correct": -1
}
```

- Gracze mogą wpisać liczbę; admin podaje odpowiedź ustną.
- Admin widzi **podpowiedź odległości** (% w zakresie) — **tylko informacyjnie**.
- Punkty przyznaje **ręcznie** (flat), nie ma auto-punktacji za bliskość w kodzie Party.

### 4.3 OPEN / LETTER

- Brak listy odpowiedzi; `correct: -1`.
- LETTER: admin losuje literę; można przyznawać punkty **wielokrotnie** w jednym pytaniu.

### 4.4 FAST_LIST — szybka lista (ważne!)

```json
{
  "type": "FAST_LIST",
  "question": "ON / ONA — test zgodności",
  "fastListItems": [
    { "question": "Kto pierwszy powiedział 'Kocham Cię'?", "answer": "ON" },
    { "question": "Kto jest bardziej uparty?", "answer": "" }
  ],
  "answers": [],
  "correct": -1,
  "bgMusic": "/uploads/sfx/tlowyborcze.mp3"
}
```

**Przebieg na imprezie:**

1. TV pokazuje **pozycję** (pytanie z listy).
2. Para/drużyna odpowiada **ustnie**.
3. Admin: **POKAŻ ODP.** → TV pokazuje zapisaną odpowiedź (lub tekst „na żywo”).
4. Admin: **+5 pkt** niebieskim/czerwonym (opcjonalnie — można poprawić).
5. Admin: **NASTĘPNE** → kolejna pozycja.
6. **NASTĘPNE bez +5 = 0 pkt** za tę pozycję (to normalne, nie błąd).
7. Po ostatniej pozycji: **ZAKOŃCZ**.

**Nie myl z quizem ABCD** — szybka lista to **seria mini-pytań**, nie jedno pytanie z wieloma odpowiedziami.

**Typowe błędy LLM:**

- Wstawienie listy ON/ONA jako `answers: ["ON", "ONA"]` w QUIZ — **źle**.
- Ustawianie `points` na pytaniu — **ignorowane** (zawsze 5 pkt/pozycja).
- Blokowanie przejścia dalej — FAST_LIST **nie blokuje** innych pytań ani złotej listy.

### 4.5 FAMILIADA

```json
{
  "type": "FAMILIADA",
  "question": "Alkohol bez litery \"W\" w nazwie",
  "answers": [
    { "text": "Bimber", "points": 40 },
    { "text": "Rum", "points": 30 },
    { "text": "Tequila", "points": 20 },
    { "text": "Książki", "points": 10 }
  ],
  "correct": -1
}
```

**Przebieg:**

1. Drużyna zgaduje; admin **odkrywa** trafione odpowiedzi na TV.
2. **X / XX / XXX** — błędy drużyny (nie trzy osobne kliknięcia — ustawia liczbę).
3. **Pula (pot)** = suma punktów **już odkrytych** odpowiedzi.
4. Admin **przekazuje pulę** drużynie → pytanie zamknięte.
5. Po zamknięciu można jeszcze odkrywać resztę (bez zmiany wyniku).

**Konwencje:**

- Suma punktów ≈ **100** (ostrzeżenie, nie twardy błąd).
- Max **10 odpowiedzi** na pytanie.
- Odpowiedź z **0 pkt** jest dozwolona.

---

## 5. Struktura pliku quizu

### Plik główny

```json
{
  "gameMode": "party",
  "defaultPoints": 10,
  "disableTimePoints": true,
  "welcome": {
    "title": "Party Quiz",
    "subtitle": "ZARAZ ZACZYNAMY",
    "logoUrl": "/img/logo_imprezja.png"
  },
  "questions": [ /* pytania */ ],
  "thanksScreen": {
    "text": "Dziękujemy!"
  }
}
```

### Lista poboczna (side list)

- Flaga: `"partySideList": true` **lub** nazwa pliku: `SL - Nazwa listy.json`
- Osobna zakładka w adminie (np. test zgodności, złota lista).
- Może mieć własne `defaultPoints` (np. 5).

### Złota lista (Familiada)

- **Osobny plik:** `party-quiz-golden.json` (max **10 pytań** FAMILIADA).
- **Nie** wkładać do głównego pliku quizu.
- W edytorze: gwiazdka ★ przy pytaniu FAMILIADA → dodaje do złotej listy.

---

## 6. Przekształcanie pytań (transformacje)

### Z kartki → typ

| Tekst na kartce | Propozycja typu | Uwaga |
|-----------------|-----------------|-------|
| „Podaj 5 alkoholi…” | FAMILIADA | Dopytaj o listę + punkty |
| 20 pytań ON/ONA | FAST_LIST | Jeden blok `fastListItems` |
| „Ile waży tort?” | ESTIMATION | Potrzebna liczba + zakres |
| ABCD z jedną poprawną | QUIZ | Potrzebny indeks `correct` |
| „Co słychać?” + plik | MUSIC | Potrzebna ścieżka `audio` |
| Luźne pytanie bez opcji | OPEN lub LETTER | Dopytaj |

### Familiada (bank / stary format) → Party FAMILIADA

```json
// Wejście (bank familiady):
{ "question": "Co zabieramy do szkoły?", "answers": [{ "text": "Plecak", "points": 40 }] }

// Wyjście (Party):
{
  "type": "FAMILIADA",
  "question": "Co zabieramy do szkoły?",
  "time": 0,
  "speedrun": false,
  "elimination": false,
  "answers": [{ "text": "Plecak", "points": 40 }],
  "correct": -1
}
```

### QUIZ → OPEN

- Gdy odpowiedzi na kartce są **niekompletne** lub **subiektywne** — nie wymyślaj opcji; zmień na OPEN i **powiedz użytkownikowi dlaczego**.

### FAST_LIST → FAMILIADA

- Rzadko sensowne. Szybka lista = wiele **osobnych** pytań; familiada = **jedno** pytanie z wieloma odpowiedziami z puli.
- Jeśli użytkownik podał listę rzeczy do „podaj jak najwięcej” → FAMILIADA, nie FAST_LIST.

### Wiele pytań ON/ONA → jeden FAST_LIST

- **Scal** pod wspólnym tytułem (`"question": "ON / ONA — …"`).
- Każda linia kartki = jeden element `fastListItems`.

---

## 7. Workflow LLM — krok po kroku

```
1. Odbierz surowe pytania (tekst, foto kartki, lista).
2. Pogrupuj: które idą razem (np. cała szybka lista).
3. Dla każdej grupy: przypisz typ (sekcja 3).
4. Wypisz BRAKI (sekcja 0) → zadaj pytania.
5. Po odpowiedziach: zbuduj JSON (sekcja 5).
6. Self-check (sekcja 8).
7. Dostarcz plik + krótkie podsumowanie („3× QUIZ, 1× FAST_LIST 35 poz., …”).
```

### Przykład dobrego dopytywania

> Dostałem 12 pytań ON/ONA bez odpowiedzi.  
> **Plan:** jeden blok `FAST_LIST` „Test zgodności”.  
> **Potrzebuję od Ciebie:**  
> 1. Czy odpowiedzi uzupełniacie na żywo (zostawiam puste `answer`)?  
> 2. Czy tytuł listy ma brzmieć „ON / ONA — test zgodności” czy inaczej?  
> 3. Czy to ma być **osobna lista poboczna** (`SL - …`) czy część głównego quizu?

### Przykład złego zachowania (nie rób tak)

> ❌ Wymyślenie odpowiedzi ON/ONA bez pary młodej.  
> ❌ Ustawienie `correct: 0` w QUIZ bez podanej poprawnej.  
> ❌ Familiada ze stringami `"answers": ["Bimber", "Rum"]`.  
> ❌ Szacowanie bez `min`/`max`.  
> ❌ Ignorowanie pytania użytkownika i generowanie 50 pytań „na podobieństwo”.

---

## 8. Checklist przed oddaniem JSON

- [ ] `gameMode` = `"party"`
- [ ] Każde pytanie ma `type` **WIELKIMI** literami (`QUIZ`, nie `quiz`)
- [ ] QUIZ/MUSIC: `correct` to liczba 0–3 (lub 0–4 dla MUSIC), **nie** `-1`
- [ ] FAMILIADA: `answers` to tablica **obiektów** `{text, points}`
- [ ] FAST_LIST: jest `fastListItems` (≥1 pozycja), `answers: []`
- [ ] ESTIMATION: jest `correctValue`, `min`, `max`
- [ ] Brak wymyślonych odpowiedzi, których użytkownik nie podał (chyba że wyraźnie poprosił o propozycje)
- [ ] Ścieżki do mediów (`/uploads/...`) — tylko jeśli użytkownik je podał; inaczej **oznacz placeholder** i dopytaj
- [ ] Side list: `partySideList: true` lub prefix `SL -` w nazwie pliku

---

## 9. Tabela wymaganych pól (szybka ściąga)

| Typ | question | answers | correct | correctValue | min/max | fastListItems | audio |
|-----|----------|---------|---------|--------------|---------|---------------|-------|
| QUIZ | ✅ | ✅ stringi ≥2 | ✅ index | — | — | — | — |
| MUSIC | ✅ | ✅ stringi ≥2 | ✅ index | — | — | — | ✅ |
| ESTIMATION | ✅ | — | -1 | ✅ | ✅ | — | — |
| OPEN | ✅ | — | -1 | — | — | — | — |
| LETTER | ✅ | — | -1 | — | — | — | — |
| FAST_LIST | ✅ tytuł | [] | -1 | — | — | ✅ ≥1 | — |
| FAMILIADA | ✅ | ✅ obiekty ≥1 | -1 | — | — | — | — |
| SHIPS | ✅ | — | — | — | — | — | ships[] |

---

## 10. Przykładowy minimalny quiz (wiele typów)

Patrz w repozytorium: `public/party-quizzes/Party-Quiz-test-15.json`  
Szybka lista ON/ONA: `public/party-quizzes/Party-Quiz-test-zgodnosci-szybka-lista.json`  
Złota lista: `public/party-quizzes/party-quiz-golden.json`

---

## 11. Jak używać tego pliku w czacie z LLM

**Pobranie z aplikacji Imprezja Quiz:**

- Edytor Party Quiz → link „Instrukcja dla AI”
- Menu startowe ⚙️ → Poradniki → „Party Quiz — instrukcja dla AI”
- Bezpośredni URL: `/party-quiz/PARTY_QUIZ_LLM_INSTRUKCJA.md`

**Repozytorium / GitHub:** `docs/PARTY_QUIZ_LLM_INSTRUKCJA.md`

**Dla użytkownika (ChatGPT, Claude, Gemini itd.):** załącz ten plik do rozmowy lub wklej na początku:

> Stosuj załączoną instrukcję Party Quiz.  
> Mam pytania na kartce — najpierw dopytaj o braki, potem zbuduj JSON do edytora Imprezja Quiz.

**Cursor (IDE):** reguła `.cursor/rules/party-quiz-llm.mdc` — aktywna przy pracy w `public/party-quiz/` i plikach quizów.

---

*Wersja: Party Quiz / Imprezja Quiz — zgodność z edytorem i adminem w `public/party-quiz/`.*
