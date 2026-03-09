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

## Konfiguracja routera Cudy LT400 V2.0 (Imprezja Quiz)

Router Cudy LT400 ma **Guest Network** i **QoS**, dzięki którym można ograniczyć przepustowość internetu wyłącznie dla gości (graczy), pozostawiając pełny dostęp dla Twojego sprzętu (hosta).

### Cel

- **Twój komputer (host)** – pełny internet, bez limitów.
- **Sieć gości (gracze)** – internet bardzo ograniczony (QoS), żeby telefony nie rozłączały się, ale chmury/sync nie zdążyły zablokować gry.

### Dlaczego QoS zamiast pełnej blokady (IP Filter)?

Gdy całkowicie zablokujesz internet (IP Filter „Allow list only”), telefony wykrywają brak połączenia i:
- pokazują komunikaty „Brak dostępu do internetu”,
- rozłączają się z WiFi lub przełączają na dane komórkowe.

**QoS z niskimi limitami** (np. 1 Mbps) rozwiązuje to: telefony widzą internet (ping przechodzi), ale przepustowość jest tak mała, że chmury i aktualizacje praktycznie nie działają. Gra (LAN) nie jest limitowana.

---

### Krok 1: Sieć gości (Guest Network)

1. Zaloguj się do panelu: **http://cudy.net** lub **http://192.168.10.1**
2. Przejdź do **Wireless** → **Guest Network**
3. Włącz Guest Network
4. Ustaw SSID i hasło (np. `Imprezja-Quiz`)
5. **Nie włączaj** Access Filter – QoS działa globalnie, nie potrzebujesz filtrów

### Krok 2: Ograniczenie przepustowości dla gości (QoS)

1. Przejdź do **Advanced Settings** → **Network** → **QoS**
2. Włącz QoS
3. W sekcji limitów dodaj **każde urządzenie gościa** (po adresie MAC):
   - Wybierz MAC z listy podłączonych urządzeń (lub wpisz ręcznie)
   - Ustaw **Download:** np. `1024` kbps (1 Mbps)
   - Ustaw **Upload:** np. `512` kbps (0,5 Mbps)
   - Zapisz wpis (**Add**)
4. **Nie dodawaj** swojego komputera (hosta) – ma pełną przepustowość

**Kiedy dodawać?** Na początku imprezy, gdy gracze już są podłączeni do sieci gości – w panelu zobaczysz listę urządzeń. Dodaj do QoS tylko te z Guest Network.

### Krok 3: Podłączenie sprzętu

| Urządzenie | Sieć | Dostęp |
|------------|------|--------|
| Twój komputer (host) | **Główna WiFi** lub **kabel LAN** | Pełny internet |
| Telefony graczy | **Guest Network** (np. Imprezja-Quiz) | Internet ograniczony (QoS), LAN bez limitów |

### Krok 4 (opcjonalnie): IP Filter – tylko jeśli QoS nie wystarczy

Jeśli mimo QoS telefony nadal zużywają za dużo pasma, możesz spróbować **Domain Filter** (blokada konkretnych domen, np. `*.icloud.com`, `*.googleapis.com`) zamiast pełnej blokady. Pełna blokada (IP Filter „Allow list only”) powoduje rozłączenia – unikaj jej.

### Uwagi

- **AP Isolation** – jeśli router ma taką opcję dla Guest Network, **nie włączaj jej** – goście muszą widzieć Twój komputer (host) w sieci lokalnej.
- **Traffic LAN** – QoS na Cudy dotyczy ruchu WAN (internet). Gra Imprezja Quiz używa tylko LAN – nie jest limitowana.
- **Test** – podłącz telefon do sieci gości, dodaj go do QoS, sprawdź: strony www ładują się bardzo wolno, a Imprezja Quiz działa płynnie.

---

### Automatyczne limitowanie (whitelist: „limit wszystkich oprócz moich urządzeń”)

**Problem:** Ręczne dodawanie każdego gościa do QoS jest uciążliwe. Chcesz: lista urządzeń nielimitowanych (Twój sprzęt) + automatyczne limitowanie wszystkich pozostałych.

**Ograniczenie stock firmware Cudy LT400:** Nie ma opcji „limit all except whitelist”. QoS działa tylko per urządzenie (MAC) – trzeba dodawać ręcznie.

#### Opcja A: Sprawdź Guest Network w panelu

1. Wejdź w **Wireless** → **Guest Network**
2. Przejrzyj wszystkie zakładki/opcje – niektóre firmware Cudy mają **Bandwidth limit** lub **Speed limit** dla sieci gości
3. Jeśli jest – ustaw np. 1–2 Mbps dla Guest Network. Wtedy **wszyscy goście** są limitowani automatycznie, a host (główna sieć) – nie

#### Opcja B: OpenWrt na Cudy LT400

Firmware Cudy jest oparty na OpenWrt. Jeśli masz lub zainstalujesz OpenWrt:

- Sieć gości ma osobny interfejs (np. `br-guest` lub VLAN)
- Można ustawić limit pasma **na cały interfejs** – wtedy wszyscy goście są limitowani automatycznie
- Host na głównej sieci LAN – bez limitów

