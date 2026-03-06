# FAQ – Najczęściej zadawane pytania

**Imprezja Quiz – odpowiedzi na częste pytania**

---

## Ogólne

### Czym jest Imprezja Quiz?

Imprezja Quiz to aplikacja desktopowa do prowadzenia quizów i głosowań na imprezach. Gracze łączą się telefonami przez WiFi (lub przez internet – tunel), odpowiadają na pytania i zdobywają punkty. Wyświetlanie na ekranie TV, prowadzenie z panelu admina (również z telefonu).

### Na jakich systemach działa Imprezja Quiz?

- **Windows** (10, 11) – 64-bit
- **macOS** (Intel i Apple Silicon M1/M2/M3) – pliki DMG dopasowane do architektury

### Czy potrzebuję internetu do gry?

**Nie.** Program działa w sieci lokalnej WiFi. Gracze i komputer muszą być w tej samej sieci.  
**Opcjonalnie:** Funkcja „Tunel” pozwala grać przez internet (np. LTE), gdy gracze nie mają WiFi – wtedy potrzebny jest internet na komputerze prowadzącym.

---

## Licencja i trial

### Jak długo mogę testować program za darmo?

**14 dni.** Po uruchomieniu aplikacja działa w trybie trial przez 14 dni. Po tym czasie wymagana jest aktywacja kluczem licencyjnym.

### Jak kupić licencję?

1. Wejdź na stronę wydawcy.
2. Pobierz program i uruchom go – na ekranie aktywacji zobaczysz **Machine ID** (identyfikator komputera).
3. Zamów licencję (formularz, e-mail) – podaj adres e-mail i Machine ID.
4. Po wpłacie otrzymasz klucz licencyjny (np. IMPREZJA-RSA-... lub IMPREZJA-XXXX-XXXX-XXXX-XXXX).
5. Wpisz klucz w aplikacji (panel admina lub ekran aktywacji) i kliknij „Aktywuj”.

### Co to jest Machine ID?

To identyfikator Twojego komputera, używany do powiązania licencji z urządzeniem. Jest wyświetlany na ekranie aktywacji oraz w panelu admina w sekcji „Licencja”. Potrzebny do zamówienia klucza.

### Czy mogę używać jednej licencji na wielu komputerach?

Nie. Standardowa licencja uprawnia do użytkowania na **jednym komputerze**. W przypadku zmiany komputera (sprzedaż, wymiana, awaria) możesz poprosić o **przeniesienie licencji** na nowy sprzęt. Napisz na biuro@imprezja.pl z adresu użytego przy zakupie, podaj nowy Machine ID (panel admina → Licencja). Otrzymasz nowy klucz w ciągu 2 dni roboczych. Limit: **2 przeniesienia** na klienta. Po przeniesieniu stara licencja na poprzednim komputerze zostaje unieważniona.

### Zgubiłem klucz licencyjny – co mam zrobić?

Skontaktuj się z nami pod adresem biuro@imprezja.pl. Podaj adres e-mail, z którego dokonałeś zakupu – sprawdzimy i pomożemy.

### „Okres testowy przypisany do innego komputera” – co robić?

Komunikat pojawia się, gdy plik z danymi triala wskazuje na inny identyfikator komputera. **Dane triala nie są usuwane przy odinstalowaniu** – zapisują się w katalogu użytkownika:

- **macOS:** `~/.imprezja-trial-start` i `~/.imprezja-license` (np. `/Users/TwojaNazwa/.imprezja-trial-start`)
- **Windows:** `%USERPROFILE%\.imprezja-trial-start` i `%USERPROFILE%\.imprezja-license`

Aby zresetować trial i uruchomić program od nowa (14 dni próbnych):

- **macOS** (Terminal): `rm ~/.imprezja-trial-start ~/.imprezja-license`
- **Windows** (cmd): `del %USERPROFILE%\.imprezja-trial-start` i `del %USERPROFILE%\.imprezja-license`

---

## Instalacja i uruchomienie

### Na Macu: „Nie można sprawdzić aktualizacji”

Komunikat oznacza, że aplikacja nie mogła połączyć się z serwerem aktualizacji (GitHub). Możliwe przyczyny:

- **Brak internetu** lub zapora blokuje połączenie.
- **Szczegóły błędu** – w oknie może być podany w nawiasie (np. timeout, ENOTFOUND). Sprawdź też log: w Finderze **Przejdź do folderu** → `~/Library/Logs/Imprezja Quiz/` lub w terminalu: `~/Library/Application Support/Imprezja Quiz/` (plik z logami Electron).

