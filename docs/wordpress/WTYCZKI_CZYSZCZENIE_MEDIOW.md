# Wtyczki WordPress do czyszczenia nieużywanych mediów

Wtyczki mają dostęp do bazy WordPress (posty, meta, widgety, Customizer) i dokładniej wykrywają użycie mediów niż skrypty oparte na skanowaniu HTML.

---

## Rekomendowane wtyczki

### 1. Media Cleaner (Meow Apps) – **najbardziej polecana**

| | |
|---|-----|
| **Instalacje** | 880 000+ |
| **Link** | [wordpress.org/plugins/media-cleaner](https://wordpress.org/plugins/media-cleaner) |
| **Cena** | Darmowa + Pro (opcjonalnie) |

**Zalety:**
- Skanuje **posty, strony, meta, widgety** – ma dostęp do bazy
- Wsparcie dla **90+ wtyczek** (Elementor, Divi, WooCommerce, ACF, Blocksy)
- **Kosz wewnętrzny** – usuwa do „trash”, można przywrócić przed trwałym usunięciem
- Obsługa **retina, WebP** (Converter for Media)
- Wersja Pro: skan plików na dysku, WP-CLI

**Jak używać:**
1. Zainstaluj wtyczkę
2. Uruchom skan (Media Cleaner → Scan)
3. Przejrzyj listę „unused” – wtyczka pokazuje, gdzie plik *może* być używany
4. Usuń do kosza wewnętrznego (nie od razu na stałe)
5. Sprawdź stronę – jeśli coś zniknęło, przywróć z kosza
6. Dopiero potem „Empty trash” (trwałe usunięcie)

---

### 2. Unused Media Checker

| | |
|---|-----|
| **Link** | [wordpress.org/plugins/unused-media-checker](https://wordpress.org/plugins/unused-media-checker) |

**Zalety:**
- Uwzględnia **logo, favicon, featured images**
- Integracja z **Advanced Ads, Rank Math**
- Bulk delete z zabezpieczeniem (nonce)
- Przyciski usuwania z potwierdzeniem

---

### 3. Media Wipe

| | |
|---|-----|
| **Link** | [wordpress.org/plugins/media-wipe](https://wordpress.org/plugins/media-wipe) |

**Zalety:**
- **AI** – ocena pewności (High/Medium/Low)
- Wieloetapowe potwierdzenie przed usunięciem
- Logowanie audytu

---

### 4. Autoremove Attachments

| | |
|---|-----|
| **Link** | [wordpress.org/plugins/autoremove-attachments](https://wordpress.org/plugins/autoremove-attachments) |

**Inne podejście:** Automatycznie usuwa załączniki **gdy usuniesz post/stronę**. Nie skanuje „starych” nieużywanych plików – zapobiega narastaniu w przyszłości.

---

## Ochrona PDF ofert przed Media Cleaner

**Problem:** Media Cleaner może usuwać PDF-y ofert (np. `Oferta-wesele-Imprezja-2027.pdf`), jeśli nie wykryje ich w treści stron.

**Rozwiązanie – dodaj link do PDF w treści strony:**
1. Edytuj stronę, na której ma być oferta (np. „Oferta”, „Kontakt”, „Wesele”)
2. Wstaw link do PDF: `https://nowajakoscrozrywki.pl/wp-content/uploads/2026/01/Oferta-wesele-Imprezja-2027.pdf`
3. Media Cleaner skanuje treść – wykryje link i **nie usunie** pliku

**Alternatywa:** Przed skanem Media Cleaner → **Ignore** (jeśli wtyczka ma taką opcję) lub wyklucz folder `2026/01/` w ustawieniach.

---

## Rekomendacja dla imprezja.pl

1. **Zainstaluj Media Cleaner** (darmowa wersja)
2. **Przywróć usunięte pliki** – wgraj backup uploads lub ponownie wgraj brakujące obrazy
3. **Upewnij się, że oferty PDF są linkowane** w treści strony – inaczej Media Cleaner może je usunąć przy kolejnym skanie
4. **Uruchom skan** w Media Cleaner – zobacz, co wtyczka uznaje za nieużywane
5. **Usuwaj ostrożnie** – najpierw do kosza wewnętrznego, potem sprawdź stronę
