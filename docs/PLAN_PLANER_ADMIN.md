# Plan: Planer imprezy – kafelek w Admin PWA

## Cel

Zastąpić kartkę papieru z notatkami o imprezie – **kafelek w Admin PWA**, który wyświetla najważniejsze informacje o wydarzeniu. DJ ma je zawsze pod ręką na telefonie, bez szukania w dokumentach czy mailach.

---

## Co wyświetlać (przykładowe pola)

| Pole | Opis | Przykład |
|------|------|----------|
| Imiona pary | Para młoda / solenizant | Anna i Leszek |
| Rodzice | Imiona rodziców | Maria, Jan |
| Życzenia | Uwagi od klienta | „Proszę nie puszczać X, para chce Y na pierwszy taniec” |
| Godziny | Kluczowe momenty | 18:00 – wejście, 20:00 – tort |
| Miejsce | Sala / adres | Sala „Bursztyn”, ul. Kwiatowa 5 |
| Kontakt | Telefon / email | 123 456 789 |
| Inne | Dowolne notatki | Alergie, preferencje muzyczne, VIP goście |

Pola powinny być **konfigurowalne** – użytkownik może dodać własne (np. „Imię solenizanta”, „Temat imprezy”).

---

## Źródła danych – jak wypełnić planer

### 1. Plik tekstowy (.txt)

- Użytkownik wgrywa plik `.txt`
- Parsowanie: każda linia = jedna informacja
- Proste formaty:
  - `Klucz: wartość` (np. `Para: Anna i Leszek`)
  - `# nagłówek` – sekcja
  - Puste linie = oddzielenie bloków
- Opcjonalnie: rozpoznawanie typowych etykiet (Para, Rodzice, Życzenia, Godziny, Miejsce, Kontakt)

### 2. Formularz Google → CSV

- DJ używa Google Forms do zbierania informacji od klienta
- Odpowiedzi trafiają do Google Sheets
- **Eksport:** Plik → Pobierz → Wartości rozdzielone przecinkami (.csv)
- Planer: przycisk „Importuj CSV” – użytkownik wgrywa plik CSV
- Parsowanie: pierwszy wiersz = nagłówki (pytania z formularza), kolejne = odpowiedzi
- Mapowanie: kolumna 1 → pole 1, kolumna 2 → pole 2, itd.
- Opcjonalnie: użytkownik wybiera, która kolumna mapuje na które pole (np. „Imię panny młodej” → „Para”)

### 3. Ręczne wpisywanie

- Formularz w rozwijanej karcie (jak Powitanie, Prezentacja)
- Pola tekstowe dla każdego standardowego elementu
- Możliwość dodania własnych pól (nazwa + wartość)

---

## UI – gdzie w Admin PWA

### Kafelek w sekcji SETUP

Nowa karta rozwijana obok „Powitanie”, „Prezentacja” itd.:

```
┌─────────────────────────────────────────┐
│ 📋 Planer imprezy                    ▼  │
├─────────────────────────────────────────┤
│ [Importuj plik .txt] [Importuj CSV]      │
│                                         │
│ Para:        Anna i Leszek               │
│ Rodzice:    Maria, Jan                  │
│ Życzenia:   Proszę nie puszczać...     │
│ Godziny:    18:00 wejście, 20:00 tort   │
│ Miejsce:    Sala Bursztyn               │
│ Kontakt:    123 456 789                 │
│                                         │
│ [Edytuj] [Wyczyść]                      │
└─────────────────────────────────────────┘
```

### Widok skrócony (gdy karta zwinięta)

- Nagłówek: „Planer imprezy” + np. „Anna i Leszek” (pierwsza linia / para)
- Kliknięcie → rozwija pełną treść

### Widok na małym ekranie (telefon)

- Karta domyślnie zwinięta
- Po rozwinięciu: przewijalna lista pól
- Duże przyciski: Importuj TXT, Importuj CSV, Edytuj

---

## Persystencja danych

- **Gdzie:** Serwer (w katalogu danych imprezy) – tak jak welcome, prezentacja
- **Format:** JSON, np. `planer.json` w `IMPREZJA_DATA_DIR` lub w `uploads/`
- **Sync:** Socket.IO – admin wysyła `planer_update`, serwer zapisuje i rozgłasza do innych adminów (jeśli wielu)
- **Fallback:** `localStorage` w przeglądarce – jeśli serwer nie przechowuje (tryb offline / uproszczony)

