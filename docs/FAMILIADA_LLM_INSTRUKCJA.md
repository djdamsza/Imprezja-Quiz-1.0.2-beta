# Familiada — instrukcja dla modeli językowych

Uniwersalny przewodnik: jak zamienić **zwykłe pytania na kartce** w poprawną listę pytań **Familiada (Imprezja Quiz)**.  
Docelowy format: plik JSON do edytora `/familiada/editor.html`.

**Nie myl z:**

- **Party Quiz** — hybryda z typem `FAMILIADA` w pliku Party (`/party-quiz/editor.html`)
- **Klasycznym quizem** — telefony, ABCD (`/editor.html`)

Ten dokument dotyczy **osobnego trybu Familiada** (buzzery, drużyny niebieska/czerwona, pula punktów).

---

## 0. Zasada nadrzędna: dopytuj, nie rób w ciemno

**Nigdy nie wymyślaj odpowiedzi, punktów ani kolejności ważności „na czuja”.**

Gdy brakuje informacji:

1. **Zatrzymaj się** — nie generuj pełnego JSON.
2. **Wypisz braki** (pytanie, odpowiedzi, punkty).
3. **Zadaj 3–5 konkretnych pytań** z propozycjami.
4. **Po odpowiedzi** zbuduj JSON.

### Kiedy MUSISZ dopytać

| Sytuacja | Pytanie do użytkownika |
|----------|------------------------|
| Lista odpowiedzi bez punktów | „Rozłożyć 100 pkt automatycznie (40/30/20/10…) czy podasz wagi?” |
| Niepełna lista (np. „3 alkohole” bez nazw) | „Podaj pełne odpowiedzi — nie uzupełniam sam.” |
| Nie wiadomo, która odpowiedź „najpopularniejsza” | „Która odpowiedź ma najwięcej punktów (pierwsze miejsce)?” |
| Pytanie ogólne bez listy | „Jakie konkretne odpowiedzi mają być na tablicy (5–10 pozycji)?” |
| Tekst jak quiz ABCD | „To ma być Familiada (lista z punktami) czy quiz telefoniczny ABCD?” |
| Import z XML/tekstu niejednoznaczny | „Potwierdź podział: pytanie X ma odpowiedzi A, B, C…?” |

### Kiedy możesz użyć domyślnych (bez pytania)

- Auto-rozkład **100 pkt** (malejąco: 40/30/20/10 dla 4 odp., presety edytora dla 2–10 odp.) — gdy użytkownik napisał „standardowa familiada” / „rozdziel automatycznie”
- Kolejność odpowiedzi = od **najwyżej punktowanej** (najpopularniejsza) do najniższej
- Odpowiedź z **0 pkt** dozwolona (jak w klasycznej Familiadzie)
- Suma ≈ **100** na pytanie (ostrzeżenie, nie twardy błąd edytora)

---

## 1. Jak działa Familiada w Imprezji

| Element | Rola |
|---------|------|
| **Ekran TV** | Tabela pytań i odsłanianych odpowiedzi |
| **Admin (telefon/komp.)** | Odsłania odpowiedzi, X/XX/XXX (błędy), przekazuje pulę |
| **Gracze** | Buzzery sprzętowe **lub** strona przycisków (niebieski/czerwony) |
| **Pula (pot)** | Suma punktów **już odkrytych** odpowiedzi — trafia do drużyny po zamknięciu rundy |

**Przebieg rundy:**

1. Admin wybiera pytanie (kolejność dowolna + złota lista).
2. Drużyna zgaduje → admin **odkrywa** trafione odpowiedzi na TV.
3. **X / XX / XXX** — błędy drużyny (nie trzy osobne kliknięcia — ustawia liczbę).
4. Admin **przekazuje pulę** drużynie → runda zamknięta.
5. Można odkryć resztę odpowiedzi bez zmiany wyniku.

---

## 2. Format JSON — pojedyncze pytanie

```json
{
  "question": "Co zabieramy ze sobą do szkoły?",
  "answers": [
    { "text": "Plecak", "points": 40 },
    { "text": "Książki", "points": 20 },
    { "text": "Kanapki", "points": 20 },
    { "text": "Zeszyty", "points": 10 },
    { "text": "Piórnik", "points": 6 },
    { "text": "Ściągi", "points": 4 }
  ]
}
```

