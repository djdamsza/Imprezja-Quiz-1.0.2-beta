# Tabela rzeczy do poprawy przed stabilnym buildem

**Checklista ręczna (wszystkie moduły + integracja):** [CHECKLISTA_QA_PRZED_RELEASE.md](CHECKLISTA_QA_PRZED_RELEASE.md)  
**Szybki smoke HTTP (wymaga działającego serwera):** `npm run qa:smoke-http`

---

| # | Kategoria | Problem | Priorytet | Uwagi |
|---|----------|---------|-----------|-------|
| 1 | **Zasoby** | Brak `build/icon.png` | Wysoki | `prepare-win-icon.js` wymaga `build/icon.png` do wygenerowania `icon.ico` dla Windows. Bez tego build:win przejdzie (skrypt exit 0), ale instalator nie będzie miał ikony. Źródło: utworzyć lub skopiować z innego projektu (np. 512×512 PNG). |
| 2 | **Zasoby** | `resources/cloudflared-windows/cloudflared.exe` nie w repo | Średni | Pobierane przez `prepare-cloudflared-for-windows.js` przed build:win. Na czystym klonie pierwszy build:win musi pobrać ~50 MB. Sprawdzić, czy `.gitignore` nie wyklucza `resources/` – jeśli tak, dodać wyjątek dla cloudflared. |
| 3 | **Zasoby** | ~~NJR konwerter~~ | — | **Osobny produkt** — repozytorium `djdamsza/njr-konwerter`, nie w tym monorepo. |
| 4 | **npm audit** | 9 luk bezpieczeństwa | Średni | `npm audit` zgłasza: ajv (ReDoS), electron (ASAR bypass), jimp/file-type (infinite loop), minimatch (ReDoS), qs (DoS), tar (path traversal). `npm audit fix` naprawi część; electron i jimp wymagają `--force` (breaking changes). |
| 5 | **Skrypt** | `rebuild:full` używa `rm -rf` | Niski | `rm -rf node_modules/electron/dist` nie działa na Windows. Zastąpić cross-platformowo (np. `node scripts/clean.js` rozszerzyć lub użyć `rimraf`). |
| 6 | **Wersja** | `1.2.0-beta.0` w package.json | Średni | Przed release zmienić na stabilną (np. `1.2.0`). |
| 7 | **Publish** | Repo GitHub `Imprezja-Quiz-1.0.2-beta` | Niski | `package.json` → `build.publish.repo` wskazuje na beta. Przed release upewnić się, że publikacja idzie do właściwego repo. |
| 8 | **Mac cross-compile** | build:mac:x64 tylko na Apple Silicon | Info | Dokumentacja: build Mac Intel wymaga Maca z Apple Silicon. Na Intel Macu skrypt się pomija. |
| 9 | **Electron** | Brak jawnej konfiguracji ikon Mac | Niski | electron-builder domyślnie szuka `build/icon.icns`. Jeśli brak – używa domyślnej. Dla spójności dodać `build/icon.icns` (z icon.png). |
| 10 | **cloudflared** | Wersja 2026.2.0 w cloudflared-version.js | Info | Wersja istnieje na GitHub. Najnowsza to 2026.3.0 – rozważyć aktualizację. |
| 11 | **pkg (launcher)** | `build:launcher` wymaga `pkg` | Niski | `pkg launcher.js --targets node18-win-x64` – `pkg` nie jest w devDependencies; wymaga `npm install -g pkg` przed build:launcher. |
| 12 | **StrContains.nsh** | installer.nsh nie używa StrContains | Info | Komentarz w installer.nsh: „bez StrContains.nsh (generowało NSIS 6010)". Plik StrContains.nsh istnieje w build/ – upewnić się, że nie jest zbędny. |

---

## Szybkie działania przed pierwszym buildem

1. **Windows**: Uruchomić `npm run build:win` – skrypt pobierze cloudflared.exe i wygeneruje icon.ico (jeśli jest icon.png).
2. **Mac**: `npm run build:mac` – wymaga `prepare-cloudflared-*` tylko dla x64 na Apple Silicon.

## Zależności do rozważenia

- Dodać `build/icon.png` (np. 512×512) – źródło ikony dla Windows i Mac.
- Dodać `rimraf` lub rozszerzyć `clean.js` o usuwanie `node_modules/electron/dist` dla `rebuild:full` na Windows.
- Uruchomić `npm audit fix` (bez --force) przed release – patrz `docs/LUKI_BEZPIECZENSTWA_NPM_AUDIT.md`.
- Dla `pkg`: `npm install -g pkg` lub dodać do devDependencies.
