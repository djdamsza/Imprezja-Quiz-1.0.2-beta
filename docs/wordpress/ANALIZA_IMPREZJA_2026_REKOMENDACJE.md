# Analiza imprezja.pl – marzec 2026
## Czy WordPress ma sens? Optymalizacja, SEO i organizacja

---

## 1. Czy WordPress ma sens na dzień dzisiejszy?

### Tak – WordPress nadal ma sens dla imprezja.pl

| Argument | Uzasadnienie |
|----------|--------------|
| **Typ strony** | Strona firmowa DJ/wodzirej: oferta, galeria, formularz, blog, cennik – to klasyczny przypadek dla CMS |
| **Samodzielna edycja** | Damian może aktualizować treści, zdjęcia, cennik bez programisty |
| **SEO** | Yoast SEO działa, strona ma 100/100 w PageSpeed SEO – fundament jest dobry |
| **Integracje** | Formularz, reCAPTCHA, Trustindex, Google Analytics, mapa – WordPress to ułatwia |
| **Koszty migracji** | Przejście na statyczny site (Astro, 11ty) = przepisanie, utrata łatwej edycji, wyższy koszt utrzymania |

### Kiedy warto rozważyć zmianę?

- **Statyczny site** – gdy strona jest bardzo prosta (1–3 strony, brak formularza, brak galerii) i nie planujesz samodzielnych aktualizacji
- **Headless CMS** – gdy potrzebujesz bardzo wysokiej wydajności i masz budżet na rozwój

**Wniosek:** Dla imprezja.pl WordPress jest uzasadniony. Zamiast migracji – **odchudzenie i optymalizacja** da lepszy efekt przy mniejszym nakładzie.

---

## 2. Stan obecny (na podstawie audytów i analizy strony)

### Mocne strony
- **PageSpeed:** 97% mobile i desktop (po optymalizacji WebP)
- **SEO:** 100/100
- **Struktura:** Jasna hierarchia: wesele, imprezy okolicznościowe, szkolenia, galeria, kontakt
- **Treść:** Dobre teksty pod frazy „DJ wodzirej wesele”, „DJ na wesele”, lokalne warianty (Poznań, Ostrów, Kalisz)
- **Internal linking:** Sensowne linkowanie między podstronami

### Do poprawy
- **Wtyczki:** Duplikacja (Kadence + Spectra), potencjalnie zbędne (SP Blog Designer, FileBird)
- ~~**Terminarz:** Blok kalendarza ukryty~~ – w trakcie usuwania (blok nadal w HTML – usuń bezpośrednio z edytora strony)
- **Obrazy:** JR-344-2 (~897 KiB) bez WebP, ~~logo za duże~~ ✅ zrobione
- **Best Practices:** 69/100 – cookies innych firm, błędy konsoli, obrazy o złych proporcjach
- **Accessibility:** 95 – kontrast, kolejność nagłówków h1–h6
- **TBT:** reCAPTCHA, YouTube, CookieYes, Trustindex – ciężkie skrypty

---

## 3. Rekomendacje optymalizacyjne

### Priorytet 1: Szybkie wygrane (do 1 godziny)

| Działanie | Gdzie | Efekt |
|-----------|-------|-------|
| **Terminarz** | Edytor strony głównej → usuń blok Google Map (Spectra) | Usunięcie zbędnej sekcji |
| ~~**Logo**~~ | ✅ zrobione | ~15 KiB mniej |
| **Obraz LCP** | Blok hero → `fetchpriority="high"`, `loading="eager"` | LCP -1–2 s |
| **Yoast** | Strona główna, dj-na-wesele → fraza „DJ wodzirej wesele” | Lepsze pozycjonowanie |
| **Usuń nieaktywne wtyczki** | Wtyczki → usuń nieużywane | Mniej kodu, szybsza strona |

### Priorytet 2: Wydajność (2–4 godziny)

| Działanie | Szczegóły |
|-----------|-----------|
| **JR-344-2.jpg** | Skompresuj (TinyPNG), wgraj WebP lub zmień blok UAGB, żeby LiteSpeed mógł konwertować |
| **LiteSpeed** | Load CSS Asynchronously, JS Deferred (testuj formularz!) |
| **Fonty** | OMGF lub Local Google Fonts – hostuj lokalnie, `font-display: swap` |
| **YouTube** | lite-youtube (thumbnail + klik) zamiast pełnego embed – oszczędność ~1 s |
| **reCAPTCHA** | Lazy load – ładuj dopiero przy focus w polu formularza |
| **CookieYes / Trustindex** | Defer – odłóż ładowanie po załadowaniu strony |

### Priorytet 3: Porządki wtyczek

| Wtyczka | Akcja |
|---------|-------|
| **Kadence vs Spectra** | Sprawdź, które bloki są używane. Jeśli wszystko ze Spectra – usuń Kadence (lub odwrotnie) |
| **SP Blog Designer** | Jeśli blog działa bez niej – usuń |
| **FileBird** | Jeśli galeria to Kadence Gallery – usuń FileBird |
| **WP-Optimize** | Zainstaluj, wyczyść bazę (dane po wtyczkach, stare rewizje) |

---

## 4. Rekomendacje SEO

### Już działa dobrze
- Struktura nagłówków (h1, h2, h3)
- Teksty pod frazy długiego ogona
- Strony lokalne (Poznań, Ostrów, Kalisz)
- Internal linking

### Do dopracowania