**Ważne:**

- `answers` to tablica **obiektów** `{ "text", "points" }` — **nie** stringi.
- Co najmniej **1 odpowiedź** z niepustym `text`.
- Punkty: liczba całkowita **≥ 0** (0 dozwolone).
- Typowe: **4–8 odpowiedzi**, suma **~100 pkt**.
- **Max 10 odpowiedzi** (ograniczenie praktyczne / Party); w Familiadzie klasycznej często 6.

---

## 3. Format pliku — cała lista

Plik to **tablica JSON** pytań (nie obiekt z `questions`):

```json
[
  {
    "question": "Polska potrawa narodowa to:",
    "answers": [
      { "text": "pierogi", "points": 25 },
      { "text": "bigos", "points": 21 },
      { "text": "żurek", "points": 18 }
    ]
  },
  {
    "question": "Najpopularniejsze ciasta:",
    "answers": [
      { "text": "szarlotka", "points": 25 },
      { "text": "sernik", "points": 21 }
    ]
  }
]
```

Zapis w edytorze: nazwa pliku np. `familiada_wesela.json` → folder Familiady aplikacji.

---

## 4. Złota lista

- **Osobny plik:** `familiada-golden.json` (max **10 pytań**).
- W edytorze: gwiazdka ⭐ przy pytaniu → dodaje do złotej listy na dole.
- Dostępna w adminie **poza kolejnością** głównej listy.
- **Nie mieszaj** złotej listy z plikiem głównym — to osobny zapis.

---

## 5. Rozpoznawanie formatu z kartki / tekstu

### Typowe wzorce na kartce

| Kartka | Interpretacja |
|--------|---------------|
| „Podaj 6 alkoholi bez litery W” + lista | Jedno pytanie Familiada, 6 odpowiedzi |
| „Pytanie 1: … / Odpowiedź – 40” | Tekst importowalny (patrz §6) |
| Lista słów pod pytaniem z „?” | Odpowiedzi bez punktów → **dopytaj** lub auto 100 pkt |
| ABCD z jedną poprawną | **To nie Familiada** — quiz klasyczny |

### Presety auto-punktów (suma 100)

| Liczba odp. | Rozkład (przykład) |
|-------------|-------------------|
| 2 | 60, 40 |
| 3 | 50, 33, 17 |
| 4 | 40, 30, 20, 10 |
| 5 | 30, 25, 20, 15, 10 |
| 6 | 25, 21, 18, 15, 12, 9 |

Pierwsza odpowiedź = **najwyżej punktowana** (najpopularniejsza / najlepsza).

---

## 6. Import tekstowy — formaty akceptowane przez edytor

LLM może najpierw ułożyć **tekst pośredni**, który użytkownik wklei do edytora, albo od razu JSON.

### Format A — pytanie + odpowiedź z punktami

```
Pytanie 1: Co zabieramy do szkoły?
Plecak - 40
Książki - 20
Kanapki - 20
```

### Format B — pytanie z „?” + lista (punkty auto)

```
Co zabieramy ze sobą do szkoły?
Plecak
Książki
Kanapki
Zeszyty
```

### Format C — JSON (preferowany dla LLM)

Bezpośrednia tablica `[{ question, answers: [{text, points}] }]`.

### Format D — XML

```xml
<familiada>
  <question text="Co zabieramy do szkoły?">
    <answer count="40">Plecak</answer>
    <answer count="20">Książki</answer>
  </question>
</familiada>
```

Atrybut `count` = punkty.

---

## 7. Przekształcanie pytań

### Kartka → Familiada JSON

1. Jedno pytanie = jeden obiekt w tablicy.
2. Każda pozycja listy → `{ text, points }`.
3. Brak punktów → dopytaj lub auto-rozkład 100.

### Familiada → Party Quiz FAMILIADA

Jeśli użytkownik chce **Party Quiz**, opakuj pytanie:

```json
{
  "type": "FAMILIADA",
  "question": "…",
  "time": 0,
  "speedrun": false,
  "elimination": false,
  "answers": [{ "text": "…", "points": 40 }],
  "correct": -1
}
```

