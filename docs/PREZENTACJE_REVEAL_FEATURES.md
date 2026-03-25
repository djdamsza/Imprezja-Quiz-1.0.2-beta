# Prezentacje – funkcje i uruchomienie

## Uruchomienie start.html

`start.html` wymaga serwera HTTP (nie działa przy otwarciu pliku `file://`):
- **Electron:** `npm run electron` – otwiera `screen-controller.html` (główny ekran TV)
- **Serwer:** `npm start` – potem otwórz `http://127.0.0.1:3000/start.html` w przeglądarce
- Link do Prezentacji: `http://127.0.0.1:3000/editor-prezentacja.html` (z siatki trybów)

---

# Funkcje Reveal.js – możliwe do wykorzystania

Na podstawie [revealjs.com](https://revealjs.com/):

## Już wykorzystane
- **Przejścia** – none, fade, slide, convex, concave, zoom
- **Auto-progression** – automatyczne przechodzenie slajdów (z własnym czasem per-slajd)

## Warte rozważenia

### 1. **Auto-Animate**
Automatyczna animacja pasujących elementów między slajdami. Elementy z tym samym `data-id` animują się płynnie.
```html
<section data-auto-animate>
  <h1 data-id="title">Animowany tytuł</h1>
</section>
```

### 2. **Fragments**
Krokowanie przez elementy na slajdzie (np. lista punktów pojawia się po kolei).
```html
<p class="fragment">Punkt 1</p>
<p class="fragment">Punkt 2</p>
<p class="fragment fade-in-then-out">Tymczasowy</p>
```

### 3. **Tło slajdu**
- `data-background="#dddddd"` – kolor
- `data-background="image.png"` – obrazek
- `data-background-video="video.mp4"` – wideo w tle
- `data-background-repeat="repeat"` – kafelkowanie

### 4. **Zoom (POV)**
Ctrl+klik na element – powiększenie. Przydatne przy prezentacji zdjęć.

### 5. **Widok prelegenta (Speaker View)**
Klawisz S – widok z notatkami, timerem, podglądem następnego slajdu.

### 6. **Eksport do PDF**
Prezentacje można eksportować do PDF.

### 7. **Parallax backgrounds**
Efekt paralaksy dla tła.

### 8. **Global State**
`data-state="something"` – dodaje klasę do dokumentu przy danym slajdzie (np. zmiana tła całej strony).

### 9. **Grupy slajdów (slajdy pionowe / nested slides)** ✓ Zaimplementowane
**Co to robi:** Pozwala pogrupować zdjęcia (szczególnie pionowe) w „stosy”. Zamiast jednej długiej listy masz grupy – np. „Wesele” z 5 zdjęciami pionowymi. Każdy slajd w grupie wyświetla się na pełnym ekranie. Przy nawigacji klawiaturą: strzałka w dół = kolejne zdjęcie w grupie, strzałka w prawo = następna grupa. Przy sterowaniu zdalnym (Next/Prev) slajdy przechodzą po kolei. **Idealne dla zdjęć pionowych na poziomym telewizorze** – każde zdjęcie wypełnia ekran, a grupy pomagają uporządkować prezentację.

### 10. **Markdown**
**Co to robi:** Umożliwia pisanie treści slajdów w formacie Markdown zamiast HTML. Np. `**pogrubienie**`, `*kursywa*`, listy z `-`, nagłówki z `#`. Przydatne przy dłuższych tekstach i listach punktowanych.

### 11. **LaTeX / Math**
**Co to robi:** Umożliwia wstawianie wzorów matematycznych, np. E=mc², ułamki, całki, symbole. Przydatne w prezentacjach edukacyjnych lub naukowych.

### 12. **Własne skróty klawiszowe**
Konfigurowalne powiązania klawiszy.

---

**Rekomendacje na najbliższe iteracje:**
- **Fragments** – dla napisów (punkt po punkcie)
- **Tło slajdu** – opcja ustawienia obrazka/wideo jako tła
- **Zoom** – dla trybu prezentacji zdjęć
