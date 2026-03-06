# Checklist optymalizacji – imprezja.pl

Szybka lista do odhaczenia. Szczegóły w `OPTYMALIZACJA_WORDPRESS.md`.

---

## PRZED STARTEM

- [ ] Backup pełny (pliki + baza)
- [ ] Zapisz listę aktywnych wtyczek
- [ ] Sprawdź: formularz działa, strona ładuje się

---

## PORZĄDKI

- [ ] Usuń nieaktywne wtyczki
- [ ] Usuń wtyczki, których nie używasz
- [ ] Zainstaluj WP-Optimize (lub Advanced Database Cleaner)
- [ ] Uruchom czyszczenie bazy (dane po wtyczkach, stare rewizje)
- [ ] Sprawdź blok Terminarz – czy nie jest ukryty na wszystkich urządzeniach

---

## WYDAJNOŚĆ

- [ ] LiteSpeed Cache – włączony
- [ ] LiteSpeed – Purge All po zmianach
- [ ] Obrazy – kompresja przed wgraniem (TinyPNG)
- [ ] LiteSpeed Image Optimization – Lazy Load włączony
- [ ] CSS Minify – włączony
- [ ] JS Minify – włączony (testuj!)

---

## SEO I INNE

- [ ] Yoast – ustaw frazę kluczową (na kluczowych stronach)
- [ ] ~~SVG viewbox~~ – zostawiamy (trudno edytować w Blocksy)
- [x] PHP 8.4 – masz

---

## PO ZMIANACH

- [ ] Test formularza kontaktowego
- [ ] Test na telefonie
- [ ] PageSpeed Insights: https://pagespeed.web.dev/ (wpisz imprezja.pl)

---

**Czas:** ok. 1–2 godziny przy pierwszym razie.
