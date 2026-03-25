# Plan: System prezentacji – tablice, zdjęcia, filmy

## Cel

Zastąpić prosty „obrazek + napis” prawdziwym systemem prezentacji z możliwościami:
1. **Tablice z napisami** – tekst na ekranie (np. menu, życzenia, ogłoszenia)
2. **Prezentacja zdjęć** – galeria/slideshow z przejściami
3. **Odtwarzanie filmów** – wideo na pełnym ekranie

Sterowanie z Admin PWA (telefon) przez Socket.IO.

---

## 1. Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│  EKRAN (screen-controller)                                       │
│  Widok: welcome | prezentacja | quiz | familiada | statki        │
│                                                                  │
│  Widok "prezentacja" = nowy komponent prezentacji:               │
│  • Typ slajdu: tekst | zdjęcia | wideo                           │
│  • Slajdy w kolejności, sterowane z admina (następny/poprzedni)  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Socket.IO
┌─────────────────────────────────────────────────────────────────┐
│  Admin PWA (telefon)                                             │
│  • Wybór trybu prezentacji                                      │
│  • Lista slajdów / playlist                                     │
│  • Następny / Poprzedni / Start / Stop                          │
│  • Edycja treści (tekst, dodanie zdjęć, filmów) – na PC         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Typy slajdów

### 2.1 Tablica tekstowa (tekst)

- **Treść:** tekst (np. „Menu weselne”, „Życzenia dla Ani i Leszka”, „Program wieczoru”)
- **Opcje:** czcionka, rozmiar, pozycja (środek, góra, dół), kolor tła
- **Format:** HTML lub Markdown (np. tytuł + lista punktów)
- **Przykłady:** menu, życzenia, ogłoszenia, program imprezy

### 2.2 Prezentacja zdjęć

- **Źródło:** pliki z `/uploads/` lub zdefiniowana lista URL-i
- **Tryb:** slideshow (auto) lub ręczne przełączanie
- **Przejścia:** fade, slide, zoom (np. Ken Burns)
- **Czas:** 5–30 s na slajd (konfigurowalne)
- **Układ:** pełny ekran, z ramką, z podpisem

### 2.3 Odtwarzanie filmów

- **Format:** MP4, WebM (HTML5 `<video>`)
- **Źródło:** pliki z `/uploads/` lub URL
- **Sterowanie:** play/pause z admina, lub automatycznie po zakończeniu → następny slajd
- **Układ:** pełny ekran, z kontrolkami

---

## 3. Gotowe elementy / biblioteki

### 3.1 Reveal.js

- **Co to:** framework prezentacji HTML5
- **Zalety:** slajdy, przejścia, wideo w tle, API JS
- **Wady:** duży rozmiar, orientacja na prezentacje „PowerPoint”
- **Użycie:** można załadować z CDN lub wbudować wybrane fragmenty
- **Link:** https://revealjs.com/

### 3.2 Własna implementacja (bez bibliotek)

- **Tablice tekstowe:** HTML + CSS, treść z JSON
- **Zdjęcia:** `<img>` + CSS transitions (fade, slide)
- **Filmy:** `<video>` + API
- **Zalety:** lekko, spójne z Imprezja, offline
- **Wady:** więcej pracy

### 3.3 lightGallery / Swiper

- **lightGallery:** galeria zdjęć + wideo
- **Swiper:** carousel/slider
- **Użycie:** tylko moduł slideshow, bez pełnej prezentacji

### 3.4 Rekomendacja

**Hybryda:** własny kod + minimalne wzorce z bibliotek:

- **Tekst:** własny HTML/CSS
- **Zdjęcia:** własny slideshow z CSS transitions (fade, slide)
- **Filmy:** natywny `<video>` + API

Ewentualnie **Reveal.js** (npm lub CDN) jako „tryb zaawansowany” – jeśli chcemy pełne prezentacje typu PowerPoint.

---

## 4. Model danych

### 4.1 Konfiguracja prezentacji (JSON)

```json
{
  "id": "wesele-ani-leszka",
  "name": "Wesele Ani i Leszka",
  "slides": [
    {
      "type": "text",
      "title": "Menu",
      "content": "Zupa: Rosół\nDanie główne: Kotlet schabowy\nDeser: Sernik",
      "style": { "fontSize": "large", "align": "center" }
    },
    {
      "type": "image",
      "src": "/uploads/1773253794518-HERCULES.webp",
      "caption": "Foto 1",
      "duration": 8
    },
    {
      "type": "video",
      "src": "/uploads/wesele-video.mp4",
      "autoplay": true
    }
  ],
  "transition": "fade",
  "loop": true
}
```

### 4.2 Stan na serwerze (Socket.IO)

