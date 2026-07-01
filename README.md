# Imprezja Quiz

Quiz i głosowanie na imprezach – działa offline w sieci lokalnej.

To repozytorium obejmuje wyłącznie Imprezja Quiz (quizy i gry muzyczne); Home Assistant i inteligentny dom to osobny projekt prywatny — nie należą tutaj.

## Pobierz

**Wersja 1.2.7** (najnowsza):

- [Windows](https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/download/v1.2.7/Imprezja.Quiz.Setup.1.2.7.exe)
- [macOS Apple Silicon (M1/M2/M3)](https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/download/v1.2.7/Imprezja.Quiz-1.2.7-arm64.dmg)
- [macOS Intel](https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases/download/v1.2.7/Imprezja.Quiz-1.2.7.dmg)

Wszystkie wersje: [Releases](https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta/releases)

Pełna historia zmian: [CHANGELOG.md](CHANGELOG.md) (sekcja **[Niewydane]** — poprawki po v1.2.7: złota lista Party, wspólna głośność gier muzycznych).

Indeks dokumentacji: [docs/INDEX.md](docs/INDEX.md)

## Wymagania

- **Windows:** 10 lub 11 (64-bit)
- **macOS:** 10.13 lub nowszy

## Uruchomienie (dev)

```bash
npm install
npm start
```

Otwórz `http://127.0.0.1:3000/start.html`

## QA przed release

```bash
npm run qa:before-build
npm run qa:smoke-http   # wymaga działającego serwera (npm start)
```

Checklista manualna: [docs/CHECKLISTA_QA_PRZED_RELEASE.md](docs/CHECKLISTA_QA_PRZED_RELEASE.md)

## Debug serwera

Szczegółowe logi Socket.IO i gry: `IMPREZJA_DEBUG=1 npm start`
