# Edytor quizów – wersja przenośna

## Opis

`editor-standalone.html` to edytor quizów działający **bez serwera**. Można go wysłać klientom, aby samodzielnie układali pytania i wgrywali pliki graficzne. Gotowy quiz eksportują jako pakiet ZIP (JSON + pliki) i odsyłają – co usprawnia pracę.

## Jak używać

1. Otwórz `editor-standalone.html` w przeglądarce (np. dwuklik).
2. Twórz pytania, wgrywaj obrazki i dźwięki z dysku.
3. Eksportuj pakiet: **📦 Pobierz Pakiet (ZIP – JSON + pliki)**.
4. Prześlij plik ZIP do Imprezja Quiz (import pakietu w panelu admina).

## Wymagania

- **Przeglądarka** – Chrome, Firefox, Edge, Safari (nowsze wersje).
- **Internet** – przy pierwszym otwarciu (ładowanie JSZip z CDN). Po załadowaniu można pracować offline.
- **Bez Node.js, npm ani serwera** – wszystko działa w przeglądarce.

## Jeden plik przenośny?

**Tak.** `editor-standalone.html` to jeden plik HTML. Można go:

- Wysłać mailem, przez WeTransfer, dysk itp.
- Otworzyć lokalnie (np. `file:///ścieżka/editor-standalone.html`).
- Hostować na dowolnej stronie (np. GitHub Pages).

### Tryb offline

- Przy **pierwszym** otwarciu potrzebny jest internet (JSZip z CDN).
- Po załadowaniu strony można pracować offline (tworzenie pytań, wgrywanie plików, eksport ZIP).
- Import pakietu ZIP wymaga JSZip – jeśli strona była otwarta wcześniej, biblioteka może być w cache przeglądarki.

### Pełny offline (bez internetu)

Dla pracy w trybie całkowicie offline można:

1. Otworzyć edytor raz z internetem, aby JSZip się załadował.
2. Zapisać stronę jako „Strona internetowa, kompletna” – przeglądarka zapisze też skrypty.
3. Użyć zapisanej strony lokalnie bez sieci.

Alternatywnie: umieścić `editor-standalone.html` i `jszip.min.js` w tym samym folderze i zmienić w HTML odwołanie na lokalne (np. `src="jszip.min.js"`).

## Format pakietu ZIP

Zgodny z Imprezja Quiz:

- `quiz.json` – dane quizu (pytania, odpowiedzi, opcje).
- `uploads/` – pliki graficzne i dźwiękowe (WebP, MP3 itd.).

Import w panelu admina: **Importuj pakiet (ZIP)**.

## Różnice względem edytora na serwerze

| Funkcja              | Edytor na serwerze | Edytor przenośny |
|-----------------------|--------------------|------------------|
| Lista plików na serwerze | ✓                  | ✗                |
| Zapisz na serwerze    | ✓                  | ✗                |
| Usuń quiz             | ✓                  | ✗                |
| Wgraj plik z dysku    | ✓                  | ✓                |
| Import/eksport ZIP    | ✓                  | ✓                |
| Pobierz JSON          | ✓                  | ✓                |
| Wklej JSON            | ✓                  | ✓                |

## Ścieżki plików

Edytor przenośny zapisuje ścieżki w formacie `/uploads/nazwa.webp`, tak jak serwer. Pakiet ZIP jest kompatybilny z importem w Imprezja Quiz.
