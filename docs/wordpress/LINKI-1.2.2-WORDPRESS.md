# Linki do podmiany na WordPress – Imprezja Quiz 1.2.2

## Jeśli pobieranie z GitHub daje „Not Found” (404)

Adresy `…/releases/download/v1.2.2/…` są **poprawne**, o ile plik **faktycznie został wgrany** do tego release’u. Po przerwanym `publish:github` na GitHubie może zostać np. tylko `.exe`, a **`.dmg` zwrócą 404** — linki na stronie wtedy „nie działają”, choć sama ścieżka jest dobra.

**Naprawa:** na maszynie z pełnym `dist/` (po `npm run pac`):

```bash
GITHUB_TOKEN=ghp_… npm run publish:github
```

**Sprawdzenie:** `npm run verify:github-release` — porównuje listę plików na GitHubie z oczekiwaną (exe + 2× dmg + opcjonalnie `napraw-uninstaller.bat`).

---

## Release na GitHub
https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/tag/v1.2.2

---

## Linki do pobrania (nazwy plików na GitHub: kropki zamiast spacji)

### Windows
```
https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/download/v1.2.2/Imprezja.Quiz.Setup.1.2.2.exe
```

### macOS Apple Silicon (M1/M2/M3)
```
https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/download/v1.2.2/Imprezja.Quiz-1.2.2-arm64.dmg
```

### macOS Intel
```
https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/download/v1.2.2/Imprezja.Quiz-1.2.2.dmg
```

### Windows — napraw-uninstaller.bat (pomoc przy deinstalacji / Avast)
Na stronie produktu / cenniku plik jest **wbudowany w HTML** (Base64 + przycisk „Pobierz” przez JavaScript) — nie wymaga GitHuba ani WordPress Media.

Dodatkowo można mieć załącznik na GitHub Release (wgrywany przez `npm run publish:github`):
```
https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/download/v1.2.2/napraw-uninstaller.bat
```

**Synchronizacja:** po zmianie `napraw-uninstaller.bat` w katalogu głównym repo uruchom:
`node scripts/embed-napraw-uninstaller-in-wordpress-docs.js` — podmieni Base64 we wszystkich plikach WordPress z tym przyciskiem.

---

## Pliki do wklejenia na WordPress

1. **Strona sukces (po płatności Stripe)** – `docs/wordpress/sukces.html`
2. **Strona sukces (wersja wklej)** – `docs/wordpress/sukces-wklej.html`
3. **Stripe cennik + pobierz** – `docs/wordpress/stripe-cennik.html`
4. **Blok pobierz** – `docs/wordpress/09-pobierz-1.2.2.html`
5. **Produkt pełna treść** – `docs/wordpress/imprezja-quiz-produkt-pelna-tresc.html`

---

## Stripe-shop (success.html)
`stripe-shop/public/success.html` – zaktualizowane

---

## Usuwanie starszych release'ów z GitHub

Jeśli brakuje miejsca, usuń **tylko naprawdę stare** release’y (np. v1.1.x), **nie** ten, do którego linkujesz na stronie sklepu.

**Uwaga:** „Delete this release" **kasuje wszystkie pliki .exe / .dmg** przy tej wersji — linki pobierania na WWW dadzą **404**, dopóki nie opublikujesz release’u ponownie (`npm run publish:github` z lokalnym folderem `dist/`).

**Odzyskanie po skasowaniu:** zbuduj instalatory (`npm run pac` lub osobno per platforma), potem `GITHUB_TOKEN=… npm run publish:github`. Skrypt `publish-release.js` **nie usuwa już wszystkich assetów naraz** przed uploadem (wcześniej przy przerwanym wgrywaniu mogły zniknąć wszystkie binaria z jednego release’u).

**napraw-uninstaller.bat** na stronie produktu jest **wbudowany w HTML** — usuwanie release’u na GitHubie **nie** wyłącza tego przycisku.

Wersja 1.2.2 dodaje m.in.: **Familiada – Kolory stron (TV)** (odwrócenie niebieski/czerwony na ekranie TV z admina). Poprzednio w 1.2.1: Admin PWA, WiFi Analyzer, wizualizacje itd. — zob. `CHANGELOG.md`.
