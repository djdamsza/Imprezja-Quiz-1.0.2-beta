# Rozwiązanie problemu z siecią lokalną

## Aktualna sytuacja

✅ **Port 3000 jest otwarty** - serwer nasłuchuje poprawnie
✅ **IP komputera**: `192.168.0.108` (zmieniło się z 104 na 108)
⚠️ **Problem**: Telefon nie może się połączyć przez WiFi

## Rozwiązania krok po kroku

### Krok 1: Sprawdź firewall macOS

Uruchom w terminalu:
```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
```

**Jeśli firewall jest włączony:**
1. Otwórz **System Preferences** → **Security & Privacy** → **Firewall**
2. Kliknij **"Firewall Options"** (wymaga hasła administratora)
3. Dodaj **Node.js** do listy dozwolonych aplikacji:
   - Kliknij **"+"**
   - Przejdź do `/usr/local/bin/node` lub `/opt/homebrew/bin/node`
   - Wybierz **"Allow incoming connections"**
4. Lub tymczasowo wyłącz firewall do testów

**Tymczasowe wyłączenie firewall (do testów):**
```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
```

**Po testach włącz z powrotem:**
```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
```

### Krok 2: Wyłącz tunel Pinggy

**WAŻNE**: Tunel Pinggy może przejmować wszystkie połączenia!

1. Otwórz panel admina: `http://192.168.0.108:3000/admin.html`
2. Znajdź sekcję **"🌐 Tunel (gra przez sieć komórkową)"**
3. Kliknij **"Zatrzymaj tunel"** (jeśli jest aktywny)
4. Upewnij się, że tunel jest wyłączony przed testowaniem WiFi

### Krok 3: Zaktualizuj QR kod

IP komputera zmieniło się z `192.168.0.104` na `192.168.0.108`.

1. **Zrestartuj serwer** - automatycznie wykryje nowe IP
2. **Wygeneruj nowy QR kod** w panelu admina
3. **Lub użyj bezpośredniego URL**: `http://192.168.0.108:3000/admin.html`

### Krok 4: Sprawdź router (AP Isolation)

Niektóre routery mają włączoną funkcję **AP Isolation** (Client Isolation), która blokuje komunikację między urządzeniami w sieci WiFi.

**Jak sprawdzić:**
1. Zaloguj się do panelu routera (zwykle `192.168.0.1` lub `192.168.1.1`)
2. Znajdź ustawienia WiFi → Advanced → AP Isolation / Client Isolation
3. **Wyłącz** tę funkcję
4. Zapisz zmiany i zrestartuj router

### Krok 5: Test połączenia

**Na telefonie:**
1. Upewnij się, że telefon jest w tej samej sieci WiFi co komputer
2. Otwórz przeglądarkę na telefonie
3. Wpisz bezpośrednio: `http://192.168.0.108:3000/test-connection`
4. Powinno zwrócić JSON z informacjami o połączeniu

**Sprawdź logi serwera:**
- Jeśli IP telefonu to `192.168.x.x` → ✅ Działa poprawnie przez WiFi
- Jeśli IP telefonu to `127.0.0.1` → ❌ Używa tunelu Pinggy (wyłącz tunel!)

## Najczęstsze przyczyny (w kolejności)

1. **Tunel Pinggy aktywny** (70%) - wyłącz tunel w panelu admina
2. **Firewall macOS** (20%) - dodaj Node.js do dozwolonych lub wyłącz tymczasowo
3. **AP Isolation w routerze** (10%) - wyłącz w ustawieniach routera

## Szybki test

```bash
# 1. Sprawdź czy port jest otwarty
lsof -i :3000

# 2. Sprawdź firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# 3. Sprawdź IP komputera
ifconfig | grep "inet " | grep -v "127.0.0.1"

# 4. Test z telefonu (wpisz w przeglądarce telefonu)
# http://192.168.0.108:3000/test-connection
```

## Po zastosowaniu rozwiązań

1. **Zrestartuj serwer** (jeśli działa)
2. **Wyłącz tunel Pinggy** w panelu admina
3. **Sprawdź firewall** macOS
4. **Wygeneruj nowy QR kod** z aktualnym IP (`192.168.0.108`)
5. **Przetestuj** połączenie z telefonu

## Status

- ✅ Port 3000: Otwarty i nasłuchuje
- ✅ IP komputera: `192.168.0.108`
- ⚠️ Firewall: Sprawdź czy blokuje
- ⚠️ Tunel Pinggy: Wyłącz przed testowaniem WiFi
