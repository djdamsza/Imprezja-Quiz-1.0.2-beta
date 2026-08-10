# Imprezja Quiz (klasyczny) — instrukcja dla modeli językowych

Uniwersalny przewodnik: jak zamienić **zwykłe pytania na kartce** w poprawny quiz **Imprezja Quiz (tryb klasyczny — telefony, auto-punkty)**.  
Docelowy format: plik JSON do edytora `/editor.html`.

**Nie myl z Party Quiz** (`/party-quiz/editor.html`) — tam gra drużynowa na żywo, inne typy (FAST_LIST, FAMILIADA w pliku Party). Ten dokument dotyczy **klasycznego quizu z telefonami**.

---

## 0. Zasada nadrzędna: dopytuj o treść, resztę ustaw sam

**Nigdy nie wymyślaj treści pytań, odpowiedzi ABCD ani poprawnej opcji.**  
**Nie dopytuj o czas, punkty (poza Familiadą — osobny tryb) ani zakresy szacowania** — program to obsługuje.

### 0A. Kiedy MUSISZ dopytać

| Sytuacja | Pytanie do użytkownika |
|----------|------------------------|
| ABCD bez wskazanej poprawnej | „Która odpowiedź jest prawidłowa — A/B/C/D (indeks 0–3)?” |
| Dwie opcje — sonda czy quiz? | „**Głosowanie** (bez poprawnej) czy **Quiz** (jedna poprawna)?” |
| Szacowanie bez podanej liczby | „Jaka jest prawidłowa wartość?” (min/max **nie pytaj**) |
| Muzyka bez pliku audio | „Dodasz audio w edytorze, czy podasz ścieżkę?” |
| Hot or Not / Foto / Wyborczy / HNC bez mediów | „Potrzebuję plików graficznych (lub wgrasz w edytorze).” |
| Lista „podaj 5 rzeczy…” z punktami | Skieruj na **Familiadę** — to inny tryb |
| Speedrun / eliminacja | **Nie pytaj domyślnie** — tylko gdy użytkownik sam o to prosi |

### 0B. Czego NIE pytaj — ustaw sam

| Temat | Co robisz |
|-------|-----------|
| **Czas** (`time`) | Domyślnie wg typu (sekcja 0B) — **nie pytaj**. |
| **Punkty** | Aplikacja nalicza — **nie pytaj**. |
| **ESTIMATION min/max** | Wylicz sam — **nie pytaj**. |
| **Seria „kto…?” z odpowiedziami** | Party **FAST_LIST** → `/party-quiz/editor.html`. |

### 0C. Język polski (QUIZ / odpowiedzi ABCD)

Popraw oczywiste braki polskich znaków i wielkie litery w tytułach (serialach, miastach). Pod JSON (lub pod plikiem quizu) wypisz **`### Poprawki językowe`** — jak w Party Quiz (`PARTY_QUIZ_LLM_INSTRUKCJA.md`, sekcja 0D).

### 0D. Bezpieczne domyślne

- `disableTimePoints: false` (chyba że user: „tylko poprawność”)
- `time`: QUIZ/VOTE/OPEN **30 s**, LETTER **45 s**, WYBORCZY/HNC **15 s**, SHIPS **0** — **nie pytaj**
- `speedrun: false`, `elimination: false`
- `correct: -1` dla VOTE, VOTE_IMG, OPEN, LETTER, WYBORCZY, HNC
- Auto-generacja `id`
- Pod JSON: **`### Poprawki językowe`**

---

## 1. Tryb klasyczny — jak działa gra

- Goście łączą się **telefonami** (QR / link).
- Odpowiadają w aplikacji; **punkty naliczane automatycznie** (z bonusem za czas, speedrunem itd.).
- Prowadzący steruje z **admina** i **ekranu TV**.
- Opcja globalna: **Wyłącz punkty za czas** — wtedy tylko poprawność (100 pkt za dobrą odpowiedź w QUIZ/Muzyka).

---

## 2. Typy pytań — kiedy który wybrać

