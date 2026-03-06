# fetchpriority="high" i loading="eager" dla obrazu LCP

**Cel:** Przyspieszenie LCP (Largest Contentful Paint) – obraz hero na stronie głównej imprezja.pl.

---

## Problem

PageSpeed: *„Zoptymalizuj LCP, zapewniając natychmiastową wykrywalność obrazu LCP w kodzie HTML i unikając leniwego ładowania”*

- Obraz hero ma `loading="lazy"` – przeglądarka odkłada jego pobranie
- Brak `fetchpriority="high"` – przeglądarka nie wie, że to priorytetowy zasób

---

## Rozwiązanie 1: W edytorze Gutenberg / UAGB

1. **WordPress** → Strony → Strona główna → Edytuj
2. Znajdź blok z obrazem **„kreatywne prowadzenie imprez”** (453617320...n-1-1.jpg)
3. Ustawienia bloku:
   - **Lazy loading:** Wyłącz (lub ustaw „Eager”)
   - **Fetch Priority:** High (jeśli dostępne)

W **Spectra/UAGB** (blok Image):
- Ustawienia zaawansowane → HTML / atrybuty
- Dodaj: `fetchpriority="high"` i `loading="eager"`

---

## Rozwiązanie 2: Filtr PHP (functions.php)

Jeśli edytor nie pozwala na ustawienie, dodaj do `functions.php` motywu dziecka:

```php
add_filter('wp_get_attachment_image_attributes', function($attr, $attachment, $size) {
    // ID obrazu LCP – sprawdź w Media Library
    $lcp_image_id = 12345; // ← Zastąp prawdziwym ID
    if ($attachment->ID == $lcp_image_id) {
        $attr['fetchpriority'] = 'high';
        $attr['loading'] = 'eager';
    }
    return $attr;
}, 10, 3);
```

**Jak znaleźć ID:** Media Library → kliknij obraz 453...n-1-1.jpg → w URL będzie `?item=12345` lub w szczegółach.

---

## Rozwiązanie 3: LiteSpeed (jeśli dostępne)

LiteSpeed Cache → Image Optimization → **Lazy Load**:
- Wyklucz obraz LCP z lazy load („Exclude Images” – dodaj URL lub klasę obrazu hero)

---

## Rozwiązanie 4: Ręcznie w HTML (ostatnia opcja)

Jeśli używasz bloku HTML lub shortcode:
```html
<img src="..." alt="kreatywne prowadzenie imprez" 
     fetchpriority="high" loading="eager" ...>
```

---

## Weryfikacja

Po zmianie:
1. Purge cache (LiteSpeed → Purge All)
2. PageSpeed Insights → sprawdź czy LCP się poprawił
3. DevTools → Network → obraz hero powinien być w pierwszych żądaniach (nie „lazy”)
