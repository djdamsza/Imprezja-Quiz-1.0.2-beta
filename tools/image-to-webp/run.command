#!/bin/bash
cd "$(dirname "$0")"
if ! python3 -c "import PIL" 2>/dev/null; then
    echo "Instaluję Pillow..."
    python3 -m pip install Pillow
fi
export TK_SILENCE_DEPRECATION=1
python3 image_to_webp.py
