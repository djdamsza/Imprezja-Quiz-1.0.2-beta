# Wdrożenie, dystrybucja i sprzedaż IMPREZJA / VoteBattle

## 1. Gotowość offline (bez internetu)

### Status: **tak, aplikacja jest przygotowana do pracy offline**

- **Serwer** (`node server.js`) – nie łączy się z zewnętrznymi API w trakcie działania (poza opcjonalnym tunelem).
- **Zależności** – po jednorazowym `npm install` wszystko jest w `node_modules`; w runtime nie ma pobrań z sieci.
- **Frontend** – brak CDN: Socket.IO z serwera (`/socket.io/socket.io.js`), fonty systemowe, brak Google Fonts.
- **Service Worker** (`public/sw.js`) – w precache: Screen.html, admin.html, vote.html, editor.html, manifest.json, socket.io.js. Strony ładują się z cache przy braku sieci.
- **Manifest** – dodany do precache (wersja cache: votebattle-v3).

### Gdzie potrzebny jest internet (opcjonalnie)

| Funkcja | Potrzebny internet |
|--------|---------------------|
| Tunel Pinggy (gra przez sieć komórkową) | Tak – tylko przy włączaniu tunelu |
| Import obrazka z URL w edytorze | Tak – tylko w momencie użycia tej opcji |
| Reszta (quiz, głosowanie, ekran, admin, edytor, WiFi) | Nie |

**Podsumowanie:** Po `npm install` (jednorazowo z internetem) aplikacja może działać wyłącznie w sieci lokalnej Wi‑Fi, bez dostępu do internetu. Tunel jest jedyną funkcją wymagającą sieci i jest wyraźnie oznaczona.

---

## 2. Budowa aplikacji desktopowej (Windows, macOS, opcjonalnie Linux)

### Czy da się zbudować? **Tak.**

Obecny stack to **Node.js + Express + Socket.IO** (serwer) oraz **HTML/CSS/JS** (klient w przeglądarce). Aby uzyskać „program” na Windows/macOS/Linux, trzeba opakować to w natywną powłokę.

### Najczęstsze podejścia

#### A) **Electron** (najprostsze dopasowanie do obecnego kodu)

- Jedna codebase: Node + frontend w oknie Chromium.
- **Kroki:**
  1. Dodać `electron` do projektu, plik `main.js` (okno + ładowanie `http://localhost:PORT` lub wbudowany serwer).
  2. Przy starcie aplikacji uruchamiać `server.js` (np. `child_process.spawn('node', ['server.js'])`), poczekać na `listen`, potem otworzyć okno na `http://localhost:3000/Screen.html` (lub wybór ekranu/admin).
  3. Budowanie: `electron-builder` lub `electron-packager` – wynik: `.exe` (Windows), `.app` (macOS), binaria Linux.
- **Plusy:** Duża kontrola, możliwość dostępu do Node (np. pliki, sieć).  
- **Minusy:** Duży rozmiar (~150–200 MB), potrzeba podpisywania/notaryzacji na macOS.

#### B) **Tauri** (lżejsza alternatywa)

- Frontend w WebView, backend w Rust; Node można uruchamiać jako proces zewnętrzny (jak wyżej) lub przepisać krytyczną logikę do Rusta.
- Mniejszy rozmiar paczki, lepsza wydajność, więcej pracy przy integracji z obecnym Node/Express.

#### C) **NW.js** (dawniej Node-Webkit)

- Podobna idea do Electrona; możesz uruchamiać ten sam serwer Node i otwierać okno na localhost.

### Paczka po stronie klienta – wszystko w jednym

Build Electron (np. `npm run build:win`) tworzy **samodzielną paczkę**: w środku jest runtime Node (Electron), serwer (`server.js`) i całe `node_modules`. **Klient nie instaluje Node.js ani nic innego** – tylko instaluje/uruchamia IMPREZJA. Szczegóły: **BUILD_WINDOWS.md** (sekcja „Po stronie klienta nic nie trzeba instalować”).

### Co trzeba zrobić, żeby osiągnąć cel

1. **Wybór narzędzia** – w praktyce najszybsze: Electron + wbudowane uruchamianie `node server.js`.
2. **Konfiguracja buildu** – osobne targety: Windows (exe/msi), macOS (dmg/pkg), ewentualnie Linux (AppImage/deb).
3. **Ścieżki i port** – katalog projektu (quizy, uploads) względem miejsca instalacji aplikacji; ewentualnie stały port lub wybór portu w ustawieniach.
4. **Pierwsze uruchomienie** – np. automatyczne otwarcie przeglądarki/okna na ekran (jak w `start.command`).
5. **macOS:** podpisanie aplikacji (Apple Developer) i notaryzacja, żeby użytkownicy mogli uruchamiać bez ostrzeżeń.
6. **Windows:** opcjonalnie certyfikat do podpisu (SmartScreen); instalator (np. NSIS/electron-builder).

