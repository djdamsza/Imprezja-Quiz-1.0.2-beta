# Instrukcja czyszczenia cache

## Problem: Zmiany nie są widoczne po resecie serwera

Service Worker cache'uje strony HTML. Aby zobaczyć najnowsze zmiany:

### Metoda 1: Wyczyść cache przeglądarki (Chrome/Edge)

1. Otwórz DevTools (F12)
2. Kliknij prawym przyciskiem na ikonę odświeżania
3. Wybierz "Wyczyść cache i twarde odświeżenie" (Empty Cache and Hard Reload)

LUB

1. Otwórz DevTools (F12)
2. Przejdź do zakładki "Application" (Aplikacja)
3. W lewym menu znajdź "Service Workers"
4. Kliknij "Unregister" przy zarejestrowanym service workerze
5. W lewym menu znajdź "Storage" → "Clear site data"
6. Odśwież stronę (Ctrl+Shift+R lub Cmd+Shift+R)

### Metoda 2: Wyłącz Service Worker tymczasowo

1. Otwórz DevTools (F12)
2. Przejdź do zakładki "Application"
3. W lewym menu znajdź "Service Workers"
4. Zaznacz "Bypass for network" (Omijaj dla sieci)
5. Odśwież stronę

### Metoda 3: Tryb incognito

Otwórz stronę w trybie incognito/prywatnym - Service Worker nie będzie aktywny.

## Sprawdzenie czy działa

Po wyczyszczeniu cache:
1. Otwórz konsolę przeglądarki (F12 → Console)
2. Kliknij "Następna runda" w panelu admina
3. Powinny pojawić się logi:
   - `🔄 shipsNextTurn wywołane dla pytania: ...`
   - `🔄 ships_next_turn otrzymane: ...`
   - `🔄 Następna runda X dla pytania ...`
   - `📤 Wysłano ships_game_update do wszystkich klientów`

Jeśli logi się nie pojawiają, sprawdź czy:
- Jesteś zalogowany jako admin
- Pytanie jest typu SHIPS
- Gra nie jest zakończona
