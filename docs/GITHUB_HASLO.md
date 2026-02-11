# GitHub – gdy terminal mówi „złe hasło”

GitHub **nie przyjmuje już zwykłego hasła** do logowania. Zamiast hasła użyj **Personal Access Token**.

---

## Krok 1: Utwórz token na GitHub

1. Zaloguj się na https://github.com
2. Kliknij swój awatar (prawy górny róg) → **Settings**
3. W lewym menu na dole: **Developer settings**
4. **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**
5. Nadaj nazwę (np. „VoteBattle”) i zaznacz uprawnienie **repo**
6. **Generate token**
7. **Skopiuj token** – wygląda np. `ghp_xxxxxxxxxxxx` – **zapisz go**, bo nie zobaczysz go ponownie

---

## Krok 2: W terminalu użyj tokena zamiast hasła

Gdy Git pyta o hasło, **wklej token** (nie hasło do konta).

```
Username: twoja-nazwa-github
Password: [wklej tutaj token ghp_xxxx...]
```

---

## Opcja: GitHub Desktop (bez terminala)

Jeśli nie chcesz używać terminala:

1. Pobierz **GitHub Desktop**: https://desktop.github.com
2. Zaloguj się przez aplikację (OAuth – bez tokena)
3. **File** → **Add local repository** → wybierz folder VoteBattle
4. **Publish repository** – wypchnie kod na GitHub

---

## Opcja: Upload przez przeglądarkę (tylko małe pliki)

- Wejdź na https://github.com/new
- Utwórz nowe repozytorium (np. „VoteBattle”)
- Na stronie repo: **Add file** → **Upload files**
- **Limit: 25 MB na plik** – większe pliki trzeba wrzucać przez Release (patrz GITHUB_REPO.md)
