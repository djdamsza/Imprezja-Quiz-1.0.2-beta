# Problemy z siecią i routerem – do dopracowania

**Status:** W trakcie dopracowania. Zawartość z ROZWIĄZANIE_SIECI.md i DIAGNOSTYKA_SIECI.md.

---

## Problem: Telefon nie może się połączyć przez WiFi

### Objawy

- Serwer działa i nasłuchuje na `0.0.0.0:3000` ✅
- IP komputera jest poprawne (np. `192.168.0.104`) ✅
- QR kod prowadzi na właściwy adres ✅
- **ALE:** Wszystkie żądania z telefonu mają IP `127.0.0.1` (localhost) ❌
- Telefon używa tunelu Pinggy zamiast bezpośredniego WiFi ❌

---

## Rozwiązania (kolejność)

### 1. Wyłącz tunel Pinggy (najczęstsza przyczyna ~70%)

Tunel może przejmować połączenia. Przy testowaniu WiFi:

1. Panel admina → sekcja „Tunel (gra przez sieć komórkową)”
2. Kliknij **„Zatrzymaj tunel”**
3. Upewnij się, że tunel jest wyłączony przed testowaniem WiFi

### 2. Firewall macOS (~20%)

```bash
# Sprawdź stan
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Tymczasowo wyłącz (do testów)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off

# Po testach włącz
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
```

Lub: System Preferences → Security & Privacy → Firewall → Firewall Options → dodaj Node.js (`/usr/local/bin/node` lub `/opt/homebrew/bin/node`).

### 3. AP Isolation w routerze (~10%)

Niektóre routery blokują komunikację między urządzeniami WiFi.

1. Zaloguj się do panelu routera (np. `192.168.0.1` lub `192.168.1.1`)
2. WiFi → Advanced → **AP Isolation** / **Client Isolation**
3. **Wyłącz** tę funkcję
4. Zapisz i zrestartuj router

### 4. Routery Xiaomi

Niektóre routery Xiaomi mają problemy z łączeniem przez QR kod WiFi. Gracze mogą łączyć się ręcznie (wpisać hasło) lub użyć innego routera.

### 5. Firewall Windows

Zapora Windows → Zezwól na Imprezja Quiz przez sieć prywatną.

### 6. Komputer na LAN (kabel), telefony na WiFi (Windows)

Typowy układ: PC podłączony kablem do routera, telefony na WiFi w tej samej sieci. **Admin z telefonu** i **gra przez WiFi** powinny działać – serwer nasłuchuje na wszystkich interfejsach (0.0.0.0). Jeśli nie łączą się:

- **Zapora Windows** – zezwól aplikacji Imprezja Quiz na port 3000 w sieci **prywatnej** (Zapora Windows → Zezwól aplikacji → zaznacz sieć prywatna).
- **Tunel (LTE)** nie zależy od LAN/WiFi – działa przez internet. Jeśli „Uruchom tunel” jednym kliknięciem nie działa, patrz punkt 8 poniżej. Szczegóły: **FAQ** → „Komputer na LAN (kabel), telefony na WiFi”.

### 7. Komputer na LAN (kabel), telefony na WiFi – ta sama sieć

Gdy komputer jest podłączony **kablem LAN** do routera, a telefony przez **WiFi** w tej samej sieci, admin i gra w sieci lokalnej powinny działać (ten sam subnet, np. 192.168.1.x). Jeśli **admin się nie otwiera z telefonu** ani **gra przez WiFi nie łączy**:

1. **Firewall Windows** – najczęstsza przyczyna. Zezwól aplikacji „Imprezja Quiz” (lub Node.js) na port **3000** w sieci **prywatnej**: Zapora Windows → Zezwól aplikacji przez firewall → odznacz publiczna, zostaw prywatna (lub dodaj regułę przychodzącą TCP 3000).
2. Sprawdź z telefonu w przeglądarce: `http://<IP_komputera>:3000/test-connection` (IP z ekranu TV / panelu admina). Jeśli nie ładuje się – blokada po stronie sieci/firewall.

**Tunel (LTE)** nie zależy od LAN/WiFi – działa przez internet. Jeśli **tunel nie otwiera się** na Windows mimo że internet działa, patrz punkt 8.

### 8. Tunel (gra przez LTE) nie otwiera się

- **Windows** – aplikacja używa **Tunnelmole** (bez OpenSSH). Wystarczy połączenie z internetem. Jeśli „Uruchom tunel” nie działa: sprawdź firewall (zezwól na Imprezja Quiz ruch wychodzący HTTPS) oraz czy port 3000 nie jest zablokowany. Logi: `%APPDATA%\Imprezja Quiz\tunnel.log`.
- **Mac** – tunel „jednym kliknięciem” używa **Pinggy** (SSH). Działa od razu; przy problemach: port 443 zablokowany (firmowy firewall) lub ręcznie w terminalu:  
  `ssh -p 443 -R0:localhost:3000 -l a a.pinggy.io`
- Logi błędów tunelu są zapisywane w konsoli serwera oraz w pliku logów (np. `tunnel.log` w katalogu danych aplikacji).

---

## Szybki test

```bash
# 1. Port otwarty?
lsof -i :3000

# 2. Firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# 3. IP komputera
ifconfig | grep "inet " | grep -v "127.0.0.1"
```

**Na telefonie:** Otwórz w przeglądarce `http://<IP_KOMPUTERA>:3000/test-connection` (np. `http://192.168.0.108:3000/test-connection`). Powinien zwrócić JSON.

---

## Logi – jak rozpoznać problem

### ✅ Działa (WiFi):
```
📥 GET /admin.html od IP: 192.168.0.110 (Mozilla/5.0...)
```

### ❌ Problem (tunel zamiast WiFi):
```
📥 GET /admin.html od IP: 127.0.0.1 (Mozilla/5.0...)
⚠️ Telefon łączy się przez localhost - może używać tunelu Pinggy!
```

---

## Po zastosowaniu rozwiązań

1. Zrestartuj serwer (jeśli działa)
2. Wyłącz tunel Pinggy
3. Sprawdź firewall
4. Wygeneruj nowy QR kod z aktualnym IP
5. Przetestuj z telefonu

---

*Treść do dopracowania – routery Xiaomi, inne modele, dodatkowe przypadki.*
