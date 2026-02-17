# Wydanie v1.0.3 – instrukcja buildu i wdrożenia

## Zmiany w tej wersji

- **Naprawa menu kontekstowego** – panel (Statystyki, Odpowiedź, Ranking) zawsze się pojawia po kliknięciu pytania
- **Lista pytań** – rozegrane pytania znikają z listy zamiast być odhaczone
- **Pytanie z literą (LETTER)** – usunięto literę V z dozwolonych; naprawa znikania tekstu przy pisaniu (można wysłać odpowiedź)

## Krok 1: Build

```bash
# Zainstaluj zależności (jeśli potrzeba)
npm install

# Test przed buildem
npm start
# lub: npm run electron

# Build dla docelowych platform:
# Windows (na Macu lub Windows)
npm run build:win

# Mac – uniwersalny (Intel + Apple Silicon)
npm run build:mac:universal

# Mac – osobne architektury (mniejsze pliki)
npm run build:mac:arm64   # Apple Silicon
npm run build:mac:x64    # Intel
```

## Krok 2: Pliki do wgrania

Po buildzie w katalogu `dist/` znajdziesz:

**Windows:**
- `Imprezja Quiz Setup 1.0.3.exe` – instalator
- `latest.yml` – metadane dla auto-update
- `Imprezja Quiz Setup 1.0.3.exe.blockmap` – mapy bloków (opcjonalnie)

**Mac:**
- `Imprezja Quiz-1.0.3-universal.dmg` (lub `-arm64.dmg`, `-x64.dmg`)
- `latest-mac.yml` – metadane dla auto-update
- `*.blockmap` – opcjonalnie

## Krok 3: Wgranie na serwer aktualizacji

Wgraj pliki do `https://nowajakoscrozrywki.pl/updates/`:

1. **Windows:** `latest.yml`, `Imprezja Quiz Setup 1.0.3.exe`, `*.blockmap`
2. **Mac:** `latest-mac.yml`, `Imprezja Quiz-1.0.3-*.dmg`, `*.blockmap`

## Krok 4: Test wdrożenia

1. Zainstaluj v1.0.2 (lub starszą) na maszynie testowej
2. Uruchom aplikację
3. W panelu admina kliknij **„Sprawdź aktualizacje”**
4. Powinien pojawić się komunikat: **„Dostępna wersja 1.0.3”**
5. Pobierz i zainstaluj aktualizację
6. Zweryfikuj: menu kontekstowe przy pytaniach, lista pytań (rozegrane znikają)
