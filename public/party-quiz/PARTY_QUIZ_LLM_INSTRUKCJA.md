# Party Quiz — instrukcja dla modeli językowych

Uniwersalny przewodnik: jak zamienić **zwykłe pytania na kartce** w poprawny quiz **Imprezja Quiz (tryb Party)**.  
Docelowy format: plik JSON do edytora `/party-quiz/editor.html`.

---

## 0. Zasada nadrzędna: dopytuj o treść, resztę ustaw sam

**Nigdy nie wymyślaj treści pytań, odpowiedzi ABCD ani poprawnej opcji „na czuja”.**  
**Nie dopytuj o rzeczy, które program ustawia sam** (czas, punkty poza Familiadą, zakresy szacowania, FAST_LIST vs test zgodności).

Gdy brakuje **merytorycznych** informacji:

1. **Zatrzymaj się** — nie generuj pełnego JSON od razu.
2. **Wypisz**, czego brakuje (tylko treść / poprawna ABCD / brakujące odpowiedzi na liście).
3. **Zadaj konkretne pytania** — maks. 3–5 na raz.
4. **Dopiero po odpowiedzi** ułóż JSON; resztę parametrów uzupełnij według sekcji 0B.

### 0A. Kiedy MUSISZ dopytać

| Sytuacja | Pytanie do użytkownika |
|----------|------------------------|
| ABCD bez wskazanej poprawnej | „Która odpowiedź jest prawidłowa — A/B/C/D?” |
| Familiada bez listy odpowiedzi | „Jakie odpowiedzi mają być na tablicy?” |
| Brak treści pytania lub pustych odpowiedzi | „Uzupełnij brakujące sformułowanie / listę.” |
| Nie wiadomo, quiz czy lista rzeczy | „ABCD, czy familiada (podaj X rzeczy)?” |
| Muzyka — brak pliku i brak możliwości późniejszego wgrania | „Potrzebuję pliku audio (lub dodasz w edytorze po JSON)?” |
| Pytanie ogólne bez żadnej treści | „Podaj chociaż szkic pytania i oczekiwany format.” |

### 0B. Czego NIE pytaj — ustaw sam (domyślne)

| Temat | Co robisz |
|-------|-----------|
| **Czas na odpowiedź** (`time`) | **Nie pytaj.** W Party ustaw `time: 0` — tempo prowadzi admin; edytor ma sensowne domyślne, jeśli kiedyś ustawisz inaczej. |
| **Punkty** (QUIZ, OPEN, ESTIMATION, FAST_LIST…) | **Nie pytaj.** Party: `defaultPoints: 10`, FAST_LIST: **5 pkt/pozycja** (stałe w programie), resztę przyznaje admin na żywo. |
| **Punkty Familiady** | **Nie pytaj.** Zawsze **rozdziel 100 pkt automatycznie** presetem jak w edytorze (przycisk „Rozdziel automatycznie”): 5 odp. → 30/25/20/15/10, 4 odp. → 40/30/20/10 itd. (sekcja 4.5). Kolejność odpowiedzi = od najwyżej punktowanej (pierwsza na liście = najwięcej pkt), chyba że użytkownik **jawnie** podał wagi. |
| **ESTIMATION — min / max** | **Nie pytaj.** Oblicz sensowny zakres z `correctValue` (sekcja 4.2). |
| **FAST_LIST vs test zgodności vs OPEN** | **Nie pytaj.** Stosuj reguły sekcji 3 i 3B. |
| **ON/ONA vs imiona (Julia/Marcel)** | **Nie pytaj.** W `answer` wpisuj **to, co podał użytkownik** (imiona, ON, ONA, Tak/Nie). |
| **Side list (`SL -`)** | Użyj tylko gdy użytkownik **wyraźnie** napisał „test zgodności” / „lista boczna SL” — inaczej FAST_LIST w głównym pliku. |

### 0C. Bezpieczne domyślne (zawsze OK)

- `gameMode: "party"`, `disableTimePoints: true`
- `time: 0`, `speedrun: false`, `elimination: false`
- `correct: -1` dla OPEN, LETTER, FAMILIADA, FAST_LIST, SHIPS, ESTIMATION
- `defaultPoints: 10`
- Auto-generacja `id`
- Familiada: **zawsze** auto-rozkład 100 pkt (preset edytora)

