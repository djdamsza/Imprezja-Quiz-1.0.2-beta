# Optymalizacja sieci przy wielu telefonach (10+ graczy)

## Problem

Przy 10+ telefonach podłączonych przez router z kartą SIM (sieć komórkowa) mogą pojawić się:
- zawieszanie panelu admina,
- resetowanie konta admina,
- brak widoczności rankingów,
- ogólna niestabilność gry.

Przyczyną jest obciążenie sieci – wiele urządzeń jednocześnie wysyła i odbiera dane.

## Co zrobiliśmy w aplikacji

### 1. Throttling broadcastu (debounce 120 ms)

Serwer nie wysyła aktualizacji stanu po każdej odpowiedzi gracza. Zamiast tego zbiera zmiany i wysyła jedną aktualizację co 120 ms. Zmniejsza to liczbę wiadomości przy wielu jednoczesnych odpowiedziach.

### 2. Priorytet dla panelu admina

Panel admina dostaje aktualizacje **od razu**, bez throttle. Telefony graczy dostają zaktualizowany stan z opóźnieniem (120 ms). Dzięki temu panel admina nie zawiesza się przy dużej liczbie odpowiedzi.

### 3. Obsługa problemu „żadne pytanie się nie otwiera”

Gdy zdarza się, że **żadne** pytanie się nie otwiera (nie pojedyncze, ale wszystkie naraz), odświeżenie strony zwykle naprawia problem. W aplikacji:

- **Synchronizacja pytań po odświeżeniu** – po odświeżeniu panelu admina lista pytań jest pobierana z aktualnego stanu serwera, więc nie trzeba ponownie ładować quizu.
- **Banner rozłączenia** – gdy połączenie zostanie utracone (np. przy przeciążeniu sieci), wyświetla się czerwony banner z prośbą o odświeżenie strony.
- **Try-catch w obsłudze stanu** – błąd w jednej aktualizacji nie blokuje kolejnych.

### 4. Nie wysyłaj obrazków na telefony

W panelu admina jest przycisk **„Nie wysyłaj obrazków na telefony”**. Gdy jest włączony (zielony), telefony nie ładują obrazków pytań – tylko tekst. **Zalecane przy większej liczbie graczy** – ogranicza obciążenie sieci o ok. 60–80%. Obrazki nadal wyświetlają się na ekranie TV.

### 5. Automatyczne odświeżanie stanu na telefonach

Gdy telefon jest na ekranie głosowania i przez 3 sekundy nie dostaje aktualizacji od serwera, sam prosi o aktualny stan. Pomaga to przy chwilowych problemach z siecią – ekran może się zsynchronizować bez odświeżania strony. Jeśli ekran nadal się nie odświeża, gracz może kliknąć „Ponów” w banerze „Brak połączenia” lub odświeżyć stronę.

## Czy można nadawać jak radiostacja (multicast)?

**Pytanie:** Czy da się zorganizować ruch tak, żeby serwer „nadawał” raz, a wszystkie telefony odbierały to samo jednocześnie (jak radiostacja), zamiast wysyłać do każdego z osobna?

**Odpowiedź:** W praktyce **nie** – przynajmniej nie bez przepisania aplikacji na inny protokół.

- **Obecna architektura:** Socket.IO używa WebSocket (TCP). Każdy telefon ma osobne połączenie. Gdy serwer wysyła `update_state`, wysyła tę samą treść do każdego klienta – ale przez **osobne połączenie TCP**. Router i tak musi przekazać dane do każdego urządzenia z osobna.

- **Multicast (UDP):** Teoretycznie WiFi obsługuje multicast – jeden pakiet, wiele odbiorców. Ale:
  - Przeglądarki i Socket.IO nie korzystają z multicast.
  - Wymagałoby przejścia na UDP i innego protokołu.
  - Multicast na WiFi bywa zawodny (gubione pakiety).
  - Nie da się tego sensownie zrobić w aplikacji webowej bez głębokich zmian.

- **Co można zrobić:** Zmniejszyć **objętość** danych – np. wyłączyć obrazki na telefonach (przycisk w panelu admina). To daje realną redukcję ruchu, bez zmiany protokołu.

## Ograniczenie przepustowości – router i telefony

Aplikacja nie może ograniczyć przepustowości łącza. Można to zrobić na routerze lub na telefonach.

### Router – QoS (Quality of Service)

Wiele routerów z kartą SIM ma ustawienia QoS:

1. Zaloguj się do panelu routera (np. `192.168.0.1`).
2. Znajdź sekcję **QoS**, **Priorytety** lub **Traffic Management**.
3. Ustaw **wyższy priorytet** dla:
   - portu **3000** (serwer Imprezja Quiz),
   - adresu IP komputera z aplikacją.
4. Opcjonalnie: **niższy priorytet** dla innych usług (np. streaming, social media).

