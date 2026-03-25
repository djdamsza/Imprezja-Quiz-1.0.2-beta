# Naprawa menu mobilnego i reCAPTCHA przy LiteSpeed Cache

## Problemy
- Menu mobilne się nie otwiera
- Błąd: `Uncaught ReferenceError: ct_localizations is not defined` (main.js)
- Błąd: `reCAPTCHA couldn't find user-provided function: kbOnloadV2Callback`

Przyczyna: LiteSpeed opóźnia ładowanie JS („Load JS Delayed”), więc skrypty nie są gotowe w odpowiedniej kolejności.

## WAŻNE – gdzie wkleić

**NIE** wklejaj do:
- „Wykluczenia leniwego wczytywania URI” (Lazy Load URI) – to dla obrazków/stron
- „LQIP wyklucza” – to dla obrazków

**TAK** – wklej do:
- **JS Deferred/Delayed Excludes** („Wykluczenia JS Deferred/Delayed”)

## Jak znaleźć właściwe pole

1. **LiteSpeed Cache** → **Optymalizacja strony**
2. Otwórz zakładkę **Excludes** (lub **Wykluczenia**)
3. Przewiń w dół – szukaj sekcji **JS Deferred/Delayed Excludes**
4. W tym polu wklej (każdy wpis w osobnej linii):

```
blocksy/static/bundle/main
ct-scripts
ct-scripts-js-extra
ct_localizations
kadence-blocks-google-recaptcha
recaptcha/api.js
```

*`ct-scripts-js-extra` i `ct_localizations` – naprawiają błąd „ct_localizations is not defined” i menu mobilne.*

5. Zapisz zmiany
6. **Purge All** (Wyczyść wszystko)
7. Przetestuj menu mobilne i formularz z reCAPTCHA

## Co zrobić z błędnym polem

Jeśli wkleiłeś `blocksy/static/bundle/main` i `ct-scripts` do **„Wykluczenia leniwego wczytywania URI”** – **usuń je stamtąd**. To pole jest dla adresów stron (np. `/kontakt/`), nie dla skryptów.

### Opcja 2: Zmiana z Delayed na Deferred

1. **LiteSpeed Cache** → **Page Optimization** → **JS Settings**
2. Zmień **Load JS** z „Delayed” na **„Deferred”**
3. Zapisz i wyczyść cache

*Deferred* ładuje JS po załadowaniu HTML (menu działa od razu). *Delayed* czeka na interakcję użytkownika – stąd problem z menu.

### Opcja 3: Całkowite wyłączenie optymalizacji JS

1. **LiteSpeed Cache** → **Page Optimization** → **JS Settings**
2. Wyłącz **Load JS Deferred** / **Load JS Delayed** (lub ustaw na „Default”)
3. Wyłącz też inne opcje JS, jeśli chcesz (np. „Combine JS”, „Minify JS”)
4. **Zapisz** zmiany
5. **KRYTYCZNE:** **Purge All** – LiteSpeed Cache → Toolbox → Purge All

### ⚠️ Menu nadal nie działa po wyłączeniu? Sprawdź cache

Jeśli wyłączyłeś optymalizację JS, ale menu dalej nie działa, **strona serwuje starą wersję z cache**.

**Co zrobić:**
1. **LiteSpeed Cache** → **Toolbox** → **Purge All** (wyczyść wszystko)
2. Odczekaj 1–2 minuty (regeneracja cache)
3. Otwórz stronę w trybie **incognito** lub zrób **twarde odświeżenie** (Ctrl+Shift+R / Cmd+Shift+R)
4. Sprawdź źródło strony (Ctrl+U) – skrypty powinny mieć normalny `src=`, a nie `data-src` i `type="litespeed/javascript"`

**Szybki test bez cache:** Dodaj `?LSCWP_CTRL=before_optm` do adresu (np. `https://imprezja.pl/?LSCWP_CTRL=before_optm`). Jeśli menu działa – problem to cache; wyczyść Purge All i odśwież.

---

## Hosting dhosting – dodatkowe warstwy cache

Na dhosting masz **więcej niż jedną warstwę cache**. Wszystkie trzeba wyczyścić:

### 1. Wtyczka LiteSpeed Cache (WordPress)
- **LiteSpeed Cache** → **Toolbox** → **Purge All**

### 2. QUIC.cloud CDN (często używane na dhosting z LiteSpeed)
**QUIC.cloud** to CDN LiteSpeed, który łączy się z wtyczką LiteSpeed Cache. dhosting promuje tę opcję (nie Cloudflare). Cache buforuje całą stronę (HTML, JS, CSS). Purge All w LiteSpeed zwykle czyści też QUIC.cloud; jeśli nie – zaloguj się na quic.cloud i w Domain Overview kliknij Purge All CDN Cache. Jeśli masz włączone usługi QUIC.cloud:
- **LiteSpeed Cache** → **General** → **Online Services**
- Kliknij **„Request Domain Key”** lub wejdź w ustawienia QUIC.cloud
- W panelu **quic.cloud** → **CDN** → **Purge** (wyczyść cache CDN)
- Alternatywnie: **LiteSpeed Cache** → **CDN** (jeśli widzisz zakładkę) → Purge

### 3. Cache Cloudflare (jeśli używasz)
Jeśli domena jest w Cloudflare:
- Zaloguj się do **Cloudflare.com**
- Wybierz domenę **imprezja.pl**
- **Caching** → **Configuration** → **Purge Everything** (wyczyść wszystko)

### 4. Cache serwera LiteSpeed (dhosting)
- Połącz się przez **SSH** (jeśli masz dostęp)
- Wykonaj:
  ```
  curl -i -X PURGE https://imprezja.pl/
  ```
- Jeśli nie masz SSH – możesz użyć narzędzia online lub skontaktować się z supportem dhosting

### 5. Kontakt z supportem dhosting
Jeśli problem nadal występuje: **dhosting.pl** → Pomoc → kontakt. Poproś o wyczyszczenie cache LiteSpeed dla domeny imprezja.pl.

---

**Szybki test:** Dodaj `?LSCWP_CTRL=before_optm` do adresu strony (np. `https://imprezja.pl/?LSCWP_CTRL=before_optm`) – jeśli menu działa, problem wynika z optymalizacji LiteSpeed.
