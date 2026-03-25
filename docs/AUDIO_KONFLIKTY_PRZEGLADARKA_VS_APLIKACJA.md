# Konflikty audio – przeglądarka vs aplikacja (Electron)

**Status:** Częściowo naprawione. Zastosowano instant stop zamiast fade 1,5 s (patrz sekcja 8).

---

## Opis problemu

- Część przycisków Stop działa, inne nie
- Jedne wymagają pełnego ekranu, inne nie
- Ograniczenia przeglądarki w trybie `npm start` vs aplikacja (Electron build)
- Naprawa pod przeglądarkę może zepsuć zachowanie w aplikacji

---

## Zidentyfikowane różnice

### 1. Źródła Stop – dwa mechanizmy

| Mechanizm | Gdzie | Co robi |
|-----------|-------|---------|
| **fetch('/api/.../stop')** | admin-pwa, imprezator, spiewaj, bitwa, whitney, njr-sampler | POST do serwera → serwer emituje event do konkretnego roomu |
| **socket.emit('admin_stop_music')** | admin-pwa, admin.html | Broadcast do **wszystkich** klientów (io.emit) |

**admin_stop_music** – każdy klient musi sam nasłuchiwać:
- `imprezator_stop` / `admin_stop_music` → doImprezatorStop
- `spiewaj_dalej_stop` / `admin_stop_music` → doSpiewajStop
- `bitwa_wokalna_stop` / `admin_stop_music` → doBitwaStop
- `whitney_stop` / `admin_stop_music` → instant stop (był fadeOut, naprawione)
- **NJR Sampler** – NIE nasłuchuje `admin_stop_music`! Tylko `njr_sampler_stop` (wysyłane do roomu `njr_sampler_screen`)

### 2. Różne API Stop per tryb

| Tryb | Endpoint | Event Socket | Kto nasłuchuje |
|------|----------|--------------|----------------|
| Sampler | POST /api/njr-sampler/stop | njr_sampler_stop | njr-sampler/index.html (screen) |
| Whitney | POST /api/whitney/stop | whitney_stop | whitney/index.html |
| Śpiewaj | POST /api/spiewaj-dalej/stop | spiewaj_dalej_stop | spiewaj-dalej/index.html |
| Bitwa | POST /api/bitwa-wokalna/stop | bitwa_wokalna_stop | bitwa-wokalna/index.html |
| Imprezator | POST /api/imprezator/stop | imprezator_stop | imprezator/index.html |
| Quiz/Screen | – | admin_stop_music | Screen.html |

### 3. admin_stop_music – co dokładnie robi serwer

```javascript
socket.on('admin_stop_music', () => {
    io.emit('admin_stop_music');  // broadcast do WSZYSTKICH
});
```

Serwer **nie** wywołuje stopOtherMusicGames ani żadnych endpointów – tylko broadcast. Każdy klient musi sam zareagować.

### 4. admin-pwa – podwójne wywołanie przy zamknięciu muzyki

Gdy zamykamy panel muzyki:
```javascript
await fetch(m.api + '/stop', { method: 'POST' });  // 1. POST do serwera
socket.emit('admin_stop_music');                    // 2. Broadcast
```

Serwer przy POST /api/.../stop emituje do **konkretnego roomu** (np. whitney_screen).  
admin_stop_music idzie do **wszystkich**. Możliwa race condition lub podwójne zatrzymanie.

### 5. Fullscreen

- **admin-pwa**: btn-fullscreen-panel – fullscreen tylko panelu (np. iframe muzyki)
- **screen-controller**: btn-fullscreen – fullscreen całego ekranu TV
- **Electron**: `webPreferences` mogą wpływać na fullscreen API (np. `nativeWindowOpen`)

### 6. Autoplay / user gesture

Przeglądarki blokują `audio.play()` bez user gesture. Electron może mieć inne ustawienia (np. `webPreferences.backgroundThrottling`).  
Różnice: w przeglądarce pierwsze play może wymagać kliknięcia; w Electron może działać od razu.

### 7. Web Audio API (GainNode) – już naprawione

Bitwa, Śpiewaj Dalej, Imprezator – w buildzie Electron GainNode powodował brak dźwięku.  
**Fix:** wyłączono GainNode, używany tylko HTMLAudioElement.volume.

### 8. Fade 1,5 s przy Stop – naprawione

**Problem:** Bitwa, Śpiewaj Dalej, Imprezator, Whitney – nie zatrzymywały się poprawnie. Sampler działał najlepiej.

**Przyczyna:** Te tryby używały `fadeOutAndStop(audio, 1500, …)` opartego na `requestAnimationFrame`. W iframe / tle / Electron `requestAnimationFrame` może być throttlowany – fade nie kończy się, `pause()` nigdy nie jest wywołane.

**Fix:** Zastąpiono fade natychmiastowym `a.pause()` w Bitwa, Śpiewaj Dalej, Imprezator oraz w Whitney (admin_stop_music). Zachowanie jak w Samplerze.

---

## Podejrzane miejsca (do sprawdzenia)

1. **NJR Sampler** – brak nasłuchiwania `admin_stop_music`. Gdy admin kliknie „Stop muzyka” globalnie, Sampler może nie zatrzymać się (bo dostaje tylko njr_sampler_stop z POST, a admin_stop_music nie jest obsługiwane).

2. **stopOtherMusicGames** – serwer wywołuje to przy **uruchomieniu** nowego trybu (np. włączasz Whitney → stopuje Sampler, Śpiewaj, Bitwa, Imprezator). Ale przy **admin_stop_music** serwer tylko broadcastuje – nie wywołuje stopOtherMusicGames. Czy to zamierzone?

3. **Podwójny stop** – fetch + admin_stop_music. Czy wszystkie tryby poprawnie obsługują wielokrotne wywołanie stop (idempotentność)?

4. **Iframe vs bezpośredni** – tryby muzyczne w admin-pwa są w iframe. Audio w iframe może mieć inne zasady autoplay. Electron może traktować iframe inaczej niż przeglądarka.

5. **Różne ścieżki wejścia** – Sampler może być otwarty jako:
   - njr-sampler.html (edytor)
   - njr-sampler/index.html (ekran)
   - njr-sampler/phone.html (w iframe admin-pwa)
   Każda strona ma inny zestaw socket listeners.

---

## Propozycje dalszej diagnostyki

1. Dodać logowanie (console.log) przy każdym `admin_stop_music` i przy każdym `*_stop` – który klient otrzymał, który zareagował.
2. Sprawdzić, czy NJR Sampler powinien nasłuchiwać `admin_stop_music` (dodać listener jak inne tryby).
3. Sprawdzić Electron `webPreferences` – czy coś wpływa na audio/fullscreen.
4. Test: w przeglądarce vs Electron – dla każdego przycisku Stop zapisać, czy działa.

---

*Dokument utworzony na podstawie analizy kodu. Nie wprowadzono żadnych zmian.*