| Element | Rekomendacja |
|---------|--------------|
| ~~**Schema.org**~~ | ~~LocalBusiness~~ ✅ zrobione (ręczny JSON-LD w nagłówku) |
| **Meta descriptions** | Każda strona – unikalny opis 150–160 znaków |
| **Alt teksty** | Wszystkie zdjęcia w galerii – opisowe alt (np. „DJ Damian Nowaczyk na weselu w Poznaniu”) |
| **Struktura URL** | Obecna jest OK (dj-na-wesele, imprezy-okolicznosciowe) |
| **Blog** | Jeśli blog-imprezja jest aktywny – regularne wpisy pod „DJ wesele”, „wodzirej tips” |
| **Google Business** | Profil zaktualizowany, zdjęcia, recenzje – link ze strony |

---

## 5. Organizacja strony

### Obecna struktura (OK)
```
imprezja.pl
├── / (strona główna)
├── /dj-na-wesele/
├── /imprezy-okolicznosciowe/
├── /szkolenia/ (Nowa Jakość Rozrywki)
├── /galeria/
├── /imprezja-damian-nowaczyk-dj-i-wodzirej/ (kontakt)
├── /dj-na-wesele-poznan/
├── /dj-ostrow-wielkopolski/
├── /dj-kalisz/
└── ... (blog, polityka, regulamin)
```

### Propozycje usprawnień

| Obszar | Zmiana |
|--------|--------|
| **CTA** | Formularz „Zapytaj o termin” – powtórz na każdej podstronie oferty (już jest na dj-na-wesele, imprezy-okolicznosciowe) |
| **Galeria** | Lazy load obrazów, mniejsze thumbnails – galeria ładuje dużo zdjęć naraz |
| **Nawigacja** | Menu – czy wszystkie kluczowe strony są w 1–2 kliknięciach? Sprawdź na mobile |
| **Strona główna** | Sekcja „Terminarz” – usuń blok (mapa Google) – usuń bezpośrednio z edytora strony |
| **Footer** | Telefon, email, social – czy są widoczne na mobile bez scrollowania? |
| **Trust** | Rekomendacje, certyfikaty – czy są powyżej linii składania (above the fold)? |

---

## 6. Best Practices (69 → 90+)

| Problem | Rozwiązanie |
|---------|-------------|
| **Cookies innych firm** | CookieYes – minimalna konfiguracja, tylko niezbędne skrypty przed zgodą |
| **Błędy konsoli** | DevTools → Console – usuń lub napraw źródła błędów |
| **Obrazy – proporcje** | Ustaw `width` i `height` w HTML (lub aspect-ratio w CSS) – zapobiega CLS |
| **CSP, HSTS** | Opcjonalnie – wymaga konfiguracji serwera/hostingu |

---

## 7. Plan działania (kolejność)

### Faza 1: Naprawy krytyczne (1 dzień)
1. Backup (UpdraftPlus)
2. Terminarz – usuń blok Google Map ze strony głównej (bezpośrednio w edytorze, nie przez wzorce)
3. Usuń nieaktywne wtyczki
4. Test formularza i strony na mobile

### Faza 2: Wydajność (1 tydzień)
1. Obraz LCP: fetchpriority, loading="eager"
2. ~~Logo – mniejsza wersja~~ ✅ zrobione
3. JR-344-2 – kompresja / WebP
4. LiteSpeed – CSS/JS, fonty (OMGF)
5. PageSpeed – weryfikacja

### Faza 3: SEO i treść (ciągłe)
1. Yoast – frazy na kluczowych stronach
2. Alt teksty – galeria i zdjęcia
3. ~~Schema LocalBusiness~~ ✅ zrobione
4. Blog – 1–2 wpisy miesięcznie (jeśli ma sens)

### Faza 4: Porządki (1 dzień)
1. Kadence vs Spectra – wybierz jeden
2. SP Blog Designer, FileBird – test i ewentualne usunięcie
3. WP-Optimize – czyszczenie bazy

---

## 8. Podsumowanie

| Pytanie | Odpowiedź |
|---------|-----------|
| **Czy WordPress ma sens?** | Tak – dla imprezja.pl to uzasadniony wybór |
| **Co poprawić w pierwszej kolejności?** | Terminarz (usuń blok), wtyczki, obraz LCP, ~~logo~~ ✅ |
| **SEO** | Fundament dobry; dopracować alt, schema, meta |
| **Organizacja** | Struktura OK; CTA, galeria, trust – drobne usprawnienia |

**Szacowany czas na Fazy 1–2:** ok. 8–12 godzin  
**Efekt:** Szybsza strona, lepsza widoczność, mniej problemów technicznych

---

## 9. Status zadań (aktualizacja)

| Zadanie | Status |
|---------|--------|
| LocalBusiness schema | ✅ Zrobione |
| Logo – mniejsza wersja | ✅ Zrobione |
| Terminarz | ⚠️ **Do zrobienia** – usunięcie wzorców nie usunęło bloku ze strony |

### Terminarz – co dalej

Blok mapy Google (Spectra) **nadal jest w treści strony głównej**. Usunięcie wzorców usuwa tylko szablony, nie bloki wklejone bezpośrednio na stronę.

**Co zrobić:**
1. **Strony** → Edytuj stronę główną (ta ustawiona jako strona startowa)
2. **Lista bloków** (ikona w górnym pasku) → znajdź **Google Map** w sekcji „Zapytaj o termin i ofertę”
3. Kliknij blok → **Delete** / **Usuń blok**
4. **Zapisz** stronę
5. **LiteSpeed** → Purge All (wyczyść cache)

---

*Dokument przygotowany na podstawie: imprezja.pl (marzec 2026), AUDYT_IMPREZJA_2025.md, PAGESPEED_ANALIZA_IMPREZJA.md, PAGESPEED_IMPREZJA_20-02-2026.md, OPTYMALIZACJA_WORDPRESS.md*
