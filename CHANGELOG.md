# Changelog – Imprezja Quiz

---

## v1.2.0 (marzec 2026) — wydanie stabilne

### Familiada
- **Bank pytań uniwersalnych** – nowy plik `universal-bank.json` z ok. 275 pytaniami (jedzenie, muzyka, sport, transport, kolory, film itd.). Panel w edytorze: paginacja, przyciski „Dodaj” i „Usuń”.
- **Pytania klasyczne** – lista `Pytania klasyczne.json` z wyborem pytań z banku uniwersalnego, gotowa do użycia.
- **Przycisk „Reset przycisków”** – w panelu admina Familiady, pod DŻINGIEL. Ponowne odblokowanie przycisków na telefonach po przypadkowym naciśnięciu.

### Kamera (stream na TV)
- **Optymalizacje streamingu** – rozdzielczość 640×480, 12 kl/s, JPEG 0.5, binarny Blob zamiast base64. Wysyłka ramek tylko do ekranu TV (nie do admina/telefonów). Znacznie mniejsze obciążenie sieci lokalnej.

### Pierwsze uruchomienie
- **Instrukcja onboarding** – przy pierwszym uruchomieniu pojawia się overlay z krótką instrukcją: ekran główny, ekran prezentera, Admin PWA (jedna synchronizacja), edytor, wymagania techniczne (kamera, mikrofon, Wi‑Fi). Wymaga kliknięcia „Zapoznałem się”. Można wyświetlić ponownie przez menu ⚙️ → „Pokaż instrukcję ponownie”.

### Strony WordPress / linki
- Zaktualizowane linki do pobrania v1.2.0 – sukces.html, sukces-wklej.html, stripe-cennik.html.

---

## v1.1.9 (marzec 2026) — wydanie stabilne

**Ta wersja zastępuje 1.1.5 – naprawia krytyczny błąd rozłączania graczy.**

### Połączenie (krytyczna naprawa)
- **Naprawiono krytyczny błąd rozłączania** – wersja 1.1.5 miała poważny problem z utrzymaniem połączenia; 1.1.9 go naprawia i zajmuje jej miejsce jako stabilna.

### Panel admina
- **Przycisk „Ranking graczy”** – przywrócony we wszystkich trybach (quiz, WYBORCZY, SHIPS itd.). Ukrywany tylko podczas pytania HNC (Hot or Not Championship), zgodnie z zamierzeniem.

### Statki Solo
- **Soundtrack** – usunięto pole wyszukiwania w uploads; wybór pliku audio tylko przez systemowe okno plików.

### Statki w quizie (Screen.html, vote.html)
- **Panel floty** – liczba statków, rozmiary (np. 1×5 1×4 2×3 1×2), wizualizacja trafień per statek, licznik „Trafienia: X/Y”.
- **Panel floty i tabela trafień** – zawsze widoczne na vote.html (nie znika po „Następna runda”).

### Audio (Screen.html)
- **Głośność SHIPS** – suwak master volume w adminie zmienia teraz głośność tła statków.
- **Konflikt muzyki** – przy wejściu w pytania WYBORCZY i HNC zatrzymywane są intro, ships, podium, clock, sfx – aby nie grały równolegle.

### Stripe-shop (sklep, WordPress)
- **Linki checkout** – trasa `GET /checkout?plan=...` zarejestrowana przed `express.static`, dzięki czemu przekierowanie do Stripe działa zamiast serwowania strony checkout.html.
- **Linki w nowej karcie** – przyciski „Wybierz”/„Kup” mają `target="_blank"` – Stripe Checkout otwiera się w nowej karcie.

### Build
- **Windows** – skrypt `prepare-win-icon.js` – generuje icon.ico 256×256 z PNG przed buildem (wymagane przez electron-builder).
- **Dependency** – dodano `sharp-ico` do devDependencies.

### Strony WordPress / linki
- Zaktualizowane linki do pobrania (v1.1.9) – nazwy plików na GitHub: kropki zamiast spacji (`Imprezja.Quiz.Setup.1.1.9.exe` itd.).
- Pliki: sukces.html, sukces-wklej.html, stripe-cennik.html, 09-pobierz-1.1.6.html, imprezja-quiz-produkt-pelna-tresc.html.

---

## v1.1.7 (marzec 2026) — wydanie stabilne

### Imprezator (utwory do tańca)
- **Nowa wtyczka:** Imprezator – muzyka do tańca dla animatorów. Dodawanie plików i folderów z dysku, lista utworów zapisywana w JSON (tylko odwołania, pliki pozostają na dysku). Każdy użytkownik wgrywa własne pliki – build zawiera pustą domyślną listę.
- Ekran z QR do telefonu, panel na komputerze i na telefonie.

