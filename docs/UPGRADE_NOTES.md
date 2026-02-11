# Notatki dotyczące aktualizacji Electron

## Wykonane aktualizacje

### Electron: 28.0.0 → 35.7.5+
- **Powód**: Naprawa podatności ASAR Integrity Bypass (CVE-2024-XXXX)
- **Kompatybilność**: ✅ Wszystkie używane API są kompatybilne:
  - `app`, `BrowserWindow`, `dialog` - bez zmian
  - `app.isPackaged`, `process.resourcesPath` - bez zmian
  - `app.requestSingleInstanceLock()` - bez zmian
  - `dialog.showMessageBoxSync()` - bez zmian

### electron-builder: 24.9.1 → 26.7.0
- **Powód**: Naprawa podatności w `tar` (zależność pośrednia)
- **Kompatybilność**: ✅ Konfiguracja w `package.json` pozostaje bez zmian

## Testowanie po aktualizacji

Po zainstalowaniu nowych wersji przetestuj:

```bash
# 1. Zainstaluj zależności
npm install

# 2. Uruchom Electron w trybie deweloperskim
npm run electron

# 3. Zbuduj aplikację dla macOS
npm run build:mac

# 4. Zbuduj aplikację dla Windows
npm run build:win
```

## Potencjalne problemy

### Jeśli Electron nie uruchamia się:
- Sprawdź logi w `imprezja-electron.log`
- Sprawdź czy Node.js jest kompatybilny (Electron 35 wymaga Node.js 20.x)

### Jeśli build nie działa:
- Sprawdź czy `electron-builder` jest poprawnie zainstalowany
- Uruchom `npm run build:win -- --debug` dla szczegółowych logów

## Ewentualna aktualizacja do Electron 40.x

Jeśli w przyszłości będziesz chciał zaktualizować do Electron 40.x:

1. **Clipboard API**: Jeśli używasz clipboard w rendererze, użyj preload scripts
2. **window.open**: Sprawdź czy popupy działają poprawnie
3. **Testy**: Przetestuj wszystkie funkcje aplikacji

## Status

✅ **Aktualizacja gotowa do instalacji**
- Wszystkie używane API są kompatybilne
- Konfiguracja electron-builder pozostaje bez zmian
- Podatności bezpieczeństwa zostaną naprawione
