# Release v1.0.4 – Imprezja Quiz

**Data:** 2026-02-18

## Pliki do wrzucenia na GitHub Releases

1. **Imprezja Quiz Setup 1.0.4.exe** – Windows (x64)  
   Ścieżka: `dist/Imprezja Quiz Setup 1.0.4.exe`

2. **Imprezja Quiz-1.0.4-arm64.dmg** – macOS Apple Silicon (M1/M2/M3)  
   Ścieżka: `dist/Imprezja Quiz-1.0.4-arm64.dmg`

3. **Imprezja Quiz-1.0.4.dmg** – macOS Intel  
   Ścieżka: `dist/Imprezja Quiz-1.0.4.dmg`

## Opis release (do wklejenia na GitHub)

```
## v1.0.4 – Tryb Familiady

### Nowości
- **Tryb Familiady** – gra drużynowa z tablicą odpowiedzi, pilot na telefonie, ekran na TV
- **Strona startowa** – wybór między Quiz a Familiada
- **Edytor Familiady** – parser formatu „Pytanie? + lista odpowiedzi” (wklej tekst, punkty auto)

### Pliki
- **Windows:** Imprezja Quiz Setup 1.0.4.exe
- **macOS Apple Silicon:** Imprezja Quiz-1.0.4-arm64.dmg
- **macOS Intel:** Imprezja Quiz-1.0.4.dmg

### Wymagania
- Windows 10/11 (64-bit) lub macOS 10.13+
```

## Kroki publikacji

1. `git add . && git commit -m "v1.0.4: changelog, build bez zip" && git push`
2. `git tag v1.0.4 && git push origin v1.0.4`
3. GitHub → Repozytorium → **Releases** → **Draft a new release**
4. Tag: **v1.0.4**
5. Tytuł: **v1.0.4 – Tryb Familiady**
6. Opis: wklej z powyższego bloku
7. Załącz 3 pliki z `dist/`
8. **Publish release**
