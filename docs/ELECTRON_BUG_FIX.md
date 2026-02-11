# Problem z Electron 35.x - Bug require('electron')

## Problem

W Electron 35.x występuje znany bug, gdzie `require('electron')` zwraca string (ścieżkę do binarnego) zamiast obiektu z API (`app`, `BrowserWindow`, itd.).

**Bug report**: https://github.com/electron/electron/issues/49034

## Rozwiązanie

Powrócono do Electron 28.0.0, która działa poprawnie.

## Podatności bezpieczeństwa

Electron 28.0.0 ma podatność ASAR Integrity Bypass, ale:
1. Ta podatność wymaga lokalnego dostępu do plików aplikacji
2. Aplikacja działa w środowisku lokalnym (nie jest wystawiana na internet)
3. Electron 35.x ma bug który uniemożliwia działanie aplikacji

## Alternatywne rozwiązania (przyszłość)

Gdy bug zostanie naprawiony w Electron 35.x lub nowszych wersjach:
1. Zaktualizuj do najnowszej stabilnej wersji Electron
2. Przetestuj czy `require('electron')` zwraca obiekt
3. Zaktualizuj `electron-builder` do kompatybilnej wersji

## Status

✅ **Aktualnie używana wersja**: Electron 28.0.0 (działa poprawnie)
⚠️ **Znany bug**: Electron 35.x - require('electron') zwraca string
