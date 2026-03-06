# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec – wersja JEDNOPLIKOWA (działa po skopiowaniu samego pliku)
# Budowanie: pyinstaller build-onefile.spec

block_cipher = None

a = Analysis(
    ['image_to_webp.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=['PIL', 'PIL.Image', 'PIL._tkinter_finder'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=['hook-tk.py'],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='Konwerter-WebP',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
