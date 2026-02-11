# Klucze licencyjne IMPREZJA

## Model licencji

- **Pobieranie:** Wszystkie programy można pobrać bezpłatnie ze strony wydawcy.
- **Okres testowy:** 14 dni od pierwszego uruchomienia (przypisany do komputera).
- **Po wygaśnięciu:** Program się wyłącza i przestaje działać – wymagana jest licencja.
- **Licencje:** Czasowe (1M, 3M, 6M, 1Y) lub dożywotnia (LT).

---

## Bezpieczeństwo (RSA)

- **Aplikacja** zawiera tylko **klucz publiczny** – służy wyłącznie do weryfikacji. Nie można z niego wygenerować nowych kluczy.
- **Klucz prywatny** jest tylko w generatorze (`license-private.pem`) – **nie trafia do aplikacji** ani do repozytorium (jest w `.gitignore`).

---

## Typy licencji

| Typ | Opis |
|-----|------|
| LT | Dożywotnia (bezterminowa) |
| 1M | 1 miesiąc |
| 3M | 3 miesiące |
| 6M | 6 miesięcy |
| 1Y | 1 rok |

---

## Format klucza

- **Format RSA (aktualny):** `IMPREZJA-RSA-{payload}.{podpis}` – podpisany kluczem prywatnym
- **Format stary:** `IMPREZJA-XXXX-XXXX-XXXX-XXXX` (dożywotnia, nadal obsługiwany)

---

## Konfiguracja (jednorazowo)

1. Wygeneruj parę kluczy RSA:
   ```bash
   node scripts/generate-license-keys-pair.js
   ```
2. Plik `license-private.pem` pojawi się w katalogu projektu – **nie commituj go** (jest w `.gitignore`).
3. Klucz publiczny jest już w `license.js` (wygenerowany przez skrypt).

---

## Generator kluczy

**Skrypt:** `scripts/generate-license-key.js`  
**Skrót:** `npm run license-key`

Generator wymaga klucza prywatnego: plik `license-private.pem` w katalogu projektu lub zmienna `IMPREZJA_LICENSE_PRIVATE_KEY`.

### Klucz dla tego komputera

```bash
# Dożywotnia (domyślnie)
node scripts/generate-license-key.js

# Określony typ (np. 1 rok)
node scripts/generate-license-key.js --type 1Y
```

### Klucz dla komputera klienta

1. Klient pobiera **Machine ID** (panel licencji lub `http://localhost:3000/api/license/machine-id`).
2. Klient przekazuje Machine ID (np. e‑mailem).
3. Wystawca generuje klucz:

```bash
# Dożywotnia
node scripts/generate-license-key.js <MachineID>

# Czasowa (np. 1 rok)
node scripts/generate-license-key.js --type 1Y <MachineID>
```

---

## Klucz testowy

Na **każdym** komputerze działa klucz:

```
IMPREZJA-TEST-TEST-TEST-TEST
```

Tylko do testów (dev/demo). Nie używaj dla klientów.

---

## Pliki i lokalizacje

| Plik | Opis |
|------|------|
| `license.js` | Logika: trial, weryfikacja RSA, public key |
| `scripts/generate-license-key.js` | Generator kluczy (wymaga klucza prywatnego) |
| `scripts/generate-license-keys-pair.js` | Jednorazowe wygenerowanie pary kluczy |
| `license-private.pem` | Klucz prywatny – **tylko na maszynie generującej** (w `.gitignore`) |
| `~/.imprezja-license` | Zapisany klucz i metadane |
| `~/.imprezja-trial-start` | Start triala |
| `public/license-required.html` | Strona aktywacji przy braku licencji |

---

## API licencji

- `GET /api/license/status` – status (valid, type, daysLeft, expires)
- `GET /api/license/machine-id` – Machine ID do zamówienia
- `POST /api/license/activate` – body: `{ "key": "IMPREZJA-..." }` – aktywacja
