# Błąd uninstallera / instalatora Windows

## Problem: „Nie udało się usunąć plików starej wersji aplikacji”

Ten komunikat pojawia się przy instalacji nowej wersji, gdy stare pliki są zablokowane lub nie usunięte.

**Rozwiązanie – przed uruchomieniem instalatora:**

1. Zamknij Imprezja Quiz.
2. Uruchom `napraw-uninstaller.bat` (PPK na plik → **Uruchom jako administrator**).
3. Skrypt usuwa: folder instalacji (z rejestru + standardowe ścieżki), AppData, skróty, wpisy rejestru.
4. Poczekaj na zakończenie, potem uruchom instalator.

---

## Problem: „Błąd otwarcia pliku do zapisu” / `IMPREZJA.exe\Uninstall...`

Przy instalacji pojawia się błąd dotyczący ścieżki `...\Programs\IMPREZJA.exe\Uninstall ImprezjaQuiz.exe`. To efekt starej lub uszkodzonej instalacji – rejestr wskazuje na nieprawidłową ścieżkę.

**Rozwiązanie:** Uruchom `napraw-uninstaller.bat` (jako administrator). Skrypt usuwa m.in. `%LOCALAPPDATA%\Programs\IMPREZJA.exe` (folder lub plik) oraz czyści rejestr. Po zakończeniu uruchom instalator ponownie.

---

## Problem: Avast blokuje / kwarantanna instalatora

**Avast** często zgłasza fałszywe alarmy (np. Win32:Malware-gen) dla plików `Imprezja Quiz Setup` i `Uninstall ImprezjaQuiz.exe`.

**Sprawdzony sposób:**
1. Poczekaj 1–2 minuty po pobraniu – niech Avast zeskanuje plik.
2. Uruchom `napraw-uninstaller.bat` (jako administrator).
3. Uruchom instalator – jeśli pierwsza próba się nie udaje, spróbuj ponownie.
4. Opcjonalnie: Avast → Ustawienia → Ogólne → Wyjątki → dodaj folder instalacji lub plik instalatora.

---

## Problem: błąd NSIS (exe.exe, nsis_error)

Możliwe przyczyny:

1. **Stara instalacja** – `executableName` zawierało `.exe` (generowało `exe.exe`).
2. **Aplikacja działa w tle** – uninstaller nie może usunąć plików, dopóki proces jest uruchomiony.

## Rozwiązanie

### 1. Ręczne usunięcie starej instalacji

Na Windows:

1. Zamknij aplikację Imprezja Quiz, jeśli jest uruchomiona.
2. Otwórz **Panel sterowania** → **Programy i funkcje** (lub **Ustawienia** → **Aplikacje**).
3. Odinstaluj **Imprezja Quiz** (jeśli działa) albo przejdź do kroku 4.
4. Jeśli uninstaller nie działa lub zgłasza błąd:
   - Uruchom skrypt `napraw-uninstaller.bat` z katalogu projektu (usuwa foldery AppData i instalacji).
   - Alternatywnie usuń ręcznie: folder instalacji (np. `C:\Users\<użytkownik>\AppData\Local\Programs\Imprezja Quiz`), `%APPDATA%\Imprezja Quiz` oraz `%APPDATA%\votebattle`.
5. Usuń wpis z rejestru (opcjonalnie, jeśli „Programy i funkcje” nadal pokazuje IMPREZJA):
   - Uruchom `regedit`.
   - Przejdź do `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Uninstall\`.
   - Usuń klucz zawierający „Imprezja Quiz” lub „votebattle”.

### 2. Zamknij aplikację przed odinstalowaniem

**Zawsze** zamknij Imprezja Quiz przed odinstalowaniem. Sprawdź w Menedżerze zadań (Ctrl+Shift+Esc), czy nie ma procesu `ImprezjaQuiz.exe` – jeśli jest, zakończ go.

### 3. Instalator zawiesza się na „Zamknij aplikację i kliknij Ponów”

Przed uruchomieniem instalatora **zawsze** zamknij Imprezja Quiz. Jeśli nadal się zawiesza:

1. Zamknij instalator.
2. Otwórz **cmd** (Win+R → `cmd` → Enter) i wpisz: `taskkill /F /IM ImprezjaQuiz.exe`
3. Poczekaj 2–3 sekundy.
4. Uruchom instalator ponownie.

Jeśli problem występuje po odinstalowaniu: uruchom `napraw-uninstaller.bat`, poczekaj chwilę, potem uruchom instalator.

### 4. Zainstaluj nową wersję

Nowe buildy zawierają poprawki: uninstaller (`customUnInit`) oraz instalator z pominiętym sprawdzaniem procesu (`customCheckAppRunning` – pusty makro, bo elektron-builder zgłaszał fałszywe pozytywy).

## Przyczyna

Wcześniej `executableName` było ustawione na `"IMPREZJA.exe"`, przez co electron-builder generował:
- główny plik: `IMPREZJA.exe.exe`
- uninstaller: `Uninstall IMPREZJA.exe.exe`

To powodowało błędy NSIS przy odinstalowywaniu. Obecnie `executableName` ma wartość `"ImprezjaQuiz"`, więc budowane są poprawne nazwy plików.
