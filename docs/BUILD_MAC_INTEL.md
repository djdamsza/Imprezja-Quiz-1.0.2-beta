# Build dla starszych Maców (Intel i7)

## Konfiguracja

Aplikacja jest skonfigurowana do budowania dla:
- **Intel Macs (x64)** - starsze Maci z procesorem i7, i5, itd.
- **Apple Silicon (arm64)** - nowsze Maci z procesorem M1, M2, M3
- **Universal Binary** - jeden plik działający na obu architekturach

## Minimalne wymagania

- **macOS**: 10.13 (High Sierra) lub nowszy
- **Procesor**: Intel x64 lub Apple Silicon (arm64)

## Komendy build

### 1. Build dla Intel Mac (x64) - starsze Maci z i7

```bash
npm run build:mac:intel
```

Lub:

```bash
npm run build:mac:x64
```

**Wynik**: 
- `dist/IMPREZJA-1.0.0-x64.dmg` - instalator dla Intel Mac
- `dist/IMPREZJA-1.0.0-x64-mac.zip` - archiwum ZIP dla Intel Mac

### 2. Build dla Apple Silicon (arm64) - nowsze Maci

```bash
npm run build:mac:arm64
```

**Wynik**: 
- `dist/IMPREZJA-1.0.0-arm64.dmg` - instalator dla Apple Silicon
- `dist/IMPREZJA-1.0.0-arm64-mac.zip` - archiwum ZIP dla Apple Silicon

### 3. Universal Binary - działa na obu architekturach

```bash
npm run build:mac:universal
```

**Wynik**: 
- `dist/IMPREZJA-1.0.0-universal.dmg` - instalator uniwersalny
- `dist/IMPREZJA-1.0.0-universal-mac.zip` - archiwum ZIP uniwersalne

**Uwaga**: Universal Binary jest większy (~2x), ale działa na wszystkich Macach.

### 4. Build dla wszystkich architektur (domyślny)

```bash
npm run build:mac
```

**Wynik**: Osobne pliki dla x64 i arm64.

## Instalacja na starszym Macu (Intel i7)

1. **Pobierz plik**: `IMPREZJA-1.0.0-x64.dmg`
2. **Otwórz plik DMG** (kliknij dwukrotnie)
3. **Przeciągnij aplikację** do folderu Applications
4. **Uruchom aplikację** z folderu Applications

### Jeśli macOS blokuje uruchomienie:

1. Otwórz **System Preferences** → **Security & Privacy**
2. Kliknij **"Open Anyway"** obok komunikatu o zablokowanej aplikacji
3. Lub uruchom z terminala:
   ```bash
   xattr -cr /Applications/IMPREZJA.app
   ```

## Kompatybilność

| Procesor | macOS | Build | Status |
|----------|-------|-------|--------|
| Intel i7 (x64) | 10.13+ | `build:mac:x64` | ✅ Działa |
| Intel i5 (x64) | 10.13+ | `build:mac:x64` | ✅ Działa |
| Intel Core 2 Duo | 10.13+ | `build:mac:x64` | ✅ Działa |
| Apple M1 (arm64) | 11.0+ | `build:mac:arm64` | ✅ Działa |
| Apple M2 (arm64) | 12.0+ | `build:mac:arm64` | ✅ Działa |
| Apple M3 (arm64) | 14.0+ | `build:mac:arm64` | ✅ Działa |

## Rozmiary plików

- **x64 build**: ~150-200 MB
- **arm64 build**: ~150-200 MB  
- **Universal build**: ~300-400 MB (zawiera obie architektury)

## Testowanie

Po zbudowaniu aplikacji, przetestuj na docelowym Macu:

```bash
# Sprawdź architekturę Maca
uname -m
# x86_64 = Intel Mac
# arm64 = Apple Silicon

# Sprawdź wersję macOS
sw_vers
```

## Troubleshooting

### Problem: "Aplikacja nie może być otwarta"

**Rozwiązanie**: 
```bash
xattr -cr /Applications/IMPREZJA.app
```

### Problem: "Aplikacja wymaga nowszego macOS"

**Rozwiązanie**: Zaktualizuj `minimumSystemVersion` w `package.json` (obecnie: 10.13)

### Problem: Build nie działa na starszym Macu

**Rozwiązanie**: 
- Upewnij się, że używasz `build:mac:x64`
- Sprawdź czy Electron 25.9.8 wspiera macOS 10.13 (powinien)

## Notatki

- **Electron 25.9.8** wspiera macOS 10.13+ (High Sierra)
- **Universal Binary** jest najlepszym rozwiązaniem dla dystrybucji (jeden plik dla wszystkich)
- **Osobne buildy** (x64/arm64) są mniejsze, ale wymagają wyboru właściwego pliku
