# Release 1.1.1 (stabilna) – CLI: build + GitHub

Wersja **stabilna** (bez „beta”) – żeby klienci na 1.0.4 mogli zaktualizować automatycznie. Release na GitHubie **nie** może być oznaczony jako Pre-release.

---

## 1. Wersja w package.json

W pliku `package.json` ustaw wersję na **1.1.1** (bez `-beta`):

```json
"version": "1.1.1",
```

Zapisz plik.

---

## 2. Token GitHub (jednorazowo)

W terminalu (albo w `~/.zshrc` / `~/.bashrc`):

```bash
export GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

(Token: GitHub → Settings → Developer settings → Personal access tokens → Generate, zakres **repo**.)

**Sprawdź, czy token działa** (w tym samym terminalu, w którym robisz build/release):

```bash
# Czy zmienna jest ustawiona (pokazuje długość, nie sam token)
[ -n "$GH_TOKEN" ] && echo "OK: GH_TOKEN ustawiony" || echo "BŁĄD: Ustaw export GH_TOKEN=..."

# Weryfikacja tokena przez API (bez wypisywania tokena)
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token $GH_TOKEN" https://api.github.com/repos/djdamsza/Imprezja-Quiz-1.0.2-beta
```
Oczekiwany wynik: `200`. Jeśli `401` – token nieprawidłowy lub wygasły; `404` – brak dostępu do repo.

Jeśli masz **GitHub CLI** (`gh`): `gh auth status` – pokaże, czy jesteś zalogowany (może używać tokena z `GH_TOKEN`).

---

## 3. Build

### Opcja A – tylko Windows (na Windows)

```bash
cd /ścieżka/do/VoteBattle
npm run build:all-in-one:win
```

Wynik: `dist/Imprezja.Quiz.Setup.1.1.1.exe` (i ewentualnie `latest.yml`).

### Opcja B – tylko macOS (na Macu)

```bash
cd /ścieżka/do/VoteBattle
npm run build:njr
npm run build:mac:arm64
npm run build:mac:x64
```

Wynik w `dist/`: `Imprezja.Quiz-1.1.1-arm64.dmg`, `Imprezja.Quiz-1.1.1.dmg` (Intel).

### Opcja C – wszystko na Macu (Windows cross + oba DMG)

```bash
npm run build:njr
npm run build:win
npm run build:mac:arm64
npm run build:mac:x64
```

---

## 4. Publikacja na GitHub (release stabilny)

### Sposób 1: GitHub CLI (`gh`)

Jeśli masz [GitHub CLI](https://cli.github.com/) (`gh`):

```bash
cd /ścieżka/do/VoteBattle

# Jedna wersja (np. tylko Windows)
gh release create v1.1.1 ./dist/Imprezja.Quiz.Setup.1.1.1.exe \
  --repo djdamsza/Imprezja-Quiz-1.0.2-beta \
  --title "Imprezja Quiz 1.1.1" \
  --notes "Wersja stabilna. Auto-aktualizacja z 1.0.4. Poprawki: QR admina (Windows), zapora sieciowa, tunel."

# Albo wszystkie pliki z dist/ (gdy masz exe + oba DMG)
gh release create v1.1.1 ./dist/Imprezja.Quiz.Setup.1.1.1.exe ./dist/Imprezja.Quiz-1.1.1-arm64.dmg ./dist/Imprezja.Quiz-1.1.1.dmg \
  --repo djdamsza/Imprezja-Quiz-1.0.2-beta \
  --title "Imprezja Quiz 1.1.1" \
  --notes "Wersja stabilna. Auto-aktualizacja z 1.0.4."
```

**Ważne:** Nie używaj `--prerelease` – wtedy 1.0.4 zobaczy aktualizację.

### Sposób 2: electron-builder (publish)

Z poziomu projektu (po ustawieniu `version: "1.1.1"` i `GH_TOKEN`):

**Windows (na Windows):**
```bash
npm run build:all-in-one:win -- --publish always
```

**macOS (na Macu) – najpierw jeden target, potem drugi:**
```bash
npm run build:njr && electron-builder --mac --arm64 --publish always
npm run build:njr && electron-builder --mac --x64 --publish always
```

Sprawdź w [Releases](https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases): release **v1.1.1** musi być zwykły (bez zaznaczenia „Pre-release”).

### Sposób 3: Ręcznie w przeglądarce

1. Otwórz: https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/new  
2. **Tag:** `v1.1.1` (utwórz nowy).  
3. **Tytuł:** `Imprezja Quiz 1.1.1`  
4. **Opis:** np. „Wersja stabilna. Auto-aktualizacja z 1.0.4. Poprawki: QR admina (Windows), zapora, tunel.”  
5. **Nie zaznaczaj** „This is a pre-release”.  
6. Przeciągnij pliki z `dist/` do „Attach binaries”.  
7. **Publish release**.

---

## 5. Po wydaniu – wróć wersję do beta (opcjonalnie)

Jeśli dalej rozwijasz w repozytorium i chcesz zbierać kolejne zmiany jako beta:

```json
"version": "1.1.2-beta",
```

Zapisz. Kolejny release (np. 1.1.2-beta) wrzucisz osobno.

---

## Szybka ściąga (CLI)

| Krok | Polecenie |
|------|-----------|
| Wersja 1.1.1 | W `package.json`: `"version": "1.1.1"` |
| Token | `export GH_TOKEN=ghp_...` |
| Build Win | `npm run build:all-in-one:win` |
| Build Mac | `npm run build:njr && npm run build:mac:arm64` i osobno `build:mac:x64` |
| Release (gh) | `gh release create v1.1.1 ./dist/*.exe ./dist/*.dmg --repo djdamsza/Imprezja-Quiz-1.0.2-beta --title "Imprezja Quiz 1.1.1" --notes "..."` |
| Release (builder) | `npm run build:all-in-one:win -- --publish always` (na Windows) |

**Auto-update:** Działa, gdy release na GitHubie ma tag np. `v1.1.1` i **nie** jest oznaczony jako Pre-release.