---

## 3. Zabezpieczenie przed piractwem (sprzedaż: subskrypcja / dożywotni dostęp)

### Ograniczenia środowiska

- **JavaScript (Node + przeglądarka)** – kod jest w dużej mierze czytelny; „twarde” zabezpieczenia (jak w C++ z obfuskowaniem natywnym) są trudne.
- **Cel:** nie „niemożliwość” złamania, tylko **podniesienie progu** i **kontrola licencji** (kto ma prawo używać).

### Możliwe mechanizmy (od prostych do zaawansowanych)

1. **Klucz licencyjny (license key)**  
   - Użytkownik wpisuje klucz (np. po zakupie).  
   - Serwer przy starcie (lub okresowo) sprawdza klucz:  
     - **Offline:** hash klucza + np. identyfikator maszyny (CPU ID, MAC) porównany z lokalną listą „dobrych” hashów lub zaszyfrowanym plikiem licencji.  
     - **Online:** request do Twojego backendu: `POST /validate { key, machineId }` → odpowiedź: ważna / subskrypcja do kiedy / dożywotnia.  
   - Trudność: przechowywanie klucza i logika walidacji w JS da się podejrzeć; sens ma połączenie z backendem lub zaszyfrowany plik licencji generowany po stronie serwera.

2. **Backend licencji (zalecane przy sprzedaży)**  
   - Twój serwer (np. prosty API): rejestracja klucza, sprawdzanie subskrypcji / dożywotniej.  
   - Aplikacja przy starcie (jeśli jest internet): sprawdzenie licencji; przy braku sieci – np. grace period (np. 7 dni) z ostatnio zweryfikowaną licencją w cache.  
   - Dla **subskrypcji:** backend zwraca datę końca; aplikacja blokuje działanie po tej dacie bez pozytywnej weryfikacji.  
   - Dla **dożywotniej:** backend zwraca „lifetime”; można dodatkowo wiązać z machineId, żeby ograniczyć udostępnianie jednej licencji na wiele komputerów (np. max 1–2 aktywacje).

3. **Obfuskacja i ochrona kodu**  
   - **JavaScript:** minifikacja + obfuskator (np. javascript-obfuscator) – utrudnia czytanie, nie daje „żelaznej” ochrony.  
   - **Node:** pakiety typu `bytenode` (skompilowanie JS do .jsc) lub `nexe`/`pkg` (zbudowanie jednego pliku wykonywalnego) – kod nadal da się w końcu odtworzyć, ale podnosi próg.  
   - W Electronie: kod w `asar` (archiwum); można go rozpakować – więc obfuskacja + licencjonowanie mają większy sens niż sam asar.

4. **Ochrona przed kopiowaniem**  
   - Wiązanie licencji z identyfikatorami maszyny (np. hash: CPU + dysk + MAC).  
   - Limit aktywacji (np. 1–2 urządzenia na klucz); dane w Twoim backendzie.

### Subskrypcja vs dożywotni dostęp – problemy i utrudnienia

| Aspekt | Subskrypcja | Dożywotni dostęp |
|--------|-------------|-------------------|
| **Weryfikacja** | Okresowa (co X dni) – potrzeba internetu lub grace period | Jednorazowa przy aktywacji + opcjonalnie okresowe „pingi” |
| **Wygaśnięcie** | Po dacie końca – blokada lub ograniczenie funkcji | Brak daty; problem: jak definiować „dożywotnio” (np. tylko major wersje?) |
| **Aktualizacje** | Łatwo powiązać z okresem subskrypcji (np. aktualizacje tylko dla aktywnych) | Trzeba zdefiniować, czy „dożywotnio” = tylko poprawki, czy też nowe wersje; ryzyko sporów |
| **Piracy** | Klucze wygasłe są nieużyteczne; łatwiej „wyłączyć” wyciek | Klucz raz „dobry” może być udostępniany; ograniczenie przez machineId / limit aktywacji |
| **Księgowość** | Przychody rozłożone w czasie, abonament | Duży jednorazowy przychód; jasna definicja produktu |

