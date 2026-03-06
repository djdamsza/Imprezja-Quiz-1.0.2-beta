# Naprawa SVG viewbox w stopce – imprezja.pl

> **Status:** SVG trudno edytować w motywie Blocksy – zostawiamy bez zmian. Błąd jest kosmetyczny.

## Co to jest?

**SVG** to format grafiki wektorowej (ikony, logo). W stopce masz ikonę **YouTube** z błędnym atrybutem:

- ❌ `viewbox="0 0 20 20"` (małe v)
- ✅ `viewBox="0 0 20 20"` (camelCase – poprawne)

W HTML/SVG atrybut musi być `viewBox` (duże B). Bez tego niektóre przeglądarki mogą źle wyświetlać ikonę.

---

## Gdzie to naprawić?

Ikona YouTube jest w **stopce** (footer), prawdopodobnie w sekcji Social Media.

### Opcja 1: Motyw Blocksy – Customizer

1. **Wygląd** → **Dostosuj** (Customize)
2. **Footer** → **Widgety stopki** lub **Elementy stopki**
3. Znajdź blok z ikonami social (Facebook, YouTube, Instagram…)
4. Edytuj – jeśli jest pole „Własny HTML” lub „Ikona YouTube” – tam może być SVG
5. Zamień `viewbox` na `viewBox`

### Opcja 2: Widget stopki

1. **Wygląd** → **Widżety**
2. Znajdź obszar **Stopka** (Footer 1, Footer 2 itd.)
3. Otwórz widget z ikonami social
4. W treści HTML znajdź: `viewbox="0 0 20 20"`
5. Zamień na: `viewBox="0 0 20 20"`

### Opcja 3: Edytor bloków (Gutenberg)

1. **Strony** → edytuj stronę, która ma stopkę (często szablon)
2. Lub **Wygląd** → **Edytor** (Full Site Editing) – jeśli motyw to wspiera
3. Znajdź blok stopki z ikonami
4. Przełącz na **Kod HTML** (trzy kropki → Edytuj jako HTML)
5. Wyszukaj `viewbox` → zamień na `viewBox`

### Opcja 4: Dodatkowy CSS (obejście)

Jeśli nie znajdziesz źródła, możesz dodać w **Wygląd** → **Dostosuj** → **Dodatkowy CSS**:

```css
/* To NIE naprawi SVG – tylko ukryje ewentualne problemy. Lepiej naprawić źródło. */
```

Lepiej znaleźć źródło i poprawić `viewbox` → `viewBox`.

---

## Szybka zamiana (jeśli masz dostęp do plików)

Jeśli ikona jest w pliku motywu lub wtyczki:

- Szukaj: `viewbox="0 0 20 20"`
- Zamień na: `viewBox="0 0 20 20"`

**Uwaga:** Przy aktualizacji motywu/wtyczki zmiany w plikach mogą zostać nadpisane. Wtedy trzeba poprawić w szablonie potomnym (child theme) lub w Customizerze.
