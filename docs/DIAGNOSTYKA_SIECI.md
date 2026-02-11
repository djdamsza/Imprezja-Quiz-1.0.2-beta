# Diagnostyka problemów z siecią lokalną

## Problem: Telefon nie może się połączyć przez WiFi

### Objawy:
- Serwer działa i nasłuchuje na `0.0.0.0:3000` ✅
- IP komputera jest poprawne (np. `192.168.0.104`) ✅
- QR kod prowadzi na właściwy adres ✅
- **ALE**: Wszystkie żądania z telefonu mają IP `127.0.0.1` (localhost) ❌
- Telefon używa tunelu Pinggy zamiast bezpośredniego WiFi ❌

## Diagnostyka

### 1. Sprawdź firewall macOS

```bash
./check-firewall-mac.sh
```

Lub ręcznie:
1. Otwórz **System Preferences** → **Security & Privacy** → **Firewall**
2. Kliknij **"Firewall Options"** (wymaga hasła)
3. Sprawdź czy firewall jest włączony
4. Jeśli tak, dodaj **Node.js** lub **Electron** do listy dozwolonych aplikacji
5. Lub tymczasowo wyłącz firewall do testów

### 2. Sprawdź czy port 3000 jest otwarty

```bash
lsof -i :3000
```

Powinno pokazać proces nasłuchujący na porcie 3000.

### 3. Sprawdź czy telefon używa tunelu Pinggy

W logach serwera sprawdź:
- Jeśli wszystkie żądania mają IP `127.0.0.1` → telefon używa tunelu Pinggy
- Jeśli żądania mają IP `192.168.x.x` → telefon używa WiFi ✅

**Rozwiązanie**: Wyłącz tunel Pinggy w panelu admina przed testowaniem WiFi.

### 4. Sprawdź router (AP Isolation)

Niektóre routery mają włączoną funkcję **AP Isolation** (Client Isolation), która blokuje komunikację między urządzeniami w sieci WiFi.

**Jak sprawdzić:**
1. Zaloguj się do panelu routera (zwykle `192.168.0.1` lub `192.168.1.1`)
2. Znajdź ustawienia WiFi → Advanced → AP Isolation / Client Isolation
3. **Wyłącz** tę funkcję
4. Zapisz zmiany i zrestartuj router

### 5. Sprawdź czy telefon i komputer są w tej samej sieci

```bash
# Na komputerze
ifconfig | grep "inet " | grep -v "127.0.0.1"

# Na telefonie (w ustawieniach WiFi)
# Sprawdź IP telefonu - powinno być w tym samym zakresie co komputer
# Np. komputer: 192.168.0.104, telefon: 192.168.0.110
```

### 6. Test połączenia z telefonu

Na telefonie otwórz przeglądarkę i wpisz bezpośrednio:
```
http://192.168.0.104:3000/test-connection
```

Powinno zwrócić JSON z statusem "ok".

## Rozwiązania

### Rozwiązanie 1: Wyłącz tunel Pinggy

1. W panelu admina (`http://192.168.0.104:3000/admin.html`)
2. Znajdź sekcję **"Tunel (gra przez sieć komórkową)"**
3. Kliknij **"Zatrzymaj tunel"**
4. Spróbuj ponownie połączyć się przez WiFi

### Rozwiązanie 2: Otwórz firewall macOS

```bash
# Tymczasowo wyłącz firewall (do testów)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off

# Po testach włącz z powrotem
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
```

Lub dodaj Node.js do dozwolonych aplikacji w System Preferences.

### Rozwiązanie 3: Wyłącz AP Isolation w routerze

1. Zaloguj się do panelu routera
2. Znajdź ustawienia WiFi → Advanced
3. Wyłącz **AP Isolation** / **Client Isolation**
4. Zapisz i zrestartuj router

### Rozwiązanie 4: Użyj innego portu

Jeśli port 3000 jest blokowany, zmień go w `server.js`:

```javascript
const PORT = 8080; // lub inny port
```

I zaktualizuj URL w QR kodzie.

## Testowanie

Po zastosowaniu rozwiązań:

1. **Uruchom serwer** (jeśli nie działa)
2. **Wyłącz tunel Pinggy** w panelu admina
3. **Sprawdź logi** - żądania z telefonu powinny mieć IP `192.168.x.x`, nie `127.0.0.1`
4. **Przetestuj** połączenie z telefonu:
   - Otwórz `http://192.168.0.104:3000/admin.html`
   - Powinno działać bez tunelu Pinggy

## Najczęstsze przyczyny

1. **Firewall macOS** - blokuje przychodzące połączenia (60%)
2. **Tunel Pinggy aktywny** - telefon używa tunelu zamiast WiFi (30%)
3. **AP Isolation w routerze** - router blokuje komunikację między urządzeniami (10%)

## Status w logach

### ✅ Działa poprawnie:
```
📥 GET /admin.html od IP: 192.168.0.110 (Mozilla/5.0 (Linux; Android...))
```

### ❌ Problem:
```
📥 GET /admin.html od IP: 127.0.0.1 (Mozilla/5.0 (Linux; Android...))
⚠️ UWAGA: Telefon łączy się przez localhost - może używać tunelu Pinggy zamiast WiFi!
```
