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

## Kamera przez WiFi – opóźnienia / przerywanie

Jeśli obraz z kamery na ekranie jest opóźniony lub się zacina, zobacz **[KAMERA_WIFI.md](KAMERA_WIFI.md)** – proste wskazówki (sieć 5 GHz, komputer na kablu, mniej urządzeń) oraz opcjonalne zmiany parametrów w kodzie.

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

### Krok 2: Ograniczenie przepustowości

**Opcja 1: Limit globalny (cała sieć LAN → internet)** – najprostsze

Cudy LT400 ma **globalny limit WAN** w QoS. Ogranicza przepustowość internetu dla **wszystkich** urządzeń (host + gracze). Idealne, gdy nie używasz Guest Network (np. Xiaomi ma Client Isolation i nie można go wyłączyć).

1. Przejdź do **Advanced Settings** → **Network** → **QoS**
2. **Włącz** QoS (Enable)
3. Ustaw **Download** (Mbps) – np. `1` lub `2`
4. Ustaw **Upload** (Mbps) – np. `0.5` lub `1`
5. **Save & Apply**

Efekt: cały ruch LAN → internet jest limitowany. Gra Imprezja Quiz działa w sieci lokalnej (LAN), więc **nie jest limitowana** – tylko internet (chmury, sync) jest ograniczony.

**Opcja 2: Limit per urządzenie (tylko goście)** – gdy używasz Guest Network

1. Przejdź do **Advanced Settings** → **Network** → **QoS**
2. Włącz QoS
3. W sekcji limitów dodaj **każde urządzenie gościa** (po adresie MAC):
   - Wybierz MAC z listy podłączonych urządzeń (lub wpisz ręcznie)
   - Ustaw **Download:** np. `1024` kbps (1 Mbps)
   - Ustaw **Upload:** np. `512` kbps (0,5 Mbps)
   - Zapisz wpis (**Add**)
4. **Nie dodawaj** swojego komputera (hosta) – ma pełną przepustowość

**Kiedy dodawać?** Na początku imprezy, gdy gracze już są podłączeni do sieci gości – w panelu zobaczysz listę urządzeń. Dodaj do QoS tylko te z Guest Network.

*Uwaga:* Jeśli w panelu QoS widzisz tylko pola **Download** i **Upload** (Mbps) bez listy urządzeń – to jest limit globalny (Opcja 1). Różne wersje firmware mogą mieć różne interfejsy.

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

#### Opcja C: Xiaomi Mi 4C jako router sieci gości

Xiaomi Mi 4C ma **sieć gości z limitem pasma** – limit działa tylko na sieci gości. **Uwaga:** Na Mi 4C nie da się wyłączyć Client Isolation w sieci gości, więc gracze nie mogą połączyć się z hostem (w LAN). W takim przypadku **użyj Cudy LT400 z limitem globalnym** (Opcja 1 powyżej) – wszyscy na sieci głównej Cudy, limit na cały internet.

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

Xiaomi Mi 4C ma **sieć gości z limitem pasma** – wszyscy goście są limitowani automatycznie. Konfiguracja zwykle przez aplikację Mi Home; jeśli Mi Home nie działa na Twoim Androidzie, patrz poniżej – alternatywy: panel WWW, Mi WiFi, limit WAN lub OpenWrt.

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

### Krok 2: Sieć gości z limitem

**Jeśli Mi Home nie jest dostępna** (np. niekompatybilna z Twoją wersją Androida), sprawdź poniższe alternatywy.

#### Opcja A: Panel WWW routera (bez aplikacji)

1. Zaloguj się do panelu: **http://192.168.31.1** lub **miwifi.com**
2. Przejdź do **WiFi** → **Sieć gości** / **Guest Network**
3. Włącz sieć gości, ustaw SSID i hasło
4. Sprawdź, czy jest opcja **Limit pasma** / **Bandwidth limit** – jeśli tak, ustaw np. 1–2 Mbps
5. Przejrzyj też **Zaawansowane** → **QoS** lub **Bandwidth Control** – niektóre firmware mają tam limit dla całego WAN lub dla sieci gości

*Uwaga:* Różne wersje firmware Xiaomi mają różne opcje. Jeśli nie ma limitu w panelu WWW, użyj opcji B lub C.

#### Opcja B: Aplikacja Mi WiFi (zamiast Mi Home)

**Mi WiFi** to osobna aplikacja do routerów Xiaomi (pakiet: `com.xiaomi.router`). Często działa na starszych Androidach, gdzie Mi Home już nie.

1. Zainstaluj **Mi WiFi** z Google Play (lub APK, jeśli Play nie oferuje dla Twojej wersji)
2. Dodaj router Xiaomi Mi 4C
3. Sieć gości → ustaw limit pasma

#### Opcja C: Limit całego routera (WAN) – bez sieci gości

