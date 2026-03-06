#!/bin/bash
# Budowanie wersji portable dla macOS
# Wymaga: pip install pyinstaller pillow

set -e
cd "$(dirname "$0")"

echo "Instalowanie zależności..."
pip3 install -q pyinstaller pillow

echo "Budowanie (wersja jednoplikowa)..."
python3 -m PyInstaller --noconfirm build-onefile.spec

echo ""
echo "Gotowe! Plik portable:"
echo "  dist/Konwerter-WebP"
echo ""
echo "Skopiuj ten JEDEN plik na biurko, pendrive – działa wszędzie."
echo "Uruchom: dwukrotne kliknięcie lub ./Konwerter-WebP"
