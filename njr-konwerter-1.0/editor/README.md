# Katalog `editor/` — źródła konwertera NJR

Tutaj musi znajdować się **pełny** zestaw plików aplikacji: m.in. `njr.spec`, `launcher.py`, `requirements.txt`, `static/`, moduły Python używane przez PyInstaller i serwer Flask.

## Skąd wziąć pliki

- Przy migracji z innego repozytorium: skopiuj **całą** zawartość katalogu z kodem konwertera (np. dawniej `tools/vdj-database-editor`) do `editor/`.
- W **repozytorium Imprezja Quiz / VoteBattle** nie commituj tego katalogu z kodem — Quiz i konwerter NJR to osobne projekty.

Lokalnie, zanim przeniesiesz pliki do osobnego repo, możesz użyć symlinku:

```bash
# przykład: z korzenia repo NJR
ln -s /ścieżka/do/vdj-database-editor editor
```

Albo ustaw `NJR_APP_DIR` przy uruchamianiu `scripts/build-local.sh`.