### 0D. Język polski — poprawiaj sam i **wypisuj zmiany pod JSON**

Przed oddaniem pliku **popraw pisownię** w treściach z kartki (ortografia, **ą, ć, ę, ł, ń, ó, ś, ź, ż**, wielkie litery w nazwach własnych, `m²`, `(kg)`, cudzysłowy „…”).

**Nie pytaj** użytkownika o każdą literkę — popraw i **pod JSONem** dodaj sekcję:

```markdown
### Poprawki językowe (względem kartki)

- Pyt. 3 FAST_LIST: „kocham cie” → „kocham cię”
- Pyt. 5 QUIZ: „supernatural” → „Supernatural” (tytuł serialu)
- Szacowanie: „m2” → „m²” w treści pytania
```

**Zasady:**
- Poprawiaj **tylko** oczywiste błędy i brak polskich znaków — **nie** przepisuj sensu ani nie dodawaj treści.
- Imiona własne (**Julia**, **Marcel**, **Dziwnów**) — wielką literą.
- Wulgaryzmy / styl mowy pary — **zostaw** (np. „Ja p*erdole…”), chyba że oczywista literówka.
- Jeśli **nic nie zmieniałeś** — napisz: `### Poprawki językowe — brak (tekst z kartki bez zmian).`

### 0E. Familiada — kolejność odpowiedzi **ma znaczenie**

| Sytuacja | Co robisz |
|----------|-----------|
| Użytkownik podał **tylko listę** odpowiedzi (bez punktów) | Ułóż odpowiedzi od **najbardziej popularnej** → najmniej. **Pierwsza** na liście dostaje **najwięcej pkt** (preset 100: np. 30 przy 5 odpowiedziach). |
| Użytkownik podał **punkty przy odpowiedziach** (np. „randka - 40”) | **Zachowaj podane punkty** i kolejność — nie przesortowuj. |
| Użytkownik podał listę **w kolejności ważności** na kartce | Traktuj kolejność kartki jako ranking → nałóż preset malejąco. |
| Losowa kolejność na kartce | Ułóż sensownie (najpewniejsza / najzabawniejsza odpowiedź pierwsza) i nałóż preset — **nie pytaj**. |

**Nie mieszaj:** nie ustawiaj 30 pkt na ostatniej odpowiedzi, jeśli auto-rozkładasz preset — **zawsze** 1. pozycja = max punktów.

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
| `FAST_LIST` | Szybka lista | Seria krótkich pytań (kto?, tak/nie, imiona…) | Seria pytań z zapisaną odpowiedzią (sekcja 3B) |
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
- Odpowiedź to **liczba** (rok, waga, powierzchnia, cena).
- **Wymaga:** `correctValue` — **dopytaj tylko**, jeśli użytkownik nie podał liczby.
- **`min` / `max` — ustaw sam**, nie pytaj. Zasady:
  - Powierzchnia / waga / odległość dodatnia: `min` ≈ 40–60% wartości, `max` ≈ 150–250% (np. 50 m² → min 25, max 100).
  - Rok: ±15–25 lat od `correctValue`.
  - Zaokrąglij do „ładnych” liczb (5, 10, 100).

### → `OPEN`
- Jedno pytanie, odpowiedź **ustna**, bez sztywnej listy w JSON.
- **Jeśli użytkownik podał oczekiwaną odpowiedź** („kto pierwszy… — Julia”) → to **nie OPEN**, tylko pozycja **FAST_LIST** (znana odpowiedź w `answer`).
- OPEN tylko gdy odpowiedź jest **otwarta** (wiele możliwych, śmiech, skojarzenia) albo użytkownik wyraźnie chce typ OPEN.

### → `LETTER`
- Odpowiedzi zaczynają się od **wylosowanej litery**.
- Przykład: *„Podaj miasto w Polsce na wylosowaną literę”*

### → `FAST_LIST` (szybka lista) — sekcja 3B

### → `FAMILIADA`
- Jedno pytanie + **lista ukrytych odpowiedzi** z punktami (suma zwykle ~100).
- Przykład kartki: *„Alkohol bez litery W w nazwie”* + lista: bimber 40, rum 30…
- Odpowiedzi to **obiekty** `{ "text": "...", "points": N }`, nie zwykłe stringi.

