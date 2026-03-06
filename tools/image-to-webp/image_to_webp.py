#!/usr/bin/env python3
"""
Konwerter obrazów JPG/PNG → WebP
Aplikacja GUI – wybierz folder, program tworzy folder [nazwa]-webp z przekonwertowanymi plikami.
"""

import os
import sys
from pathlib import Path
from typing import Tuple, List

try:
    from PIL import Image
except ImportError:
    print("Zainstaluj Pillow: pip install Pillow")
    sys.exit(1)

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
except ImportError:
    print("Tkinter nie jest dostępny. Uruchom na systemie z GUI.")
    sys.exit(1)

# Obsługiwane rozszerzenia wejściowe
INPUT_EXT = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'}
# Jakość WebP (0–100, 85 = dobry kompromis rozmiar/jakość)
WEBP_QUALITY = 85
# Dla obrazów z przezroczystością – lossless
WEBP_LOSSLESS_FOR_ALPHA = True


def get_output_folder(input_path: Path) -> Path:
    """Zwraca ścieżkę folderu wyjściowego: [nazwa]-webp"""
    return input_path.parent / f"{input_path.name}-webp"


def convert_to_webp(input_path: Path, output_path: Path, quality: int = WEBP_QUALITY) -> Tuple[bool, str]:
    """
    Konwertuje pojedynczy obraz do WebP.
    Zwraca (sukces, komunikat).
    """
    try:
        img = Image.open(input_path)
        # Konwersja RGBA jeśli potrzeba (PNG z przezroczystością)
        if img.mode in ('RGBA', 'P'):
            if img.mode == 'P':
                img = img.convert('RGBA')
            # WebP z alpha – lossless daje lepszą jakość
            img.save(output_path, 'WEBP', quality=quality, method=6, lossless=WEBP_LOSSLESS_FOR_ALPHA)
        else:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.save(output_path, 'WEBP', quality=quality, method=6)
        return True, "OK"
    except Exception as e:
        return False, str(e)


def collect_image_files(root: Path) -> List[Path]:
    """Zbiera wszystkie obrazy rekurencyjnie (również w podfolderach)."""
    files = []
    for p in root.rglob('*'):
        if p.is_file() and p.suffix.lower() in INPUT_EXT:
            files.append(p)
    return sorted(files)


def process_folder(input_folder: Path, output_folder: Path, quality: int = WEBP_QUALITY, progress_callback=None) -> Tuple[int, int, List]:
    """
    Przetwarza wszystkie obrazy w folderze i podfolderach.
    Zachowuje strukturę katalogów w folderze wyjściowym.
    Zwraca (sukces, błędy, lista_błędów).
    """
    files = collect_image_files(input_folder)
    total = len(files)
    success = 0
    errors = []

    for i, f in enumerate(files):
        try:
            rel = f.relative_to(input_folder)
        except ValueError:
            rel = f.name
        out_path = output_folder / rel.parent / (f.stem + '.webp')
        out_path.parent.mkdir(parents=True, exist_ok=True)
        ok, msg = convert_to_webp(f, out_path, quality)
        if ok:
            success += 1
        else:
            errors.append((str(rel), msg))
        if progress_callback:
            progress_callback(i + 1, total, str(rel))

    return success, len(errors), errors


