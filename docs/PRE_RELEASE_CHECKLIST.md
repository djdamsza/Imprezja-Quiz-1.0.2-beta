# Checklist przed wydaniem builda (Win + Mac)

Przed zbudowaniem i wydaniem nowej wersji Imprezja Quiz wykonaj poniższe kroki.

---

## 1. Zmiana wersji w `package.json`

Otwórz **`package.json`** i zmień pole **`"version"`**:

- **Poprawki (patch):** np. `1.0.0` → `1.0.1`
- **Nowe funkcje (minor):** np. `1.0.0` → `1.1.0`
- **Duże zmiany (major):** np. `1.0.0` → `2.0.0`

Przykład:
```json
"version": "1.0.1"
```

Z tej wersji biorą się nazwy plików (np. `Imprezja Quiz Setup 1.0.1.exe`, `Imprezja Quiz-1.0.1-arm64.dmg`).

---

## 2. Zależności

W katalogu projektu:

```bash
npm install
```

---

## 3. Test przed buildem

- Uruchom aplikację: `npm start` lub `npm run electron`
- Sprawdź:
  - [ ] Ekran TV (Screen.html) – pełny ekran, przyciski, QR, Rozpocznij
  - [ ] Panel admina (admin.html) – quiz, reset, END GAME, raport błędów
  - [ ] Głosowanie (vote.html) – odpowiedzi, tryb drużynowy
  - [ ] Nowe funkcje z tej wersji

---

## 4. Build Windows

**Na Windows:**

- **Zalecane:** dwuklik **`build-win-jako-admin.bat`** (build z uprawnieniami administratora)
- Lub: **cmd** → prawy przycisk → **Uruchom jako administrator** → `cd` do projektu → `npm run build:win`

**Na Macu:**

```bash
npm run build:win
```

**Wynik w `dist/`:**
- `Imprezja Quiz Setup X.Y.Z.exe` – instalator
- `Imprezja Quiz X.Y.Z-portable.exe` – wersja portable (bez instalacji)

---

## 5. Build Mac

**Jedna komenda – jeden plik na wszystkie Maci (Intel i7 + M1/M2/M3/M4):**
```bash
npm run build:mac:universal
```
→ Wynik: `Imprezja Quiz-X.Y.Z-universal.dmg` i `Imprezja Quiz-X.Y.Z-universal-mac.zip` (działają na Intel i Apple Silicon).

**Osobne architektury (mniejsze pliki, trzeba wybrać x64 lub arm64):**
```bash
npm run build:mac           # osobno x64 i arm64
npm run build:mac:x64       # tylko Intel
npm run build:mac:arm64     # tylko Apple Silicon
```

**Wynik w `dist/`:**
- np. `Imprezja Quiz-X.Y.Z-universal.dmg`, `Imprezja Quiz-X.Y.Z-x64.dmg`, `Imprezja Quiz-X.Y.Z-arm64.dmg`

---

## 6. Po buildzie

- [ ] Sprawdź, że w `dist/` są oczekiwane pliki
- [ ] Przetestuj instalator / portable na czystej maszynie (opcjonalnie)
- [ ] Zapisz lub opublikuj pliki do dystrybucji
- [ ] (Opcjonalnie) zaktualizuj changelog lub notatki do wersji

---

## Szybka ściąga

| Krok | Komenda / akcja |
|------|------------------|
| Wersja | Edytuj `package.json` → `"version": "1.0.1"` |
| Zależności | `npm install` |
| Test | `npm start` lub `npm run electron` |
| Win (na Windows) | `build-win-jako-admin.bat` lub `npm run build:win` (jako admin) |
| Win (na Mac) | `npm run build:win` |
| Mac uniwersalny | `npm run build:mac:universal` |
