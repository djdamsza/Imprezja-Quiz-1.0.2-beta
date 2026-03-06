# Profilowanie wydajności Imprezja Quiz

## Opcja 1: Chrome DevTools (zalecane)

1. Uruchom aplikację: `npm start` lub `npm run electron`
2. Otwórz stronę w Chrome: `http://localhost:3000/Screen.html` (lub vote.html, admin.html)
3. Otwórz DevTools: **F12** lub **Cmd+Option+I** (Mac)
4. Zakładka **Performance** (Wydajność)
5. Kliknij **Record** (kółko) → wykonaj typowe akcje (zmiana pytania, głosowanie, itp.) → **Stop**
6. Przeanalizuj wykres: najdłuższe paski = wolne funkcje

### Co szukać
- **Scripting** (żółty) – wolny JavaScript
- **Rendering** (fioletowy) – layout, paint
- **Long tasks** – zadania > 50 ms

## Opcja 2: Performance API w konsoli

Wklej do konsoli (F12 → Console) podczas działania strony:

```javascript
// Start profilowania
performance.mark('profile-start');
performance.mark('profile-end');
performance.measure('session', 'profile-start', 'profile-end');

// Po wykonaniu akcji (np. kliknięcie pytania):
performance.mark('profile-end');
performance.measure('session', 'profile-start', 'profile-end');
const entries = performance.getEntriesByType('measure');
console.table(entries);
```

## Opcja 3: Timing dla konkretnych operacji

Dodaj do kodu tymczasowo (np. w Screen.html przy obsłudze nowego pytania):

```javascript
const t0 = performance.now();
// ... kod który sprawdzasz ...
console.log('Czas:', (performance.now() - t0).toFixed(2), 'ms');
```

## Typowe miejsca do sprawdzenia

| Strona | Potencjalna przyczyna wolności |
|--------|--------|
| Screen.html | Ładowanie obrazków, animacje podium, aktualizacja stanu |
| vote.html | Renderowanie siatki odpowiedzi, Socket.IO |
| admin.html | Lista pytań, QR codes |

## Opcja 4: Lighthouse (ogólna ocena)

1. DevTools → zakładka **Lighthouse**
2. Wybierz: Performance, Desktop
3. **Analyze page load** – raport z rekomendacjami
