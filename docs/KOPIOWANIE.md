# Kopiowanie projektu IMPREZJA – bez 3 godzin

## Problem

W projekcie jest **~15 000 plików** i **~2 GB**, ale:
- **~8 500 plików** to `node_modules/` (zależności) – **nie trzeba kopiować**
- **~6 100 plików** to `dist/` (wyniki buildów) – **nie trzeba kopiować**
- **~145 plików** to właściwy kod i zasoby – **tylko to ma sens kopiować**

Kopiowanie całego folderu (z node_modules i dist) trwa bardzo długo.

---

## Rozwiązanie: kopiuj tylko źródła

### Co NIE kopiować

| Folder / pliki      | Plików | Rozmiar | Dlaczego pominąć |
|---------------------|--------|---------|-------------------|
| `node_modules/`     | ~8 500 | ~487 MB | Odtworzenie: `npm install` |
| `dist/`             | ~6 100 | ~1,5 GB | Odtworzenie: `npm run build:mac` / `build:win` |
| `*.log`             | –      | –       | Logi, można usunąć |
| `LOG-LOCATION.txt`  | –      | –       | Tymczasowy |

### Co kopiować (wystarczy do pracy i buildów)

- `package.json`, `package-lock.json`
- `server.js`, `electron-main.js`, `license.js`, `launcher.js`
- `public/`, `quizzes/`, `css/`, `js/`
- Pliki `.bat`, `.sh`, `.command` (launchery, naprawa sharp, firewall)
- Pliki `.md` (dokumentacja)
- **Bez** `node_modules/` i **bez** `dist/`

---

## Sposób 1: Ręcznie (Finder / Eksplorator)

1. Skopiuj cały folder projektu.
2. W skopiowanym folderze **usunąć**:
   - `node_modules` (cały folder)
   - `dist` (cały folder)
3. Na docelowym komputerze w katalogu projektu uruchomić:
   ```bash
   npm install
   ```
   Zajmie to kilka minut zamiast godzin kopiowania.

---

## Sposób 2: Archiwum tylko źródeł (Mac / Linux)

W katalogu **nad** projektem (np. `Documents`):

```bash
cd /Users/test/Documents
zip -r VoteBattle-zrodla.zip VoteBattle -x "VoteBattle/node_modules/*" -x "VoteBattle/dist/*" -x "VoteBattle/*.log" -x "VoteBattle/.DS_Store"
```

Powstanie `VoteBattle-zrodla.zip` – tylko źródła, mały rozmiar.  
Na drugim komputerze: rozpakuj i zrób `npm install`.

---

## Sposób 3: Skrypt (Mac)

Zapisz jako `spakuj-do-kopiowania.sh` w katalogu projektu:

```bash
#!/bin/bash
cd "$(dirname "$0")"
PARENT="$(dirname "$(pwd)")"
NAZWA="$(basename "$(pwd)")"
zip -r "../${NAZWA}-zrodla.zip" . \
  -x "node_modules/*" -x "dist/*" -x "*.log" \
  -x ".DS_Store" -x ".git/*"
echo "Utworzono: ${PARENT}/${NAZWA}-zrodla.zip"
```

Uruchom: `chmod +x spakuj-do-kopiowania.sh` potem `./spakuj-do-kopiowania.sh`.  
Kopiuj tylko plik `.zip`.

---

## Po skopiowaniu na nowy komputer

**Ważne (szczególnie Windows):** `npm install` uruchamiaj **w folderze, w którym widać plik `package.json`**.  
Jeśli po rozpakowaniu ZIP-a widzisz tylko jeden podfolder – wejdź do niego i tam daj `npm install`.

```bash
cd VoteBattle   # lub cd VoteBattle-zrodla-YYYYMMDD – folder Z package.json w środku!
npm install     # ok. 2–5 min
npm start       # lub npm run electron
```

Jeśli pojawi się błąd „Could not read package.json”, zobacz **ROZPAKOWANIE-WINDOWS.md**.

---

## Szybkie czyszczenie przed kopiowaniem (u siebie)

Żeby u siebie mieć mniej plików i mniejszy rozmiar:

```bash
npm run clean    # usuwa tylko dist/
# node_modules usuwaj ręcznie tylko gdy chcesz:
# rm -rf node_modules
```

Potem kopiuj folder (bez `node_modules` i `dist`) albo używaj archiwum jak wyżej.

---

## Podsumowanie

| Akcja              | Z node_modules + dist | Tylko źródła (~145 plików) |
|--------------------|------------------------|----------------------------|
| Liczba plików      | ~15 000                | ~145                        |
| Rozmiar            | ~2 GB                  | kilkadziesiąt MB           |
| Czas kopiowania    | nawet 3 h              | kilkadziesiąt sekund       |
| Po skopiowaniu     | –                      | `npm install` (kilka min)  |

**Zasada: kopiuj tylko źródła, bez `node_modules` i `dist`. Na docelowym PC zrób `npm install`.**
