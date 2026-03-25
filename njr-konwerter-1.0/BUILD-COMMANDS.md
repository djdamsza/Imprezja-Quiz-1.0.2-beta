# Komendy — build NJR Konwertera

Użyj **jednej** z poniższych ścieżek (A lub B). Ścieżka VoteBattle u Ciebie:  
`/Users/test/Documents/VoteBattle` — jeśli masz inną, zamień ją w komendach.

---

## A) Build na Twoim Macu (Apple Silicon) — jedna komenda

Skrypt sam weźmie kod z `tools/vdj-database-editor` i wrzuci binarkę do `releases/`.

```bash
export NJR_APP_DIR="$HOME/Documents/VoteBattle/tools/vdj-database-editor"
cd "$HOME/Documents/VoteBattle/njr-konwerter-1.0"
chmod +x scripts/build-local.sh
./scripts/build-local.sh
```

**Wynik:** plik  
`$HOME/Documents/VoteBattle/njr-konwerter-1.0/releases/NJR-konwerter-1.0.0`  
(arch: **arm64** — Mac M1/M2/M3).

---

## B) Build ręcznie (bez skryptu) — ten sam Mac

```bash
cd "$HOME/Documents/VoteBattle/tools/vdj-database-editor"
python3 -m pip install -r requirements.txt
python3 -m pip install pyinstaller
python3 -m PyInstaller njr.spec --clean --noconfirm
ls -la dist/
```

**Wynik:** `dist/NJR-konwerter` (uruchom: `./dist/NJR-konwerter`).

---

## C) Windows (osobny komputer — cmd)

Ścieżkę dostosuj (folder `VoteBattle` musi istnieć na tym PC).

```cmd
cd /d %USERPROFILE%\Documents\VoteBattle\tools\vdj-database-editor
python -m pip install -r requirements.txt
python -m pip install pyinstaller
python -m PyInstaller njr.spec --clean --noconfirm
dir dist
```

**Wynik:** `dist\NJR-konwerter.exe`

---

## D) Wszystkie trzy platformy — osobne repo `njr-konwerter` (z `editor/`)

```bash
cd "$HOME/Documents/njr-konwerter"
git push origin main
git tag -a v1.0.0 -m "NJR 1.0.0"
git push origin v1.0.0
```

**Actions** → workflow z repo konwertera → **Artifacts** / **Releases**.

---

## E) Wszystkie trzy platformy — repo **VoteBattle** na GitHubie (Imprezja Quiz)

W repozytorium jest workflow  
[`.github/workflows/njr-konwerter-build.yml`](../.github/workflows/njr-konwerter-build.yml)  
— buduje z `tools/vdj-database-editor`, wersja z `njr-konwerter-1.0/VERSION`.

**Ręcznie (bez taga):** GitHub → **Actions** → **Build NJR Konwerter (VoteBattle)** → **Run workflow** → po zakończeniu pobierz **Artifacts** (3× ZIP).

**Release z plikami do pobrania** — tag z prefiksem **`njr-v`**, żeby nie mylić z tagami Quiz (`v1.0.0` itd.):

```bash
cd "$HOME/Documents/VoteBattle"
git add -A
git commit -m "CI: build NJR na GitHubie"   # musi być push workflow + pliki
git push origin main
git tag -a njr-v1.0.0 -m "NJR Konwerter 1.0.0"
git push origin njr-v1.0.0
```

Link release:  
`https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/tag/njr-v1.0.0`  
(podmień user/repo jeśli inne).

---

## Typowe błędy

| Problem | Co zrobić |
|--------|-----------|
| `Brak katalogu ze źródłami` | Ustaw `NJR_APP_DIR` jak w **A** albo bądź w `tools/vdj-database-editor` jak w **B**. |
| `python3: command not found` | Na Macu czasem trzeba `python3` z Xcode CLT; na Windows użyj `python`. |
| Chcę `.exe`, jestem na Macu | `.exe` zrób na **Windows (C)** albo **GitHub Actions (D)**. |
| Chcę Intel Mac, mam tylko M-Maca | Zrób **D** (job `macos-15-intel`) albo build na fizycznym Intel Macu jak **B**. |

---

## Wersja w nazwie pliku

Numer bierze się z pliku `VERSION` w `njr-konwerter-1.0` (np. `1.0.0`). Zmiana:

```bash
echo "1.0.1" > "$HOME/Documents/VoteBattle/njr-konwerter-1.0/VERSION"
```

Potem znów **A** lub **B**.
