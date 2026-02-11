# Build Windows – IMPREZJA

## Tak – możesz zbudować działający instalator Windows

Konfiguracja jest gotowa. Build tworzy **instalator NSIS** (`.exe`) dla Windows 10/11 (x64).

---

## Na Windows: błąd „Cannot create symbolic link”

Jeśli przy `npm run build:win` pojawia się błąd z **linkami symbolicznymi** (winCodeSign, libcrypto.dylib), build **musi** być uruchomiony z uprawnieniami administratora.

**Najprościej:** w folderze projektu uruchom **`build-win-jako-admin.bat`** (dwuklik). Skrypt poprosi o UAC i zbuduje aplikację.

Alternatywnie: **cmd** → prawy przycisk → **Uruchom jako administrator** → `cd C:\VoteBattle` → `npm run build:win`.

Szczegóły: **BUILD_WIN_SYMLINK_FIX.md**.

---

## Jak zbudować (na Macu lub na Windows)

### 1. Zainstaluj zależności

```bash
npm install
```

### 2. Uruchom build Windows

```bash
npm run build:win
```

### 3. Wynik

W folderze **`dist/`** pojawią się m.in.:

- **`Imprezja Quiz Setup 1.0.0.exe`** – instalator NSIS (instalacja do wybranej lokalizacji)
- **`Imprezja Quiz 1.0.0-portable.exe`** – wersja **portable** (bez instalacji; ten sam kod co w win-unpacked – działa od razu po uruchomieniu)
- **`win-unpacked/`** – rozpakowana aplikacja (do testów; wewnątrz **ImprezjaQuiz.exe**)

**Jeśli instalator nie działa lub jest blokowany przez antywirus:**  
Użyj **`Imprezja Quiz 1.0.0-portable.exe`** albo rozpakuj folder **win-unpacked** (np. jako ZIP) i uruchom **ImprezjaQuiz.exe** – ta wersja przechodzi skan Avast i łączy się z telefonem. Instalator jest skonfigurowany tak, aby instalować **bez uprawnień administratora** i **nie uruchamiać** aplikacji od razu po instalacji (mniej konfliktów z antywirusem).

---

## Po stronie klienta nic nie trzeba instalować

Paczka instalacyjna (Setup, portable, win-unpacked) **zawiera wszystko**, czego potrzebuje aplikacja:

- **Runtime Node.js** – wbudowany w Electron (aplikacja uruchamia serwer przez ten sam plik `.exe`, nie przez zewnętrzny Node).
- **Zależności** (Express, Socket.IO, sharp, jimp, multer, qrcode itd.) – są w paczce w folderze aplikacji (np. `resources/app/node_modules`), nie wymagają `npm install` u klienta.
- **Działanie offline** – po instalacji aplikacja działa bez internetu (z wyjątkiem opcjonalnego tunelu).

**Klient:** instaluje Imprezja Quiz (lub uruchamia portable) i odpala program. Nie musi instalować Node.js, npm ani żadnych innych narzędzi.

**Uwaga:** Na bardzo minimalnych instalacjach Windows (np. świeża minimalna wersja) czasem brakuje **Visual C++ Redistributable**, którego potrzebują natywne moduły (np. sharp). W takim przypadku można doinstalować [Microsoft Visual C++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist). Na typowym Windows 10/11 jest już zainstalowany.

---

## Wymagania

- **Node.js** 18+ (LTS zalecane)
- **npm**
- Na **Macu**: do zbudowania Windows potrzebny jest np. Wine (electron-builder może go użyć) albo build na maszynie z Windows
- Na **Windows**: build działa natywnie

---

## Build na Macu pod Windows

electron-builder na macOS może budować pod Windows **bez Wine**, używając własnych narzędzi. Po prostu uruchom:

```bash
npm run build:win
```

Jeśli pojawi się błąd związany z brakującym Wine, możesz:
- zainstalować Wine, albo
- uruchomić `npm run build:win` na komputerze z Windows (np. w VM lub drugim PC).

---

## Po instalacji na Windows

1. Uruchom **Imprezja Quiz** z menu Start lub ze skrótu na pulpicie.
2. Aplikacja:
   - uruchomi serwer Node (w tle, przez Electron),
   - otworzy okno z ekranem (Screen.html).
3. **Panel admina**: w przeglądarce otwórz `http://localhost:3000/admin.html`  
   lub użyj adresu w sieci lokalnej (np. `http://192.168.x.x:3000/admin.html`), jeśli chcesz dostęp z innych urządzeń.

---

## Logi i diagnostyka (Windows)

- **Logi**: w folderze z aplikacją (tam gdzie zainstalowano) szukaj pliku **`imprezja-electron.log`**.
- **Lokalizacja logów**: w tym samym folderze może być plik **`LOG-LOCATION.txt`** ze ścieżką do logu.
- **Firewall**: jeśli telefon/inne urządzenia nie łączą się z serwerem, sprawdź firewall Windows i ewentualnie dodaj regułę dla portu **3000** (skrypt `otworz-firewall.bat` w projekcie).

---

## Sharp i obrazy na Windows

- Aplikacja ma **jimp** jako zapas gdy **sharp** się nie załaduje (np. problemy z natywnymi bibliotekami na Windows).
- Jeśli na danym PC sharp nie działa, obrazy będą obsługiwane przez jimp (wolniej, ale bez blokowania działania).

---

## Skrót

```bash
npm install
npm run build:win
```

Pliki do dystrybucji:
- **`dist/Imprezja Quiz Setup 1.0.0.exe`** – instalator
- **`dist/IMPREZJA 1.0.0-portable.exe`** – wersja portable (zalecana, gdy instalator nie działa lub jest blokowany)
