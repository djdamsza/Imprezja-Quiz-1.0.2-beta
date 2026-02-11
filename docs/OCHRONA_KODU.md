# Ochrona kodu przy dystrybucji

## Co jest zrobione

### 1. Archiwum ASAR (włączone)

W `package.json` ustawione jest **`asar: true`**. Dzięki temu:

- **Instalator i portable** pakują aplikację do jednego pliku **`app.asar`** zamiast folderu z jawnymi plikami `.js`.
- Po instalacji użytkownik widzi w `resources/` plik **`app.asar`** (oraz ewentualnie **`app.asar.unpacked`** z modułami natywnymi). Żeby zobaczyć lub skopiować kod, trzeba najpierw rozpakować archiwum (np. `npx @electron/asar extract app.asar ./wyjscie`).
- To **utrudnia** zwykłe skopiowanie całego folderu i odsprzedaż – kod nie leży w czytelnej strukturze katalogów.

### 2. asarUnpack

Moduły natywne (`.node`, sharp, @img) są wyciągane do **`app.asar.unpacked`**, bo muszą być na dysku. Sam kod JS (server, electron-main, public, itd.) zostaje w **`app.asar`**.

---

## Ograniczenia (realna ochrona)

- **Pełna ochrona przed kopiowaniem nie istnieje** – ktoś z dostępem do pliku `.exe` / `.app` i narzędziami (np. `asar extract`) może i tak wyciągnąć kod.
- **JavaScript w asarze jest dalej czytelny** – po rozpakowaniu widać źródła. ASAR to **bariera dla zwykłego użytkownika**, nie szyfrowanie.
- **Dalsze utrudnienia** (opcjonalnie):
  - **Obfuskacja** (np. `javascript-obfuscator`) – utrudnia czytanie i modyfikację, nie blokuje kopii.
  - **Licencjonowanie** – już macie (license.js) – ogranicza **użycie**, nie kopiowanie plików.

---

## Podsumowanie

| Sytuacja              | Przed (asar: false)     | Po (asar: true)        |
|-----------------------|-------------------------|-------------------------|
| Instalator            | Folder z plikami .js    | Jeden plik `app.asar`   |
| Portable              | Rozpakowane pliki .js   | Zawartość w `app.asar`  |
| Skopiowanie „na szybko” | Tak, cały folder        | Trzeba extract asar     |
| Czytelność po extract | Pełne źródła            | Nadal pełne źródła      |

Kod jest więc **mniej narażony na przypadkowe lub proste kopiowanie**, ale **nie jest niemożliwy do wyciągnięcia** przez osobę z narzędziami.
