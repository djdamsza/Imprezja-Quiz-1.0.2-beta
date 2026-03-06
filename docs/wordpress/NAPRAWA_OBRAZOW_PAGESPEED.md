# Naprawa obrazów – PageSpeed nadal pokazuje 722 KiB do oszczędzenia

**Problem:** LiteSpeed + Converter for Media działają, ale PageSpeed Insights nadal raportuje obrazy bez WebP/AVIF i złe rozmiary.

---

## 1. Konflikt: użyj JEDNEJ wtyczki do WebP

**LiteSpeed Image Optimization** i **Converter for Media** robią to samo – obie mogą kolidować.

**Co zrobić:** Wybierz jedną:
- **LiteSpeed** – jeśli masz QUIC.cloud i chcesz AVIF + WebP
- **Converter for Media** – jeśli wolisz prostszą konfigurację

**Rekomendacja:** Zostaw **LiteSpeed Image Optimization** (WebP/AVIF), **wyłącz** Converter for Media. Albo odwrotnie – ale nie obie naraz.

---

## 2. JR-344-2.jpg (897 KiB) – blok UAGB/Spectra

Obraz jest w bloku **UAGB** (Ultimate Addons / Spectra) – prawdopodobnie jako **tło sekcji** lub **cover image**.

### Dlaczego nie działa WebP?
- Blok może ładować obraz przez **inline style** `background-image: url(...jpg)`
- Lub przez **data-atrybut** ładowany przez JavaScript
- Te ścieżki czasem omijają standardowe reguły WordPress

### Rozwiązania

**A) Zmień źródło obrazu w bloku**
1. Edytuj stronę
2. Zaznacz blok z JR-344-2
3. Jeśli jest opcja „Obraz tła” / „Background Image” – usuń i wstaw obraz jako **zwykły blok Obrazek** (Image) zamiast tła
4. Ustaw rozmiar na **Large** (1024px) zamiast Full

**B) Ręczna kompresja**
1. Pobierz JR-344-2.jpg z Media Library
2. Skompresuj w [TinyPNG.com](https://tinypng.com/) (~70% mniej)
3. Wgraj z powrotem i zamień w bloku

**C) Dodaj do kolejki LiteSpeed**
- LiteSpeed Cache → Optymalizacja obrazków → **Request Optimization**
- Upewnij się, że JR-344-2.jpg jest w Media Library i w kolejce

---

## 3. Hero (453...n-1.jpg) – 105 KiB

Jeśli serwer nadal zwraca JPEG zamiast WebP przy `Accept: image/webp`:

1. **Wyczyść cache** – LiteSpeed → Purge All
2. **Sprawdź reguły** – Converter for Media dodaje reguły do `.htaccess`. LiteSpeed może mieć własne – kolejność ma znaczenie
3. **Sprawdź hosting** – na Nginx/OpenLiteSpeed reguły `.htaccess` nie działają – trzeba konfiguracji po stronie serwera

---

## 4. Obrazy „większe niż powinny” (dyplom-njr9, dyplom.dj-union)

PageSpeed: *„768x525 przy wyświetlanych 507x347”* – przeglądarka wybiera za duży plik.

**Przyczyna:** Atrybut `sizes` lub `srcset` jest źle ustawiony – brakuje rozmiaru ~500px.

**Rozwiązanie:** W motywie (Blocksy) lub wtyczce Kadence Blocks sprawdź:
- Ustawienia galerii certyfikatów
- Czy można dodać rozmiar obrazu 512px lub 600px

Albo dodaj do `functions.php`:
```php
add_image_size( 'gallery-medium', 512, 512, false );
```
Potem **Regenerate Thumbnails** dla obrazów w galerii.

---

## 5. Kolejność reguł WebP (Apache)

Jeśli używasz Converter for Media na Apache, reguły WebP muszą być **na górze** `.htaccess`, przed regułami LiteSpeed.

Converter for Media zwykle dodaje coś w stylu:
```apache
<IfModule mod_rewrite.c>
  RewriteCond %{HTTP_ACCEPT} image/webp
  RewriteRule ^(.*)\.(jpe?g|png)$ $1.$2.webp [T=image/webp]
</IfModule>
```

Jeśli LiteSpeed nadpisuje lub blokuje te reguły – WebP nie zadziała.

---

## 6. Szybki test WebP

W terminalu (lub DevTools → Network):
```bash
curl -I -H "Accept: image/webp" "https://imprezja.pl/wp-content/uploads/2024/08/453617320_1021841319946964_2081097672691140249_n-1.jpg"
```

- **Content-Type: image/webp** → działa
- **Content-Type: image/jpeg** → nie działa (konflikt lub brak reguł)

---

## Podsumowanie działań

| # | Działanie |
|---|-----------|
| 1 | Wyłącz Converter for Media LUB LiteSpeed Image Optimization – zostaw jedną |
| 2 | Purge All w LiteSpeed |
| 3 | JR-344-2: zmień blok na zwykły obrazek LUB skompresuj ręcznie |
| 4 | Sprawdź .htaccess – reguły WebP na górze |
| 5 | Galeria certyfikatów: dodaj rozmiar 512px, Regenerate Thumbnails |
