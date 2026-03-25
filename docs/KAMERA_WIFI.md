# Kamera przez WiFi – lepsze działanie

Kamera w Imprezji przesyła klatki z telefonu na ekran TV przez WebSocket (JPEG). Przy słabym WiFi obraz może być opóźniony lub przerywany.

---

## Sposoby bez programowania

### 1. Sieć WiFi

- **5 GHz zamiast 2,4 GHz** – jeśli router obsługuje oba pasma, połącz telefon i komputer z siecią 5 GHz. Mniej zakłóceń, wyższa przepustowość.
- **Blisko routera** – telefon i komputer jak najbliżej routera.
- **Mniej urządzeń na WiFi** – wyłącz nieużywane telefony, tablety, smart TV.
- **Sieć gości** – jeśli masz Guest Network, użyj jej tylko dla gry (mniej ruchu od innych urządzeń).

### 2. Komputer na kablu

- **Komputer podłączony kablem LAN** do routera – mniej obciąża WiFi, stabilniejsze połączenie.
- Telefon na WiFi, komputer na LAN – typowy układ dla imprez.

### 3. Ograniczenie ruchu w tle

- Na telefonie: **wyłącz dane komórkowe** podczas gry (żeby nie przełączał się na LTE).
- **Tryb samolotowy + WiFi** – wymusza tylko WiFi (Android).
- Zamknij inne aplikacje zużywające sieć (aktualizacje, streaming).

### 4. Jakość obrazu w aplikacji

W pliku `admin-pwa.html` są stałe:
- `CAMERA_FPS` (domyślnie 12) – liczba klatek na sekundę
- `CAMERA_MAX_W` (domyślnie 1280) – maksymalna szerokość w pikselach
- Jakość JPEG (0.7) – w kodzie przy `toDataURL`

**Przy słabym WiFi** można ręcznie obniżyć w kodzie:
- `CAMERA_FPS = 8` – mniej klatek, mniej danych
- `CAMERA_MAX_W = 640` – mniejsza rozdzielczość
- Jakość JPEG `0.5` – mniejszy rozmiar pliku

---

## Co NIE wymaga zmian w kodzie

| Działanie | Efekt |
|-----------|--------|
| Telefon i komputer w sieci 5 GHz | Mniej zakłóceń, szybszy transfer |
| Komputer na kablu LAN | Mniej obciążenia WiFi |
| Blisko routera | Lepszy sygnał |
| Wyłączenie danych komórkowych na telefonie | Brak przełączania na LTE |
| Mniej urządzeń na WiFi | Więcej przepustowości dla kamery |

---

## Dalsze ulepszenia (wymagają programowania)

- **WebRTC** – stream wideo zamiast klatek JPEG (dużo mniej opóźnień, ale wymaga większych zmian).
- **Adaptacyjna jakość** – obniżanie rozdzielczości/FPS przy wykryciu opóźnień.
- **Kompresja** – np. WebP zamiast JPEG (mniejszy rozmiar przy podobnej jakości).

---

## Stream ekranu (odbić ekranu na TV)

- **Działa tylko na komputerze** – Chrome, Edge (Windows/Mac), Safari (Mac).
- **Nie działa na telefonie** – Chrome/Brave na Android ani Safari na iPhone nie obsługują `getDisplayMedia`. Do streamu ekranu użyj komputera.
