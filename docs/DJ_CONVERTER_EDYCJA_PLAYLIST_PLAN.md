# Plan: edycja i udoskonalanie playlist (tryb bez eksportu)

Edycja bazy VDJ bezpośrednio w edytorze – nie eksport do RB. Inspiracja: Lexicon. **Wszystkie zmiany z zatwierdzeniem użytkownika** – zaznaczenie, które utwory poprawić, które zostawić.

---

## 1. Wyszukiwanie duplikatów

**Cel:** Znaleźć utwory powielone (np. ten sam plik w różnych playlistach, ten sam utwór w różnych wersjach).

**Metody wykrywania:**
- Hash pliku (FilePath + size) – identyczne pliki
- Hash zawartości (np. MD5) – pliki w różnych lokalizacjach
- Podobieństwo: Title + Artist (normalizacja) – możliwe duplikaty
- Ścieżka do pliku – ten sam plik

**UI:** Lista grup duplikatów. Użytkownik zaznacza, które utwory usunąć z bazy (lub pozostawić tylko jeden w playlistach).

**Priorytet:** wysoki

---

## 2. Poprawianie nazw – polskie litery

**Cel:** Zamiana znaków (np. `Ã³` → `ó`, `Å‚` → `ł`) – typowe błędy kodowania.

**Propozycja:** Wykryj podejrzane sekwencje (UTF-8 źle zinterpretowane jako Latin-1), pokaż sugestię poprawki.

**UI:** Kolumna „Autor” / „Tytuł” – przed/po. Checkbox „Zastosuj” przy każdym utworze. Grupowe „Zastosuj zaznaczone”.

**Priorytet:** wysoki

---

## 3. Ujednolicenie nazw (np. Abba / ABBA / AbBa)

**Cel:** Jednolity format nazw artystów (np. „ABBA” wszędzie).

**Opcje:**
- **Title Case** – Abba
- **UPPERCASE** – ABBA
- **lowercase** – abba
- **Zachowaj pierwszą wersję** – użytkownik wybiera wzorzec z grupy

**UI:** Grupowanie po znormalizowanej nazwie (np. lowercase). Lista wariantów. Użytkownik wybiera docelowy wariant i zaznacza utwory do zmiany.

**Priorytet:** średni

---

## 4. Usuwanie zbędnych opisów z tytułów

**Cel:** Usunąć z tytułu m.in.:
- Linki (http://, https://, www.)
- Adresy e-mail
- Znaczniki typu „(Official Video)”, „[HD]”
- Numery wersji („(Radio Edit)”, „(Original Mix)”) – opcjonalnie, użytkownik decyduje

**UI:** Wykryj wzorce, pokaż „przed” → „po”. Checkbox przy każdym utworze. Możliwość edycji sugestii przed zastosowaniem.

**Priorytet:** średni

---

## 5. Rozdzielenie: tytuł vs artysta

**Cel:** Gdy „Artist” i „Title” są pomylone (np. wszystko w jednym polu: „Artist - Title” lub „Title – Artist”).

**Sugestie:**
- Wykryj „ - ” lub „ – ” jako separator
- Sprawdź, czy lewa/prawa część wygląda na tytuł (np. krótsza, „Mix”, „Edit”)
- Użytkownik wybiera kierunek: „Lewa część → Artist” lub „Lewa część → Title”

**UI:** Lista „podejrzanych” utworów. Propozycja podziału. Zaznaczenie, które zastosować.

**Priorytet:** średni

---

## 6. Zamiana wielkich liter na normalne

**Cel:** Np. „TYTUŁ UTWORU” → „Tytuł utworu” (Title Case).

**Opcje:** Title Case, lowercase, UPPERCASE (jak w pkt 3).

**UI:** Zaznaczenie utworów. Wybór reguły. Podgląd przed/po.

**Priorytet:** niski

---

## 7. Wspólne założenia UI

- **Zawsze podgląd przed/po** – użytkownik widzi zmianę przed zatwierdzeniem
- **Checkboxy** – zaznaczenie, które utwory poprawić
- **Grupy** – np. „Wszystkie z tym samym błędem” → jedna akcja „Zastosuj do grupy”
- **Cofnij** – możliwość wycofania ostatniej zmiany (np. w sesji)

---

## 8. Kolejność implementacji (propozycja)

| Faza | Funkcja | Złożoność |
|------|---------|-----------|
| 1 | Duplikaty (po ścieżce + Title+Artist) | Średnia |
| 2 | Polskie litery (naprawa kodowania) | Niska |
| 3 | Usuwanie linków z tytułów | Niska |
| 4 | Ujednolicenie nazw (Title Case) | Średnia |
| 5 | Rozdzielenie Artist/Title | Średnia |
| 6 | Duplikaty (hash pliku) | Wyższa |

---

## 9. API (szkic)

```
GET  /api/duplicates?method=path|hash|similar
GET  /api/encoding-fixes?field=artist|title
GET  /api/suggest-normalize?pattern=titlecase|uppercase
GET  /api/suggest-clean-title?pattern=urls|brackets
POST /api/apply-changes  { changes: [{ songId, field, newValue }, ...] }
```

---

## 10. Uwagi

- Wszystkie zmiany w **pamięci** – zapis do pliku dopiero po „Zapisz” (jak teraz)
- Backup przed zapisem – `database.xml.bak`
- vdjfolder – aktualizacja filtrów po zmianie tagów (już działa)
