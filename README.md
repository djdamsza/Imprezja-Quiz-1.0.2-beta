# Imprezja Booth

Zalążek osobnego projektu fotobudki. To nie jest aplikacja quizu.

W repozytorium Imprezja Quiz nie było kodu fotobudki (ani historii commitów budki), więc ta gałąź nie jest podziałem `git subtree`. Jest czystym drzewem startowym: zostaje wyłącznie kontrakt pokazywania zdjęć w quizie.

## Co jest w tym drzewie

- `contracts/photo-presentation.js` — typy, walidacja i zamiana zdjęcia na slajd `type: "image"`
- `contracts/photo-presentation.test.js` — sprawdzenie kontraktu bez serwera quizu
- `contracts/README.md` — zdarzenia Socket.IO

Quiz zostaje w `djdamsza/Imprezja-Quiz-1.0.2-beta` na gałęzi `main`. Podpięcie po stronie quizu jest w szkicu PR z gałęzi `cursor/booth-photo-contract-cbfa`.

## Jak założyć własne repozytorium

Na GitHubie utwórz puste repozytorium (bez README), na przykład `ImprezjaBooth`, i wypchnij tę gałąź jako `main`:

```bash
git clone https://github.com/djdamsza/Imprezja-Quiz-1.0.2-beta.git
cd Imprezja-Quiz-1.0.2-beta
git checkout cursor/imprezja-booth-cbfa
git remote add booth https://github.com/djdamsza/ImprezjaBooth.git
git push booth cursor/imprezja-booth-cbfa:main
```

Potem w Cursorze: File → Open Folder na katalog sklonowany z `ImprezjaBooth`, nowy czat o fotobudce. Quiz otwieraj z osobnego folderu.

## Sprawdzenie

```bash
node contracts/photo-presentation.test.js
```
