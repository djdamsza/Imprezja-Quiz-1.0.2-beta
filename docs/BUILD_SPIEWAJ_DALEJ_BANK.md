# Śpiewaj Dalej – bank w buildzie Imprezja Quiz

## Problem
W instalacji z GitHub / „czystym” buildzie lista banków lub utworów była pusta, bo:
- plik JSON miał **nazwę z polskimi znakami** (`Śpiewaj_…`) – na części systemów pliki w paczce/asar mogły się źle pakować;
- **`domyslna.json`** w `public/spiewaj-dalej-configs/` nie istniała – domyślny bank w pamięci to `{ tracks: [] }`;
- przy aktualizacji aplikacji **pusty** plik w katalogu danych użytkownika **nie był nadpisywany** (kopiowano tylko brakujące pliki).

## Co zrobić przy wydaniu
1. W repozytorium trzymaj w **`public/spiewaj-dalej-configs/`**:
   - **`domyslna.json`** – główny pakiet demonstracyjny (banki + utwory),
   - opcjonalnie **`spiewaj-dalej-wesele.json`** (ta sama treść, nazwa ASCII),
   - **bez** nazw plików z nietypową ogonkową w ścieżce (bezpieczniej dla Windows/archiwów).
2. **`public/spiewaj-dalej-last.json`** – np. `{"name":"domyslna"}` w repozytorium, żeby pierwsze uruchomienie w Electron skopiowało domyślny wybór do userData.
3. Pliki audio z konfiguracji (`/uploads/…`, `.vdjsample`, `.mp3`) muszą **faktycznie być w `public/uploads/`** w momencie builda, inaczej lista utworów będzie widoczna, ale odtwarzanie zwróci 404. Przed releasem: `npm run build` na maszynie, która ma te pliki, **albo** commit wybranych plików do repo (uwaga na rozmiar licencji).

## Logika w `server.js`
- Przy nowej wersji aplikacji (`shouldSyncConfigsFromApp`) konfiguracje Śpiewaj Dalej są **dokopiowywane z builda**, jeśli plik w userData jest **efektywnie pusty** (brak utworów).
- Pierwszy raz kopiowany jest też **`spiewaj-dalej-last.json`**, jeśli w userData go nie ma.