**Na razie:** pobierz najnowszą wersję ręcznie ze [strony wydawcy](https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/latest) (DMG dla Apple Silicon lub Intel) i zainstaluj nadpisując aplikację.

### Nie mogę zaktualizować automatycznie z 1.0.4 do 1.1.1 (brak oferty aktualizacji)

Aplikacja 1.0.4 mogła nie pokazywać aktualizacji do 1.1.1 (beta), bo mechanizm aktualizacji domyślnie nie uwzględniał wersji „beta” na GitHub. **W nowszych buildach (1.1.1+) to zostało poprawione** – sprawdzanie aktualizacji obejmuje też wersje beta.

**Jeśli nadal masz 1.0.4 i nie widzisz aktualizacji:** pobierz 1.1.1 ręcznie ze strony wydawcy lub z [GitHub Releases](https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases), **odinstaluj starą wersję** (Panel sterowania → Programy i funkcje → Imprezja Quiz), potem zainstaluj nową. Dane (quizy, licencja) są w folderze użytkownika i nie giną przy odinstalowaniu.

### Instalator się wywala / nie instaluje nowej wersji (np. 1.1.1)

**Aktualizacja:** Instalator przy aktualizacji sam zamyka aplikację i czyści stare wpisy (od wersji 1.1.x). Jeśli w trakcie instalacji pojawi się okno błędu (np. „Program nie zakończył się poprawnie”), wybierz **Kontynuuj** / **Dalej** – instalacja powinna dokończyć się poprawnie.

Jeśli nadal występuje problem (np. bardzo stara wersja w systemie):

1. **Zamknij** Imprezja Quiz (jeśli działa).
2. **Odinstaluj starą wersję:** Panel sterowania → Programy i funkcje → **Imprezja Quiz** → Odinstaluj. W razie błędu odinstalowania użyj **napraw-uninstaller.bat** (jako administrator).
3. Uruchom **nowy instalator** (np. 1.1.1).

Po odinstalowaniu poprzedniej wersji instalator zwykle działa poprawnie.

### Instalator: „Nie udało się usunąć plików starej wersji aplikacji”

1. Zamknij Imprezja Quiz.
2. Uruchom `napraw-uninstaller.bat` (PPK → **Uruchom jako administrator**).
3. Poczekaj na zakończenie skryptu.
4. Uruchom instalator ponownie.

### Instalator 1.0.3 / 1.0.4 – komunikat „zamknij aplikację” mimo że nie działa

1. Uruchom **`napraw-uninstaller.bat`** (prawy przycisk → **Uruchom jako administrator**).
2. Poczekaj na zakończenie – skrypt usuwa stare pliki i wpisy rejestru.
3. Uruchom instalator (prawy przycisk → **Uruchom jako administrator**).
4. **Nowe buildy (1.0.4+)** – instalator sam zamyka procesy przed instalacją.
5. Jeśli nadal się nie udaje – wyłącz tymczasowo antywirus (np. Windows Defender) na czas instalacji.

### Windows: wyskoczyło okno z pytaniem o dostęp do sieci – zamknąłem je, teraz admin/telefony nie łączą się

Przy pierwszym uruchomieniu Windows może pokazać **okno Zapory** z pytaniem, czy zezwolić aplikacji na dostęp do sieci (prywatnej/publicznej). Jeśli je **zamkniesz** lub wybierzesz „Anuluj”, aplikacja zostanie **zablokowana** i telefony nie połączą się z serwerem (admin z telefonu, gra przez WiFi).

**Jak dać dostęp po fakcie:**

1. Otwórz **Zaporę Windows** (Start → wpisz „Zapora Windows” → „Zapora Windows Defender z zabezpieczeniami w zaawansowanym” lub: Ustawienia → Prywatność i zabezpieczenia → Zapora Windows).
2. Po lewej: **„Zezwól aplikacji lub funkcji przez Zaporę Windows Defender”** → **„Zmień ustawienia”** (wymagane uprawnienia administratora).
3. Na liście znajdź **„Imprezja Quiz”** (lub „ImprezjaQuiz”). Zaznacz **„Prywatne”** (sieć domowa). Zapisz (OK).
4. Jeśli aplikacji **nie ma na liście**: kliknij **„Zezwól innej aplikacji…”** → **Przeglądaj** → wskaż plik programu, np.  
   `C:\Users\<TwojaNazwa>\AppData\Local\Programs\Imprezja Quiz\ImprezjaQuiz.exe`  
   (ścieżkę sprawdzisz: prawy przycisk na skrócie → Właściwości → „Element docelowy”).