### → `SHIPS`
- Osobna gra — rzadko „wpada” z kartki; zwykle świadomy wybór prowadzącego.

---

## 3B. FAST_LIST a „test zgodności” — nie pytaj, stosuj reguły

To **najczęstszy błąd modeli** (np. Gemini): długie dopytywanie zamiast zbudowania JSON.

### Pojęcia

| Pojęcie | Co to jest |
|---------|------------|
| **`FAST_LIST`** | **Typ techniczny** w JSON — seria mini-pytań w `fastListItems[]`. |
| **Test zgodności** | **Motyw / scenariusz** imprezy (para odpowiada „w sync”). Często realizowany jako `FAST_LIST`, ale **to nie osobny typ JSON**. |
| **Lista boczna `SL - …`** | Osobny plik quizu z `partySideList: true` — zakładka obok głównej gry. Używaj **tylko**, gdy użytkownik **wyraźnie** prosi o „test zgodności”, „listę boczną SL” albo „osobną zakładkę”. |

### Reguły decyzyjne (bez dopytywania)

1. **Wiele krótkich pytań** typu „kto…?”, „kto więcej…?” z **podanymi odpowiedziami** → **jeden blok `FAST_LIST`**, scal pozycje.
2. **Nie wiadomo, OPEN czy FAST_LIST** → **FAST_LIST**, jeśli jest oczekiwana konkretna odpowiedź (imiona, ON/ONA, Tak/Nie); **OPEN**, jeśli odpowiedź jest otwarta (opowieść, wiele słów).
3. **Nie wiadomo, FAST_LIST czy test zgodności** → **FAST_LIST w głównym pliku** (domyślnie). Side list tylko przy wyraźnej prośbie.
4. **Odpowiedź w polu `answer`:** dokładnie to, co podał użytkownik — `Julia`, `Marcel`, `ON`, `ONA`, `Tak` — **nie zamieniaj** imion na ON/ONA bez prośby.
5. **Tytuł bloku** (`question` przy FAST_LIST): np. `"Kto pierwszy? — szybka lista"` lub `"ON / ONA"` — tylko gdy na kartce jest ON/ONA albo użytkownik tak nazwał; inaczej neutralny tytuł („Pytania o parze”).
6. **Puste `answer`** — OK, gdy użytkownik nie podał odpowiedzi dla pozycji (odpowiedź na żywo); **nie pytaj**, czy uzupełniać.
7. **Punkty** — zawsze **5 pkt/pozycja** w programie; nie ustawiaj własnych wag.

### Przykład (z kartki weselnej)

Wejście:
- „Kto pierwszy powiedział kocham cię?” → Julia  
- „Kto więcej pije?” → Julia  
- „Kto częściej pisał listy?” → Marcel  

Wyjście — **jeden** FAST_LIST (bez pytania użytkownika):

```json
{
  "type": "FAST_LIST",
  "question": "Pytania o parze — szybka lista",
  "fastListItems": [
    { "question": "Kto pierwszy powiedział «kocham cię»?", "answer": "Julia" },
    { "question": "Kto więcej pije?", "answer": "Julia" },
    { "question": "Kto częściej pisał listy miłosne?", "answer": "Marcel" }
  ],
  "answers": [],
  "correct": -1,
  "time": 0
}
```

Gdy użytkownik napisze: *„zrób test zgodności jako listę boczną”* → ten sam JSON + `"partySideList": true` + nazwa pliku `SL - Test zgodności.json`.

### FAST_LIST — składnia przypomnienie

- **Wiele krótkich pytań** pod jednym tytułem.
- Każda pozycja: `{ "question": "...", "answer": "..." }`.
- **Nie** wstawiaj serii jako `answers: ["ON", "ONA"]` w QUIZ.

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
- **`min` / `max`:** ustaw sam według sekcji 3 (ESTIMATION). Przykład: 50 m² → `min: 25`, `max: 100`; 134 kg razem → `min: 80`, `max: 200`.

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

- **Kolejność odpowiedzi ma znaczenie** (sekcja 0E): przy auto-punktach **pierwsza** odpowiedź = **najwyżej punktowana**; przy punktach z kartki — użyj **dokładnie** podanych wag.
- **Punkty — zawsze generuj sam**, jeśli user nie podał wag: preset edytora (suma 100), **nie pytaj**.
- Presety (identyczne jak „Rozdziel automatycznie” w edytorze):

