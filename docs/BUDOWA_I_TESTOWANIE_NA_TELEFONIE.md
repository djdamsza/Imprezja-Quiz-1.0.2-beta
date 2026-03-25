# Jak zbudować i przetestować Imprezja Quiz na telefonie

## Architektura

- **Komputer (Mac/Windows)** – uruchamia serwer i wyświetla ekran TV
- **Telefon** – łączy się z komputerem przez WiFi lub LTE (tunel), służy jako panel prowadzącego (admin) lub kontrolki (np. Sampler)

---

## 1. Budowanie aplikacji (komputer)

### Mac (Apple Silicon M1/M2/M3)

```bash
cd /Users/test/Documents/VoteBattle
npm install
npm run build:mac:arm64
```

Plik instalacyjny: `dist/Imprezja Quiz-1.x.x-arm64.dmg`

### Mac (Intel)

```bash
npm run build:mac:x64
```

Plik: `dist/Imprezja Quiz-1.x.x.dmg`

### Windows

```bash
npm run build:win
```

Plik: `dist/Imprezja Quiz Setup 1.x.x.exe`

### Instalacja po zbudowaniu

- **Mac:** Otwórz plik `.dmg`, przeciągnij aplikację do folderu Aplikacje
- **Windows:** Uruchom plik `.exe` i postępuj według kreatora instalacji

---

## 2. Testowanie na telefonie – sieć WiFi

### Wymagania

- Komputer i telefon w **tej samej sieci WiFi**
- Firewall na komputerze zezwala na port 3000 (sieć prywatna)

### Kroki

1. **Uruchom aplikację** na komputerze (Electron lub `npm start`)
2. Na ekranie TV / w aplikacji zobaczysz **adres IP** (np. `192.168.0.104`) i port `3000`
3. **Na telefonie** otwórz przeglądarkę i wpisz:
   ```
   http://192.168.0.104:3000/admin-pwa.html
   ```
   (zastąp IP adresem z ekranu)
4. Panel admina załaduje się – możesz sterować quizem, samplerem itd.

### Instalacja Admin PWA na telefonie

1. Otwórz `http://<IP>:3000/admin-pwa.html` w **Chrome** lub **Safari**
2. **Chrome (Android):** Menu (⋮) → „Zainstaluj aplikację” / „Dodaj do ekranu głównego”
3. **Safari (iPhone):** Przycisk „Udostępnij” → „Dodaj do ekranu początkowego”
4. Ikona pojawi się na ekranie – uruchamia panel bez wpisywania adresu

---

## 3. Testowanie przez LTE (tunel) – gdy WiFi nie działa

Gdy telefony są w innej sieci (np. LTE) lub router blokuje połączenie:

1. W panelu admina znajdź sekcję **„Tunel (gra przez sieć komórkową)”**
2. Kliknij **„Uruchom tunel”**
3. Pojawi się **publiczny URL** (np. `https://xxx.pinggy.io` lub `https://xxx.tunnelmole.net`)
4. Na telefonie otwórz ten URL + `/admin-pwa.html`, np.:
   ```
   https://xxx.pinggy.io/admin-pwa.html
   ```
5. Możesz zeskanować **QR kod** wyświetlany na ekranie (jeśli jest)

---

## 4. Typowy scenariusz testowy

### A. Ekran TV na komputerze

1. Uruchom `npm run electron` (lub zainstalowaną aplikację)
2. Na dużym monitorze/TV zobaczysz ekran powitalny

### B. Panel prowadzącego na telefonie

1. Telefon w tej samej sieci WiFi co komputer
2. Otwórz `http://<IP>:3000/admin-pwa.html`
3. Wybierz tryb (Quiz, Sampler, Prezentacja itd.)
4. Ekran TV zaktualizuje się automatycznie

### C. Sampler – panel na telefonie

1. W admin-pwa wybierz **NJR Sampler**
2. Panel samplera otworzy się w przeglądarce
3. Dźwięk gra na komputerze (gdzie działa aplikacja)
4. Możesz dodać admin-pwa do ekranu głównego (PWA) dla szybszego dostępu

---

## 5. Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---------|-------------|
| Telefon nie łączy się | Wyłącz tunel Pinggy (może przejmować połączenia). Sprawdź firewall. |
| Firewall blokuje | Mac: Zezwól Node.js w Ustawieniach → Zapora. Windows: Zezwól Imprezja Quiz na port 3000 (sieć prywatna). |
| AP Isolation | Wyłącz w ustawieniach routera (WiFi → Zaawansowane). |
| Tunel nie startuje | Windows: sprawdź `%APPDATA%\Imprezja Quiz\tunnel.log`. Mac: tunel Pinggy wymaga SSH. |

Więcej: `docs/ROUTER_SIECI.md`

---

## 6. Szybki start (bez budowania)

Jeśli chcesz tylko przetestować bez instalacji:

```bash
cd /Users/test/Documents/VoteBattle
npm install
npm run electron
```

Na telefonie (WiFi): `http://<IP_z_ekranu>:3000/admin-pwa.html`