**Utrudnienia wspólne:**  
- Backend do licencji (utrzymanie, dostępność, RODO jeśli zbierasz dane).  
- Obsługa „zapomniałem klucza”, zmiana komputera, zwroty.  
- Jasne regulaminy (co obejmuje licencja, aktualizacje, wsparcie).

---

## 4. Późniejsze aktualizacje

### Opcje

1. **Ręcznie**  
   - Użytkownik pobiera nowy instalator / plik .zip i nadpisuje lub instaluje ponownie.  
   - W aplikacji: menu „Sprawdź aktualizacje” → link do strony z plikami do pobrania.  
   - Proste, bez infrastruktury; użytkownik musi sam pamiętać.

2. **Auto-update w Electron**  
   - `electron-updater` (z electron-builder): aplikacja sprawdza (np. GitHub Releases lub własny serwer) wersję, pobiera paczkę, instaluje w tle i proponuje restart.  
   - Wymaga: hostowanie plików (np. GitHub, S3, własny serwer) i poprawne wersjonowanie (semver).

3. **Własny endpoint**  
   - Serwer zwraca np. `{ "version": "1.2.0", "url_win": "...", "url_mac": "..." }`.  
   - Aplikacja porównuje z bieżącą wersją i otwiera stronę pobierania lub uruchamia pobieranie.

4. **Kompatybilność wsteczna**  
   - Zapisy quizów (JSON) – trzymać czytelny format i nie usuwać pól; nowe pola opcjonalne.  
   - Socket.IO / API – nowe eventy/pola opcjonalne; stary klient nadal działa na starszym serwerze w ograniczonym zakresie.  
   - Przy złamaniu kompatybilności: zwiększyć wersję protokołu lub wymusić minimalną wersję klienta/serwera i pokazać komunikat „Zaktualizuj aplikację”.

---

## 5. Kompatybilność na różnych systemach

### Obecny stan

- **Node.js** – działa na Windows, macOS, Linux; zależności w `package.json` (express, socket.io, sharp, multer, qrcode) są cross-platform.
- **Sharp** – używa natywnych binariów per system (np. `sharp-darwin-arm64`, `win32-x64`); `npm install` dobiera właściwe.
- **Frontend** – HTML/CSS/JS; przeglądarka w Electronie (Chromium) lub systemowa – spójne zachowanie.

### Jak zachować kompatybilność

1. **Ciągłe testy** – na wszystkich docelowych systemach (np. GitHub Actions: Windows, macOS, Linux) przed wydaniem.
2. **Wersja Node** – ustalić minimalną (np. 18 LTS) i testować na niej; w dokumentacji podać wymagania.
3. **Ścieżki** – używać `path.join()`, `__dirname`; unikać hardkodowanych `\` lub `/`.
4. **Sharp / binaria** – przy pakowaniu Electrona upewnić się, że w paczce są właściwe binaria dla danego OS (electron-builder zwykle je dołącza).
5. **Opcjonalne funkcje** – np. „Otwórz w przeglądarce” (`open` na macOS, `start` na Windows, `xdg-open` na Linux) – już obsłużone w `server.js` przez `process.platform`.
6. **Wersjonowanie** – semver (np. 1.2.3); w aplikacji wyświetlać wersję (w pliku, w menu), żeby wsparcie i aktualizacje były jednoznaczne.

---

## Krótkie podsumowanie

| Pytanie | Odpowiedź |
|--------|-----------|
| **Offline** | Tak – po `npm install` aplikacja działa bez internetu; tylko tunel i „import z URL” wymagają sieci. Dodano manifest do precache. |
| **Program na Windows/macOS/Linux** | Tak – np. Electron opakowujący uruchomienie `node server.js` + okno na localhost; build przez electron-builder. |
| **Zabezpieczenie przed piractwem** | Klucze licencyjne + backend walidacji; wiązanie z machineId; obfuskacja JS; przy sprzedaży – backend jest praktycznie konieczny. |
| **Subskrypcja vs dożywotnia** | Subskrypcja: okresowa weryfikacja, jasne wygaśnięcie. Dożywotnia: prosta sprzedaż, ale trzeba zdefiniować zakres (aktualizacje?) i ograniczyć udostępnianie (np. limit aktywacji). |
| **Aktualizacje** | Ręczne pobieranie lub auto-update (np. electron-updater); wersjonowanie i hostowanie plików. |
| **Kompatybilność** | Node + ścieżki + Sharp są cross-platform; testy na każdym OS, stała minimalna wersja Node i semver. |
