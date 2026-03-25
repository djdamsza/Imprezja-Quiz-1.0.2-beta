# Repozytorium GitHub — NJR Konwerter

Konwerter NJR to **osobny produkt** — trzymaj go w **osobnym** repozytorium (np. `twoja-org/njr-konwerter`), bez mieszania z Imprezja Quiz ani innymi aplikacjami.

## Automatycznie: utworzenie repo + pierwszy push (token)

Ze struktury **VoteBattle** (szablon `njr-konwerter-1.0` obok `tools/vdj-database-editor`):

```bash
cd /ścieżka/do/VoteBattle/njr-konwerter-1.0
./scripts/github-bootstrap.sh
```

Skrypt:

1. Poprosi o **Personal Access Token** (wpis jest ukryty), chyba że ustawisz `GITHUB_TOKEN`.
2. Utworzy **prywatne** repozytorium `njr-konwerter` na Twoim koncie (lub `--name` / `--org` / `--public` — patrz `./scripts/github-bootstrap.sh --help`).
3. Złoży katalog: szablon + pełne źródła z `tools/vdj-database-editor` w `editor/`.
4. Zrobi `git commit` i `git push` na `main`.

**Token na GitHubie:** [Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens) — klasyczny PAT z zakresem **repo** (wystarczy do prywatnego repo). Nie wklejaj tokenu do plików w repozytorium.

Przydatne opcje:

```bash
./scripts/github-bootstrap.sh --name moj-njr --clone-to "$HOME/Projects/moj-njr"
./scripts/github-bootstrap.sh --org moja-firma --name njr-konwerter
./scripts/github-bootstrap.sh --dry-run
```

## Utworzenie repo ręcznie

1. Na GitHubie: **New repository** (np. `njr-konwerter`), bez domyślnego README jeśli masz już lokalne pliki.
2. Lokalnie — struktura z [`README.md`](README.md): korzeń repo = `README.md`, `editor/`, `scripts/`, `VERSION`, itd.

```bash
cd /ścieżka/do/njr-konwerter
git init -b main
git add .
git commit -m "NJR Konwerter — początek repozytorium"
git remote add origin git@github.com:TWOJ_USER/njr-konwerter.git
git push -u origin main
```

## CI

- [`.github/workflows/verify.yml`](.github/workflows/verify.yml) — szybka weryfikacja struktury repo.
- [`.github/workflows/build-converter.yml`](.github/workflows/build-converter.yml) — **pełny build PyInstaller** na:
  - **Windows x64** (`windows-latest`) → `.exe`
  - **macOS Apple Silicon** (`macos-latest`, arm64)
  - **macOS Intel** (`macos-15-intel`, x64)

W repozytorium musi być katalog **`editor/`** z `njr.spec` (tak jak po `github-bootstrap.sh`).

### Uruchomienie buildu

- **Ręcznie:** zakładka **Actions** → workflow **Build NJR Konwerter** → **Run workflow**.
- **Automatycznie przy wydaniu:** wypchnij tag w formacie `v*` (np. `v1.0.0`) — po zakończeniu buildów workflow dołączy pliki do **GitHub Release** o tej samej nazwie co tag.

```bash
git tag -a v1.0.0 -m "NJR Konwerter 1.0"
git push origin v1.0.0
```

### Linki do przekazania klientowi

| Sposób | Link / gdzie kliknąć |
|--------|----------------------|
| **Release (najlepsze do wklejenia na stronę / mail)** | `https://github.com/TWOJ_USER/njr-konwerter/releases/latest` albo konkretnie `https://github.com/TWOJ_USER/njr-konwerter/releases/tag/v1.0.0` — pod każdym release są **assets** (bez logowania, jeśli repo jest **publiczne**; przy **prywatnym** odbiorca musi mieć dostęp do repo). |
| **Pobranie konkretnego pliku z release** | `https://github.com/TWOJ_USER/njr-konwerter/releases/download/v1.0.0/NJR-konwerter-1.0.0-windows-x64.exe` (nazwa pliku = taka jak w artefakcie workflow). |
| **Artefakty z pojedynczego uruchomienia Actions** | **Actions** → wybierz run → sekcja **Artifacts** (ZIP). Działa dla osób z dostępem do repo; link do runu: `https://github.com/TWOJ_USER/njr-konwerter/actions/runs/RUN_ID` (RUN_ID zmienia się przy każdym buildzie). |

### Ręczne wrzucenie builda na istniejący release (CLI)

Po zalogowaniu `gh auth login`:

```bash
chmod +x scripts/upload-to-github-release.sh
./scripts/upload-to-github-release.sh v1.0.0 \
  ./releases/NJR-konwerter-1.0.0-windows-x64.exe \
  ./releases/NJR-konwerter-1.0.0-macos-arm64 \
  ./releases/NJR-konwerter-1.0.0-macos-intel-x64
```

(albo `gh release upload v1.0.0 plik1 plik2 --clobber` z katalogu repo).

## Release

1. Preferowane: **tag `v*`** + workflow build-converter (powyżej) — release z binariami bez ręcznego wgrywania.
2. Alternatywa: **Releases → Create release** w UI — dołącz binaria z `releases/` jako **assets** (samych dużych plików nie commituj do gałęzi — patrz `.gitignore`).

### Prywatne vs publiczne

Zwykle **prywatne**, jeśli kod i binaria są produktem komercyjnym.
