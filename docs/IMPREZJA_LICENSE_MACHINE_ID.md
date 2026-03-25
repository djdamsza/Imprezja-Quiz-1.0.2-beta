# Imprezja Quiz – „Klucz nie pasuje do tego komputera”

## Dlaczego

1. **Kilka poprawnych ID na jednym PC**  
   Główne ID = hash `hostname` + system (np. `win32`).  
   Dodatkowo (Mac/Windows/Linux) aplikacja uznaje **alternatywne** ID (np. Hardware UUID z Apple / `wmic` na Windows).  
   **Klucz RSA zawiera w środku jedno konkretne 16-znakowe `m`** – musi być **identyczne** z jednym z ID, które ten komputer uznaje.

2. **Wygenerowano klucz dla innego ID**  
   Np. skopiowano tylko pierwszy wiersz z ekranu, a na tym komputerze licencja pasuje dopiero do **drugiego** ID.

3. **Przy zamówieniu wpisano nie to ID co w programie**  
   Poprawne ID to **dokładnie 16 znaków** z zakresu **0–9** i **a–f** (hex). Ciągi z literami **J, N, Q** itd. **nie pochodzą** z okna licencji — klucz zostanie wygenerowany „dla obcego komputera” i nie zadziała.  
   Endpoint `/api/license/deliver` (Stripe) i `generate-license-key.js` odrzucają ID spoza formatu hex×16.

4. **„Nieprawidłowy podpis klucza”** (inny komunikat)  
   To nie jest „zły komputer”, tylko **inna para kluczy RSA**: generator użył innego `license-private.pem` niż klucz publiczny wbudowany w tę wersję `.exe` / aplikacji.

## Co zrobić

### Na komputerze klienta (po aktualizacji aplikacji)

Na stronie aktywacji licencji widać **wszystkie** akceptowane ID (główne + alternatywne).  
Przy zamówieniu klucza podaj **całą listę** albo wygeneruj klucz **dla każdego** ID po kolei i wyślij ten, który działa (zwykle wystarczy jeden pasujący).

### U Ciebie (wydawca), w katalogu VoteBattle

```bash
# Zobacz ID na Twoim Macu (test):
node scripts/show-machine-ids.js

# Klucz dla konkretnego 16-znakowego ID:
node scripts/generate-license-key.js 6f8045868c5a765e

# Sprawdź klucz na tym komputerze (bez zapisu):
node scripts/verify-license-key-cli.js "IMPREZJA-RSA-..."
```

**Uwaga:** Wklej klucz **jednym ciągiem**, bez spacji na początku/końcu, w formacie `IMPREZJA-RSA-...`.

## Technicznie

- Weryfikacja: `license.js` → `verifyRSAFormat` → `payload.m` ∈ `getMachineIdAlternatives()`.
- Endpoint: `GET /api/license/machine-id` zwraca `{ machineId, machineIds }`.
