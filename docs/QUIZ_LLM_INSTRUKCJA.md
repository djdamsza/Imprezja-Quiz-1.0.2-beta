# Imprezja Quiz (klasyczny) — instrukcja dla modeli językowych

Uniwersalny przewodnik: jak zamienić **zwykłe pytania na kartce** w poprawny quiz **Imprezja Quiz (tryb klasyczny — telefony, auto-punkty)**.  
Docelowy format: plik JSON do edytora `/editor.html`.

**Nie myl z Party Quiz** (`/party-quiz/editor.html`) — tam gra drużynowa na żywo, inne typy (FAST_LIST, FAMILIADA w pliku Party). Ten dokument dotyczy **klasycznego quizu z telefonami**.

---

## 0. Zasada nadrzędna: dopytuj, nie rób w ciemno

**Nigdy nie uzupełniaj brakujących odpowiedzi, poprawnej opcji, liczb, ścieżek mediów ani typu pytania „na czuja”.**

Gdy brakuje informacji albo pytanie jest niejednoznaczne:

1. **Zatrzymaj się** — nie generuj pełnego JSON od razu.
2. **Wypisz**, czego brakuje (lista punktowana).
3. **Zadaj konkretne pytania** — maks. 3–5 na raz, z propozycjami do wyboru.
4. **Dopiero po odpowiedzi** ułóż pytanie w JSON.

### Kiedy MUSISZ dopytać

| Sytuacja | Pytanie do użytkownika |
|----------|------------------------|
| ABCD bez wskazanej poprawnej | „Która odpowiedź jest prawidłowa — A/B/C/D (indeks 0–3)?” |
| Dwie opcje — sonda czy quiz? | „To ma być **Głosowanie** (bez poprawnej) czy **Quiz** (jedna poprawna)?” |
| Szacowanie bez liczby | „Jaka jest prawidłowa wartość i zakres min–max?” |
| Muzyka bez pliku audio | „Masz plik audio do wgrania, czy na razie placeholder?” |
| Hot or Not / Foto bez obrazków | „Podaj ścieżki/URL obrazków A i B (lub wgraj w edytorze).” |
| Wyborczy / HNC bez zdjęć | „Ile zdjęć i jakie etykiety/opisy?” |
| Lista „podaj 5 rzeczy…” z punktami | „To brzmi jak **Familiada** (osobny tryb) — Familiada czy coś innego w quizie?” |
| Speedrun / eliminacja | „Włączyć speedrun lub eliminację przy tym pytaniu?” |

### Kiedy możesz użyć bezpiecznych domyślnych (bez pytania)

- `disableTimePoints: false` (punkty za czas włączone), chyba że użytkownik prosi o „tylko poprawność”
- `time: 30` (OPEN/QUIZ/VOTE), `45` dla LETTER, `15` dla WYBORCZY/HNC, `0` dla SHIPS
- `speedrun: false`, `elimination: false`
- `correct: -1` dla VOTE, VOTE_IMG, OPEN, LETTER, WYBORCZY, HNC (gdy brak poprawnej)
- Auto-generacja `id` (np. `q_173…`)
- Puste `thanksScreen` — aplikacja pokaże domyślne podziękowanie

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
| Liczba do zgadnięcia | ESTIMATION | min/max + correctValue |
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

> ❌ Wymyślanie poprawnej odpowiedzi bez wiedzy.  
> ❌ FAST_LIST / FAMILIADA w pliku klasycznego quizu.  
> ❌ HOT_OR_NOT bez `imageA`/`imageB`.  
> ❌ HNC z 6 zdjęciami (musi być 4, 8 lub 16).  
> ❌ MUSIC bez `audio`.

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