5. **Uruchom ponownie** Imprezja Quiz i sprawdź połączenie z telefonu.

Przy następnym uruchomieniu, jeśli znowu wyskoczy pytanie – wybierz **„Sieci prywatne”** (lub obie) i **Zezwól**.

### Komputer na LAN (kabel), telefony na WiFi – admin/gra nie łączą się

Komputer podłączony kablem do routera i telefony na WiFi w tej samej sieci – połączenie powinno działać. Jeśli **admin z telefonu się nie otwiera** ani **gra przez WiFi nie łączy**:

1. **Zapora Windows** – najczęstsza przyczyna. Zezwól aplikacji Imprezja Quiz na dostęp w sieci **prywatnej** (patrz pytanie powyżej: „Windows: wyskoczyło okno z pytaniem o dostęp do sieci”).
2. **Tunel (LTE)** działa przez internet i nie zależy od LAN/WiFi. **Tunel jednym kliknięciem** na Windows wymaga **Klienta OpenSSH**. Przy instalacji aplikacja dodaje regułę zapory dla tunelu (ssh.exe). Log błędów: `%APPDATA%\Imprezja Quiz\tunnel.log`. Jak zainstalować OpenSSH – patrz pytanie poniżej.

Więcej: dokumentacja w pliku ROUTER_SIECI.md (sekcje 6 i 7).

### Windows 10/11: Jak zainstalować Klient OpenSSH (dla tunelu jednym kliknięciem)?

**Automatycznie przy instalacji:** Gdy Klient OpenSSH nie jest zainstalowany, instalator **otworzy osobne okno** z prośbą o uprawnienia (UAC). Kliknij **Tak** – wtedy doinstaluje się OpenSSH (1–2 minuty). Nie trzeba uruchamiać całego instalatora jako administrator; tylko to jedno okno poprosi o zatwierdzenie. Po tym tunel LTE jednym kliknięciem działa bez dodatkowych kroków.

**Ręcznie (gdy automatyczna instalacja się nie udała):**

**Sposób 1 – Ustawienia (jeśli widzisz „Funkcje opcjonalne”):**  
Ustawienia → Aplikacje → **Funkcje opcjonalne** (lub „Dodaj funkcję opcjonalną”) → **Dodaj funkcję** → wyszukaj **Klient OpenSSH** → Zainstaluj.

**Sposób 2 – Okno „Funkcje systemu”:**  
Naciśnij **Win + R**, wpisz: **optionalfeatures** i naciśnij Enter. Na liście zaznacz **Klient OpenSSH** (lub „Open SSH Client”), OK, poczekaj na instalację.

**Sposób 3 – PowerShell (administrator):**  
Otwórz **PowerShell jako administrator** (Start → wpisz „PowerShell” → prawy przycisk → Uruchom jako administrator). Wklej i uruchom:
```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```
Gdy status będzie „Installed”, zamknij PowerShell i uruchom ponownie Imprezja Quiz.

### Antywirus blokuje instalator (Windows) – co robić?

Niektóre programy antywirusowe mogą oznaczać nowe instalatory jako podejrzane. Możesz:
- Użyć wersji **portable** (bez instalacji), jeśli dostępna,
- Dodać wyjątek dla Imprezja Quiz w ustawieniach antywirusa,
- Tymczasowo wyłączyć antywirus na czas instalacji.

### Avast blokuje instalator / uninstaller (Windows) – IDP.Generic itp.

**Avast** często zgłasza fałszywe alarmy dla instalatorów Electron (np. **IDP.Generic**, Win32:Malware-gen). Instalator od wersji 1.1.2 przy **pierwszej instalacji** nie modyfikuje rejestru ani nie zamyka procesów – te kroki wykonuje tylko przy **aktualizacji** (mniej triggerów dla heurystyk).

**Gdy Avast zablokuje instalator:**

