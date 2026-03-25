#!/bin/sh
#
# OpenWrt – konfiguracja jako Access Point (sieć QUIZ)
# Sieć główna: Cudy 192.168.10.x (DHCP 10-250)
# OpenWrt: 192.168.10.2 (poza pulą DHCP), WiFi QUIZ (WPA2)
#
# Użycie:
#   scp openwrt-ap-quiz-config.sh root@192.168.1.1:/tmp/
#   ssh root@192.168.1.1 "sh /tmp/openwrt-ap-quiz-config.sh"
#
# Gdy scp nie działa (ash: /usr/libexec/sftp-server: not found):
#   ssh root@192.168.1.1 "cat > /tmp/openwrt-ap-quiz-config.sh && sh /tmp/openwrt-ap-quiz-config.sh" < openwrt-ap-quiz-config.sh
#
# LUB wklej komendy w LuCI → System → Startup (Local Startup) lub przez SSH.
#

# === NETWORK ===
# LAN: statyczny IP w sieci Cudy
uci set network.lan.proto='static'
uci set network.lan.ipaddr='192.168.10.2'
uci set network.lan.netmask='255.255.255.0'
uci set network.lan.gateway='192.168.10.1'
uci set network.lan.dns='192.168.10.1'
# NIE wyłączaj LAN (lan.disabled='1' powoduje brak IP dla klientów WiFi!)

# WAN – wyłącz lub ustaw DHCP (nieużywany gdy łączysz Cudy LAN → OpenWrt LAN)
uci set network.wan.proto='none' 2>/dev/null || true

# === DHCP ===
# Wyłącz serwer DHCP – adresy wydaje Cudy
uci set dhcp.lan.ignore='1'
uci set dhcp.lan.dynamicdhcp='0'
# Usuń opcjonalne opcje jeśli powodują konflikty
uci delete dhcp.lan.ra_slaac 2>/dev/null || true

# === WIRELESS ===
# Włącz radio (niektóre firmware mają wyłączone domyślnie)
uci set wireless.radio0.disabled='0' 2>/dev/null || true
# Znajdź lub utwórz wifinet1 (sieć gości)
if ! uci get wireless.wifinet1 >/dev/null 2>&1; then
  uci set wireless.wifinet1='wifi-iface'
fi
uci set wireless.wifinet1.device='radio0'
uci set wireless.wifinet1.mode='ap'
uci set wireless.wifinet1.ssid='QUIZ'
uci set wireless.wifinet1.encryption='psk2'
uci set wireless.wifinet1.key='0123456789'
uci set wireless.wifinet1.network='lan'
uci set wireless.wifinet1.disabled='0'

# === ZAPISZ I ZASTOSUJ ===
uci commit network
uci commit dhcp
uci commit wireless

/etc/init.d/network restart
/etc/init.d/dnsmasq restart 2>/dev/null || true
# WAŻNE: wifi reload stosuje zmiany wireless (network restart tego nie robi)
wifi reload 2>/dev/null || wifi 2>/dev/null || true

echo "Gotowe. Panel OpenWrt: http://192.168.10.2"