---

## Parsowanie pliku .txt – propozycja

```
Para: Anna i Leszek
Rodzice: Maria, Jan

Życzenia:
Proszę nie puszczać piosenki X.
Para chce Y na pierwszy taniec.

Godziny:
18:00 – wejście pary
20:00 – tort
22:00 – oczepiny

Miejsce: Sala Bursztyn, ul. Kwiatowa 5
Kontakt: 123 456 789
```

Reguły:
- Linia zawierająca `:` → dziel na klucz i wartość (pierwsze `:`)
- Wieloliniowe wartości: po `Klucz:` następne linie bez `:` dopisywane do wartości, aż do pustej linii lub nowego klucza
- Puste linie = koniec bloku

---

## Parsowanie CSV (Google Forms)

Google Forms → Sheets daje np.:

| Timestamp | Imię panny młodej | Imię pana młodego | Imiona rodziców | Życzenia | ... |
|-----------|-------------------|-------------------|-----------------|----------|-----|
| 12.03.2025 10:00 | Anna | Leszek | Maria, Jan | Proszę nie... | ... |

- Pierwszy wiersz = nagłówki (pytania)
- Drugi wiersz (i kolejne) = odpowiedzi – zwykle bierzemy ostatni (najświeższy)
- Mapowanie: użytkownik może wybrać „Która kolumna → które pole” albo automatyczne dopasowanie po słowach kluczowych („imię”, „para”, „rodzice”, „życzenia”)

---

## Fazy implementacji

### Faza 1 – MVP
- [ ] Karta „Planer imprezy” w setup-grid (admin-pwa.html)
- [ ] Ręczne pola: Para, Rodzice, Życzenia, Godziny, Miejsce, Kontakt
- [ ] Zapis do `localStorage` (prosty start)
- [ ] Wyświetlanie w rozwiniętej karcie

### Faza 2 – Import TXT
- [ ] Przycisk „Importuj .txt”
- [ ] Parsowanie `Klucz: wartość` + wieloliniowe bloki
- [ ] Mapowanie na standardowe pola (Para, Rodzice, itd.)
- [ ] Nadpisywanie / merge z istniejącymi danymi

### Faza 3 – Import CSV (Google Forms)
- [ ] Przycisk „Importuj CSV”
- [ ] Parsowanie CSV (nagłówki + wiersze)
- [ ] Automatyczne mapowanie po nazwach kolumn (imię, para, rodzice…)
- [ ] Opcjonalnie: ekran wyboru mapowania kolumna → pole

### Faza 4 – Persystencja na serwerze
- [ ] Endpoint / API: zapis `planer.json` w katalogu danych
- [ ] Socket.IO: `planer_update`, `planer_state`
- [ ] Sync między urządzeniami (kilku adminów)

### Faza 5 – Ulepszenia
- [ ] Własne pola (użytkownik dodaje „Temat imprezy”, „Alergie” itd.)
- [ ] Szablony pól (np. „Wesele”, „Urodziny”, „Firma”)
- [ ] Eksport planera do PDF (do wydruku)
- [ ] Powiązanie z ekranem powitalnym (np. auto-uzupełnienie „WESELE ANI I LESZKA” z pola Para)

---

## Zależności techniczne

- **Frontend:** admin-pwa.html – JavaScript, File API (input file), parsowanie tekstu/CSV
- **Backend:** server.js – opcjonalnie endpoint `POST /api/planer` + Socket.IO
- **Brak zewnętrznych bibliotek** – parsowanie CSV w czystym JS (split po przecinku, uwzględnienie cudzysłowów)

---

## Uwagi

- **Prywatność:** Dane klienta (imiona, kontakt) – przechowywane lokalnie / na serwerze u DJ-a. Brak wysyłania do zewnętrznych usług.
- **Google Forms:** Nie ma bezpośredniego API – użytkownik eksportuje CSV z Sheets i wgrywa do Imprezji. To proste i nie wymaga OAuth.
- **Offline:** Z localStorage planer działa offline. Z serwerem – wymaga połączenia przy pierwszym załadowaniu.
