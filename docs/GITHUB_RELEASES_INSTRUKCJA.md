# Prosta instrukcja: wrzucenie buildu na GitHub Releases

**Kiedy:** Po przetestowaniu update na Mac i Windows – gdy wszystko działa.

---

## Co musisz mieć

1. **Konto GitHub** (jeśli nie masz: github.com → Sign up)
2. **Repozytorium** – może być to samo VoteBattle albo osobne np. `ImprezjaQuiz-releases`
3. **Token** – żeby build mógł wgrać pliki (jednorazowa konfiguracja)

---

## Krok 1: Utwórz repozytorium (jeśli nie ma)

1. Wejdź na **github.com**
2. Kliknij **+** (prawy górny róg) → **New repository**
3. Nazwa: np. **ImprezjaQuiz-releases** (albo użyj istniejącego VoteBattle)
4. Zaznacz **Private** jeśli nie chcesz, żeby było publiczne
5. Kliknij **Create repository**

---

## Krok 2: Utwórz token (jednorazowo)

1. GitHub → kliknij **swój avatar** (prawy górny róg) → **Settings**
2. Na dole po lewej: **Developer settings**
3. **Personal access tokens** → **Tokens (classic)**
4. **Generate new token** → **Generate new token (classic)**
5. Nazwa: np. `ImprezjaQuiz-build`
6. Zaznacz: **repo** (pełny dostęp do repozytoriów)
7. Kliknij **Generate token**
8. **Skopiuj token** – wyświetli się tylko raz! Zapisz w bezpiecznym miejscu.

---

## Krok 3: Ustaw token w projekcie

W terminalu (w folderze VoteBattle):

```bash
export GH_TOKEN=wklej_tutaj_swój_token
```

Albo dodaj do pliku `~/.zshrc` (Mac) lub `~/.bashrc` (Windows Git Bash):

```
export GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

Potem: `source ~/.zshrc` (lub zamknij i otwórz terminal).

---

## Krok 4: Zmień package.json

Otwórz `package.json` i znajdź sekcję `"publish"`. Zamień na:

```json
"publish": {
  "provider": "github",
  "owner": "TWOJA_NAZWA_NA_GITHUB",
  "repo": "NAZWA_REPOZYTORIUM"
}
```

**Dla tego projektu** (już ustawione w `package.json`):

```json
"publish": {
  "provider": "github",
  "owner": "djdamsza",
  "repo": "Imprezja-Quiz-1.0.2-beta"
}
```

---

## Krok 5: Build + automatyczne wgranie

```bash
# Windows
npm run build:win -- --publish

# Mac arm64 (Apple Silicon)
npm run build:mac:arm64 -- --publish

# Mac x64 (Intel)
npm run build:mac:x64 -- --publish
```

Po zakończeniu buildu pliki pojawią się w **GitHub → Twoje repo → Releases**.

---

## Krok 6: Sprawdź

1. Wejdź na **github.com/TWOJA_NAZWA/NAZWA_REPO**
2. Kliknij **Releases** (prawa strona)
3. Powinna być nowa wersja (np. v1.0.3) z plikami .exe i .dmg

---

## Szybka ściąga

| Co | Gdzie |
|----|-------|
| Token | Avatar → Settings → Developer settings → Personal access tokens |
| Repo | github.com → + → New repository |
| Releases | Repo → Releases (prawa kolumna) |
| owner | Twoja nazwa użytkownika na GitHub |
| repo | Nazwa repozytorium |

---

## Jeśli coś nie działa

- **Błąd 401/403** – token wygasł lub brak uprawnień (zaznacz `repo`)
- **Błąd "repo not found"** – sprawdź `owner` i `repo` w package.json
- **GH_TOKEN nie ustawiony** – upewnij się, że `echo $GH_TOKEN` pokazuje token