| Typ (klucz JSON) | Nazwa w edytorze | Na kartce zwykle… | Kiedy użyć |
|------------------|------------------|-------------------|------------|
| `QUIZ` | Quiz (wielokrotny) | Pytanie + 2–4 odp., jedna poprawna | Wiedza, ABCD |
| `MUSIC` | Muzyka | „Co to za utwór?” + opcje + audio | Rozpoznawanie muzyki (**5 odpowiedzi**) |
| `VOTE` | Głosowanie | „Co wolicie: A czy B?” bez poprawnej | Sonda, ankieta |
| `VOTE_IMG` | Foto Głos | Jak VOTE + obrazek | Głosowanie wizualne |
| `HOT_OR_NOT` | Hot or Not | Dwa obrazki — wybór A/B | Porównania wizualne |
| `ESTIMATION` | Szacowanie | „Ile / w którym roku?” — liczba | Instynkt liczbowy |
| `OPEN` | Pytanie otwarte | Dowolny krótki tekst od graczy | Chmura słów, kreatywność |
| `LETTER` | Pytanie z literą | Słowo na wylosowaną literę | Kreatywność, śmiech |
| `SHIPS` | Statki | Gra w statki | Przerwa, element planszowy |
| `WYBORCZY` | Wyborczy | Show ze zdjęciami + muzyka tła | Efekt telewizyjny |
| `HNC` | Hot or Not Champ. | Turniej 4 / 8 / 16 zdjęć | Finał na obrazkach |

**Nie generuj** typów Party-only: `FAST_LIST`, `FAMILIADA` (w pliku Party) — skieruj użytkownika na Party Quiz lub Familiadę.

---

## 3. Rozpoznawanie typu z luźnej kartki

### → `QUIZ`
- Lista odpowiedzi, **jedna poprawna**.
- *„Stolica Polski? a) Kraków b) Warszawa c) Gdańsk”*

### → `MUSIC`
- Jak QUIZ + **nagranie** (`audio`). Edytor domyślnie **5 slotów** odpowiedzi.

### → `VOTE` / `VOTE_IMG`
- **Dwie** opcje, **brak** oficjalnie poprawnej (`correct: -1`).
- VOTE_IMG: jeden obrazek przy pytaniu (`media` / `image`).

### → `HOT_OR_NOT`
- **Dwa obrazki** obok siebie (`imageA`, `imageB` + miniatury `imageSmallA/B`).
- Etykiety w `answers: ["Opcja A", "Opcja B"]`.
- Opcjonalnie `correct` (0 lub 1) — wtedy punkty jak w quizie z bonusem za czas.

### → `ESTIMATION`
- Odpowiedź to **liczba** — wymaga `correctValue`, `min`, `max`.

### → `OPEN` / `LETTER`
- Brak listy ABCD; gracze wpisują tekst.
- LETTER: admin losuje literę w panelu (nie ustawiaj `letterCount` w JSON — wybór w adminie).

### → `SHIPS`
- Konfiguracja statków na planszy (`ships[]`) — zwykle tworzone w edytorze wizualnym; z kartki rzadko.

### → `WYBORCZY`
- Minimum **2 zdjęcia** w `photos: [{ url, label }]`, muzyka tła `bgMusic`, `time: 15`, bez speedrun/elimination.

### → `HNC`
- Dokładnie **4, 8 lub 16** zdjęć w `photos: [{ url, desc }]`, turniej pucharowy na TV.

---

## 4. Logika typów — pola JSON

### 4.1 QUIZ

```json
{
  "type": "QUIZ",
  "question": "Jaka jest stolica Francji?",
  "time": 20,
  "speedrun": false,
  "elimination": false,
  "answers": ["Londyn", "Berlin", "Paryż", "Madryt"],
  "correct": 2,
  "media": "/uploads/obrazek.webp",
  "image": "/uploads/obrazek.webp",
  "imageSmall": "/uploads/obrazek-thumb.webp"
}
```

- `correct` = **indeks od 0**.
- Obrazek opcjonalny (zalecany na imprezach).
- **Punkty:** poprawna = 100 + bonus za czas (max +100), chyba że `disableTimePoints: true` → tylko 100.

### 4.2 MUSIC

- Jak QUIZ, ale **5 odpowiedzi** i wymagane `"audio": "/uploads/.../utwor.mp3"`.
- `media`/`image` opcjonalne (okładka).

### 4.3 VOTE / VOTE_IMG

```json
{
  "type": "VOTE",
  "question": "Piwo czy wino?",
  "answers": ["Piwo", "Wino"],
  "correct": -1,
  "time": 25
}
```

- **100 pkt** za udział (głos).
- Jeśli ustawisz `correct: 0` lub `1` — punkty tylko za wybraną opcję (+ bonus za czas).

### 4.4 HOT_OR_NOT

