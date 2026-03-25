# Sekcja Kontakt – jak wstawić formularz w WordPress

Formularz Kadence to **osobny blok** – nie da się go umieścić wewnątrz jednego bloku Custom HTML. Trzeba użyć bloku **Kolumny** (Columns).

---

## Dwa sposoby – wybierz jeden

### Sposób A: Jeden blok (style w lewej kolumnie)

**Na każdej stronie:** wklej tylko lewą kolumnę – zawiera style + treść. Nie trzeba osobnego bloku ze stylami.

- Plik: `kontakt-imprezja-czesc-a.html`

### Sposób B: Style globalne (jednorazowa konfiguracja)

**Raz:** dodaj style do WordPress → Wygląd → Dostosuj → Dodatkowy CSS (wklej `kontakt-imprezja-global.css`).

**Na każdej stronie:** wklej tylko treść bez stylów.

- Plik lewej kolumny: `kontakt-imprezja-czesc-a-minimal.html`

---

## Krok po kroku

### 1. Usuń stare bloki
Usuń mapę, stary formularz i dane kontaktowe.

### 2. Dodaj blok Grupa
- Dodaj blok **Grupa** (Group)
- Zaawansowane → Dodatkowa klasa CSS: `kontakt-imprezja`
- Opcjonalnie: Identyfikator HTML: `form` (dla kotwicy „Zapytaj o wycenę”)

### 3. Wewnątrz Grupy – blok Kolumny
- Dodaj **Kolumny** (Columns), układ 2 kolumny (np. 39% / 59%)
- **WAŻNE:** Kolumny → Zaawansowane → Dodatkowa klasa CSS: **`kontakt-imprezja-cols`**

### 4. Lewa kolumna
- Kliknij w lewą kolumnę
- Dodaj blok **Custom HTML**
- **Sposób A:** wklej `kontakt-imprezja-czesc-a.html` (style + treść)
- **Sposób B:** wklej `kontakt-imprezja-czesc-a-minimal.html` (tylko treść – style muszą być w Dodatkowy CSS)

### 5. Prawa kolumna (3 bloki w tej kolejności)
- **Blok 1:** Custom HTML – wklej `kontakt-imprezja-czesc-b1.html`
- **Blok 2:** Kadence Form – dodaj formularz (Imię, Email, Treść, reCAPTCHA, Submit)
- **Blok 3:** Custom HTML – wklej `kontakt-imprezja-czesc-b2.html`

**WAŻNE:** Blok Kadence Form musi być **wewnątrz** prawej kolumny (między B1 a B2). Jeśli formularz wyświetla się pod kolumnami – przeciągnij go do środka prawej kolumny.

---

## Przenoszenie na inne strony

| Sposób | Co przenosisz |
|--------|----------------|
| **A** (style w kolumnie) | 1× blok Custom HTML (lewą kolumnę) + 2× Custom HTML (B1, B2) + blok Kadence Form |
| **B** (style globalne) | To samo, ale lewa kolumna bez stylów – style działają na całej stronie |

**W obu przypadkach** blok Kadence Form dodajesz ręcznie w prawej kolumnie (nie da się go wstawić do Custom HTML).

---

## Pliki (referencja)

| Plik | Zawartość |
|------|-----------|
| `kontakt-imprezja-czesc-a.html` | Style + lewa kolumna (Sposób A) |
| `kontakt-imprezja-czesc-a-minimal.html` | Lewa kolumna bez stylów (Sposób B) |
| `kontakt-imprezja-global.css` | Style do Dodatkowy CSS (Sposób B) |
| `kontakt-imprezja-czesc-b1.html` | Otwarcie prawej kolumny |
| `kontakt-imprezja-czesc-b2.html` | Zamknięcie prawej kolumny |
| `kontakt-imprezja-styles.html` | *(przestarzały)* – style przeniesione do czesc-a lub global.css |
