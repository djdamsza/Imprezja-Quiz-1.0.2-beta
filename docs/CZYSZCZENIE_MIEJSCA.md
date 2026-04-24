# Zwolnienie miejsca na dysku

## Skrypty w projekcie

| Polecenie | Co czyści | Szac. zwolnione |
|-----------|-----------|------------------|
| `npm run clean` | folder `dist/` (buildy) | ~600 MB |
| `npm run clean:cache` | Electron, electron-builder, node_modules/.cache | ~2 GB |
| `npm run clean:cache:npm` | cache npm | ~500 MB |

## Inne miejsca (ręcznie)

Jeśli nadal brakuje miejsca, sprawdź:

- **~/Library/Caches/Google** – cache Chrome (~1 GB)
- **~/Library/Caches/Mozilla** – cache Firefox (~500 MB)
- **~/Library/Application Support/Imprezja Quiz/uploads** – pliki audio z quizów/samplera (~35 MB+) – usuń tylko jeśli nie potrzebujesz
- **~/Library/Application Support/Imprezja Quiz/tunnel.log** – log tunelu (można skrócić)
- **~/Library/Developer/Xcode/DerivedData** – buildy Xcode (jeśli używasz) – często wiele GB
- **~/.Trash** – Kosz
- **~/Downloads** – Pobrane pliki

## Build bez publikacji na GitHub

Skrypty build (`build:mac:arm64`, `build:win` itd.) używają `--publish never` – nie próbują uploadować na GitHub. Dzięki temu buildy są szybsze i nie zostawiają artefaktów z prób publikacji. Aby opublikować release, uruchom electron-builder ręcznie z `--publish onTag` (lub usuń `--publish never` ze skryptu).
