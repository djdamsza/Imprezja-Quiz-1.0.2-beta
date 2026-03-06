# Changelog – Imprezja Quiz

**Przed następnym release:** Zainstaluj GitHub CLI (`brew install gh`), zaloguj się (`gh auth login`) i zrób release z poziomu terminala: `gh release create vX.Y.Z dist/*.dmg "dist/Imprezja Quiz Setup X.Y.Z.exe" --title "vX.Y.Z" --notes "..."` – załączy buildy bez ręcznego wgrywania w przeglądarce.

---

## v1.1.1-beta (luty 2026)

### Familiada
- Ekran końcowy pokazuje wyniki i nazwy drużyn.
- Dźwięk przy każdym odsłonięciu odpowiedzi.
- Nazwy drużyn na przyciskach (zamiast stałych „NIEBIESCY”/„CZERWONI”).
- W dżinglu widać nazwy drużyn i punkty.

### Gry muzyczne (NJR Sampler, Whitney, Śpiewaj Dalej, Bitwa wokalna)
- Poprawione ładowanie banków i zestawów.
- Po zeskanowaniu QR gra startuje automatycznie – nie trzeba klikać „Start”.
- Jeden przycisk Start/Stop (zielony/czerwony).
- Jedna gra muzyczna aktywna naraz – włączenie innej zatrzymuje poprzednią.
- Przycisk **Cofnij** na każdym ekranie gry – powrót do wyboru trybu.

### Ekran
- Ekran (TV/projektor) nie gaśnie w pełnym ekranie.

### Ekran startowy
- Większe, wyśrodkowane logo.
- Na trybach muzycznych znaczek (kłódka) – wymagana pełna licencja.
- Przycisk „Zakończ” zawsze pokazuje QR admina.

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
- Przycisk „Nie wysyłaj obrazków na telefony” – szybsza gra na słabszym WiFi.
- Komunikat „Utracono połączenie” gdy odpadnie sieć.
- Poprawki dogrywki i odświeżania stanu na telefonach.
- Edytor: przesuwanie pytań w górę/dół.

---

Starsze wpisy (v1.0.1 i wcześniej) – w archiwum repozytorium.
