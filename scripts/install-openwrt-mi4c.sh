#!/bin/bash
# Instalacja OpenWrt na Xiaomi Mi Router 4C
# Uruchom gdy komputer jest podłączony do sieci Xiaomi (WiFi lub LAN)
# Działa przez WiFi - opcja 1 (lokalny serwer) NIE wymaga internetu na routerze!
#
# Użycie:
#   ./install-openwrt-mi4c.sh [IP] [STOK] [HASŁO]
#   ./install-openwrt-mi4c.sh 192.168.31.1 33f82bd2a2098acdbf9032ce5c5388af
# Stok: zaloguj się na http://192.168.31.1, skopiuj z URL: ...;stok=XXXXXXXX/...
# Hasło domyślne: 0123456789

set -e
ROUTER_IP="${1:-192.168.31.1}"
FIRMWARE="/Users/test/Downloads/openwrt-24.10.5-ramips-mt76x8-xiaomi_mi-router-4c-squashfs-sysupgrade.bin"
SSH_OPTS="-oKexAlgorithms=+diffie-hellman-group1-sha1 -oHostKeyAlgorithms=+ssh-rsa -oConnectTimeout=10 -oStrictHostKeyChecking=no"

echo "=== OpenWrt na Xiaomi Mi 4C ==="
echo "Router: $ROUTER_IP"
echo ""

# Sprawdź połączenie
echo "[1/4] Sprawdzam połączenie z routerem..."
if ! ping -c 1 -W 3 "$ROUTER_IP" &>/dev/null; then
    echo "BŁĄD: Nie można połączyć się z $ROUTER_IP"
    echo "Podłącz komputer do sieci Xiaomi (WiFi lub kabel LAN do portu LAN routera)"
    exit 1
fi
echo "OK"

# Sprawdź firmware
if [ ! -f "$FIRMWARE" ]; then
    FIRMWARE="/Users/test/Downloads/openwrt-24.10.5-ramips-mt76x8-xiaomi_mi-router-4c-squashfs-sysupgrade (1).bin"
fi
if [ ! -f "$FIRMWARE" ]; then
    echo "BŁĄD: Nie znaleziono firmware w Downloads"
    exit 1
fi
echo "Firmware: $FIRMWARE"

# OpenWRTInvasion
echo ""
echo "[2/4] OpenWRTInvasion - uruchamiam..."
INVASION_DIR="/tmp/OpenWRTInvasion-master"
if [ ! -f "$INVASION_DIR/remote_command_execution_vulnerability.py" ]; then
    echo "Pobieranie OpenWRTInvasion..."
    curl -sL "https://github.com/acecilia/OpenWRTInvasion/archive/refs/heads/master.zip" -o /tmp/oi.zip
    unzip -o /tmp/oi.zip -d /tmp/
    rm -f /tmp/oi.zip
fi

cd "$INVASION_DIR"
pip3 install -r requirements.txt -q 2>/dev/null || true

STOK="$2"
if [ -n "$STOK" ]; then
    echo "Używam: IP=$ROUTER_IP, stok (ręcznie), opcja 1 (lokalny serwer)"
    # Wymuszamy ścieżkę "manual stok": podajemy złe hasło → get_stok fail → używamy stok
    # Kolejność: IP, złe_hasło, stok, 1 (opcja lokalny serwer - router NIE ma internetu!)
    printf "%s\nx\n%s\n1\n" "$ROUTER_IP" "$STOK" | python3 remote_command_execution_vulnerability.py
else
    echo ""
    echo ">>> UWAGA: Wpisz DOKŁADNIE w tej kolejności:"
    echo "    1. IP routera: $ROUTER_IP  (NIE wpisuj stok tutaj!)"
    echo "    2. Gdy spyta o stok: wklej stok z przeglądarki (po zalogowaniu na 192.168.31.1)"
    echo "    3. Opcja: 1"
    echo ""
    python3 remote_command_execution_vulnerability.py
fi

echo ""
echo "[3/4] Czekam na SSH (5 s)..."
sleep 5

# Usuń stary klucz hosta (invasion zmienia klucz routera)
ssh-keygen -R "$ROUTER_IP" -f ~/.ssh/known_hosts 2>/dev/null || true

# SSH wymaga hasła "root" (NIE hasła Xiaomi - to inne hasło!).
SSH_PASS="root"
USE_SSHPASS=""
if command -v sshpass &>/dev/null; then
    USE_SSHPASS=1
fi

# Test SSH (tylko z sshpass - inaczej blokuje na hasło)
echo "[3/4] Sprawdzam SSH..."
if [ -n "$USE_SSHPASS" ]; then
    if ! sshpass -p "$SSH_PASS" ssh $SSH_OPTS root@$ROUTER_IP "echo OK" 2>/dev/null; then
        echo "SSH nie odpowiada. Uruchom ręcznie (hasło: root)."
        exit 1
    fi
else
    echo "Brak sshpass - wpisz hasło 'root' gdy SSH zapyta (2x)."
    echo "Instalacja: brew install sshpass"
fi

# Transfer i flash
echo "[4/4] Przekazuję firmware i flashuję (~1 min)..."
if [ -n "$USE_SSHPASS" ]; then
    cat "$FIRMWARE" | sshpass -p "$SSH_PASS" ssh $SSH_OPTS root@$ROUTER_IP "cat > /tmp/firmware.bin"
    sshpass -p "$SSH_PASS" ssh $SSH_OPTS root@$ROUTER_IP "export PATH=/usr/sbin:/sbin:/bin:\$PATH; mtd -r write /tmp/firmware.bin OS1"
else
    echo "Wpisz 'root' gdy SSH zapyta o hasło (2 razy)."
    cat "$FIRMWARE" | ssh $SSH_OPTS root@$ROUTER_IP "cat > /tmp/firmware.bin"
    ssh $SSH_OPTS root@$ROUTER_IP "export PATH=/usr/sbin:/sbin:/bin:\$PATH; mtd -r write /tmp/firmware.bin OS1"
fi

echo ""
echo ">>> Gotowe! Router się restartuje."
echo ">>> Za 2-3 min: http://192.168.1.1 (ustaw hasło od razu!)"