Wymaga: instalacja OpenWrt (jeśli nie ma wersji dla LT400 V2.0 – sprawdź [forum OpenWrt](https://forum.openwrt.org/)) oraz konfiguracja `tc` (traffic control) lub SQM/nftables.

#### Opcja C: Xiaomi Mi 4C jako router sieci gości (zalecane)

Xiaomi Mi 4C ma **sieć gości z limitem pasma** w aplikacji Mi Home – limit dotyczy automatycznie wszystkich gości. Cudy LT400 nie ma tej opcji w Guest Network.

**Topologia:**
- **Cudy LT400** – główny router (4G internet), główna WiFi
- **Xiaomi Mi 4C** – podłączony kablem (Cudy LAN → Xiaomi WAN), tryb routera
- **Host** – łączy się z Cudy (główna sieć), pełny internet
- **Gracze** – łączą się z Xiaomi (sieć gości), limit pasma

Szczegóły w sekcji poniżej: [Xiaomi Mi 4C – sieć gości z limitem](#xiaomi-mi-4c--sieci-gości-z-limitem-dla-imprezja-quiz).

#### Opcja D: Skrypt na OpenWrt (zaawansowane)

Na routerze z OpenWrt i SSH można napisać skrypt, który:

- Pobiera listę podłączonych urządzeń
- Porównuje z whitelistą (MAC hosta)
- Dodaje limity QoS (UCI) dla nowych urządzeń spoza whitelisty
- Uruchamiany przez cron co 1–2 minuty

Wymaga dostępu SSH i znajomości UCI/OpenWrt.

---

## Xiaomi Mi 4C – sieć gości z limitem (dla Imprezja Quiz)

Xiaomi Mi 4C ma **sieć gości z limitem pasma** – ustawiasz go raz w aplikacji Mi Home, a **wszyscy goście są limitowani automatycznie**. Nie trzeba dodawać urządzeń ręcznie.

### Topologia

```
[4G] → Cudy LT400 (główny router)
         ├── WiFi główna → Host (komputer prowadzącego) – pełny internet
         └── LAN (kabel) → Xiaomi Mi 4C (WAN)
                            └── WiFi gości → Gracze – limit pasma
```

### Krok 1: Podłączenie Xiaomi do Cudy

1. **Reset** Xiaomi Mi 4C do ustawień fabrycznych (przycisk Reset 5–10 s)
2. Podłącz **port WAN** Xiaomi (niebieski) do **portu LAN** Cudy kablem Ethernet
3. Zaloguj się do Xiaomi: **http://192.168.31.1** lub **miwifi.com**
4. W kreatorze wybierz **tryb routera** (nie repeater, nie AP)
5. Xiaomi pobierze internet z Cudy przez DHCP – nie trzeba nic więcej konfigurować

### Krok 2: Sieć gości z limitem (aplikacja Mi Home)

Konfiguracja sieci gości jest w **aplikacji Mi Home** (Xiaomi Home), nie w panelu WWW.

1. Zainstaluj **Mi Home** lub **Xiaomi Home** na telefonie
2. Dodaj router Xiaomi Mi 4C do aplikacji
3. Przejdź do ustawień routera → **Sieć gości** / **Guest Wi-Fi**
4. Włącz sieć gości, ustaw SSID (np. `Imprezja-Quiz`) i hasło
5. **Ustaw limit pasma** – np. 1–2 Mbps pobierania, 0,5–1 Mbps wysyłania
6. Zapisz ustawienia

### Krok 3: Podłączenie sprzętu

| Urządzenie | Sieć | Dostęp |
|------------|------|--------|
| Komputer hosta | **Cudy** (główna WiFi lub kabel) | Pełny internet |
| Telefony graczy | **Xiaomi** (sieć gości, np. Imprezja-Quiz) | Internet z limitem |

### Krok 4: Imprezja Quiz – adres hosta

Host ma IP z Cudy (np. `192.168.10.100`). Gracze są za Xiaomi (192.168.31.x). Dzięki NAT na Xiaomi gracze mogą łączyć się z hostem – adres w QR kodzie (`http://192.168.10.100:3000`) będzie działał.

**Test:** Podłącz telefon do sieci gości Xiaomi, uruchom grę na komputerze, zeskanuj QR. Jeśli nie działa – sprawdź firewall na komputerze hosta.

### Uwagi

- **Izolacja sieci gości** – Xiaomi domyślnie izoluje gości od głównej sieci Xiaomi (192.168.31.x). Host jest na Cudy (192.168.10.x), więc jest traktowany jako „internet” – dostęp do hosta powinien działać.
- **AP Isolation** – na Xiaomi nie włączaj dodatkowej izolacji, jeśli jest taka opcja.
- **Tryb repeater** – Xiaomi w trybie repeatera **nie obsługuje** sieci gości. Musi być w trybie routera.

---

*Treść do dopracowania – routery Xiaomi, inne modele, dodatkowe przypadki.*
