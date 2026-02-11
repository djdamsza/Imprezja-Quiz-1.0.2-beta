# Imprezja Quiz – Instrukcja użytkownika

Quiz i głosowanie w sieci lokalnej. Gracze łączą się telefonami przez WiFi, odpowiadają na pytania, zdobywają punkty. Działa offline.

---

## Spis treści

1. [Instalacja](#1-instalacja)
2. [Pierwsze uruchomienie](#2-pierwsze-uruchomienie)
3. [Panel admina](#3-panel-admina)
4. [QR kody i połączenie](#4-qr-kody-i-połączenie)
5. [Tunel (gra przez internet)](#5-tunel-gra-przez-internet)
6. [Edytor quizów](#6-edytor-quizów)
7. [Tryby gry](#7-tryby-gry)
8. [Rodzaje pytań](#8-rodzaje-pytań)
9. [Punkty i mechanika](#9-punkty-i-mechanika)
10. [Rozwiązywanie problemów](#10-rozwiązywanie-problemów)

---

## 1. Instalacja

### macOS (Apple Silicon M1/M2/M3)

1. Pobierz plik **`Imprezja Quiz-x.x.x-arm64.dmg`** ze strony wydawcy.
2. Otwórz plik DMG (dwuklik).
3. Przeciągnij **Imprezja Quiz** do folderu **Programy** (Applications).
4. Uruchom aplikację z folderu Programy.

**Jeśli macOS blokuje uruchomienie:**
- Otwórz **Ustawienia systemowe** → **Poufność i bezpieczeństwo** → **Bezpieczeństwo**
- Kliknij **„Otwórz mimo to”** obok komunikatu o zablokowanej aplikacji
- Lub w Terminalu: `xattr -cr /Applications/Imprezja Quiz.app`

**Możliwe błędy – liczymy na Twoje raporty.** Aplikacja jest w aktywnej fazie rozwoju. W trakcie użytkowania mogą wystąpić różnego rodzaju błędy. W panelu admina znajdziesz przycisk **„Wyślij raport błędów”** – pozwala szybko przekazać informacje o problemach. Dzięki temu możemy sprawnie je eliminować.

### macOS (Intel)

1. Pobierz plik **`Imprezja Quiz-x.x.x-x64.dmg`** lub **`Imprezja Quiz-x.x.x.dmg`** (dla Maców z procesorem Intel).
2. Instalacja jak powyżej (w tym informacja o blokadzie Gatekeeper i raportach błędów).

### Windows

1. Pobierz plik **`Imprezja Quiz Setup x.x.x.exe`** ze strony wydawcy.
2. Uruchom instalator.
3. Wybierz folder instalacji (domyślnie: `C:\Users\<użytkownik>\AppData\Local\Programs\Imprezja Quiz`).
4. Zakończ instalację. Możesz utworzyć skrót na pulpicie.
5. Uruchom **Imprezja Quiz** z menu Start lub pulpitu.

**Jeśli antywirus blokuje instalator:** Użyj wersji portable (jeśli dostępna) lub dodaj wyjątek dla Imprezja Quiz.

---

## 2. Pierwsze uruchomienie

1. Uruchom aplikację – otworzy się okno z ekranem TV (duży ekran).
2. Aplikacja działa przez **14 dni** w trybie testowym.
3. Po wygaśnięciu pojawi się ekran aktywacji – wprowadź klucz licencyjny (jeśli kupiłeś licencję).
4. Jeśli używasz panelu admina na telefonie: otwórz przeglądarkę i wpisz adres wyświetlony na ekranie (np. `http://192.168.0.104:3000/admin.html`).

---

## 3. Panel admina

Panel admina służy do prowadzenia quizu. Możesz go otworzyć:
- **Na komputerze:** w przeglądarce `http://localhost:3000/admin.html`
- **Na telefonie:** zeskanuj QR kod „Admin” lub wpisz adres z sieci (np. `http://192.168.x.x:3000/admin.html`)

### Główne sekcje panelu

- **Licencja** – status (trial/pełna), aktywacja klucza, Machine ID
- **Generator QR WiFi** – kod QR do połączenia z siecią WiFi (gracze mogą się podłączyć)
- **QR do gry w sieci lokalnej** – kod prowadzący do strony gry (vote.html)
- **Tunel** – gra przez internet (np. LTE) bez WiFi
- **Wybierz Quiz** – załaduj quiz z listy
- **Konfiguracja Team Battle** – tryb drużynowy (dwie drużyny)
- **Pytania** – przyciski do pokazywania pytań, resetu, rankingu, podium

---

## 4. QR kody i połączenie

### Generator QR WiFi

Pozwala wygenerować kod QR, który po zeskanowaniu łączy telefon z siecią WiFi:
1. Wpisz nazwę sieci (SSID) i hasło.
2. Wybierz typ (WPA2, WPA, WEP).
3. Kliknij **Generuj** – kod QR pojawi się na ekranie.
4. Gracze skanują kod telefonem, aby połączyć się z WiFi.

**Uwaga:** Niektóre routery (np. Xiaomi) mogą mieć problemy z łączeniem przez QR. Wtedy gracze łączą się ręcznie.

### QR do gry w sieci lokalnej

1. Kliknij **„Pokaż QR sieci lokalnej na ekranie”**.
2. Na ekranie TV pojawi się kod QR.
3. Gracze skanują go – otwiera się strona gry (`/vote.html`).
4. Adres bazuje na IP komputera w sieci (np. `http://192.168.0.104:3000/`).

**Wymagania:** Komputer i telefony muszą być w tej samej sieci WiFi.

### „Pokaż QR na telefonach”

Gdy włączysz tę opcję, zalogowani gracze zobaczą kod QR do gry bezpośrednio na swoim telefonie (bez potrzeby patrzenia na ekran TV).

---

## 5. Tunel (gra przez internet)

Tunel pozwala grać, gdy gracze NIE są w tej samej sieci WiFi (np. używają LTE).

### Na Macu (jednym kliknięciem)

1. W panelu admina znajdź sekcję **„Tunel (gra przez sieć komórkową)”**.
2. Kliknij **„Uruchom tunel i generuj QR”**.
3. Po chwili pojawi się adres (np. `https://xxx.a.pinggy.io`) i kod QR.
4. Gracze skanują QR – łączą się przez internet, bez WiFi.

### Na Windows (ręcznie)

1. Otwórz PowerShell lub Wiersz polecenia.
2. Uruchom: `ssh -p 443 -R0:localhost:3000 a.pinggy.io`
3. Przy pierwszym połączeniu wpisz **yes**.
4. Skopiuj wyświetlony adres (np. `https://xxx.a.pinggy.io`).
5. W panelu admina wklej adres w pole „Na Windows… wklej adres ręcznie” i kliknij **Ustaw URL**.

### Ograniczenia tunelu

- **Wymagany internet** na komputerze prowadzącym grę.
- **Limit czasu:** wersja darmowa Pinggy ma limit ok. **60 minut** na jedno połączenie – po tym czasie tunel się rozłączy, adres się zmieni, trzeba uruchomić ponownie.
- Gdy tunel jest aktywny, QR „do gry” prowadzi przez tunel, nie przez WiFi.

---

## 6. Edytor quizów

Edytor: `http://localhost:3000/editor.html` (lub z adresem IP w sieci).

### Funkcje

- **Wczytaj quiz** – z listy plików na serwerze lub z dysku (JSON).
- **Zapisz** – zapisuje quiz w folderze `quizzes/` (na serwerze).
- **Dodawanie pytań** – przyciski typów: QUIZ, Głosowanie, Muzyka, Foto Głos, Hot or Not, Szacowanie, Pytanie otwarte, Pytanie z literą, Statki.
- **Edycja pytania** – treść, odpowiedzi, obrazek, plik audio, czas, opcje Speedrun/Eliminacja.
- **Opcje quizu** – np. wyłączenie punktów za czas (`disableTimePoints`).

### Tworzenie nowego quizu

1. Nadaj nazwę pliku (np. `quiz_urodzinowy`).
2. Kliknij przycisk typu pytania (np. **QUIZ**).
3. Wypełnij treść, dodaj odpowiedzi, zaznacz poprawną.
4. Opcjonalnie: dodaj obrazek (upload), plik audio (Muzyka), ustaw czas.
5. Zapisz quiz – pojawi się na liście w panelu admina.

---

## 7. Tryby gry

### Tryb indywidualny (domyślny)

- Każdy gracz zdobywa punkty osobno.
- Ranking: TOP 10 graczy.
- Podium: miejsca 3, 2, 1 (wyświetlane stopniowo).

### Tryb drużynowy (Team Battle)

1. W panelu admina w sekcji **Konfiguracja Team Battle** wpisz nazwy drużyn (np. „Panny Młodej”, „Pana Młodego”).
2. Kliknij **AKTYWUJ TRYB DRUŻYNOWY**.
3. Gracze przy logowaniu wybierają drużynę A lub B.
4. Punkty sumują się do drużyny.
5. Podium: miejsca 2 i 1 (drużyny).

---

## 8. Rodzaje pytań

| Typ | Opis |
|-----|------|
| **QUIZ** | Pytanie z jedną poprawną odpowiedzią (A/B/C/D). Może zawierać obrazek. |
| **Głosowanie** | Wybór A lub B (bez poprawnej odpowiedzi). |
| **Foto Głos** | Głosowanie z obrazkiem. |
| **Muzyka** | Pytanie z odtwarzanym dźwiękiem (np. rozpoznaj piosenkę). |
| **Hot or Not** | Dwa obrazki – gracz wybiera A lub B. |
| **Szacowanie** | Gracze wpisują liczbę – wygrywa najbliższa do poprawnej. |
| **Pytanie otwarte** | Chmura słów, dogrywka TAK/NIE (bez punktów). |
| **Pytanie z literą** | Gracze wpisują wyraz na daną literę, chmura słów, dogrywka TAK/NIE. |
| **Statki** | Gra w statki – strzały po kolei, trafienie = 100 pkt. |

### Opcje pytania

- **Speedrun** – punkty tylko dla 10 pierwszych poprawnych (1000→900→…→100 według kolejności).
- **Eliminacja** – zła odpowiedź = gracz odpada, wynik zerowany.

---

## 9. Punkty i mechanika

### Standardowe pytania (QUIZ, Muzyka)

- **Poprawna odpowiedź:** 100 pkt + bonus za czas (10 pkt za każdą sekundę do końca).
- **Zła odpowiedź:** 0 pkt.
- **Opcja „Wyłącz punkty za czas”:** tylko 100 pkt za poprawną (bez bonusu).

### Głosowanie / Foto Głos

- **100 pkt** za udział (wybór A lub B).

### Hot or Not

- 100 pkt za wybór (lub według poprawnej odpowiedzi, jeśli jest ustawiona).

### Speedrun

- Punkty według kolejności: 1. miejsce = 1000 pkt, 2. = 900, …, 10. = 100.
- Tylko 10 pierwszych poprawnych odpowiedzi dostaje punkty.

### Eliminacja

- Zła odpowiedź = gracz **eliminowany** (wynik zerowany, nie może grać dalej).

### Statki

- Trafienie = 100 pkt.

### Tryb drużynowy

- Punkty gracza są dodawane do sumy drużyny.

---

## 10. Rozwiązywanie problemów

### Telefon nie łączy się z grą

**Sprawdź po kolei:**

1. **Ta sama sieć WiFi** – komputer i telefon muszą być w tej samej sieci.
2. **Tunel Pinggy wyłączony** – jeśli testujesz WiFi, zatrzymaj tunel w panelu admina („Zatrzymaj tunel”). Gdy tunel jest włączony, telefony mogą używać tunelu zamiast WiFi.
3. **Firewall** – może blokować połączenia.

   **macOS:** Ustawienia → Bezpieczeństwo → Zapora → Opcje → dodaj Imprezja Quiz/Node do dozwolonych. Lub tymczasowo wyłącz zaporę do testów.
   
   **Windows:** Zapora Windows → Zezwól na Imprezja Quiz przez prywatną sieć.

4. **AP Isolation w routerze** – niektóre routery blokują komunikację między urządzeniami. Zaloguj się do panelu routera (np. 192.168.0.1), znajdź „AP Isolation” / „Client Isolation” i **wyłącz**.
5. **Test połączenia** – na telefonie wpisz w przeglądarce: `http://<IP_KOMPUTERA>:3000/test-connection` (np. `http://192.168.0.104:3000/test-connection`). Powinieneś zobaczyć JSON z informacją o połączeniu.

### Logi pokazują IP 127.0.0.1 zamiast 192.168.x.x

Oznacza to, że telefon łączy się przez **tunel Pinggy**, nie przez WiFi. Wyłącz tunel w panelu admina i spróbuj ponownie.

### Aplikacja się nie uruchamia

- **macOS:** Jeśli blokada Gatekeeper – `xattr -cr /Applications/Imprezja Quiz.app`
- **Windows:** Sprawdź czy Visual C++ Redistributable jest zainstalowany (typowy Windows 10/11 ma).
- Sprawdź logi: w folderze z aplikacją szukaj `imprezja-electron.log`.

### Port 3000 zajęty

Zamknij inne aplikacje używające portu 3000 lub zmień port w konfiguracji (wymaga edycji kodu).

### Uninstaller Windows nie działa (błąd NSIS, exe.exe)

Użyj instrukcji z pliku **NAPRAW_UNINSTALLER_WINDOWS.md** – ręczne usunięcie starej instalacji i ponowna instalacja nowej wersji.

### Dźwięki nie grają

- Sprawdź czy przeglądarka/ekran nie jest wyciszony.
- Pierwsza interakcja (klik) może być wymagana do odblokowania audio w przeglądarce.
- Na ekranie podium: dźwięk podziękowań gra po kliknięciu „Wyświetl podziękowania”.

### Brak obrazków/dźwięków w quizie

Pliki muszą być w folderze `uploads/` (lub w katalogu danych aplikacji). Edytor umożliwia upload przy dodawaniu pytań.

---

## Szybka ściągawka

| Co chcesz zrobić | Gdzie |
|------------------|-------|
| Prowadzić quiz | Panel admina → Wybierz Quiz → Załaduj → Pytania |
| Dołączyć graczy przez WiFi | QR „do gry w sieci lokalnej” lub generator QR WiFi |
| Grać przez internet (LTE) | Tunel → Uruchom tunel |
| Edytować quiz | editor.html |
| Tryb drużynowy | Konfiguracja Team Battle → AKTYWUJ |
| Aktywować licencję | Panel admina → Licencja → Wprowadź klucz |

---

*Imprezja Quiz – quiz i głosowanie w sieci lokalnej. Działa offline.*

© Damian Nowaczyk. Wszelkie prawa zastrzeżone.