```json
{
  "type": "HOT_OR_NOT",
  "question": "Który styl wolicie?",
  "answers": ["Styl A", "Styl B"],
  "imageA": "/uploads/a.webp",
  "imageB": "/uploads/b.webp",
  "imageSmallA": "/uploads/a-thumb.webp",
  "imageSmallB": "/uploads/b-thumb.webp",
  "correct": -1
}
```

### 4.5 ESTIMATION

```json
{
  "type": "ESTIMATION",
  "question": "Ile waży średni samochód (kg)?",
  "correctValue": 1500,
  "min": 800,
  "max": 2500,
  "answers": [],
  "time": 30
}
```

- **Auto-punkty** wg odległości od poprawnej wartości (100 przy trafieniu, 0 przy odchyleniu ≥50%).
- **`min` / `max`:** wylicz sam — nie pytaj użytkownika (sekcja 0B).

### 4.6 OPEN / LETTER

- `answers: []` lub brak; `correct` nieużywane.
- OPEN: dogrywka TAK/NIE w adminie (bez punktów za dogrywkę).
- LETTER: `time: 45`, speedrun i elimination **wyłączone** w JSON.

### 4.7 SHIPS

- `time: 0`, `ships: [{ row, col, size, orientation }, …]` — najlepiej edytować w UI edytora.

### 4.8 WYBORCZY

```json
{
  "type": "WYBORCZY",
  "question": "Kto zostaje?",
  "time": 15,
  "bgMusic": "/uploads/sfx/tlowyborcze.mp3",
  "photos": [
    { "url": "/uploads/osoba1.webp", "label": "Anna" },
    { "url": "/uploads/osoba2.webp", "label": "Basia" }
  ],
  "answers": [],
  "correct": -1
}
```

### 4.9 HNC (Hot or Not Champion)

- `photos` — **dokładnie 4, 8 lub 16** elementów z `url` i `desc`.
- Turniej na ekranie — bez ABCD.

---

## 5. Speedrun i eliminacja

| Opcja | Działanie | Kiedy pytać |
|-------|---------|-------------|
| **speedrun** | Top 10 najszybszych z poprawną: 1000→100 pkt; reszta poprawnych: 50 | Tylko QUIZ, MUSIC, VOTE, VOTE_IMG, HOT_OR_NOT, ESTIMATION |
| **elimination** | Zła odpowiedź = gracz odpada (wynik zerowany) | Jak wyżej — **nie** dla LETTER, SHIPS, WYBORCZY, HNC |

**Nie włączaj** speedrun/elimination bez potwierdzenia użytkownika na imprezie towarzyskiej.

---

## 6. Struktura pliku quizu

```json
{
  "disableTimePoints": false,
  "questions": [ /* pytania */ ],
  "thanksScreen": {
    "text": "Dziękujemy za grę!",
    "image": "/uploads/koniec.webp"
  }
}
```

- Pliki zapisywane w folderze quizów aplikacji (`public/quizzes/` w repozytorium).
- `thanksScreen` opcjonalny — puste = domyślny ekran końcowy.

---

## 7. Przekształcanie pytań

| Tekst na kartce | Propozycja | Uwaga |
|-----------------|------------|-------|
| ABCD z jedną poprawną | QUIZ lub MUSIC | Dopytaj o poprawną |
| „Co wolicie?” 2 opcje | VOTE | `correct: -1` |
| Lista rzeczy z punktami 40/30/20 | **Familiada**, nie ten quiz | Osobny plik `/familiada/editor.html` |
| ON/ONA wiele pytań | **Party Quiz FAST_LIST** | Nie klasyczny quiz |
| Luźne skojarzenie | OPEN | |
| Liczba do zgadnięcia | ESTIMATION | min/max sam z `correctValue` |
| Seria „kto…?” z odpowiedziami | Party **FAST_LIST** | Nie ten edytor |
| Dwa zdjęcia „które ładniejsze” | HOT_OR_NOT | Potrzebne pliki graficzne |

### Quiz ABCD → VOTE
- Gdy **nie ma** poprawnej odpowiedzi (subiektywne) — zmień na VOTE i **wyjaśnij użytkownikowi**.

### Familiada → klasyczny quiz
- **Nie konwertuj** automatycznie — to inny tryb gry (buzzery, drużyny, pula punktów).

---

## 8. Workflow LLM — krok po kroku

```
1. Odbierz surowe pytania.
2. Ustal: klasyczny quiz (ten dokument) vs Party vs Familiada.
3. Dla każdego pytania: przypisz typ.
4. Wypisz braki → dopytaj.
5. Zbuduj JSON + self-check.
6. Podsumuj (np. „8× QUIZ, 2× VOTE, 1× ESTIMATION”).
```

