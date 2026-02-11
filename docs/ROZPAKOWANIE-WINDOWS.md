# Rozpakowanie na Windows – gdzie jest package.json

## Problem: „Could not read package.json”

To zwykle znaczy, że **nie jesteś w folderze z projektem** albo **w archiwum brakuje plików**.

---

## Krok 1: Sprawdź, gdzie są pliki po rozpakowaniu

Po rozpakowaniu ZIP-a sprawdź:

1. Otwórz **Eksplorator plików** i wejdź w folder, do którego rozpakowałeś (np. `C:\VoteBattle`).

2. **Czy widzisz plik `package.json`?**
   - **TAK** – uruchom w tym folderze `npm install` (np. w cmd: `cd` do tego folderu, potem `npm install`).
   - **NIE** – przejdź do Kroku 2.

---

## Krok 2: Może pliki są w podfolderze

Czasem po rozpakowaniu powstaje **jeden podfolder** (np. `VoteBattle-zrodla-20260209`), a Ty jesteś w folderze nad nim.

Zrób tak:

1. W `C:\VoteBattle` (albo tam, gdzie rozpakowałeś) zobacz, czy jest **jeden folder** (np. `VoteBattle-zrodla-20260209`).
2. Wejdź do niego – **w środku** powinny być m.in. `package.json`, `server.js`, folder `public`.
3. W **wierszu poleceń** wpisz:
   ```bat
   cd C:\VoteBattle\VoteBattle-zrodla-20260209
   ```
   (albo inna nazwa podfolderu, jeśli inna).
4. Sprawdź:
   ```bat
   dir package.json
   ```
5. Jeśli plik jest, uruchom:
   ```bat
   npm install
   ```

---

## Krok 3: Jeśli nadal nie ma package.json

Wtedy w archiwum nie ma pełnych źródeł (np. skopiował się zły plik albo inny zip).

**Szybka naprawa** – utwórz `package.json` ręcznie:

1. W folderze projektu (tam, gdzie chcesz uruchamiać `npm install`) utwórz plik **`package.json`**.
2. Wklej do niego **całą** zawartość z pliku **`package.json-RECOVERY`** (jest w projekcie – skopiuj go z Maca lub z drugiego PC, gdzie masz pełne źródła).
3. Zapisz plik.
4. W tym samym folderze muszą być też: **`server.js`**, **`electron-main.js`**, folder **`public`** (z plikami HTML itd.). Jeśli ich nie ma, trzeba skopiować **cały projekt** jeszcze raz (np. nowy zip z Maca).
5. W cmd w tym folderze:
   ```bat
   npm install
   ```

---

## Podsumowanie

| Gdzie jesteś              | Co zrobić |
|---------------------------|-----------|
| W folderze **z** `package.json` | `npm install` |
| W folderze **nad** podfolderem  | `cd NAZWA_PODFOLDERU` potem `npm install` |
| Brak `package.json`       | Użyj `package.json-RECOVERY` i upewnij się, że reszta plików jest skopiowana |

Po udanym `npm install` możesz uruchomić np. `npm start` lub `npm run electron`.
