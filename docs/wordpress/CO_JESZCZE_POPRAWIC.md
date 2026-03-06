# Co jeszcze można poprawić – imprezja.pl

Lista rzeczy do zrobienia (bez SVG – zostawiamy w spokoju).

---

## 1. Terminarz – czy jest widoczny?

**Problem:** Blok z kalendarzem Google miał klasy ukrywające go na desktop, tablet i mobile.

**Sprawdź:** Otwórz imprezja.pl na komputerze – czy widzisz sekcję „Terminarz” z kalendarzem?

- **Jeśli NIE** – Edytor strony głównej → znajdź blok kalendarza → ustawienia bloku (Spectra) → „Ukryj na” → usuń wszystkie opcje (desktop, tablet, mobile)
- **Jeśli TAK** – nic do roboty

---

## 2. Usuń nieaktywne wtyczki

**Wtyczki** → Zainstalowane → dla każdej **nieaktywnej**:
- Czy na pewno nie potrzebujesz? → **Usuń**

Każda wtyczka (nawet nieaktywna) zajmuje miejsce i może zostawiać śmieci w bazie.

---

## 3. Test: SP Blog Designer

- Masz blog (imprezja.pl/blog-imprezja/) – wtyczka może być używana
- **Jeśli blog wygląda OK** – zostaw
- **Jeśli chcesz odchudzić stronę** – dezaktywuj SP Blog Designer → odśwież blog → jeśli nic się nie zepsuło, usuń wtyczkę

---

## 4. Test: FileBird Pro

- **Galeria** (imprezja.pl/galeria/) – sprawdź w edytorze: blok galerii to „FileBird” czy „Kadence Gallery”?
- Jeśli Kadence – FileBird może być zbędny (dezaktywuj, test, ewentualnie usuń)

---

## 5. WP-Optimize – czyszczenie bazy

- Zainstaluj **WP-Optimize** (darmowa)
- Uruchom: „Usuń dane po usuniętych wtyczkach”, „Ogranicz rewizje” (np. ostatnie 5)
- Optymalizacja tabel

---

## 6. LiteSpeed Cache (jeśli masz na dhostingu)

- **Cache** – włączony
- **Image Optimization** – Lazy Load, ewentualnie konwersja do WebP
- **Page Optimization** – CSS Minify, JS Minify (testuj – czasem psuje formularze)
- Po każdej zmianie treści: **Purge All**

---

## 7. Obrazy – kompresja przed wgraniem

- Przed dodaniem nowych zdjęć: [TinyPNG.com](https://tinypng.com/) lub [Squoosh.app](https://squoosh.app/)
- Obrazy 2–5 MB → po kompresji często 200–500 KB

---

## 8. Formularz kontaktowy – test

- Wyślij testową wiadomość ze strony
- Sprawdź czy przychodzi na e-mail
- Sprawdź czy reCAPTCHA nie blokuje (jeśli masz)

---

## 9. PageSpeed Insights

- Wejdź na: https://pagespeed.web.dev/
- Wpisz: imprezja.pl
- Zobacz wyniki (Mobile/Desktop) – czerwone punkty = co poprawić w pierwszej kolejności

---

## Priorytet (od najważniejszych)

| # | Działanie | Czas |
|---|-----------|------|
| 1 | Terminarz – sprawdź widoczność | 2 min |
| 2 | Usuń nieaktywne wtyczki | 10 min |
| 3 | WP-Optimize – czyszczenie bazy | 5 min |
| 4 | LiteSpeed – sprawdź ustawienia | 5 min |
| 5 | Test formularza | 2 min |
| 6 | PageSpeed – zobacz raport | 5 min |

---

**SVG, Yoast, PHP** – masz ogarnięte. Reszta to głównie porządki i cache.
