# Działanie offline (bez internetu)

Aplikacja **VoteBattle / IMPREZJA** może działać w całości w sieci lokalnej Wi‑Fi **bez dostępu do internetu**.

## Co jest potrzebne jednorazowo (z internetem)

- **Node.js** – zainstalowany na komputerze.
- **Zależności npm** – jeden raz w katalogu projektu:
  ```bash
  npm install
  ```
  Po tym wszystkie pakiety (express, socket.io, multer, qrcode) są w folderze `node_modules` i **nic nie jest pobierane w trakcie działania aplikacji**.

## Działanie bez internetu

- Serwer (`node server.js`) działa lokalnie.
- Strona głosowania, ekran TV, panel admina i edytor są serwowane z Twojego komputera.
- Socket.io jest dostarczany przez serwer (brak CDN).
- Fonty to fonty systemowe (brak Google Fonts).
- Quizy, zdjęcia i dźwięki są w `public/quizzes` i `public/uploads`.

Urządzenia w tej samej sieci Wi‑Fi (bez internetu) łączą się pod adresem np. `http://192.168.x.x:3000`.

## Opcjonalnie (tylko gdy potrzebujesz)

- **Import obrazka z URL** w edytorze – wymaga internetu tylko w momencie użycia tej funkcji. Reszta działa offline.
- **Confetti** na ekranie TV – w `public/Screen.html` używane jest confetti w CSS (działa offline). Wariant z biblioteką canvas-confetti można dodać lokalnie do `public/js/confetti.js`, jeśli chcesz ten efekt.

## Cache i Service Worker (działanie offline)

- **Service Worker** (`public/sw.js`) jest rejestrowany na stronach: ekran prowadzącego (Screen.html), panel admina (admin.html), głosowanie (vote.html) oraz **edytor quizów (editor.html)**. Wszystkie te strony są w precache, więc ładują się z cache przy słabej sieci lub ponownym wejściu.
- Po pierwszym wejściu na którąkolwiek z tych stron przeglądarka cachuje HTML i socket.io, dzięki czemu przy krótkiej przerwie w sieci lub ponownym wejściu strona może załadować się z cache.
- **Manifest** (`public/manifest.json`) jest podlinkowany we wszystkich powyższych stronach (w tym w edytorze) i umożliwia dodanie aplikacji do ekranu głównego („Zainstaluj aplikację”) na telefonie lub tablecie.

## Wake Lock (ekran nie gaśnie)

Wake Lock jest włączony na ekranie prowadzącego, panelu admina i głosowaniu. **Działa tylko w kontekście zabezpieczonym:** `localhost` albo **HTTPS**. Gdy otwierasz aplikację po adresie IP w LAN (np. `http://192.168.1.10:3000`), przeglądarka nie udostępnia Wake Lock – ekran może wtedy normalnie gasnąć. Rozwiązanie: uruchomić serwer z HTTPS (np. z certyfikatem lokalnym) i otwierać `https://192.168.x.x:3000`, albo testować na `http://localhost:3000`.

**Podsumowanie:** Po jednorazowym `npm install` (z internetem) aplikacja może działać wyłącznie w sieci Wi‑Fi, bez dostępu do internetu. Service Worker i manifest poprawiają działanie przy słabszej sieci i pozwalają korzystać z aplikacji jak z natywnej (ekran główny).
