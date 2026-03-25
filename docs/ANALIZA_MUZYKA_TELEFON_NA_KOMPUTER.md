# Analiza: Muzyka z telefonu (YouTube, Spotify, Tidal) → dźwięk na komputerze

**Pytanie:** Czy można dać użytkownikowi możliwość wyszukania piosenki na telefonie (YouTube, Spotify, Tidal) i odtworzenia jej na komputerze zamiast na telefonie?

---

## 1. Dwa podejścia

| Podejście | Opis | Wykonalność |
|----------|------|-------------|
| **A. Stream audio z telefonu** | Telefon przechwytuje dźwięk (YouTube/Spotify gra na telefonie) i wysyła go do komputera w czasie rzeczywistym | ❌ **Niemożliwe** w przeglądarce |
| **B. Telefon jako pilot** | Telefon wysyła polecenie (URL, ID utworu) → komputer pobiera/odtwarza | ✅ **Możliwe** (z ograniczeniami) |

---

## 2. Dlaczego stream audio z telefonu jest niemożliwy

### Ograniczenia przeglądarek mobilnych

- **`getDisplayMedia()`** (przechwytywanie ekranu + dźwięk systemowy) **nie jest obsługiwane** na żadnej przeglądarce mobilnej (iOS Safari, Chrome Android, Firefox Android).
- Nawet na desktopie `getDisplayMedia` służy do udostępniania **własnego** ekranu, nie do przechwytywania dźwięku z innej aplikacji (YouTube, Spotify) na telefonie.
- **`getUserMedia()`** przechwytuje tylko mikrofon – nie dźwięk systemowy (muzyka z aplikacji).
- Przeglądarki celowo blokują dostęp do dźwięku innych aplikacji ze względów bezpieczeństwa i prywatności.

**Wniosek:** W aplikacji webowej (PWA, przeglądarka na telefonie) nie da się przechwycić dźwięku YouTube/Spotify grającego na telefonie i przesłać go do komputera.

---

## 3. Podejście B: Telefon jako pilot – co da się zrobić

### 3.1 YouTube ✅ (najprostsze)

**Idea:** Użytkownik wyszukuje na telefonie → wysyła link lub ID filmu → komputer odtwarza w iframe.

**Architektura:**
```
Telefon (admin-pwa / nowy panel) 
  → Socket.IO: { type: 'youtube', videoId: 'dQw4w9WgXcQ' }
  → Serwer: io.to('screen_controller').emit('play_youtube', { videoId })
  → Ekran (screen-controller / nowy widok): iframe YouTube embed + API play
```

**Implementacja:**
- YouTube IFrame Player API – standardowe osadzenie, sterowanie play/pause/volume.
- Telefon: pole wyszukiwania lub wklejanie URL → wyciągnięcie `videoId` z `youtube.com/watch?v=XXX` lub `youtu.be/XXX`.
- Brak API klucza – embed działa bez klucza. Wyszukiwanie przez YouTube Data API v3 wymaga klucza (opcjonalnie).

**Ograniczenia:**
- Reklamy YouTube (chyba że użytkownik ma Premium).
- Niektóre filmy mają wyłączone osadzanie (embed disabled).
- Zasady użytkowania YouTube – osadzanie dozwolone, masowe pobieranie/streaming – nie.

---

### 3.2 Spotify ⚠️ (wymaga Premium + integracji)

**Idea:** Komputer uruchamia odtwarzacz Spotify (Web Playback SDK) → pojawia się jako urządzenie Spotify Connect → użytkownik z aplikacji Spotify na telefonie wybiera „Imprezja Quiz” i puszcza muzykę.

**Dwa warianty:**

| Wariant | Opis | Wymagania |
|--------|------|-----------|
| **Spotify Connect (natywny)** | Użytkownik w aplikacji Spotify wybiera urządzenie „Imprezja Quiz” | Web Playback SDK na komputerze, Premium |
| **Własny UI** | W Imprezji: wyszukiwanie, kolejka, play – wszystko w aplikacji | Web Playback SDK + Spotify API (OAuth) + Premium |

