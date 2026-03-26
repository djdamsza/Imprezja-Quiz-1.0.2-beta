# Release: Mac (Apple Silicon) / Mac Intel / Windows

Wersja w pliku [`VERSION`](VERSION) (np. `1.0.0`). Nazwy plików z CI:  
`NJR-konwerter-1.0.0-macos-arm64`, `…-macos-intel-x64`, `…-windows-x64.exe`.

---

## 1. GitHub Actions — jeden tag, trzy binaria + Release

W **repozytorium konwertera** (np. `njr-konwerter`), z pełnym `editor/`:

```bash
cd /ścieżka/do/njr-konwerter
# opcjonalnie: echo "1.0.1" > VERSION && git add VERSION && git commit -m "Bump 1.0.1"
git add -A && git commit -m "Release przygotowanie"   # jeśli są zmiany
git tag -a v1.0.0 -m "NJR Konwerter 1.0.0"
git push origin main
git push origin v1.0.0
```

Po zielonym workflow **Build NJR Konwerter**:

- **Release:** `https://github.com/TWOJ_USER/njr-konwerter/releases/tag/v1.0.0`
- **Latest:** `https://github.com/TWOJ_USER/njr-konwerter/releases/latest`

Ręczne odpalenie buildu bez taga: **Actions → Build NJR Konwerter → Run workflow** (tylko artefakty ZIP, bez automatycznego Release).

---

## 2. Lokalny build — tylko na danej maszynie

Katalog z kodem: `editor/` (lub `tools/vdj-database-editor` w VoteBattle).

### macOS Apple Silicon (arm64) — na Macu M1/M2/M3

```bash
cd /ścieżka/do/njr-konwerter/editor
python3 -m pip install -r requirements.txt pyinstaller
python3 -m PyInstaller njr.spec --clean --noconfirm
cp dist/NJR-konwerter "../releases/NJR-konwerter-$(tr -d ' \t\r\n' < ../VERSION)-macos-arm64"
chmod +x "../releases/NJR-konwerter-"*
```

### macOS Intel (x64)

Najpewniej: **na Macu z procesorem Intel** te same komendy co wyżej, potem:

```bash
cp dist/NJR-konwerter "../releases/NJR-konwerter-$(tr -d ' \t\r\n' < ../VERSION)-macos-intel-x64"
chmod +x "../releases/NJR-konwerter-"*macos-intel*
```

Na Macu Apple Silicon **nie** dostaniesz natywnego binarium Intel bez środowiska x86_64 (np. osobnego Pythona x64 + Rosetta) — prościej użyć **GitHub job `macos-15-intel`**.

### Windows x64

W **cmd** lub PowerShell z katalogu `editor`:

```cmd
cd C:\ścieżka\do\njr-konwerter\editor
python -m pip install -r requirements.txt pyinstaller
python -m PyInstaller njr.spec --clean --noconfirm
copy dist\NJR-konwerter.exe ..\releases\NJR-konwerter-1.0.0-windows-x64.exe
```

(Wersję podstaw pod zawartość `VERSION`.)

---

## 3. Skrypt z korzenia repo NJR (jedna maszyna = jedna platforma)

```bash
cd /ścieżka/do/njr-konwerter
./scripts/build-local.sh
```

Kopiuje do `releases/` plik dla **bieżącego OS** (`.exe` albo binarka bez rozszerzenia).  
Żeby mieć wszystkie trzy — **Actions** albo trzy maszyny / trzy uruchomienia.

---

## 4. Ręczne utworzenie Release na GitHubie (masz już 3 pliki)

Zalogowany **GitHub CLI** (`gh auth login`):

```bash
cd /ścieżka/do/njr-konwerter
gh release create v1.0.0 \
  ./releases/NJR-konwerter-1.0.0-windows-x64.exe \
  ./releases/NJR-konwerter-1.0.0-macos-arm64 \
  ./releases/NJR-konwerter-1.0.0-macos-intel-x64 \
  --title "NJR Konwerter 1.0.0" \
  --notes "Windows x64, macOS Apple Silicon, macOS Intel"
```

Albo skrypt: [`scripts/upload-to-github-release.sh`](scripts/upload-to-github-release.sh).

---

## Podsumowanie

| Platforma              | Jak zbudować najprościej                          |
|------------------------|---------------------------------------------------|
| Apple Silicon          | `macos-latest` w Actions lub lokalnie na M-Mac    |
| Mac Intel              | `macos-15-intel` w Actions lub lokalnie na Intel  |
| Windows                | `windows-latest` w Actions lub lokalnie na PC     |

Szczegóły linków: [`GITHUB.md`](GITHUB.md).
