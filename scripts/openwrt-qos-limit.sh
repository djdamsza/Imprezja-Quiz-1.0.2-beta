#!/bin/sh
# OpenWrt – tc w pakiecie tc-tiny lub tc-full (nie ip-full!)
export PATH="/usr/sbin:/sbin:/bin:/usr/bin:/usr/libexec:$PATH"
for p in /usr/sbin/tc /sbin/tc /usr/bin/tc; do [ -x "$p" ] && TC="$p" && break; done
[ -z "$TC" ] && TC=$(command -v tc 2>/dev/null)
[ -z "$TC" ] && { echo "Błąd: brak tc. Zainstaluj: opkg install tc-tiny"; exit 1; }
#
# OpenWrt – limit przepustowości dla sieci QUIZ (cały ruch przez OpenWrt)
# Działa na br-lan – limit dotyczy sumy ruchu wszystkich klientów QUIZ.
#
# Użycie: uruchom na OpenWrt (ssh root@192.168.10.2)
#   sh openwrt-qos-limit.sh
#
# Lub przez stdin (gdy scp nie działa):
#   ssh root@192.168.10.2 "cat > /tmp/openwrt-qos-limit.sh && sh /tmp/openwrt-qos-limit.sh" < scripts/openwrt-qos-limit.sh
#
# Parametry (zmień przed uruchomieniem):
RATE="1mbit"      # Limit łącznie dla całej sieci QUIZ (up+down)
BURST="16kbit"    # Burst – wyższy = płynniejsze krótkie transfery

# tc na br-lan NIE działa dla ruchu mostowanego – limit na porcie do Cudy (eth)
# Znajdź interfejs eth w br-lan (port uplink do Cudy)
find_iface() {
  for iface in /sys/class/net/br-lan/brif/*; do
    [ -d "$iface" ] || continue
    name=$(basename "$iface")
    case "$name" in eth*) echo "$name"; return 0;; esac
  done
  # Fallback: eth0.1 (LAN na ramips/mt76x8)
  [ -d /sys/class/net/eth0.1 ] && echo "eth0.1" && return 0
  [ -d /sys/class/net/eth0 ] && echo "eth0" && return 0
  return 1
}

IFACE=""
apply_limit() {
  IFACE=$(find_iface)
  [ -z "$IFACE" ] && { echo "Błąd: nie znaleziono portu eth (br-lan/brif)"; exit 1; }
  for m in sch_tbf sch_htb ifb; do modprobe "$m" 2>/dev/null; done
  # Egress (upload od telefonów)
  $TC qdisc del dev "$IFACE" root 2>/dev/null
  if $TC qdisc add dev "$IFACE" root tbf rate "$RATE" burst "$BURST" latency 50ms 2>/dev/null; then
    echo "QoS egress: limit $RATE na $IFACE (upload od telefonów)."
  else
    $TC qdisc del dev "$IFACE" root 2>/dev/null
    $TC qdisc add dev "$IFACE" root handle 1: htb default 10 2>/dev/null && \
    $TC class add dev "$IFACE" parent 1: classid 1:10 htb rate "$RATE" ceil "$RATE" 2>/dev/null && \
    echo "QoS egress: limit $RATE na $IFACE (HTB)."
  fi
  # Ingress (download do telefonów) – IFB
  $TC qdisc del dev "$IFACE" ingress 2>/dev/null
  ip link show ifb0 >/dev/null 2>&1 || ip link add ifb0 type ifb 2>/dev/null
  ip link set ifb0 up 2>/dev/null
  $TC qdisc del dev ifb0 root 2>/dev/null
  if $TC qdisc add dev "$IFACE" handle ffff: ingress 2>/dev/null && \
     $TC filter add dev "$IFACE" parent ffff: protocol ip u32 match u32 0 0 action mirred egress redirect dev ifb0 2>/dev/null && \
     $TC qdisc add dev ifb0 root tbf rate "$RATE" burst "$BURST" latency 50ms 2>/dev/null; then
    echo "QoS ingress: limit $RATE na $IFACE (download do telefonów)."
  else
    $TC qdisc del dev "$IFACE" ingress 2>/dev/null
    echo "Uwaga: limit ingress (download) nie ustawiony – zainstaluj: opkg install kmod-ifb"
  fi
}

# Jeśli podano --install – zapisz do /root i dodaj do rc.local
if [ "$1" = "--install" ]; then
  SCRIPT_PATH="/root/openwrt-qos-limit.sh"
  for src in /tmp/openwrt-qos-limit.sh ./openwrt-qos-limit.sh; do
    [ -f "$src" ] && cp "$src" "$SCRIPT_PATH" && chmod +x "$SCRIPT_PATH" && break
  done
  if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Błąd: skrypt nie znaleziony. Uruchom najpierw: ssh ... \"cat > /tmp/openwrt-qos-limit.sh && sh /tmp/openwrt-qos-limit.sh\" < scripts/openwrt-qos-limit.sh"
    exit 1
  fi
  if ! grep -q "openwrt-qos-limit" /etc/rc.local 2>/dev/null; then
    sed -i "/exit 0/i $SCRIPT_PATH" /etc/rc.local
    echo "Dodano do /etc/rc.local – limit będzie stosowany przy starcie."
  fi
  apply_limit
  exit 0
fi

apply_limit
echo "Aby zmienić: edytuj RATE i BURST w skrypcie, uruchom ponownie."
echo "Aby uruchamiać przy starcie: sh /tmp/openwrt-qos-limit.sh --install"
IFACE=$(find_iface 2>/dev/null)
if [ -n "$IFACE" ]; then
  echo "Aby wyłączyć: $TC qdisc del dev $IFACE root; $TC qdisc del dev $IFACE ingress; ip link set ifb0 down 2>/dev/null"
fi