Patrz: `docs/PARTY_QUIZ_LLM_INSTRUKCJA.md`.

### Familiada → klasyczny QUIZ

**Nie konwertuj** bez pytania — inna mechanika (telefony vs buzzery).

### Bank uniwersalny

- Plik `public/familiada/universal-bank.json` — gotowe pytania w edytorze (panel „Bank pytań”).
- LLM **nie musi** duplikować banku — może zaproponować wczytanie z banku zamiast generowania od zera.

---

## 8. Workflow LLM — krok po kroku

```
1. Odbierz surowe pytania (tekst, lista, XML).
2. Potwierdź tryb: Familiada (ten dokument) vs Party vs Quiz.
3. Dla każdego pytania: treść + lista odpowiedzi.
4. Wypisz braki (punkty, brakujące odpowiedzi).
5. Zbuduj tablicę JSON lub tekst importowalny.
6. Self-check (§9).
7. Podsumuj („12 pytań, średnio 6 odpowiedzi, suma 100/pyt.”).
```

### Przykład dopytywania

> Dostałem: „Alkohol bez W w nazwie” i tylko: bimber, rum, tequila.  
> **Potrzebuję:**  
> 1. Czy to komplet odpowiedzi, czy dopisać więcej (np. 6 pozycji)?  
> 2. Rozłożyć 100 pkt malejąco (40/30/20/10…) czy podasz wagi?  
> 3. Osobny plik na wesele czy dopisać do istniejącej listy?

### Antywzorce

> ❌ `"answers": ["Bimber", "Rum"]` — muszą być obiekty z punktami.  
> ❌ Wymyślanie „śmiesznych” odpowiedzi bez kontekstu pary/imprezy.  
> ❌ Mieszanie złotej listy z głównym plikiem w jednym JSON bez prośby.  
> ❌ Ujemne punkty.  
> ❌ Puste `question`.

---

## 9. Checklist przed oddaniem

- [ ] Plik to **tablica** `[...]`, nie `{ questions: [...] }` (chyba że użytkownik prosi o format importu do wklejki)
- [ ] Każde pytanie: niepusty `question`
- [ ] Każda odpowiedź: niepusty `text`, `points` ≥ 0
- [ ] Suma punktów ≈ 100 (zaznacz odchylenia)
- [ ] Brak wymyślonych treści bez zgody
- [ ] Złota lista: max 10 pytań, osobny plik `familiada-golden.json`
- [ ] XML: atrybut `count` na `<answer>`

---

## 10. Tabela wymaganych pól

| Pole | Wymagane | Uwagi |
|------|----------|-------|
| `question` | ✅ | Treść na tablicy |
| `answers` | ✅ ≥1 | Tablica obiektów |
| `answers[].text` | ✅ | Niepusty string |
| `answers[].points` | ✅ | int ≥ 0 |
| `type`, `time`, `correct` | ❌ | Nie używać w pliku Familiady |

---

## 11. Przykłady w repozytorium

- `public/familiada/Pytania klasyczne.json`
- `public/familiada/familiada-golden.json` — złota lista
- `public/familiada/universal-bank.json` — bank wbudowany
- Poradnik: `/poradniki/familiada-wlasna.html`

---

## 12. Jak używać tego pliku

**Pobranie z aplikacji:**

- Edytor Familiady → link „Instrukcja dla AI”
- Menu startowe ⚙️ → Poradniki → „Familiada — instrukcja dla AI”
- URL: `/familiada/FAMILIADA_LLM_INSTRUKCJA.md`

**Repozytorium:** `docs/FAMILIADA_LLM_INSTRUKCJA.md`

**Prompt dla ChatGPT / Claude:**

> Stosuj załączoną instrukcję **Familiada** Imprezja Quiz.  
> Mam pytania na kartce — najpierw dopytaj o braki i punkty, potem zbuduj JSON do `/familiada/editor.html`.

**Cursor:** reguła `.cursor/rules/familiada-llm.mdc`.

---

*Wersja: Familiada — zgodność z edytorem `/familiada/editor.html` i panelem admina Familiady.*
