# Przegląd strony imprezja.pl – potencjalne błędy

## Krytyczne

### 1. Sekcja „Terminarz” ukryta na wszystkich urządzeniach
Blok z kalendarzem Google ma klasy:
- `uag-hide-desktop`
- `uag-hide-tab`
- `uag-hide-mob`

Efekt: kalendarz z zajętymi terminami **nie jest widoczny** na żadnym urządzeniu.

**Rozwiązanie:** W edytorze Spectra/UAG usuń ustawienie „Ukryj na” dla tego bloku albo zostaw tylko np. „Ukryj na mobile”, jeśli kalendarz ma być widoczny na desktopie i tablecie.

---

## Średnie

### 2. Yoast SEO – brak frazy kluczowej
Panel SEO pokazuje: „Nie ustawiono frazy kluczowej”.

**Rozwiązanie:** W edytorze strony (np. „Analiza SEO” Yoast) ustaw frazę kluczową, np. „DJ wodzirej wesele” lub „DJ na wesele”.

### 3. SVG – nieprawidłowy atrybut `viewbox`
W ikonie YouTube w stopce jest:
```html
viewbox="0 0 20 20"
```
W SVG poprawny jest atrybut `viewBox` (camelCase).

**Rozwiązanie:** W szablonie/motywie zamień `viewbox` na `viewBox` albo usuń ten blok, jeśli ikona pochodzi z motywu – wtedy aktualizacja motywu może to naprawić.

### 4. Cache LiteSpeed
Strona jest buforowana. Po zmianach w CSS/treści trzeba czyścić cache, żeby zobaczyć aktualizacje.

---

## Niskie / sugestie

### 5. Formularz – pole honeypot
Pole antyspamowe ma etykietę „Email” – może być mylące przy drugim polu Email. Jeśli etykieta jest widoczna, warto ją ukryć (np. klasą `screen-reader-text`).

### 6. Duplikaty stylów map
W dodatkowym CSS są style dla Kadence i Spectra. Mapa na stronie pochodzi ze Spectra – style Kadence nie są używane, ale nie powodują błędów.

---

## Sprawdzone elementy (OK)

- Meta description ustawiona
- Schema.org (JSON-LD) obecny
- Canonical URL ustawiony
- Responsywność (viewport)
- Obfuskacja adresu e-mail (ochrona przed spamem)
- reCAPTCHA v2 w formularzu
- Trustindex – widoczny blok recenzji Google