| Liczba odp. | Rozkład punktów |
|-------------|-----------------|
| 2 | 60, 40 |
| 3 | 50, 33, 17 |
| 4 | 40, 30, 20, 10 |
| 5 | 30, 25, 20, 15, 10 |
| 6 | 25, 21, 18, 15, 12, 9 |
| 7–10 | jak w edytorze Familiady / Party |

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
| „Podaj 5 alkoholi…” | FAMILIADA | Auto 100 pkt; nie pytaj o wagi |
| 3+ pytań „kto…?” z odpowiedziami | FAST_LIST | Scal; nie pytaj OPEN vs FAST_LIST |
| Wyraźnie „test zgodności SL” | FAST_LIST + `partySideList` | Plik `SL - …` |
| „Ile waży tort?” + liczba | ESTIMATION | min/max sam |
| ABCD z jedną poprawną | QUIZ | Dopytaj tylko o poprawną, jeśli brak |
| „Co słychać?” + plik | MUSIC | Placeholder audio tylko jeśli brak pliku |
| Luźne pytanie bez podanej odp. | OPEN | Znaną odp. → FAST_LIST |

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
2. Pogrupuj: FAST_LIST (serie „kto…”), Familiada, reszta.
3. Dla każdej grupy: przypisz typ (sekcja 3, 3B).
4. Dopytaj **tylko** o braki merytoryczne (sekcja 0A).
5. Uzupełnij czas/punkty/min-max sam (sekcja 0B).
6. Zbuduj JSON (sekcja 5).
7. Self-check (sekcja 8).
8. **Popraw język polski** (sekcja 0D).
9. Dostarcz: **JSON** + sekcja **„Poprawki językowe”** pod spodem + krótkie podsumowanie typów.
```

### Format odpowiedzi LLM (obowiązkowy)

```
[tu pełny JSON]

### Poprawki językowe (względem kartki)
- …

### Podsumowanie
2× FAMILIADA, 2× ESTIMATION, 1× FAST_LIST (6 poz.), 4× QUIZ
```

### Przykład dobrego zachowania

> Mam 2× Familiada (po 5 odp.), 2× szacowanie (50 m², 134 kg), 3 pytania „kto…?”, 4× QUIZ.  
> **Robię od razu:** Familiada z presetem 30/25/20/15/10; szacowanie z min/max; 3× „kto…?» → jeden FAST_LIST z imionami; QUIZ z `time: 0`.  
> **Pytam tylko**, jeśli przy QUIZ brakuje poprawnej odpowiedzi.

### Przykład złego zachowania (nie rób tak — wzorowane na błędach Gemini)

> ❌ „Proszę podać punktację do familiady…” — **sam** rozdziel 100 pkt.  
> ❌ „Ile sekund na QUIZ?” — **nie pytaj**, `time: 0` w Party.  
> ❌ „Czy OPEN czy FAST_LIST / ON czy imiona?” — **sam** wybierz FAST_LIST + imiona z kartki.  
> ❌ „Podaj min/max do szacowania” — **sam** oblicz z `correctValue`.  
> ❌ Wymyślenie odpowiedzi bez kartki.  
> ❌ Familiada ze stringami `"answers": ["Bimber", "Rum"]`.

---

## 8. Checklist przed oddaniem JSON

- [ ] `gameMode` = `"party"`
- [ ] Każde pytanie ma `type` **WIELKIMI** literami (`QUIZ`, nie `quiz`)
- [ ] QUIZ/MUSIC: `correct` to liczba 0–3 (lub 0–4 dla MUSIC), **nie** `-1`
- [ ] FAMILIADA: `answers` to obiekty `{text, points}`; suma ≈ 100
- [ ] FAMILIADA: kolejność = ranking (1. = max pkt) **lub** punkty z kartki bez zmian
- [ ] Pod JSONem: sekcja **„Poprawki językowe”**
- [ ] FAST_LIST: `fastListItems` (≥1); serie „kto…?» scalone; `answers: []`
- [ ] ESTIMATION: `correctValue` + **sam** wyliczone `min`, `max`
- [ ] **Nie** pytano o czas, punkty (poza jawnymi wagami od usera), min/max, FAST_LIST vs OPEN
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
