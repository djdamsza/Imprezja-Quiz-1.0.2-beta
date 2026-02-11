# Diagnostyka instalatora Windows

Gdy instalator się wywala, sprawdź przyczynę w następujący sposób:

## 1. Podgląd zdarzeń Windows (Event Viewer)

1. Naciśnij **Win+R**, wpisz `eventvwr.msc`, Enter.
2. Otwórz **Podgląd zdarzeń** → **Dzienniki Windows** → **Aplikacja**.
3. Znajdź zdarzenie z momentu awarii (czas odpowiadający uruchomieniu instalatora).
4. Zaznacz zdarzenie i sprawdź **Szczegóły** – opis błędu, kod wyjątku, nazwa modułu.

Typowe: `Application Error`, `Faulting module name`, `Exception code` (np. 0xC0000005 = dostęp do pamięci).

## 2. Uruchomienie instalatora z wiersza poleceń

1. Otwórz **cmd** (Win+R → `cmd`).
2. Przejdź do folderu z instalatorem: `cd /d D:\` (lub inna ścieżka).
3. Uruchom: `"Imprezja Quiz Setup 1.0.2.exe" /D=C:\TestImprezja`
   - `/D=` – katalog instalacji (bez spacji wokół `=`).
4. Obserwuj okno cmd – mogą pojawić się dodatkowe komunikaty.

## 3. Weryfikacja, czy to nasz skrypt NSIS

Tymczasowo **zmień nazwę** `build/installer.nsh` na `build/installer.nsh.bak` i zbuduj ponownie:

```bash
npm run build:win
```

Jeśli build się nie powiedzie, skrypt NSIS jest wymagany.  
Jeśli build przejdzie – uruchom nowy instalator. Jeśli działa, problem jest w `installer.nsh`.

## 4. Test minimalnego skryptu

Utwórz tymczasowo minimalny `build/installer.nsh`:

```nsis
!macro customInstall
  CreateDirectory "$APPDATA\Imprezja Quiz\quizzes"
  CreateDirectory "$APPDATA\Imprezja Quiz\uploads"
  CreateDirectory "$APPDATA\Imprezja Quiz\uploads\sfx"
!macroend
```

Zostaw tylko `customInstall`. Zbuduj i przetestuj. Jeśli działa – problem był w `customCheckAppRunning` lub `customUnInit`.

## 5. Instalator one-click

Spróbuj instalatora one-click (bez wyboru katalogu):

W `package.json` w sekcji `nsis` ustaw `"oneClick": true`, usuń `allowToChangeInstallationDirectory`, zbuduj i przetestuj.
