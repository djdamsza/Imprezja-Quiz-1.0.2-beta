# Indeksowanie Cursor (codebase index)

Jeśli usunąłeś indeksy ze względu na zawieszanie, możesz zbudować je od nowa i ograniczyć obciążenie.

## Jak zbudować indeksy od nowa

1. Otwórz **Command Palette**: `Cmd+Shift+P` (macOS) lub `Ctrl+Shift+P` (Windows/Linux).
2. Wpisz **„Reindex”** (lub „Index”).
3. Wybierz polecenie **„Cursor: Reindex”** / **„Reindex codebase”** (nazwa zależna od wersji).
4. Poczekaj, aż indeksowanie się zakończy (status na dole okna).

Alternatywnie: **Cursor → Settings → Codebase** – tam może być przycisk odświeżania indeksu.

## Mniejsze obciążenie przy indeksowaniu

Żeby indeksowanie nie zawieszało się, wyklucz duże katalogi. Utwórz w głównym katalogu projektu plik **`.cursorignore`** z zawartością:

```
node_modules/
dist/
.git/
*.dmg
*.pkg
*.zip
.cache/
public/uploads/
*.log
```

Po zapisaniu `.cursorignore` uruchom ponownie reindeksację (Command Palette → Reindex).

Pliki z `.gitignore` są zwykle pomijane przy indeksowaniu; `.cursorignore` pozwala dodać kolejne (np. `docs/`, jeśli folder jest bardzo duży).
