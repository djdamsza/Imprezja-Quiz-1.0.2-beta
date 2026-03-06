# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec – NJR konwerter
# Build: pyinstaller njr.spec

block_cipher = None

# Moduły wymagane przez NJR (hiddenimports)
hidden_imports = [
    'flask',
    'flask_cors',
    'werkzeug',
    'jinja2',
    'vdj_parser',
    'vdjfolder',
    'vdj_adapter',
    'rb_parser',
    'rb_generator',
    'rb_masterdb_generator',
    'serato_parser',
    'engine_parser',
    'traktor_parser',
    'djxml_parser',
    'djxml_generator',
    'unified_model',
    'tag_writer',
    'file_analyzer',
    'vdj_streaming',
    'license_njr',
    'mutagen',
    'cryptography',
    'pyrekordbox',
]

a = Analysis(
    ['launcher.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('static', 'static'),
    ],
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
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
    name='NJR-konwerter',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
