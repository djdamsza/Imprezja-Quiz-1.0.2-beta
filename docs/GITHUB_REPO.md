# Imprezja Quiz – publikacja na GitHub

## Limity GitHub

| Sposób | Limit na plik |
|--------|----------------|
| **Przesyłanie przez przeglądarkę** (web UI) | **25 MB** |
| **Git (push z linii poleceń)** | 100 MB |
| **GitHub Releases** (pliki instalatorów) | **2 GB** |

## Źródła – co trafia do repozytorium

Katalogi `dist/` i `node_modules/` są w `.gitignore` – **nie trafiają** do repo.

Pozostały kod źródłowy mieści się w limitach. Użyj **Gita z linii poleceń** (nie przesyłaj plików przez przeglądarkę):

```bash
cd /Users/test/Documents/VoteBattle
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TWOJA-NAZWA/VoteBattle.git
git push -u origin main
```

## Instalatory (DMG, EXE) – GitHub Releases

Pliki instalatorów (100–130 MB) **nie** commituj do repo. Publikuj je jako **Release assets**:

1. Na GitHub: **Releases** → **Create a new release**
2. Utwórz tag (np. `v1.0.2`)
3. W sekcji **Attach binaries** przeciągnij pliki z `dist/`:
   - `Imprezja Quiz Setup 1.0.2.exe` (~119 MB)
   - `Imprezja Quiz-1.0.2-arm64.dmg` (~128 MB)
   - `Imprezja Quiz-1.0.2.dmg` (Intel)

Releases pozwalają na pliki do **2 GB**.

## Jeśli plik >25 MB został już dodany przez przeglądarkę

Użyj Gita zamiast web UI – `git push` obsługuje pliki do 100 MB.