class App:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Konwerter obrazów → WebP")
        self.root.geometry("520x320")
        self.root.resizable(True, True)

        self.input_folder = tk.StringVar()
        self.output_folder = tk.StringVar()
        self.is_running = False

        self._build_ui()

    def _build_ui(self):
        # Główny kontener – tk.Frame lepiej działa na macOS
        main = tk.Frame(self.root, padx=20, pady=20, bg='#f5f5f5')
        main.pack(fill=tk.BOTH, expand=True)
        main.columnconfigure(0, weight=1)

        # Wybór folderu wejściowego
        tk.Label(main, text="Folder z obrazami:", bg='#f5f5f5').grid(row=0, column=0, sticky=tk.W, pady=(0, 4))
        row1 = tk.Frame(main, bg='#f5f5f5')
        row1.grid(row=1, column=0, sticky=tk.EW, pady=(0, 12))
        row1.columnconfigure(0, weight=1)
        tk.Entry(row1, textvariable=self.input_folder, width=45).grid(row=0, column=0, sticky=tk.EW, padx=(0, 8))
        tk.Button(row1, text="Wybierz folder…", command=self._select_input).grid(row=0, column=1)

        # Folder wyjściowy
        tk.Label(main, text="Folder wyjściowy:", bg='#f5f5f5').grid(row=2, column=0, sticky=tk.W, pady=(0, 4))
        tk.Label(main, textvariable=self.output_folder, fg='gray', bg='#f5f5f5').grid(row=3, column=0, sticky=tk.W, pady=(0, 12))

        # Jakość
        qual_frame = tk.Frame(main, bg='#f5f5f5')
        qual_frame.grid(row=4, column=0, sticky=tk.W, pady=(0, 12))
        tk.Label(qual_frame, text="Jakość WebP (1–100):", bg='#f5f5f5').grid(row=0, column=0, padx=(0, 8))
        qual_spin = tk.Spinbox(qual_frame, from_=1, to=100, width=5)
        qual_spin.grid(row=0, column=1)
        qual_spin.delete(0, tk.END)
        qual_spin.insert(0, str(WEBP_QUALITY))
        self._qual_spin = qual_spin

        # Progress
        self.progress_var = tk.DoubleVar(value=0)
        self.progress = ttk.Progressbar(main, variable=self.progress_var, maximum=100)
        self.progress.grid(row=5, column=0, sticky=tk.EW, pady=(0, 8))
        self.status_label = tk.Label(main, text="", bg='#f5f5f5')
        self.status_label.grid(row=6, column=0, sticky=tk.W, pady=(0, 12))

        # Przycisk Konwertuj
        self.btn_convert = tk.Button(main, text="Konwertuj", command=self._convert, width=15)
        self.btn_convert.grid(row=7, column=0, pady=(0, 8))

        self.root.minsize(450, 280)

    def _select_input(self):
        folder = filedialog.askdirectory(title="Wybierz folder z obrazami")
        if folder:
            self.input_folder.set(folder)
            p = Path(folder)
            out = get_output_folder(p)
            self.output_folder.set(str(out))

    def _convert(self):
        inp = self.input_folder.get().strip()
        if not inp or not Path(inp).is_dir():
            messagebox.showwarning("Uwaga", "Wybierz folder z obrazami.")
            return
        if self.is_running:
            return

        try:
            q = int(self._qual_spin.get())
            if q < 1 or q > 100:
                q = WEBP_QUALITY
        except (ValueError, tk.TclError):
            q = WEBP_QUALITY

        input_path = Path(inp)
        output_path = get_output_folder(input_path)

        self.is_running = True
        self.btn_convert.config(state=tk.DISABLED)
        self.progress_var.set(0)
        self.status_label.config(text="Konwersja…")

        def update_progress(current, total, name):
            pct = (current / total * 100) if total else 0
            self.progress_var.set(pct)
            self.status_label.config(text=f"{current}/{total} – {name}")
            self.root.update_idletasks()

        def run():
            success, err_count, err_list = process_folder(input_path, output_path, quality=q, progress_callback=update_progress)
            self.root.after(0, lambda: self._done(success, err_count, err_list, output_path))

        import threading
        threading.Thread(target=run, daemon=True).start()

    def _done(self, success: int, err_count: int, err_list: list, output_path: Path):
        self.is_running = False
        self.btn_convert.config(state=tk.NORMAL)
        self.progress_var.set(100)
        total = success + err_count
        if total == 0:
            self.status_label.config(text="Brak obrazów do konwersji.")
            messagebox.showinfo("Info", "W folderze nie znaleziono obrazów (jpg, png, bmp, tiff).")
        else:
            self.status_label.config(text=f"Gotowe: {success} OK, {err_count} błędów.")
            msg = f"Przekonwertowano {success} plików.\nZapisano w:\n{output_path}"
            if err_list:
                msg += f"\n\nBłędy ({err_count}):\n" + "\n".join(f"• {n}: {e}" for n, e in err_list[:5])
                if len(err_list) > 5:
                    msg += f"\n… i {len(err_list) - 5} więcej"
            messagebox.showinfo("Konwersja zakończona", msg)


def main():
    app = App()
    app.root.mainloop()


if __name__ == "__main__":
    main()