**Web Playback SDK:**
- Tworzy urządzenie Spotify Connect w przeglądarce.
- Wymaga **Spotify Premium** (mobile-only Premium nie wystarczy).
- Rejestracja aplikacji w Spotify Developer Dashboard.
- OAuth – użytkownik loguje się na komputerze (gdzie gra muzyka).

**Prostszy wariant:** Zintegrować tylko Web Playback SDK – komputer pokazuje się jako urządzenie. Użytkownik steruje z natywnej aplikacji Spotify na telefonie. Brak własnego UI wyszukiwania w Imprezji.

---

### 3.3 Tidal ⚠️ (podobnie jak Spotify)

- TIDAL SDK for Web – wymaga rejestracji w Tidal Developer Portal.
- Podobny model: odtwarzacz na komputerze, sterowanie z telefonu lub z własnego UI.
- Wymaga subskrypcji Tidal.

---

### 3.4 Ogólny dźwięk z telefonu (dowolna aplikacja)

**Nie da się** w przeglądarce – brak dostępu do dźwięku systemowego. Jedyna opcja to **mikrofon**: użytkownik mógłby trzymać telefon przy głośniku i streamować przez `getUserMedia` – jakość i UX byłyby słabe, nie ma sensu tego robić.

---

## 4. Rekomendowana ścieżka implementacji

### Faza 1: YouTube (najszybsza wartość)

1. **Nowy tryb/panel „Muzyka z sieci”** w admin-pwa lub jako osobna sekcja.
2. **Telefon:** pole wyszukiwania + wklejanie URL. Przycisk „Odtwórz na komputerze”.
3. **Serwer:** event `play_youtube` → broadcast do `screen_controller`.
4. **Ekran:** widok z iframe YouTube (lub `screen-controller` z nowym widokiem). YouTube IFrame API do play/pause/volume.
5. **Opcjonalnie:** YouTube Data API v3 do wyszukiwania po frazie (wymaga klucza API).

**Szacowany nakład:** 1–2 dni dla podstawowej wersji (URL → odtwarzanie).

### Faza 2: Spotify Connect (opcjonalnie)

1. Integracja Web Playback SDK.
2. OAuth w aplikacji (logowanie Spotify na komputerze).
3. Komputer jako urządzenie Spotify Connect – użytkownik wybiera je w aplikacji Spotify na telefonie.
4. **Bez własnego UI wyszukiwania** – sterowanie wyłącznie z aplikacji Spotify.

**Szacowany nakład:** 2–4 dni + rejestracja w Spotify Developer.

### Faza 3: Tidal (opcjonalnie)

- Analogicznie do Spotify – TIDAL SDK for Web.
- Wymaga konta deweloperskiego Tidal.

---

## 5. Integracja z istniejącą architekturą

- **Socket.IO** – już używany (np. `imprezator_volume`, `whitney_state`).
- **screen-controller.html** – przełącza widoki (welcome, quiz, familiada, statki, tryby muzyczne). Można dodać widok `music_stream` z iframe YouTube.
- **admin-pwa.html** – panel na telefonie. Można dodać sekcję „Muzyka z sieci” z polem URL i przyciskiem.
- **Serwer** – nowy event, np. `play_youtube`, `youtube_control` (play/pause/volume).

---

## 6. Podsumowanie

| Źródło | Stream z telefonu | Telefon jako pilot |
|--------|-------------------|--------------------|
| **YouTube** | ❌ | ✅ iframe embed |
| **Spotify** | ❌ | ✅ Web Playback SDK (Premium) |
| **Tidal** | ❌ | ✅ TIDAL SDK |
| **Dowolna aplikacja** | ❌ | ❌ |

**Odpowiedź na pytanie:**  
Bezpośrednie „puszczenie muzyki z telefonu tak, żeby leciała na komputerze” (stream audio) **nie jest możliwe** w aplikacji webowej.  
**Możliwe** jest: wyszukanie/wybór na telefonie → wysłanie polecenia → odtwarzanie na komputerze. Najprościej zacząć od YouTube (URL → iframe).
