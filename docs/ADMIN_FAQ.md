# Admin FAQ – Wskazówki techniczne dla prowadzącego

Dokument dla Ciebie (administratora/wydawcy) – techniczne porady, build, Stripe, WordPress, sieć.

---

## Build i wydanie

### Checklist przed buildem

1. Zmień wersję w `package.json` → `"version": "1.0.X"`
2. `npm install`
3. Test: `npm start` lub `npm run electron`
4. Build Windows: `build-win-jako-admin.bat` (lub cmd jako admin → `npm run build:win`)
5. Build Mac: `npm run build:mac:universal` (uniwersalny) lub `npm run build:mac:arm64` + `npm run build:mac:x64`

### Błąd buildu Windows: „Cannot create symbolic link”

Electron-builder wymaga uprawnień do tworzenia linków symbolicznych. Rozwiązania:
- **Sposób A:** Uruchom `build-win-jako-admin.bat` (UAC)
- **Sposób B:** Włącz Tryb deweloperski w Windows (Ustawienia → Dla deweloperów)

### Diagnostyka instalatora Windows (Event Viewer)

Gdy instalator się wywala: Win+R → `eventvwr.msc` → Dzienniki Windows → Aplikacja. Sprawdź zdarzenie z momentu awarii.

---

## Instalator / Uninstaller Windows

### „Nie udało się usunąć plików starej wersji”

1. Zamknij Imprezja Quiz
2. Uruchom `napraw-uninstaller.bat` (jako administrator)
3. Uruchom instalator ponownie

### Avast blokuje instalator

1. Poczekaj 1–2 min po pobraniu
2. Uruchom `napraw-uninstaller.bat` (jako admin)
3. Uruchom instalator – często udaje się za drugim razem
4. Opcjonalnie: Avast → Wyjątki → dodaj folder instalacji

### Błąd NSIS / exe.exe

Stara konfiguracja z `executableName: "IMPREZJA.exe"` generowała błędne nazwy. Obecnie `ImprezjaQuiz` – nowe buildy są poprawne. Przy problemach: `napraw-uninstaller.bat`, ręczne usunięcie folderów, ponowna instalacja.

---

## Aktualizacje (auto-update)

### Błąd 404 na Macu: „Cannot find channel latest-mac.yml”

Stara wersja szuka aktualizacji pod `nowajakoscrozrywki.pl/updates/`. Rozwiązania:
1. **Szybkie:** Pobierz ręcznie z GitHub Releases
2. **Dla starych wersji:** Wgraj `dist/updates-for-server/latest-mac.yml` i `latest-mac-arm64.yml` na serwer do folderu `updates/`

Aktualne wersje (1.0.4+) szukają aktualizacji na GitHub.

---

## Electron – znane problemy

### require('electron') zwraca string (Electron 28.x, 35.x)

Znany bug – `require('electron')` zwraca ścieżkę zamiast obiektu. **Rozwiązanie:** Używaj Electron 25.x lub 26.x (obecnie 25.9.8 działa poprawnie).

### Aktualizacja Electron

Przy aktualizacji: `npm run electron` i `npm run build:win` – sprawdź czy wszystko działa. Unikaj Electron 35.x (bug z require).

---

## Bezpieczeństwo

- **Electron 25.9.8** – stabilna, działa lokalnie
- **electron-builder 26.7.0** – naprawione podatności
- `npm audit fix` – automatyczna naprawa zależności
- Sharp, jimp, express, socket.io – aktualne wersje

---

## Licencje

- Generator: `node scripts/generate-license-key.js`
- Wymaga: `license-private.pem` w katalogu projektu
- Klucz prywatny NIE trafia do aplikacji ani repozytorium (`.gitignore`)

### Przeniesienie licencji (zmiana komputera)

Klient pisze na biuro@imprezja.pl z adresu z zakupu, podaje nowy Machine ID. Limit: **2 przeniesienia** na klienta (na adres e-mail). W regulaminie: stara licencja unieważniona (deterrent – technicznie stary klucz nadal działa offline). Generujesz nowy klucz: `node scripts/generate-license-key.js NOWY_MACHINE_ID LT`

---

## Stripe / WordPress / Resend

- **Stripe:** `docs/STRIPE_CHECKLIST.md`, `STRIPE_WEBHOOK_WORDPRESS.md`
- **Resend (e-mail z kluczem):** `docs/RESEND_INSTRUKCJA.md`
- **WordPress cennik:** `docs/wordpress/CENNIK_NA_STRONIE_PRODUKTU.md`, `STRONA_CENNIKA_WORDPRESS.md`
- **Webhook:** URL stripe-shop (np. `shop.nowajakoscrozrywki.pl/webhook`)

---

## Sieć / Router

Szczegóły w **ROUTER_SIECI.md** (na wierzchu w docs). Skrót:

1. **Tunel Pinggy aktywny** – wyłącz tunel przy testowaniu WiFi
2. **Firewall** – dodaj Node/Electron do dozwolonych
3. **AP Isolation** – wyłącz w routerze (blokuje komunikację między urządzeniami)
4. **Xiaomi router** – może mieć problemy z QR WiFi; ręczne połączenie lub inny router

---

## Kopiowanie projektu

- **Nie kopiuj** `node_modules/` i `dist/` (~15 000 plików, 2 GB)
- Kopiuj tylko źródła (~145 plików)
- Na docelowym PC: `npm install`
- Archiwum: `zip -r VoteBattle-zrodla.zip . -x "node_modules/*" -x "dist/*"`

### „Could not read package.json” po rozpakowaniu

Sprawdź czy jesteś w folderze z `package.json`. Czasem pliki są w podfolderze – `cd NAZWA_PODFOLDERU` przed `npm install`.

---

## Cache (Service Worker)

Zmiany w HTML nie widoczne? Wyczyść cache:
- DevTools (F12) → Application → Service Workers → Unregister
- Lub: Hard Reload (prawy przycisk na odświeżanie → Wyczyść cache i twarde odświeżenie)
- Lub: tryb incognito

---

## Edytor przenośny (editor-standalone.html)

Działa bez serwera – wyślij klientom do układania pytań. Otwórz w przeglądarce, twórz quiz, eksportuj ZIP. Import pakietu w panelu admina. Przy pierwszym otwarciu potrzebny internet (JSZip z CDN).

---

## Optymalizacja przy 10+ graczach

- **Throttling 120 ms** – serwer zbiera zmiany i wysyła co 120 ms (panel admina bez throttle)
- **„Nie wysyłaj obrazków na telefony”** – zalecane przy wielu graczach (ogranicza ruch ~60–80%)
- **Banner rozłączenia** – przy utracie połączenia
- **Odświeżenie** – przy zawieszeniu panelu admina

---

## Publikacja strony / checklist

- Dokumenty prawne: Regulamin, Polityka prywatności, EULA
- Opis produktu: `OPIS_SKLEP_INTERNETOWY.md`
- FAQ dla graczy: `FAQ.md`
- Generator kluczy: `scripts/generate-license-key.js`

---

## Działanie offline

Aplikacja działa w sieci lokalnej bez internetu. Po `npm install` (jednorazowo z siecią) wszystko jest w `node_modules` i `public/`. Service Worker cache'uje strony – przy zmianach w HTML wyczyść cache (DevTools → Application → Service Workers → Unregister).

---

*Ostatnia aktualizacja: luty 2026*