### Build
- Wykluczenie `public/imprezator-configs` z paczki – domyślna lista Imprezatora jest pusta, bez prywatnych linków.
- Skrypt `rebuild:full` – pełne przebudowanie (czyszczenie cache, reinstalacja Electron, build).

---

## v1.1.6 (marzec 2026) — wydanie stabilne

### Tunel (Mac Intel)
- **Naprawiono crash przy uruchomieniu tunelu na Mac Intel:** build Mac x64 był pakowany z binarką cloudflared dla arm64 (pobraną na Apple Silicon). Na Intel Mac spawn(arm64) wywalał program. Przed buildem Mac x64 binarka jest teraz podmieniana na darwin-amd64.

### Ekran TV (Screen.html)
- **Statystyki quizu:** naprawiono pasek procentowy – zamiast kwadratu wyświetla się teraz prawidłowy pasek odpowiadający udziałowi procentowemu odpowiedzi.
- **Pytania muzyczne z 5 odpowiedziami:** odpowiedzi wyświetlają się zawsze w 5 wierszach (1 kolumna), bez zmiennego układu.
- Animowany ranking: gracze zmieniający pozycję przesuwają się płynnie w górę lub dół (animacja FLIP, 0,9 s, etapowo co 1 s). Animacja nie pojawia się przy pierwszym otwarciu – tylko przy kolejnych zmianach.
- Naprawiono pozycję startową animacji rankingu – wiersze nie pojawiają się już za wysoko (nad napisem „Ranking").
- Przyciski (Edytor, Cofnij, Admin, Rozpocznij, Zakończ) znikają automatycznie po włączeniu trybu pełnoekranowego.
- Ekran końcowy z podziękowaniami: naprawiono układ tekstu obok obrazka – treść i logo wyświetlają się obok siebie bez nakładania.
- QR kod admina: widoczny do momentu zalogowania admina, po zalogowaniu znika i nie wraca. „Admin na komputerze" nie ukrywa QR – można jednocześnie mieć otwartego admina zdalnie i lokalnie.

### Panel admina (admin.html)
- Ranking graczy wyświetlany jest teraz wewnątrz bloku pytania (rozwijana sekcja nad przyciskiem „Następne"), a nie jako wyskakujące okno.
- Przy nickach graczy w rankingu widoczne są strzałki zmian pozycji (▲▼).
- Tabela trafień w trybie Statki: naprawiony układ kolumn (`table-layout: fixed`), długie nicki obcięte z `…`, właściwe proporcje kolumn.

### Telefony graczy (vote.html)
- Odpowiedzi QUIZ i MUZYCZNE wyświetlają się w jednej kolumnie (4 kafelki pionowo) na wszystkich urządzeniach – koniec z poziomym ściskaniem nieczytelnych kafli.
- Ranking na telefonie: styl zgodny z ekranem TV (złoto/srebro/brąz dla TOP 3, strzałki zmian, wyświetlenie po 3 sekundach od otwarcia).
- Długie nicki graczy: obcięte z `…` na końcu, strzałka zmiany pozycji zawsze widoczna obok nicku.
- Pytanie z literą: wymagana litera wyświetlana w wyraźnym, dużym polu (64×64 px) obok pola tekstowego – gracze od razu wiedzą, że mają wpisać literę, a nie ją przepisywać.
- Szacowanie: suwak startuje w losowym miejscu zamiast wskazywać prawidłową odpowiedź.
- Pytanie otwarte: naprawiono błąd, przez który naciśnięcie „Wyślij" nie wysyłało odpowiedzi (pole tekstowe było czyszczone przy ponownym renderowaniu).
- Komunikat „STRZELAJ / CZEKAJ" w trybie Statki pojawia się prawidłowo; plansza i tabela trafień wyświetlane są od góry ekranu.

### Tryb Statki (pytanie quizowe)
- Rundy liczone poprawnie: 1 runda = wszyscy gracze oddają strzał, nowa runda zaczyna się gdy admin kliknie przycisk. Trafienia nie inkrementują licznika rund.
- Ekran TV: tabela wyników graczy widoczna przez cały czas gry; banery statusu „⚡ GRACZE STRZELAJĄ!" / „📊 RUNDA ZAKOŃCZONA" / „🏁 Koniec gry".
- Panel admina: naprawiona tabela trafień (poprawne wymiarowanie, brak „rozjeżdżania się" wartości).

### Edytor
- Ostrzeżenie przy uploadzie za małego obrazka (zbyt mała rozdzielczość dla pytań quizowych lub ekranu TV).

### Dokumentacja
- Dodano informację: zminimalizowanie okna aplikacji lub karty z panelem admina może rozłączyć graczy – podczas imprezy trzymaj okno widoczne (INSTRUKCJA_UZYTKOWNIKA.md, FAQ.md).

### Statki Solo (tryb standalone)
- Ekran TV: dodano baner statusu „🎯 STRZELAJ!" / „CZEKAJ", wizualne odliczanie 10 s, licznik strzałów „Strzał X".
- Limit czasu na strzał: 10 sekund – po przekroczeniu ekran wyświetla komunikat „⏱ Czas minął" i gra przechodzi do następnej kolejki.

---

## v1.1.5 (marzec 2026) — wydanie stabilne

### Instalator
- Ekran końcowy instalatora (Windows) z checkboxem „Uruchom Imprezja Quiz" po instalacji.
- Naprawiony błąd „integrity check has failed" przy odinstalowywaniu na Windows.
- Instalator Mac: poprawiony układ okna DMG.

### Bitwa wokalna
- Gotowy zestaw „Panie VS Panowie" załadowany domyślnie przy pierwszym uruchomieniu – bez ręcznego konfigurowania.
- Przycisk „← Cofnij" na ekranie gry (znika w trybie pełnoekranowym).

### Familiada – ekran TV
- Przycisk „← Cofnij" na ekranie Familiady (znika w trybie pełnoekranowym).

### Ekran TV (Imprezja Quiz)
- Przycisk „← Cofnij" na ekranie TV (znika w trybie pełnoekranowym).

### Panel admina
- Poprawione pozycjonowanie poradnika admina – nie jest już zasłaniany przez nagłówek ze statusem i liczbą graczy.

### Tunel LTE
- Poprawione wyświetlanie stanu tunelu po zatrzymaniu w panelu admina.

---

## v1.1.5-beta (19 luty 2026)

### Tunel LTE
- Zastąpiono poprzedni tunel nowym rozwiązaniem – bez hasła, bez limitu czasu, działa na Mac i Windows.
- Panel admina poprawnie pokazuje stan tunelu po jego zatrzymaniu.

### Gry muzyczne
- Sampler: dodano gotowe banki „Odpowiedzi" i „Prezentacja".
- Bitwa Wokalna: bank „Panie VS Panowie".
- Śpiewaj Dalej: zestaw weselny.
- Wszystkie zestawy piosenek wbudowane w instalator – gotowe od pierwszego uruchomienia.

---

## v1.1.1 (luty 2026)

### Familiada
- Ekran końcowy pokazuje wyniki i nazwy drużyn.
- Dźwięk przy każdym odsłonięciu odpowiedzi.
- Nazwy drużyn na przyciskach (zamiast stałych „NIEBIESCY"/„CZERWONI").
- W dżinglu widać nazwy drużyn i punkty.

### Gry muzyczne (NJR Sampler, Śpiewaj Dalej, Bitwa wokalna)
- Poprawione ładowanie banków i zestawów.
- Po zeskanowaniu QR gra startuje automatycznie – nie trzeba klikać „Start".
- Jeden przycisk Start/Stop (zielony/czerwony).
- Jedna gra muzyczna aktywna naraz – włączenie innej zatrzymuje poprzednią.
- Przycisk **Cofnij** na każdym ekranie gry – powrót do wyboru trybu.

### Ekran
- Ekran (TV/projektor) nie gaśnie w pełnym ekranie.

### Ekran startowy
- Większe, wyśrodkowane logo.
- Na trybach muzycznych znaczek (kłódka) – wymagana pełna licencja.
- Przycisk „Zakończ" zawsze pokazuje QR admina.

### Strona licencji
- Duże logo, czytelne ID komputera w ramce, przycisk **Cofnij**.

---

## v1.0.5 (luty 2026)

- Pliki audio z Virtual DJ (`.vdjsample`, `.ogg`) działają poprawnie.
- Śpiewaj Dalej: wizualizacja odtworzonych fragmentów (kolor → szary).
- Familiada: czytelniejsze cyfry, poprawka Złotej Listy i przekazywania punktów.

---

## v1.0.4 (luty 2026)

- **Nowy tryb: Familiada** – gra drużynowa, tablica odpowiedzi, pilot na telefonie.
- Ekran startowy: wybór Quiz lub Familiada.
- Złota Lista w Familiadzie (ulubione pytania).

---

## v1.0.3 (luty 2026)

- Naprawa panelu przy pytaniach (Statystyki, Odpowiedź, Ranking).
- Rozegrane pytania znikają z listy.
- Pytanie na literę: usunięto literę V, naprawa znikania wpisanego tekstu.

---

## v1.0.2

- Lepsza praca przy wielu telefonach (10+): mniej obciążenia sieci, priorytet dla admina.
- Przycisk „Nie wysyłaj obrazków na telefony" – szybsza gra na słabszym WiFi.
- Komunikat „Utracono połączenie" gdy odpadnie sieć.
- Poprawki dogrywki i odświeżania stanu na telefonach.
- Edytor: przesuwanie pytań w górę/dół.

---

Starsze wpisy (v1.0.1 i wcześniej) – w archiwum repozytorium.