### Przykład dobrego dopytywania

> Mam 6 pytań ABCD, ale przy 2. nie widać poprawnej odpowiedzi.  
> **Potrzebuję:**  
> 1. Która odpowiedź jest dobra w pytaniu 2?  
> 2. Czy włączyć speedrun przy pytaniu 5 („kto pierwszy”)?  
> 3. Pytanie 4 — to sonda (VOTE) czy quiz z poprawną?

### Antywzorce (nie rób tak)

> ❌ „Ile sekund na odpowiedź?” — ustaw domyślny `time` (30 s itd.).  
> ❌ „Podaj min/max do szacowania” — wylicz sam.  
> ❌ „Ile punktów?” — program nalicza automatycznie.  
> ❌ FAST_LIST / test zgodności w pliku klasycznego quizu — to Party Quiz.  
> ❌ Wymyślanie poprawnej odpowiedzi ABCD.

---

## 9. Checklist przed oddaniem JSON

- [ ] Każde pytanie ma `type` **WIELKIMI** literami
- [ ] QUIZ/MUSIC: `correct` = indeks 0-based, ≥2 odpowiedzi
- [ ] MUSIC: `audio` ustawione; do 5 odpowiedzi
- [ ] VOTE/VOTE_IMG: dokładnie 2 odpowiedzi
- [ ] ESTIMATION: `correctValue`, `min`, `max`; min < max
- [ ] HOT_OR_NOT: `imageA` + `imageB`
- [ ] WYBORCZY: ≥2 `photos`
- [ ] HNC: 4, 8 lub 16 `photos`
- [ ] SHIPS: co najmniej 1 statek w `ships`
- [ ] Brak wymyślonych treści bez zgody użytkownika
- [ ] Ścieżki `/uploads/...` tylko gdy podane — inaczej placeholder + pytanie

---

## 10. Tabela wymaganych pól (ściąga)

| Typ | question | answers | correct | correctValue | min/max | audio | imageA/B | photos |
|-----|----------|---------|---------|--------------|---------|-------|----------|--------|
| QUIZ | ✅ | ✅ ≥2 stringi | ✅ index | — | — | — | opcj. media | — |
| MUSIC | ✅ | ✅ ≥2 (do 5) | ✅ index | — | — | ✅ | opcj. | — |
| VOTE | ✅ | ✅ 2 | -1 (domyślnie) | — | — | — | opcj. | — |
| VOTE_IMG | ✅ | ✅ 2 | -1 | — | — | — | ✅ media | — |
| HOT_OR_NOT | ✅ | ✅ 2 | -1 lub 0/1 | — | — | — | ✅ A+B | — |
| ESTIMATION | ✅ | — | — | ✅ | ✅ | — | opcj. | — |
| OPEN | ✅ | — | — | — | — | — | opcj. | — |
| LETTER | ✅ | — | — | — | — | — | opcj. | — |
| SHIPS | ✅ | — | — | — | — | — | — | ships[] |
| WYBORCZY | ✅ | [] | -1 | — | — | bgMusic | — | ✅ ≥2 |
| HNC | ✅ | [] | -1 | — | — | — | — | ✅ 4/8/16 |

---

## 11. Przykłady w repozytorium

- `public/quizzes/Quiz wiedza ogólna.json` — mix typów
- Poradnik użytkownika: `/poradniki/rodzaje-pytan.html`

---

## 12. Jak używać tego pliku

**Pobranie z aplikacji:**

- Edytor quizów → link „Instrukcja dla AI”
- Menu startowe ⚙️ → Poradniki → „Quiz — instrukcja dla AI”
- URL: `/QUIZ_LLM_INSTRUKCJA.md`

**Repozytorium:** `docs/QUIZ_LLM_INSTRUKCJA.md`

**Prompt dla ChatGPT / Claude:**

> Stosuj załączoną instrukcję **klasycznego** Imprezja Quiz.  
> Mam pytania na kartce — najpierw dopytaj o braki, potem zbuduj JSON do `/editor.html`.

**Cursor:** reguła `.cursor/rules/quiz-llm.mdc` — przy pracy w `public/editor.html`, `public/quizzes/`.

---

*Wersja: Imprezja Quiz (klasyczny) — zgodność z edytorem `/editor.html` i panelem admina.*
