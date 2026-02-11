# Błąd buildu Windows: „Cannot create symbolic link”

## Problem

Przy `npm run build:win` pojawia się:

```
ERROR: Cannot create symbolic link : Klient nie ma wymaganych uprawnie...
darwin\10.12\lib\libcrypto.dylib
```

Electron-builder pobiera narzędzia (winCodeSign) w archiwum 7z, które zawiera **linki symboliczne**. Na Windows ich utworzenie wymaga **uprawnień administratora** albo **trybu deweloperskiego**. Opcja `forceCodeSigning: false` **nie** pomija tego kroku – winCodeSign jest nadal używany przy budowaniu.

---

## Rozwiązanie 1: Uruchom build jako administrator (zalecane)

### Sposób A – skrypt (najprostszy)

W folderze projektu **kliknij dwukrotnie**:

**`build-win-jako-admin.bat`**

Skrypt poprosi o potwierdzenie UAC i uruchomi `npm run build:win` z uprawnieniami administratora.

### Sposób B – ręcznie

1. Zamknij zwykły cmd.
2. **Start** → wpisz **cmd** → **prawy przycisk** na „Wiersz poleceń” → **Uruchom jako administrator**.
3. W oknie cmd:
   ```bat
   cd C:\VoteBattle
   npm run build:win
   ```

---

## Rozwiązanie 2: Tryb deweloperski Windows (bez uruchamiania jako admin)

1. **Ustawienia** → **Aktualizacja i zabezpieczenia** → **Dla deweloperów**.
2. Włącz **Tryb deweloperski** (pozwala na tworzenie linków symbolicznych bez administratora).
3. Zrestartuj komputer (albo wyloguj i zaloguj się).
4. W zwykłym cmd:
   ```bat
   cd C:\VoteBattle
   npm run build:win
   ```

---

## Dlaczego forceCodeSigning: false nie pomaga

Electron-builder i tak pobiera winCodeSign (m.in. do obróbki pliku .exe). Opcja wyłącza tylko faktyczne podpisywanie certyfikatem, a nie rozpakowanie tego archiwum. Dlatego jedyne skuteczne rozwiązania to: **administrator** albo **tryb deweloperski**.

---

## Po udanym buildzie

W folderze **`dist\`** powinny być m.in.:
- **`IMPREZJA Setup 1.0.0.exe`** – instalator,
- **`win-unpacked\`** – wersja „portable”.

Aplikacja nie będzie podpisana cyfrowo (Windows może pokazać ostrzeżenie „Nieznany wydawca”) – to normalne przy buildzie bez certyfikatu. Użytkownik może wybrać „Uruchom mimo to” lub dodać wyjątek.
