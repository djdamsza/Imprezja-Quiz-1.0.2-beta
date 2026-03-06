# Konwerter obrazów → WebP

Mini aplikacja GUI do konwersji obrazów (JPG, PNG, BMP, TIFF) na format WebP – oszczędność miejsca na dysku przy zachowaniu dobrej jakości.

## Instalacja

```bash
cd tools/image-to-webp
pip install -r requirements.txt
```

## Uruchomienie

```bash
python image_to_webp.py
```

## Jak używać

1. Kliknij **„Wybierz folder…”** i wskaż folder z obrazami (np. „Pobrane rzeczy” z plikami .jpg)
2. Program pokaże folder wyjściowy: `[nazwa-folderu]-webp` (np. `Pobrane rzeczy-webp`)
3. Ustaw jakość (1–100, domyślnie 85 – dobry kompromis rozmiar/jakość)
4. Kliknij **„Konwertuj”**

Obrazy zostaną zapisane w nowym folderze obok wybranego. Oryginały pozostają bez zmian.

**Struktura katalogów:** Program skanuje też podfoldery i zachowuje ich strukturę. Np. `Zdjęcia/wakacje/img1.jpg` → `Zdjęcia-webp/wakacje/img1.webp`.

**Przykład:** Wybierasz folder `Pobrane rzeczy` z plikami 7C1A0740.jpg, 7C1A0728.jpg itd. → program tworzy folder `Pobrane rzeczy-webp` z plikami 7C1A0740.webp, 7C1A0728.webp itd.

## Obsługiwane formaty wejściowe

- JPG, JPEG
- PNG
- BMP
- TIFF, TIF

## Wymagania

- Python 3.7+
- Pillow
- Tkinter (zazwyczaj wbudowany w Pythona)

---

## Wersja portable (bez instalacji Pythona)

Można zbudować wersję, która działa bez Pythona – całość w jednym folderze, do skopiowania na pendrive.

### Budowanie na macOS

```bash
cd tools/image-to-webp
chmod +x build.sh
./build.sh
```

Wynik: `dist/Konwerter-WebP` – **jeden plik**. Skopiuj go na biurko, pendrive – działa wszędzie. Uruchom przez dwukrotne kliknięcie.

### Budowanie na Windows

```bash
cd tools\image-to-webp
build.bat
```

Wynik: `dist\Konwerter-WebP.exe` – **jeden plik**. Skopiuj na pulpit, pendrive – działa wszędzie.

### Wymagania do budowania

- Python 3.7+ z pip
- `pip install pyinstaller pillow`

### Uwaga: wersja jednoplikowa

Program buduje teraz **jeden plik** (ok. 7 MB) zamiast folderu. Można go skopiować na biurko, pendrive – działa wszędzie. Nie trzeba kopiować folderu `_internal`.