1. **Daj Avastowi czas** – po pobraniu poczekaj 1–2 minuty, aż plik zostanie zeskanowany.
2. **Wyjątek:** Avast → Ustawienia → Ogólne → **Wyjątki** → dodaj folder z pobranym instalatorem (np. `Downloads`) lub ścieżkę `%LocalAppData%\Programs\Imprezja Quiz`.
3. **Uruchom instalator** ponownie (PPK → Uruchom jako administrator). Przy aktualizacji: w razie błędu odinstalowania użyj **napraw-uninstaller.bat** (jako administrator), potem zainstaluj od nowa.
4. **Zgłoszenie fałszywego alarmu:** [Avast – zgłoś fałszywy alarm](https://www.avast.com/false-positive-file-form.php) – pomaga w przyszłych wersjach. **Podpisanie kodu** (certyfikat EV/OV) praktycznie eliminuje te alarmy, ale wymaga zakupu certyfikatu.

### Windows (64 bity): „Ta aplikacja nie będzie działać na tym komputerze”

Aplikacja jest budowana tylko dla **Windows 64-bit** (x64). Jeśli masz **64-bitowy Windows** i widzisz ten komunikat:

1. **Uruchom jako administrator** – prawy przycisk na instalatorze lub skrócie → „Uruchom jako administrator”.
2. **SmartScreen** – jeśli Windows pokazuje „Windows chronił Twój komputer”, wybierz „Więcej informacji” → „Uruchom mimo to” (plik musi być pobrany z zaufanego źródła).
3. **Antywirus** – tymczasowo wyłącz lub dodaj wyjątek dla folderu z instalatorem i dla `%LocalAppData%\Programs\Imprezja Quiz`.
4. **Visual C++ Redistributable** – zainstaluj [Microsoft Visual C++ 2015–2022 Redistributable (x64)](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist). Electron może tego wymagać na czystym systemie.
5. **Sprawdź typ systemu** – Ustawienia → System → Informacje o systemie → „Typ systemu”. Powinno być „Komputer z procesorem opartym na architekturze x64”. Jeśli jest „x86” (32 bity), potrzebna byłaby wersja 32-bitowa (obecnie nie wydajemy jej).

### macOS blokuje uruchomienie – „Aplikacja od nieznanego dewelopera”

Otwórz **Ustawienia systemowe** → **Poufność i bezpieczeństwo** → **Bezpieczeństwo** i kliknij **„Otwórz mimo to”** obok komunikatu.  
Alternatywnie w Terminalu: `xattr -cr /Applications/Imprezja Quiz.app`

### Gdzie są zapisane quizy i dane aplikacji? Czy odinstalowanie je usuwa?

**Nie.** Quizy i uploady są w katalogu danych użytkownika, który **nie jest usuwany** przy odinstalowaniu:

- **macOS:** `~/Library/Application Support/votebattle/` (np. `/Users/TwojaNazwa/Library/Application Support/votebattle`)
- **Windows:** `%APPDATA%\Imprezja Quiz\` (lub `%APPDATA%\votebattle\`)

Wewnątrz: `quizzes/` (pliki quizów), `uploads/` (obrazy, dźwięki).

**Aby przy nowej instalacji dostać świeże quizy z aplikacji**, usuń ten folder przed instalacją:

- **macOS** (Terminal): `rm -rf ~/Library/Application\ Support/votebattle`
- **Windows** (cmd): `rmdir /s /q "%APPDATA%\votebattle"` (lub `"%APPDATA%\Imprezja Quiz"`)

### Gdzie znajdę panel admina?

- **Na komputerze:** `http://localhost:3000/admin.html`
- **Na telefonie:** Zeskanuj QR kod „Admin” wyświetlany na ekranie TV lub wpisz adres `http://<IP_KOMPUTERA>:3000/admin.html` (IP widoczny na ekranie).

---

## Połączenie i gra

### Gracze nie mogą się połączyć z grą – co sprawdzić?

1. **Ta sama sieć WiFi** – komputer i telefony muszą być w tej samej sieci.
2. **Tunel wyłączony** – Jeśli testujesz WiFi, zatrzymaj tunel w panelu admina („Zatrzymaj tunel”).
3. **Firewall** – dodaj Imprezja Quiz do dozwolonych (macOS: Zapora → Opcje; Windows: Zapora → Zezwól).
4. **AP Isolation** – w routerze wyłącz „AP Isolation” / „Client Isolation” (blokuje komunikację między urządzeniami).
5. **Router Xiaomi** – niektóre routery Xiaomi mają problemy z QR kodem WiFi. Gracze mogą połączyć się ręcznie (wpisać hasło sieci) lub użyć innego routera.

### Jak grać bez WiFi (gracze mają tylko LTE)?

Użyj funkcji **Tunel** w panelu admina. Kliknij „Uruchom tunel i generuj QR” – po chwili pojawi się adres i kod QR. Gracze skanują QR i łączą się przez internet.  
**Uwaga:** Tunel wymaga internetu na komputerze. Wersja darmowa Pinggy ma limit ok. 60 minut na jedno połączenie.

### Jak dodać własne quizy?

1. Otwórz edytor: `http://localhost:3000/editor.html` (lub z adresem IP Twojego komputera).
2. Stwórz nowy quiz lub wczytaj istniejący.
3. Dodawaj pytania (QUIZ, Głosowanie, Muzyka, Hot or Not, Szacowanie, Statki itd.).
4. Zapisz na serwerze – quiz pojawi się na liście w panelu admina.

---

## Tryby gry i typy pytań

### Czy jest tryb drużynowy?

Tak. W panelu admina w sekcji **Konfiguracja Team Battle** wpisz nazwy drużyn (np. „Panny Młodej”, „Pana Młodego”) i kliknij **AKTYWUJ TRYB DRUŻYNOWY**. Gracze przy logowaniu wybierają drużynę A lub B. Punkty sumują się do drużyny.

### Jakie rodzaje pytań są dostępne?

- **QUIZ** – pytanie z poprawną odpowiedzią (A/B/C/D)
- **Głosowanie** – wybór A lub B (bez poprawnej)
- **Foto Głos** – głosowanie z obrazkiem
- **Muzyka** – pytanie z odtwarzanym dźwiękiem
- **Hot or Not** – dwa obrazki, wybór A lub B
- **Szacowanie** – gracze wpisują liczbę, wygrywa najbliższa
- **Pytanie otwarte** – chmura słów
- **Pytanie z literą** – gracze wpisują słowo na daną literę
- **Statki** – gra w statki, strzały po kolei

Dodatkowo: **Speedrun** (punkty za kolejność) i **Eliminacja** (zła odpowiedź = odpadasz).

---

## Problemy techniczne

### Dźwięki nie grają

- Sprawdź czy przeglądarka/ekran nie jest wyciszony.
- Pierwsza interakcja (klik) może być wymagana do odblokowania audio w przeglądarce.
- Na podium: dźwięk podziękowań gra po kliknięciu „Wyświetl podziękowania”.

### Brak obrazków lub dźwięków w quizie

Pliki muszą być w folderze `uploads/` (lub w katalogu danych aplikacji). W edytorze przy dodawaniu pytań możesz uploadować pliki bezpośrednio.

### Uninstaller (Windows) nie działa – błąd NSIS

1. Zamknij Imprezja Quiz.
2. Uruchom **`napraw-uninstaller.bat`** (prawy przycisk → Uruchom jako administrator) – w folderze z aplikacją.
3. Poczekaj na zakończenie, potem uruchom instalator ponownie.

Jeśli nadal nie działa: usuń ręcznie foldery `%APPDATA%\Imprezja Quiz` i `%LOCALAPPDATA%\Programs\Imprezja Quiz`, potem zainstaluj od nowa.

### Gdzie są logi przy błędach?

W folderze z aplikacją szukaj pliku **`imprezja-electron.log`**. Możesz go dołączyć do raportu błędów (panel admina → przycisk „Wyślij raport błędów”).

---

## Błędy i raporty

### Czy mogą wystąpić błędy w aplikacji?

**Tak.** Aplikacja jest w aktywnej fazie rozwoju. W trakcie użytkowania mogą wystąpić różnego rodzaju błędy lub niezgodności. Liczymy na raporty od użytkowników – w panelu admina znajdziesz przycisk „Wyślij raport błędów”, który pozwala szybko przekazać informacje o problemach. Dzięki temu możemy sprawnie je eliminować i udoskonalać produkt.

---

## Kontakt i wsparcie

### Jak skontaktować się z wydawcą?

**E-mail:** biuro@imprezja.pl  
**Adres:** ul. Wrzosowa 19, 63-421 Przygodzice

Odpowiadamy zwykle w ciągu 1–2 dni roboczych.

### Gdzie znajdę pełną instrukcję?

Instrukcja użytkownika jest dostępna w pliku **INSTRUKCJA_UZYTKOWNIKA.md** (do pobrania ze strony) lub w dokumentacji aplikacji.

---

*Ostatnia aktualizacja: 11 lutego 2026 r.*

© Damian Nowaczyk. Wszelkie prawa zastrzeżone.