- `presentationIndex` – aktualny indeks slajdu (0, 1, 2…)
- `presentationPlaying` – czy slideshow (zdjęcia) jest włączony
- `presentationConfig` – aktualna konfiguracja (nazwa, slajdy)

---

## 5. Eventy Socket.IO

| Event | Kierunek | Opis |
|-------|----------|------|
| `presentation_next` | admin → serwer | Następny slajd |
| `presentation_prev` | admin → serwer | Poprzedni slajd |
| `presentation_go` | admin → serwer | Idź do slajdu N |
| `presentation_play` | admin → serwer | Włącz auto-slideshow |
| `presentation_pause` | admin → serwer | Zatrzymaj slideshow |
| `presentation_slide` | serwer → wszyscy | Aktualny slajd (index, data) |
| `presentation_config` | admin → serwer | Załaduj konfigurację |
| `presentation_join` | ekran → serwer | Ekran łączy się, dostaje stan |

---

## 6. Widok prezentacji w screen-controller

Nowy widok `view-prezentacja`:

```html
<div id="view-prezentacja" class="screen-view">
  <div id="presentation-container">
    <!-- Slajd tekstowy -->
    <div class="slide-text" data-active>
      <h1 class="slide-title">Menu</h1>
      <div class="slide-content">Treść...</div>
    </div>
    <!-- Slajd zdjęcie -->
    <div class="slide-image" data-active>
      <img src="..." alt="">
      <p class="slide-caption">Podpis</p>
    </div>
    <!-- Slajd wideo -->
    <div class="slide-video" data-active>
      <video src="..." controls autoplay></video>
    </div>
  </div>
</div>
```

Przełączanie: zmiana `data-active` lub podmiana treści w jednym kontenerze.

---

## 7. Edytor prezentacji (na komputerze)

- **Lokalizacja:** `/editor-prezentacja.html` lub sekcja w menu Edytor
- **Funkcje:**
  - Lista slajdów (drag & drop kolejność)
  - Dodawanie slajdu: tekst / zdjęcie / wideo
  - Dla tekstu: pole tekstowe, wybór stylu
  - Dla zdjęć: przeglądarka `/uploads/`, wybór plików
  - Dla wideo: wybór pliku z uploads
  - Zapisywanie do JSON (np. `/uploads/prezentacje/nazwa.json` lub API)

---

## 8. Admin PWA – sterowanie prezentacją

W sekcji „Prezentacja” w Admin PWA:

- Przycisk „Pokaż prezentację” → `screen_switch` → `prezentacja`
- Lista slajdów (miniatury) – klik = `presentation_go` (index)
- Przyciski: „◀ Poprzedni” | „▶ Następny”
- „▶ Play” / „⏸ Pause” – auto-slideshow

---

## 9. Kolejność implementacji

| # | Zadanie | Szacunek |
|---|---------|----------|
| 1 | Widok `prezentacja` w screen-controller + obsługa slajdu tekstowego | 2–3h |
| 2 | Serwer: eventy `presentation_*`, stan | 1h |
| 3 | Slajd zdjęcie – slideshow z fade | 1–2h |
| 4 | Slajd wideo – `<video>` + sterowanie | 1h |
| 5 | Admin PWA – przyciski Następny/Poprzedni, Play/Pause | 1–2h |
| 6 | Edytor prezentacji (na PC) – tworzenie, zapis JSON | 3–4h |
| 7 | Przejścia (slide, zoom), konfiguracja czasu | 1–2h |

---

## 10. Przechowywanie plików

- **Prezentacje:** `{dataDir}/prezentacje/*.json`
- **Zdjęcia:** `/uploads/` (już istnieje)
- **Filmy:** `/uploads/` (już istnieje)
- **API:** `GET /api/prezentacje/list`, `GET /api/prezentacje/:id`, `POST /api/prezentacje/save`

---

## 11. Alternatywa: Reveal.js (tryb zaawansowany)

Jeśli chcemy pełne prezentacje:

1. `npm install reveal.js`
2. Strona `/prezentacja-reveal.html` – ładuje Reveal.js
3. Konfiguracja slajdów z JSON → generowanie HTML dla Reveal
4. API Reveal: `Reveal.next()`, `Reveal.prev()`, `Reveal.slide(index)` – wywoływane przez Socket.IO

**Zalety:** profesjonalne przejścia, wideo w tle, fragmenty
**Wady:** większy bundle, dodatkowa zależność

---

## Podsumowanie

- **Faza 1:** slajdy tekst + zdjęcia + wideo, sterowanie z admina
- **Faza 2:** edytor na PC, zapis JSON
- **Faza 3:** przejścia, auto-slideshow, ewentualnie Reveal.js

Wszystko offline, bez zewnętrznych zależności (oprócz ewentualnego Reveal.js).
