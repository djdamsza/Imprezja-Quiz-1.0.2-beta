# Krok 2.1 – Projekt na GitHubie (szczegółowo)

Railway potrzebuje kodu z GitHuba. Poniżej dokładnie, co kliknąć i co wpisać.

---

## Scenariusz A: Projekt NIE jest jeszcze na GitHubie

### Krok 1: Utwórz repozytorium na GitHubie

1. Otwórz przeglądarkę i wejdź na **https://github.com**
2. Zaloguj się (jeśli nie masz konta – **Sign up**)
3. W **prawym górnym rogu** obok avatara znajdź przycisk **+** (plus)
4. Kliknij **+** → z listy wybierz **New repository**
5. Wypełnij:
   - **Repository name:** wpisz np. `Imprezja-Quiz` (bez spacji)
   - **Description:** opcjonalnie, np. „Quiz na imprezy”
   - **Public** – zostaw zaznaczone
   - **Add a README file** – odznacz (mamy już pliki w projekcie)
   - **Add .gitignore** – wybierz „Node” (opcjonalnie)
6. Kliknij zielony przycisk **Create repository**

### Krok 2: Wgraj projekt z komputera

1. Otwórz **Terminal** (Mac) lub **Wiersz poleceń** (Windows)
2. Przejdź do folderu projektu:
   ```bash
   cd Documents/VoteBattle
   ```
   (dostosuj ścieżkę, jeśli projekt jest gdzie indziej)

3. Sprawdź, czy jest git:
   ```bash
   git --version
   ```
   Jeśli nie ma – zainstaluj Git z [git-scm.com](https://git-scm.com)

4. Wykonaj po kolei (zamień `djdamsza` na swoją nazwę użytkownika GitHub, `Imprezja-Quiz` na nazwę repozytorium):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/djdamsza/Imprezja-Quiz.git
   git push -u origin main
   ```

5. Przy `git push` może poprosić o logowanie – użyj swojego konta GitHub (lub tokena)

6. Odśwież stronę repozytorium na GitHubie – powinieneś zobaczyć pliki, m.in. folder **stripe-shop**

---

## Scenariusz B: Projekt JUŻ jest na GitHubie

1. Wejdź na **https://github.com** → zaloguj się
2. Kliknij ikonę swojego avatara (prawy górny róg) → **Your repositories**
3. Kliknij repozytorium z projektem (np. Imprezja-Quiz, VoteBattle)
4. Sprawdź, czy na liście plików jest folder **stripe-shop**
5. Kliknij **stripe-shop** – wewnątrz powinny być: `server.js`, `package.json`, folder `public`

Jeśli folderu `stripe-shop` nie ma – dodaj go lokalnie i wypchnij zmiany:
```bash
cd Documents/VoteBattle
git add stripe-shop
git commit -m "Add stripe-shop"
git push
```

---

## Co dalej

Gdy projekt jest na GitHubie z folderem `stripe-shop`, przejdź do **Kroku 2.2** w [STRIPE_CHECKLIST.md](STRIPE_CHECKLIST.md) – deploy na Railway.
