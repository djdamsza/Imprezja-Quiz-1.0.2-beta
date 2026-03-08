# Płatności na stronie – rozwiązywanie problemów

## Przyciski „Wybierz” / „Kup” nie działają (są „martwe”)

### Błąd w konsoli: „Invalid currency code : null” (main.js)

Ten komunikat pochodzi z **motywu WordPress lub wtyczki** (np. WooCommerce), a nie ze skryptu cennika Imprezja. Gdy waluta sklepu nie jest ustawiona lub ma wartość null, skrypt motywu rzuca błąd i może zablokować inne skrypty na stronie.

**Co zrobić:**

1. **WooCommerce**  
   Ustaw walutę: **WooCommerce → Ustawienia → Ogólne → Waluta** – wybierz np. **Polski złoty (zł)** i zapisz.

2. **Wtyczki wielowalutowe**  
   Jeśli używasz wtyczki do wielu walut (np. WOOCS), upewnij się, że domyślna waluta jest ustawiona i wtyczka nie nadpisuje jej na null na stronach bez sklepu.

3. **Blok z cennikiem**  
   W bloku Własny HTML używaj **zaktualizowanego** kodu z `imprezja-quiz-WORDPRESS-WKLEJ.html` – nasłuch kliknięć jest podpięty na `document` w fazie capture, więc przyciski powinny działać nawet gdy inny skrypt (main.js) rzuca błąd.

4. **Cache**  
   Wyczyść cache strony i przeglądarki; odśwież stronę (Ctrl+F5).

---

## W logach Render nic nie widać przy klikaniu w sklepie

**Sprawdź, czy żądanie w ogóle dociera do serwera:**

1. **W stripe-shop** (od wersji z logowaniem) w logach Render powinny się pojawiać wpisy przy **każdym** żądaniu, np.  
   `[timestamp] POST /create-checkout-session https://twoja-strona.pl`  
   oraz `Checkout request: { lookup_key: 'imprezja-1m', ... }`.  
   Wdróż najnowszy kod stripe-shop (z tym logowaniem) i zrestartuj serwis na Render.

2. **Jeśli nadal nic w logach** – żądanie nie dociera do Render:
   - Otwórz stronę sklepu w przeglądarce, **F12 → zakładka Sieć (Network)**.
   - Kliknij przycisk „Wybierz” / „Kup”.
   - Sprawdź, czy pojawia się żądanie do `create-checkout-session`. Jeśli nie ma – skrypt na stronie nie wysyła requestu (błąd JS, zły adres API lub blokada).
   - **Adres API:** w bloku Własny HTML musi być `STRIPE_API_URL = 'https://imprezja.onrender.com'` (bez slash na końcu). Na stronie produkcyjnej nie może być `localhost`.
   - Jeśli żądanie jest wysyłane, ale ma status **CORS error** lub **blocked** – ustaw na Render zmienną `CORS_ORIGIN=https://twoja-domena.pl` (dokładna domena strony ze sklepem).

3. **Jeśli w logach widać „Checkout request”** – serwer dostaje klik. Wtedy ewentualny błąd (np. brak STRIPE_SECRET_KEY, błąd Stripe) będzie w kolejnej linii logu.

---

## Serwis płatności (stripe-shop) na Render – restart / cold start

- Po ok. 15 minutach bez ruchu Render może **uśpić** serwis (cold start). Pierwsze żądanie po uśpieniu trwa dłużej (nawet 30–60 s) i może się nie udać (timeout).
- **Cron / UptimeRobot:** ustaw ping co 10–14 minut na adres stripe-shop, np.  
  `https://imprezja.onrender.com/health`  
  (plik `docs/wordpress/cron.php` opisuje taki ping).
- Po **restarcie** serwisu na Render poczekaj 1–2 minuty, aż instancja wstanie, potem sprawdź w przeglądarce:  
  `https://imprezja.onrender.com/health`  
  Powinien zwrócić status 200.

---

## Adres API (STRIPE_API_URL)

W bloku musi być poprawny URL serwisu stripe-shop, np.:

- Produkcja (Render): `https://imprezja.onrender.com`
- Lokalnie: `http://localhost:4242` lub `http://localhost:10000` (zależnie od `PORT` / `STRIPE_PORT`)

Jeśli wdrożysz stripe-shop pod inną domeną, zmień w skrypcie zmienną `STRIPE_API_URL` na ten adres.

---

## CORS

Serwer stripe-shop ustawia `Access-Control-Allow-Origin: *` (albo wartość z `CORS_ORIGIN`). Jeśli strona jest pod inną domeną niż Render, a nadal są błędy CORS, ustaw w zmiennych środowiskowych na Render np.:

`CORS_ORIGIN=https://twoja-domena.pl`
