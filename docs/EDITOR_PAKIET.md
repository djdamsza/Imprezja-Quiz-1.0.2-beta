# Edytor – kopiowanie i wklejanie z powiązanymi plikami

## Problem

Quiz JSON zawiera odwołania do plików (`/uploads/obrazek.webp`, `/uploads/audio.mp3`). Przy samym kopiowaniu i wklejaniu JSON-a te pliki nie są przenoszone – po wklejeniu obrazy i dźwięki nie działają.

## Rozwiązanie: pakiet ZIP

### Pobierz pakiet (export)

- **Przycisk:** „📦 Pobierz Pakiet (JSON + pliki)"
- **Efekt:** Pobiera plik `.zip` zawierający:
  - `quiz.json` – dane quizu
  - `uploads/` – wszystkie powiązane pliki (obrazy, audio, miniatury)

### Importuj pakiet (import)

- **Przycisk:** „📦 Importuj pakiet (ZIP)" (w sekcji „Wczytaj quiz")
- **Efekt:** Wgrywa plik `.zip`, rozpakowuje pliki do `uploads/`, ładuje quiz w edytorze

## Zastosowanie

- Przenoszenie quizu między komputerami
- Backup quizu z mediami
- Wymiana quizów (np. przez e‑mail, dysk)