### Router – limit przepustowości dla telefonów

Jeśli router ma **limity przepustowości** (Bandwidth Limit) per urządzenie:

1. Ustaw **limit** dla telefonów graczy (np. 1–2 Mbps na urządzenie).
2. Komputer z aplikacją – bez limitu lub wyższy limit.
3. Dzięki temu telefony nie będą „zabierać” całego łącza innym usługom.

### Telefony – tryb oszczędny danych

Przed grą warto:

1. **Wyłączyć dane komórkowe** na telefonach – gra działa przez WiFi.
2. **Włączyć tryb oszczędny danych** – ogranicza działanie aplikacji w tle.
3. **Zamknąć inne aplikacje** – mniej ruchu w tle.
4. **Tryb samolotowy + WiFi** – tylko WiFi, bez danych komórkowych.

### Sieć – preferowanie WiFi zamiast tunelu

- Używaj **WiFi** zamiast tunelu Pinggy, jeśli to możliwe.
- Tunel przez sieć komórkową zwiększa opóźnienia i obciążenie.
- Tunel ma sens tylko wtedy, gdy WiFi nie jest dostępne.

### Problem: nagrywanie i zdjęcia na imprezie

Na imprezach uczestnicy często nagrywają filmy i robią zdjęcia. Po podłączeniu do WiFi telefony automatycznie wysyłają je do chmury (iCloud, Google Photos, Dropbox itp.), co **mocno obciąża łącze** i może sparaliżować grę.

**Rozwiązania:**
- **Tryb samolotowy + WiFi** na telefonach graczy – wyłącza dane komórkowe, ale WiFi nadal działa; może ograniczyć synchronizację w tle.
- **Prośba do uczestników**: przed grą zamknąć aplikacje zdjęć i wyłączyć auto-backup na czas quizu.
- **QoS na routerze** – wyższy priorytet dla portu 3000 (Imprezja Quiz).
- **Limit przepustowości** dla telefonów – jeśli router ma taką opcję.

---

## Router Cudy LT400 – limity i QoS

Cudy LT400 ma wbudowany **QoS** w panelu administracyjnym.

### Dostęp do panelu

1. Otwórz przeglądarkę i wejdź na: **http://cudy.net/** lub **http://192.168.10.1/**
2. Zaloguj się hasłem: **admin**

### Gdzie szukać QoS

W menu **Network** (sieć) jest opcja **QoS**. Panel LT400 oparty jest na OpenWrt/LuCI, więc możesz tam ustawiać priorytety ruchu.

### Co ustawić dla Imprezja Quiz

1. **QoS** – włącz i ustaw **wyższy priorytet** dla:
   - portu **3000** (TCP),
   - adresu IP komputera z aplikacją.
2. **Bandwidth limit** – jeśli dostępny, ustaw **limit przepustowości** dla telefonów (np. 1–2 Mbps na urządzenie), żeby nie „zabierały” całego łącza przy wysyłaniu zdjęć i filmów.
3. **Band Lock** – jeśli łącze LTE jest niestabilne, w **Cellular → APN** włącz ręczny wybór pasma (Band Select) i ustaw pasmo z najlepszym zasięgiem.

### Inne przydatne opcje LT400

- **Guest Network** – sieć gości (można ograniczyć pasmo).
- **IP/MAC Binding** – przypisanie IP do urządzeń.
- **Domain Filter** – blokowanie domen (np. ograniczenie social media podczas gry).
- **TTL** – w **Advanced Settings → Network → TTL** ustaw 64 lub 65, jeśli operator ogranicza tethering.

### Gdy LT400 nie ma limitu per urządzenie

Jeśli w QoS nie ma limitu przepustowości per urządzenie, pozostają:
- QoS z priorytetem dla portu 3000,
- prośba do uczestników o wyłączenie synchronizacji zdjęć/filmów,
- tryb samolotowy + WiFi na telefonach graczy.

---

## Zalecenia przy 10+ graczach

1. **WiFi zamiast tunelu** – jeśli masz stabilne WiFi.
2. **QoS na routerze** – wyższy priorytet dla portu 3000 i komputera z aplikacją.
3. **Limit przepustowości** dla telefonów – jeśli router to obsługuje.
4. **Zamknięte inne aplikacje** na telefonach graczy.
5. **Wyłączone dane komórkowe** na telefonach – tylko WiFi.

## Zmienne środowiskowe (opcjonalnie)

Można zmienić czas debounce broadcastu dla telefonów (domyślnie 120 ms):

```bash
# Zwiększ do 200 ms przy bardzo słabym łączu (mniej aktualizacji, mniejsze obciążenie)
IMPREZJA_BROADCAST_DEBOUNCE_MS=200 node server.js
```

Panel admina nadal dostaje aktualizacje od razu – zmienna dotyczy tylko telefonów graczy.