Jeśli sieć gości ma blokady lub nie da się jej skonfigurować, możesz **ograniczyć przepustowość całego internetu** (WAN) na routerze. Wtedy wszyscy użytkownicy (host + gracze) dzielą ten limit.

- **Host** – ma mniej internetu, ale gra Imprezja Quiz działa w sieci lokalnej (LAN), więc to nie przeszkadza
- **Gracze** – internet bardzo ograniczony, chmury/sync praktycznie nie działają

**Gdzie szukać w panelu Xiaomi (192.168.31.1):**

- **QoS** / **Bandwidth Control** – szukaj opcji typu „Limit prędkości WAN”, „Maksymalna prędkość pobierania”
- **Zaawansowane** → **Sieć** – czasem jest tam limit dla całego łącza

Ustaw np. 2–3 Mbps dla całego routera – wystarczy na ping, gry LAN działają normalnie.

#### Opcja D: OpenWrt na Xiaomi Mi 4C

Pełna instrukcja w sekcji: [Instalacja OpenWrt na Xiaomi Mi 4C](#instalacja-openwrt-na-xiaomi-mi-4c).

---

**Jeśli używasz Mi Home** (działa na Twoim telefonie):

1. Zainstaluj **Mi Home** lub **Xiaomi Home**
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

## Instalacja OpenWrt na Xiaomi Mi 4C

**OpenWrt** to otwarte oprogramowanie routera oparte na Linuksie. Daje pełną kontrolę: SQM (limit pasma), sieć gości bez Client Isolation, firewall, VPN itd. Xiaomi Mi 4C ma oficjalne wsparcie od wersji 21.02, aktualnie 24.10.x.

Źródła: [OpenWrt Wiki – Xiaomi Mi Router 4C](https://openwrt.org/toh/hwdata/xiaomi/xiaomi_mi_router_4c), [OpenWRTInvasion](https://github.com/acecilia/OpenWRTInvasion), [forum OpenWrt](https://forum.openwrt.org/t/installing-openwrt-on-xiaomi-mi-router-4c/194915).

### Co będzie potrzebne

- Xiaomi Mi Router 4C (R4CM)
- Komputer z **Dockerem** (Mac/Linux) lub **Python 3** (Windows/Mac/Linux)
- Kabel Ethernet (komputer ↔ port LAN routera)
- Opcjonalnie: drugi kabel do obejścia kreatora (WAN↔LAN)

### Krok 1: Przygotowanie routera

1. **Reset** do ustawień fabrycznych (przycisk Reset 5–10 s)
2. Podłącz komputer **kablem** do portu **LAN** Xiaomi (nie WAN)
3. Uruchom kreator w przeglądarce: **http://192.168.31.1** lub **miwifi.com**
4. Ukończ konfigurację (język, hasło admina, SSID WiFi)
5. **Ważne:** Na etapie „Połącz z internetem” – jeśli nie masz internetu:
   - Podłącz kablem **WAN** i **LAN** Xiaomi (router widzi siebie jako „online”)
   - Kliknij „Sprawdź ponownie” – kreator przejdzie dalej
   - Możesz potem odłączyć ten kabel
6. Po ukończeniu kreatora zapisz **stok** z adresu URL:  
   `http://192.168.31.1/cgi-bin/luci/;stok=XXXXXXXX/web/home`  
   (XXXXXXXX to Twój stok)

### Krok 2: OpenWRTInvasion – dostęp root

Exploit daje tymczasowy dostęp SSH (hasło: `root`). Nie modyfikuje trwale firmware Xiaomi.

**Metoda A: Docker (zalecana)**

```bash
docker build -t openwrtinvasion https://github.com/acecilia/OpenWRTInvasion.git
docker run --network host -it openwrtinvasion
```

**Metoda B: Python**

```bash
git clone https://github.com/acecilia/OpenWRTInvasion.git
cd OpenWRTInvasion
pip install -r requirements.txt
python remote_command_execution_vulnerability.py
```

W skrypcie:
- IP routera: `192.168.31.1` (lub `miwifi.com`)
- Hasło: hasło admina ustawione w kreatorze
- Opcja plików: `1` (lokalny serwer – działa bez internetu na routerze)

Po sukcesie: **SSH root@192.168.31.1** (hasło: `root`).

### Krok 3: Backup (zalecane)

```bash
ssh -oKexAlgorithms=+diffie-hellman-group1-sha1 -oHostKeyAlgorithms=+ssh-rsa root@192.168.31.1
# hasło: root

# Na routerze:
dd if=/dev/mtd0 of=/tmp/ALL_backup.bin
dd if=/dev/mtd1 of=/tmp/Bootloader_backup.bin
dd if=/dev/mtd3 of=/tmp/Factory_eeprom.bin
```

Pobierz na komputer (w drugim terminalu):

```bash
scp -O -oKexAlgorithms=+diffie-hellman-group1-sha1 -oHostKeyAlgorithms=+ssh-rsa root@192.168.31.1:/tmp/*_backup.bin .
scp -O -oKexAlgorithms=+diffie-hellman-group1-sha1 -oHostKeyAlgorithms=+ssh-rsa root@192.168.31.1:/tmp/Factory_eeprom.bin .
```

### Krok 4: Pobierz firmware OpenWrt

Pobierz na komputer (nie na router):

- **24.10.5:** https://downloads.openwrt.org/releases/24.10.5/targets/ramips/mt76x8/openwrt-24.10.5-ramips-mt76x8-xiaomi_mi-router-4c-squashfs-sysupgrade.bin

### Krok 5: Przekaż firmware na router

**Opcja 1 – SCP** (jeśli działa):

```bash
scp -O -oKexAlgorithms=+diffie-hellman-group1-sha1 -oHostKeyAlgorithms=+ssh-rsa \
  openwrt-24.10.5-ramips-mt76x8-xiaomi_mi-router-4c-squashfs-sysupgrade.bin \
  root@192.168.31.1:/tmp/firmware.bin
```

**Opcja 2 – przez pipe** (gdy SCP nie działa – brak sftp-server):

```bash
cat openwrt-24.10.5-ramips-mt76x8-xiaomi_mi-router-4c-squashfs-sysupgrade.bin | \
  ssh -oKexAlgorithms=+diffie-hellman-group1-sha1 -oHostKeyAlgorithms=+ssh-rsa root@192.168.31.1 "cat > /tmp/firmware.bin"
```

### Krok 6: Flash OpenWrt

```bash
ssh -oKexAlgorithms=+diffie-hellman-group1-sha1 -oHostKeyAlgorithms=+ssh-rsa root@192.168.31.1

# Na routerze – sprawdź partycję (zwykle OS1 = mtd7):
cat /proc/mtd

# Flash:
mtd -r write /tmp/firmware.bin OS1
```

Router zrestartuje się. Po 2–3 minutach:

- **Panel WWW:** http://192.168.1.1 (domyślnie; może być 192.168.31.1 – sprawdź)
- **SSH:** `ssh root@192.168.1.1` (bez hasła przy pierwszym logowaniu – ustaw je od razu)

### Krok 7: Limit pasma (SQM) w OpenWrt

1. Panel: **Network** → **SQM QoS**
2. Zainstaluj: `opkg update && opkg install sqm-scripts luci-app-sqm`
3. Ustaw limit na interfejs **wan** (lub **wwan** dla 4G): np. 2000 kbit/s download, 1000 kbit/s upload
4. Włącz SQM

Alternatywa: **Firewall** → **Traffic Rules** – limity per host.

### Uwagi (instalacja)

- **Partia 2024:** Instrukcja działa też na nowszych egzemplarzach ([Sergio Giménez](https://sergiogimenez.com/posts/2025/openwrt-mi4c-2024-batch/)).
- **64 MB RAM:** Zainstaluj `zram-swap` (System → Software → zram-swap), żeby uniknąć braku pamięci przy wielu klientach.
- **Powrót do stock:** Przywróć backup przez U-Boot/TFTP (zaawansowane – szukaj w forum OpenWrt).

---

## Konfiguracja OpenWrt (Xiaomi Mi 4C) dla Imprezja Quiz

**Cel:** Sieć gości dla graczy z małym limitem internetu, **bez izolacji** – goście widzą się nawzajem i mogą łączyć się z hostem (komputer prowadzącego).

### Topologia (zalecana)

```
[Internet/4G] → Cudy LT400 (główny router)
                  ├── WiFi główna / LAN → Host (komputer) – pełny internet
                  └── LAN (kabel) → Xiaomi Mi 4C WAN
                                     └── WiFi gości „Imprezja-Quiz” → Gracze – limit pasma
```

Host łączy się z **Cudy**, gracze z **Xiaomi**. Dzięki temu SQM na Xiaomi limituje tylko ruch gości.

### Krok 1: Sieć gości (WiFi)

1. **Network** → **Wireless** → **Add** (dodaj nową sieć WiFi)
2. **General Setup:**
   - Mode: **Access Point**
   - ESSID: np. `Imprezja-Quiz`
   - Network: **Create / Assign firewall zone** → wybierz **Create new interface** → nazwa: `guest`
3. **Wireless Security:**
   - Encryption: **WPA2-PSK**
   - Key: ustaw hasło (np. proste, do podania graczom)
4. **Save** → **Save & Apply**

### Krok 2: Konfiguracja interfejsu guest

1. **Network** → **Interfaces** → znajdź interfejs **guest**
2. **Edit:**
   - Protocol: **Static address**
   - IPv4 address: `192.168.2.1`
   - IPv4 netmask: `255.255.255.0`
3. **DHCP Server** (zakładka obok General Setup):
   - Włącz **DHCP server**
   - Start: `100`, Limit: `100` (adresy 192.168.2.100–199)
4. **Save & Apply**

### Krok 3: Firewall – goście widzą hosta i siebie

1. **Network** → **Firewall** → **Zones**
2. Sprawdź strefę **guest** (powinna powstać przy tworzeniu interfejsu)
3. **Edit** strefy guest:
   - **Allow forward to destination zones:** zaznacz **wan** i **lan**
   - Dzięki temu goście mają internet (wan) i dostęp do hosta na Cudy (lan = upstream)
4. **Save & Apply**

**Brak izolacji:** OpenWrt domyślnie nie włącza Client Isolation – urządzenia w sieci gości widzą się nawzajem. Nie trzeba nic wyłączać.

### Krok 4: Limit pasma (SQM)

1. **System** → **Software** → **Update lists** (kliknij i poczekaj – router musi mieć internet)
2. Zainstaluj: `luci-app-sqm` (i `sqm-scripts`, jeśli brak)
3. **Network** → **SQM QoS**

**Jeśli „package is not available in any configured repository”:**

- **Router bez internetu** – podłącz WAN do sieci z internetem (np. Cudy), poczekaj na DHCP, spróbuj ponownie **Update lists**.
- **Instalacja ręczna (Upload Package):**
  1. Pobierz na komputer (Xiaomi Mi 4C = mipsel_24kc):
     - [sqm-scripts](https://downloads.openwrt.org/releases/24.10.5/packages/mipsel_24kc/packages/sqm-scripts_1.6.0-r1_all.ipk)
     - [luci-app-sqm](https://downloads.openwrt.org/releases/24.10.5/packages/mipsel_24kc/luci/luci-app-sqm_26.066.70324~6b42b91_all.ipk)
  2. **System** → **Software** → **Upload Package** – wgraj najpierw `sqm-scripts`, potem `luci-app-sqm`.
  3. Jeśli brakuje zależności – podłącz WAN do internetu i spróbuj ponownie **Update lists** + instalacja z repozytorium.
4. **Add new instance** → nazwa np. `guest-limit`
5. **Configuration:**
   - **Interface:** `wan` (lub `eth0.2` – interfejs WAN)
   - **Download speed:** `2000` kbit/s (2 Mbps)
   - **Upload speed:** `1000` kbit/s (1 Mbps)
   - **Queue discipline:** `cake` (domyślnie)
6. **Enable** SQM
7. **Save & Apply**

Efekt: cały ruch przez Xiaomi (tylko goście) jest limitowany. Host na Cudy ma pełną prędkość.

### Krok 5: Podłączenie sprzętu

| Urządzenie | Sieć | Dostęp |
|------------|------|--------|
| Komputer (host) | **Cudy** – WiFi główna lub kabel LAN | Pełny internet |
| Telefony graczy | **Xiaomi** – WiFi „Imprezja-Quiz” | Internet z limitem, LAN bez limitów |

### Krok 6: Adres hosta w quizie

Host ma IP z Cudy (np. `192.168.10.100`). Gracze są za Xiaomi (192.168.2.x). Dzięki NAT na Xiaomi gracze łączą się z hostem – adres w QR (`http://192.168.10.100:3000`) działa.

**Test:** Podłącz telefon do „Imprezja-Quiz”, zeskanuj QR. Jeśli nie działa – sprawdź firewall na komputerze hosta (zezwól port 3000 w sieci prywatnej).

### Xiaomi jako jedyny router (bez Cudy)

Jeśli Xiaomi jest głównym routerem (host i gracze na nim):

- Host na **LAN** (kabel lub główna WiFi), gracze na **guest**
- SQM na WAN limituje **wszystkich** (host + goście)
- Dla quizu to zwykle wystarczy – gra działa w LAN, limit dotyczy głównie internetu

### Wyłączenie sieci głównej – tylko sieć gości (mniej sieci WiFi)

Jeśli chcesz **wyłączyć WiFi główną** i zostawić tylko sieć gości (mniej bałaganu w listach sieci):

**OpenWrt na Mi 4C:**
1. **Network** → **Wireless**
2. Znajdź interfejs głównej sieci (np. `radio0` z SSID domyślnym)
3. **Disable** / **Wyłącz** tę sieć (lub ustaw **Disabled**)
4. Zostaw włączoną tylko sieć gości (np. `Imprezja-Quiz`)
5. **Save & Apply**

**Uwaga:** Host i gracze muszą łączyć się z siecią gości. Skoro logujesz się do routera z gości – działa. Wszyscy (host + telefony) na tej samej sieci gości – Imprezja Quiz działa w LAN.

**Stock firmware Xiaomi:** Zwykle nie da się wyłączyć tylko głównej WiFi (albo włączone obie, albo wyłączone wszystko). Rozwiązanie: OpenWrt.

### OpenWrt jako AP (sieć QUIZ) – gotowy skrypt

W `scripts/openwrt-ap-quiz-config.sh` jest skrypt konfigurujący OpenWrt jako Access Point:
- **LAN:** 192.168.10.2, brama 192.168.10.1 (sieć Cudy)
- **DHCP:** wyłączony (adresy wydaje Cudy)
- **WiFi:** SSID `QUIZ`, WPA2, hasło `0123456789`

**Użycie (ważna kolejność):**
1. **Reset OpenWrt** (przycisk reset ~10 s) – wraca do 192.168.1.1
2. **Podłącz komputer kablem do OpenWrt** (port LAN) – NIE do Cudy
3. Ustaw komputer na DHCP lub 192.168.1.x – wejdź na http://192.168.1.1
4. Uruchom skrypt (gdy scp nie działa):
   ```bash
   ssh root@192.168.1.1 "cat > /tmp/openwrt-ap-quiz-config.sh && sh /tmp/openwrt-ap-quiz-config.sh" < scripts/openwrt-ap-quiz-config.sh
   ```
5. **Podłącz: Cudy LAN → OpenWrt LAN** (kabel między routerami)
6. **Podłącz komputer do Cudy** (WiFi IMPREZJA lub kabel) – dostaniesz 192.168.10.x
7. Panel OpenWrt: http://192.168.10.2

**Gdy OpenWrt nie odpowiada po podłączeniu do Cudy:**
- Sprawdź listę DHCP w Cudy – czy OpenWrt ma adres?
- `ping 192.168.10.2` z komputera w sieci Cudy
- Jeśli brak – zrób reset OpenWrt i powtórz od punktu 1 (skrypt uruchamiaj TYLKO gdy komputer jest podłączony do OpenWrt, nie do Cudy)

**Uwaga:** Zmień hasło WiFi w skrypcie (`uci set wireless.wifinet1.key='...'`) przed uruchomieniem.

**Gdy WiFi nadal się nie pojawia** – sprawdź przez SSH (ssh root@192.168.10.2):
```bash
uci show wireless
wifi status
wifi reload
```
Jeśli `radio0` ma inną nazwę (np. `@wifi-device[0]`), dostosuj skrypt. Na niektórych routerach interfejs to `wifinet0` zamiast `wifinet1` – wtedy zmień w skrypcie `wifinet1` na `wifinet0`.

**Limity przepustowości dla sieci QUIZ (OpenWrt)**

Skrypt `scripts/openwrt-qos-limit.sh` ustawia limit na cały ruch przez OpenWrt (wszyscy klienci QUIZ łącznie). Domyślnie 1 Mbit/s.

**Wymagane pakiety** (przed pierwszym uruchomieniem):
```bash
ssh root@192.168.10.2 "opkg update && opkg install kmod-sched tc-tiny kmod-ifb"
```
*(kmod-ifb – dla limitu downloadu; bez niego działa tylko limit uploadu)*

**Krok 1 – wgraj i uruchom** (z katalogu VoteBattle):
```bash
ssh root@192.168.10.2 "cat > /tmp/openwrt-qos-limit.sh && sh /tmp/openwrt-qos-limit.sh" < scripts/openwrt-qos-limit.sh
```

**Krok 2 – uruchamiaj przy starcie** (opcjonalnie):
```bash
ssh root@192.168.10.2 "sh /tmp/openwrt-qos-limit.sh --install"
```

**Zmiana limitu:** Edytuj w skrypcie `RATE="5mbit"` (np. `10mbit`, `2mbit`), potem uruchom ponownie krok 1.

**Wyłączenie limitu:**
```bash
ssh root@192.168.10.2 "tc qdisc del dev br-lan root"
```

**Sprawdzenie:** `ssh root@192.168.10.2 "tc -s qdisc show dev br-lan"`

### WiFi Analyzer – wybór kanału 2,4 GHz

W Imprezja Quiz (zębatka → **WiFi Analyzer 2,4 GHz**) jest prosty skan sieci WiFi:
- **Zajętość kanałów 1–13** – słupki pokazują, ile sieci nadaje na każdym kanale
- **Szerokość 20/40 MHz** – przy 40 MHz sieć zajmuje 5 kanałów (np. kanał główny 1 → zakres 1–5). Wybierz opcję zgodną z ustawieniami routerów w okolicy.
- **Lista sieci** – SSID, kanał (zakres), siła sygnału (RSSI)

Uruchom skan przed imprezą, wybierz kanał z najniższym słupkiem (np. 1, 6 lub 11, jeśli wolne). Działa na Mac, Windows i Linux (wymaga `nmcli`).

### Znajdowanie IP drugiego routera (wpiętego przez LAN)

Gdy masz **2 routery** – główny i drugi podłączony kablem LAN (te same sieci WiFi) – adres panelu drugiego routera mógł zostać zmieniony. Jak go znaleźć:

**1. Tabela DHCP na routerze głównym**
- Zaloguj się do głównego routera (np. 192.168.31.1, 192.168.1.1)
- Szukaj: **DHCP** → **Lista klientów** / **Connected Devices** / **DHCP Leases**
- Drugi router ma stały adres z DHCP – znajdź urządzenie po **nazwie** (np. Xiaomi, TP-Link) lub **MAC** (adres z naklejki na routerze)

**2. Skan sieci z komputera (Mac)**
```bash
# Lista urządzeń w sieci (ARP) – uruchom osobno:
arp -a

# Skan zakresu – uruchom osobno (wymaga nmap: brew install nmap):
nmap -sn 192.168.18.0/24
```
*Uwaga:* Zamień `192.168.18.0` na swój subnet (np. 192.168.31.0, 192.168.1.0). Sprawdź: `ipconfig getifaddr en0` – jeśli masz 192.168.18.105, użyj 192.168.18.0/24.

**3. Typowe adresy drugiego routera**
- Główny 192.168.31.1 → drugi często: 192.168.31.2, 192.168.31.100
- Główny 192.168.1.1 → drugi: 192.168.1.2, 192.168.1.254
- Przetestuj w przeglądarce: `http://192.168.31.2`, `http://192.168.31.100` itd.

**4. Reset drugiego routera**
- Jeśli nic nie działa: przycisk Reset 5–10 s – router wróci do fabrycznego IP (np. Xiaomi: 192.168.31.1, TP-Link: 192.168.0.1)

### TP-Link jako drugi router (Access Point) – ta sama sieć 192.168.18.x i te same nazwy WiFi

Gdy panel TP-Link pokazuje białą stronę lub nie wchodzisz – **zresetuj router** (Reset 5–10 s), potem wykonaj kroki poniżej. Sieć główna: **192.168.18.1**.

---

**Krok 0: Reset i pierwsze wejście**
1. Przycisk **Reset** 5–10 s (światełka mrugną)
2. Podłącz komputer **kablem** do portu **LAN** TP-Link (nie WAN)
3. Odłącz kabel od głównego routera – na razie TP-Link ma być sam
4. W przeglądarce: **http://192.168.0.1** lub **http://tplinkwifi.net**
5. Login: `admin` / hasło: `admin` (lub sprawdź naklejkę na routerze)
6. Jeśli nadal biała strona: tryb incognito, inna przeglądarka, wyłącz rozszerzenia

---

**Krok 1: Tryb Access Point (jeśli menu jest)**

- **Advanced** → **Operation Mode** → **Access Point (AP)**
- Zapisz, router się zrestartuje

Jeśli nie ma takiego menu – przejdź do Kroku 2 (konfiguracja ręczna).

---

**Krok 2: Adres IP w sieci głównej**

- **Network** → **LAN** (lub **Advanced** → **Network** → **LAN**)
- **IP Address:** `192.168.18.2`
- **Subnet Mask:** `255.255.255.0`
- **Gateway:** `192.168.18.1`
- **Primary DNS Server:** `192.168.18.1` (główny router)
- Zapisz (Save)

*Uwaga:* Na głównym routerze ustaw zakres DHCP np. 192.168.18.100–250, żeby 192.168.18.2 nie był przydzielany innym urządzeniom.

---

**Krok 3: Wyłączenie DHCP**

- **DHCP** → **DHCP Settings**
- **Enable DHCP Server:** **OFF** / **Disable**
- Zapisz

---

**Krok 4: Te same nazwy WiFi co na routerze głównym**

Sprawdź na głównym routerze (192.168.18.1) nazwy sieci i hasła, potem ustaw **identyczne** na TP-Link:

- **Wireless** → **Wireless Settings** (lub **2.4GHz** / **5GHz** osobno)
- **SSID (nazwa sieci):** np. `TwojaSieć` – **dokładnie tak samo** jak na głównym
- **Password:** to samo hasło co na głównym
- **Security:** WPA2-Personal (tak jak główny)
- Dla dual-band: powtórz dla 2,4 GHz i 5 GHz

---

**Krok 5: Kanały WiFi (opcjonalnie)**

- Na głównym routerze: np. kanał 6 (2,4 GHz), 36 (5 GHz)
- Na TP-Link: ustaw **inny** kanał niż główny (np. 11 dla 2,4 GHz), żeby się nie nakładały
- Lub użyj **Auto** – router sam wybierze

---

**Krok 6: Podłączenie kabla**

- **Główny router (192.168.18.1)** – port **LAN** → kabel → **TP-Link** – port **LAN** (nie WAN)

**Ważne:** W trybie AP używaj portu **LAN** na TP-Link, nie niebieskiego WAN.

---

**Krok 7: Po zapisie**

- Odłącz kabel od komputera
- Podłącz TP-Link do głównego routera (LAN → LAN)
- Po ok. 1 minucie panel TP-Link: **http://192.168.18.2**

---

**Podsumowanie ustawień**

| Ustawienie | Wartość |
|------------|---------|
| **LAN IP** | 192.168.18.2 |
| **Maska** | 255.255.255.0 |
| **Brama** | 192.168.18.1 |
| **DHCP** | Wyłączony |
| **SSID** | Identyczny jak na głównym routerze |
| **Hasło WiFi** | Identyczne jak na głównym |
| **Podłączenie** | Główny LAN → TP-Link LAN |

---

**Jeśli nadal biała strona po resecie:**

- Sprawdź, czy komputer ma IP 192.168.0.x (np. `ipconfig getifaddr en0` na Macu)
- Spróbuj: `http://192.168.0.1` zamiast tplinkwifi.net
- Wyłącz VPN i proxy
- Inna przeglądarka (Safari, Firefox)

**Jeśli sieć działa, ale nie wchodzisz na panel TP-Link (192.168.18.2):**

1. **Sprawdź, czy TP-Link ma ten adres:** W tabeli DHCP głównego routera znajdź TP-Link po nazwie lub MAC (z naklejki) – zobaczysz aktualny IP.
2. **Bezpośrednie podłączenie:** Odłącz kabel od głównego routera. Podłącz komputer **tylko** do portu LAN TP-Link. Ustaw na komputerze IP ręcznie: 192.168.18.100, maska 255.255.255.0. W przeglądarce: http://192.168.18.2
3. **Alternatywny adres:** Niektóre TP-Link po zmianach wracają do 192.168.0.1 – spróbuj http://192.168.0.1 (komputer musi być podłączony bezpośrednio do TP-Link).

### Uwagi

- **zram-swap:** Na Mi 4C (64 MB RAM) warto zainstalować `zram-swap` przy wielu klientach: **System** → **Software** → `zram-swap`
- **Hasło root:** Po pierwszym logowaniu ustaw hasło: **System** → **Administration** → Password

---

### Inne routery z limitem pasma w panelu WWW

Jeśli Xiaomi nie spełnia oczekiwań, routery z natywnym limitem w panelu WWW (bez aplikacji):

- **MikroTik** – Simple Queues w panelu Winbox/WebFig, limit na WAN lub per interfejs
- **pfSense** – Traffic Shaper / Limiter w Firewall
- **OpenWrt** (dowolny router) – SQM, limit na interfejs gości lub WAN
- **TP-Link / inne** – sprawdź w specyfikacji „Guest Network bandwidth limit” lub „QoS” w panelu WWW

---

## Imprezator i NJR Sampler – narzędzia wielokrotnego użytku (WiFi)

**Imprezator** (muzyka do tańca) i **NJR Sampler** (panel na telefonie) są używane wielokrotnie w ciągu nocy, w różnych odstępach czasu. Telefon może być w kieszeni przez godzinę, potem animator otwiera stronę i ma działać – niezależnie od tego, czy w międzyczasie sieć się rozłączyła, czy używano Familiady lub Imprezja Quiz.

### Konfiguracja: tylko WiFi (bez tunelu)

- **Tunel LTE** został usunięty z tych trybów – działają wyłącznie przez sieć lokalną (Wi‑Fi).
- Zeskanuj QR z adresem lokalnym (np. `http://192.168.1.100:3000/imprezator/phone.html`).
- Telefon i komputer muszą być w tej samej sieci.

### Stabilność połączenia

Aplikacja obsługuje automatycznie:

1. **Rekonnekcja Socket.IO** – po rozłączeniu (np. zgaszony ekran, zmiana sieci) połączenie odtwarza się samo.
2. **Odświeżenie przy powrocie** – gdy wrócisz do zakładki po przerwie, stan jest pobierany ponownie.
3. **Fallback REST** – gdy Socket.IO nie jest połączony, stan jest pobierany przez HTTP co 5 sekund (tylko odczyt, sterowanie wymaga Socket.IO).

### Zalecenia dla routera

- **AP Isolation / Client Isolation** – **wyłączone** (goście muszą widzieć komputer hosta).
- **Stałe IP** – warto nadać komputerowi stały adres (DHCP reservation) w routerze, żeby adres w QR nie zmieniał się.
- **Stabilna sieć** – unikaj routerów z częstymi rozłączeniami; jeśli WiFi się resetuje, telefon po chwili połączy się ponownie.

### Użycie w ciągu nocy

1. Na początku imprezy: włącz Imprezator/Sampler na komputerze, zeskanuj QR na telefonie.
2. Możesz schować telefon, używać Familiady, Quiz itd.
3. Po przerwie: otwórz zakładkę Imprezator/Sampler na telefonie – powinno działać od razu.
4. Jeśli nie działa: odśwież stronę (pull-to-refresh lub F5) – połączenie zostanie nawiązane od nowa.

---

## Rekomendacje: router 4G LTE z siecią gości (Imprezja Quiz)

Na podstawie wymagań: **Guest Network bez izolacji** (goście widzą hosta w LAN), **limit pasma dla gości** (QoS), **slot na kartę SIM**, oraz doświadczeń z Cudy LT400 i Xiaomi.

### Wymagania

| Wymaganie | Opis |
|-----------|------|
| Guest Network bez AP Isolation | Goście muszą łączyć się z hostem (komputer prowadzącego) w sieci lokalnej – Imprezja Quiz, Imprezator, NJR Sampler |
| Limit internetu dla gości | QoS / bandwidth limit – telefony widzą internet (nie rozłączają się), ale chmury/sync praktycznie nie działają |
| Slot na kartę SIM | 4G LTE – internet mobilny bez kabla |
| Dodatkowo | Stabilna sieć, możliwość wyłączenia izolacji, QoS per sieć gości lub per urządzenie |

### Rekomendowane modele (2024–2025)

#### 1. **Cudy LT400 / LT500** (już używany w dokumentacji)

- **Plusy:** Guest Network, QoS (globalny lub per MAC), OpenWrt w tle, slot SIM, rozsądna cena
- **Minusy:** QoS per urządzenie – ręczne dodawanie gości; brak automatycznego „limit wszystkich oprócz whitelist”
- **Dla Imprezji:** Działa. Host na głównej sieci, gracze na Guest – ustaw limit globalny (Opcja 1) lub dodawaj gości ręcznie do QoS
- **Gdzie kupić:** Allegro, Cudy.com

#### 2. **TP-Link TL-MR6400** (V4/V5)

- **Plusy:** Guest Network z opcją **„Allow Guests to Access My Local Network”** – można włączyć dostęp gości do LAN (bez izolacji), QoS, slot nano SIM, kontrola rodzicielska, ~150–250 zł
- **Minusy:** WiFi N (300 Mb/s), tylko 2,4 GHz
- **Dla Imprezji:** W panelu: Advanced → Guest Network → włącz „Allow Guests to Access My Local Network”. QoS w tym samym panelu – limit globalny lub per urządzenie
- **Gdzie kupić:** Media Expert, x-kom, Allegro

#### 3. **DrayTek Vigor2865 LTE** (seria biznesowa)

- **Plusy:** 2 sloty SIM, Bandwidth Management per zakres IP, Guest Network, hotspot z captive portal, stabilność
- **Minusy:** Wyższa cena (~800–1200 zł)
- **Dla Imprezji:** Bandwidth Limit → Limitation List – osobny limit dla zakresu IP sieci gości. Pełna kontrola nad izolacją i limitami
- **Gdzie kupić:** DrayTek Polska, dystrybutorzy

#### 4. **D-Link G416** (WiFi 6 AX1500)

- **Plusy:** WiFi 6, 4G+ Cat6, sieć gości (Guest Zone), odkręcane anteny
- **Minusy:** Guest Zone ma domyślnie **„Internet Access only”** – izoluje gości od LAN. Trzeba sprawdzić w manualu, czy da się to wyłączyć
- **Uwaga:** Jeśli nie da się wyłączyć izolacji – **nie nadaje się** do Imprezji Quiz (gracze nie zobaczą hosta)

#### 5. **Router z OpenWrt** (dowolny model z oficjalnym wsparciem)

- **Plusy:** Pełna kontrola: sieć gości bez izolacji, SQM/limit pasma na interfejs, firewall
- **Minusy:** Wymaga instalacji OpenWrt i konfiguracji (UCI, firewall)
- **Modele 4G z OpenWrt:** Cudy (częściowo), niektóre ZTE, sprawdź [OpenWrt ToH](https://openwrt.org/toh/start)

### Czego unikać

- **Xiaomi Mi 4C** (i podobne) – sieć gości ma **Client Isolation bez możliwości wyłączenia** w stock firmware. Gracze nie połączą się z hostem. Rozwiązanie: OpenWrt (instrukcja w tym dokumencie) lub użycie jako routera sieci gości z limitem, z hostem na innym routerze (Cudy).
- **Routery z Guest Network „tylko internet”** bez opcji dostępu do LAN – nie nadają się do Imprezji Quiz.

### Podsumowanie – co kupić

| Budżet | Rekomendacja |
|--------|--------------|
| **Niski (~150–250 zł)** | TP-Link TL-MR6400 – sprawdź w specyfikacji opcję „Allow Guests to Access My Local Network” |
| **Średni (~250–400 zł)** | Cudy LT500 – nowszy niż LT400, dual band, podobna logika |
| **Wyższy (~800+ zł)** | DrayTek Vigor2865 LTE – pełna kontrola, 2× SIM, Bandwidth Management |

**Przed zakupem:** Sprawdź w manualu lub na forum, czy Guest Network ma opcję **dostępu do sieci lokalnej** (bez izolacji) oraz **limit pasma** dla gości.

---

*Treść do dopracowania – routery Xiaomi, inne modele, dodatkowe przypadki.*
