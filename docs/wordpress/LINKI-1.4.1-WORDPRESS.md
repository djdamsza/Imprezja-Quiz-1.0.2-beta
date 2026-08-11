# Linki do podmiany na WordPress – Imprezja Quiz 1.4.1

## Jeśli pobieranie z GitHub daje „Not Found" (404)

Adresy `…/releases/download/v1.4.1/…` są **poprawne**, o ile plik **faktycznie został wgrany** do tego release'u. Po przerwanym `publish:github` na GitHubie może zostać np. tylko `.exe`, a **`.dmg` zwrócą 404** — linki na stronie wtedy „nie działają", choć sama ścieżka jest dobra.

**Naprawa:** na maszynie z pełnym `dist/` (po `npm run pac`):

```bash
GITHUB_TOKEN=ghp_… npm run publish:github
```

**Sprawdzenie:** `npm run verify:github-release` — porównuje listę plików na GitHubie z oczekiwaną (exe + 2× dmg + opcjonalnie `napraw-uninstaller.bat`).

---

## Release na GitHub
https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/tag/v1.4.1

---

## Linki do pobrania (nazwy plików na GitHub: kropki zamiast spacji)

### Windows
```
https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/download/v1.4.1/Imprezja.Quiz.Setup.1.4.1.exe
```

### macOS Apple Silicon (M1/M2/M3)
```
https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/download/v1.4.1/Imprezja.Quiz-1.4.1-arm64.dmg
```

### macOS Intel
```
https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/download/v1.4.1/Imprezja.Quiz-1.4.1.dmg
```

### Windows — napraw-uninstaller.bat (pomoc przy deinstalacji / Avast)
Na stronie produktu / cenniku plik jest **wbudowany w HTML** (Base64 + przycisk „Pobierz" przez JavaScript) — nie wymaga GitHuba ani WordPress Media.

Dodatkowo można mieć załącznik na GitHub Release (wgrywany przez `npm run publish:github`):
```
https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/download/v1.4.1/napraw-uninstaller.bat
```

**Synchronizacja:** po zmianie `napraw-uninstaller.bat` w katalogu głównym repo uruchom:
`node scripts/embed-napraw-uninstaller-in-wordpress-docs.js` — podmieni Base64 we wszystkich plikach WordPress z tym przyciskiem.

---

## Pliki do wklejenia na WordPress

1. **Strona produktu / sklep (GŁÓWNE)** – `docs/wordpress/imprezja-quiz-produkt-pelna-tresc.html`
2. **Alias sklepu** – `docs/wordpress/imprezja-quiz-sklep-pelna-strona.html`
3. **Stripe cennik + pobierz** – `docs/wordpress/stripe-cennik.html`
4. **Blok pobierz (osobna strona)** – `docs/wordpress/09-pobierz-1.4.1.html`
5. **Strona sukces (po płatności Stripe)** – `docs/wordpress/sukces.html`
6. **Strona sukces (wersja wklej)** – `docs/wordpress/sukces-wklej.html`

---

## Stripe-shop (Render / własny hosting)
- `stripe-shop/public/success.html` – strona powrotu po Stripe (linki do pobrania).
- `stripe-shop/public/pobierz.html` – publiczna strona „Pobierz” (https://imprezja-quiz-1-0-2-beta.onrender.com/pobierz.html).

---

## Co nowego w 1.4.1 (krótko – do opisu na WordPress)

**Licencje / subskrypcja**
- **Auto-odnawianie licencji** — przy aktywnej subskrypcji program z internetem sam przedłuża licencję (nie trzeba wklejać klucza z maila po każdym odnowieniu).
- **7 dni łaski offline** — margines na imprezę bez sieci.

**Party Quiz (v1.4.0 + v1.4.1)**
- Milkdrop / Butterchurn na ekranie TV; szybka lista; lista pytań w PWA bez znikania wierszy.
- Sterowanie na żywo pod aktywnym pytaniem.

Pełny changelog: `CHANGELOG.md` oraz https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/tag/v1.4.1

---

## Kolejność wdrożenia (ważne)

1. `GITHUB_TOKEN=… npm run publish:github` — **najpierw** wgraj binaria na GitHub.
2. `npm run verify:github-release` — sprawdź, że wszystkie 3 instalatory odpowiadają 200 (nie 404).
3. Wklej HTML na WordPress (pliki powyżej).
4. Deploy `stripe-shop` na Render (auto-odnawianie licencji + zaktualizowane strony).
5. Wyślij mail do subskrybentów z linkiem do pobrania v1.4.1.

---

## Usuwanie starszych release'ów z GitHub

Jeśli brakuje miejsca, usuń **tylko naprawdę stare** release'y (np. v1.1.x), **nie** v1.4.1, do którego linkujesz na stronie sklepu.

**Uwaga:** „Delete this release" **kasuje wszystkie pliki .exe / .dmg** przy tej wersji — linki pobierania na WWW dadzą **404**, dopóki nie opublikujesz release'u ponownie.

**napraw-uninstaller.bat** na stronie produktu jest **wbudowany w HTML** — usuwanie release'u na GitHubie **nie** wyłącza tego przycisku.
