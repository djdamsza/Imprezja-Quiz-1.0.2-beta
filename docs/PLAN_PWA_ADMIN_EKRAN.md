# Plan: PWA Admin + Zunifikowany ekran główny

## Cel

- **Ekran TV** – pełny ekran, sterowany z telefonu przez admina.
- **Admin PWA** – jedna aplikacja na telefonie, steruje wszystkim (poza edycją plików).
- **Ekran powitalny** – spersonalizowany (logo, zdjęcie, tekst np. „WESELE ANI I LESZKA”).
- **Tryby muzyczne** – nie ingerują w ekran. Jeśli jest obrazek/widok powitalny, zostaje. Później można dodać np. grafikę dla Śpiewaj Dalej.
- **Brak konfliktów** – panel admina danego trybu ładuje się dopiero po jego wyborze.

---

## Architektura – zarys

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EKRAN TV (Electron / przeglądarka) – pełny ekran                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  screen-controller.html (JEDNA strona)                                 │  │
│  │  Stan: welcome | quiz | familiada | statki | music-off | (inne)        │  │
│  │                                                                        │  │
│  │  • welcome: logo + obrazek + tekst (spersonalizowany)                  │  │
│  │  • quiz: iframe /Screen.html                                           │  │
│  │  • familiada: iframe /familiada/screen.html                            │  │
│  │  • statki: iframe /statki-solo/screen.html                             │  │
│  │  • music-off: czarny ekran (tryby muzyczne – Sampler, Bitwa, itd.)     │  │
│  │  • njr-sampler, bitwa, spiewaj, whitney, imprezator: opcjonalnie       │  │
│  │    iframe lub ekran off                                                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ Socket.IO: screen_switch, welcome_update
                                    │
┌─────────────────────────────────────────────────────────────────────────────┐
│  ADMIN PWA (telefon)                                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  1. Ekran główny: wybór trybu (Quiz, Familiada, Statki, Sampler…)     │  │
│  │  2. Po wyborze: LAZY LOAD panelu admina (tylko ten tryb)              │  │
│  │  3. Przycisk „Ekran powitalny” – ustawienia + przełącz na welcome      │  │
│  │  4. Przycisk „Wyłącz ekran” – dla trybów muzycznych                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Część 1: Zunifikowany kontroler ekranu (screen-controller.html)

### 1.1 Nowa strona `public/screen-controller.html`

**Rola:** Jedyna strona wyświetlana na ekranie TV. Odbiera polecenia przez Socket.IO i przełącza widok.

**Stany ekranu:**
- `welcome` – ekran powitalny (logo, obrazek, tekst)
- `quiz` – iframe `/Screen.html`
- `familiada` – iframe `/familiada/screen.html`
- `statki` – iframe `/statki-solo/screen.html`
- `njr-sampler`, `bitwa`, `spiewaj`, `whitney`, `imprezator` – tryby muzyczne (ekran off lub minimalny)
- `off` – czarny ekran (np. przerwa, muzyka)

**Struktura HTML:**
```html
<div id="view-welcome" class="screen-view">...</div>
<div id="view-quiz" class="screen-view"><iframe id="iframe-quiz"></iframe></div>
<div id="view-familiada" class="screen-view"><iframe id="iframe-familiada"></iframe></div>
<div id="view-statki" class="screen-view"><iframe id="iframe-statki"></iframe></div>
<div id="view-off" class="screen-view"></div>
```

**Socket.IO – nasłuch:**
- `screen_switch` – `{ mode: 'welcome'|'quiz'|'familiada'|'statki'|'off'|... }` → przełącza widoczny div, ładuje iframe tylko przy pierwszym wyświetleniu.
- `welcome_update` – `{ imageUrl?, text?, logoVisible? }` → aktualizuje ekran powitalny.

**Ekran powitalny – układ:**
- Logo Imprezja Quiz (opcjonalnie)
- Obrazek (np. zdjęcie pary młodej) – URL z `/uploads/` lub zewnętrzny
- Tekst – np. „WESELE ANI I LESZKA” – ładna czcionka, wyśrodkowany
- Tło – gradient / ciemne, spójne z resztą aplikacji

**Pełny ekran:** Przycisk „⛶ PEŁNY EKRAN” (jak teraz w Screen.html). Opcjonalnie: automatyczne wejście w fullscreen przy starcie (parametr URL `?autofs=1`).

### 1.2 Serwer – nowe eventy Socket.IO

W `server.js`:
- Zmienna stanu: `let screenControllerMode = 'welcome';`
- Zmienna: `let welcomeScreenData = { imageUrl: '', text: '', logoVisible: true };`
- Event `screen_switch` – admin wysyła `{ mode }` → zapisz stan, wyślij `io.emit('screen_switch', { mode })` do wszystkich (ekran nasłuchuje).
- Event `welcome_update` – admin wysyła `{ imageUrl?, text?, logoVisible? }` → zapisz, wyślij `io.emit('welcome_update', data)`.
- Event `screen_join` – gdy screen-controller się łączy, od razu dostaje `screen_state` z aktualnym mode + welcome data (żeby po odświeżeniu odtworzyć stan).

### 1.3 Electron – domyślny URL

W `electron-main.js` – okno główne ładuje `screen-controller.html` zamiast `start.html` (albo dodaj opcję: start.html z przekierowaniem do screen-controller, lub osobna konfiguracja).

**Wariant A:** Aplikacja startuje od razu na `screen-controller.html` (bez siatki trybów na TV – wszystko z telefonu).
**Wariant B:** Nadal `start.html` na TV, ale po wyborze trybu z telefonu – screen-controller przełącza się. Wymaga, żeby start.html i screen-controller były w jednym flow.

**Rekomendacja:** Ekran TV = tylko `screen-controller.html`. Siatka trybów znika z TV – jest wyłącznie w Admin PWA. Na TV od razu widać ekran powitalny.

---

## Część 2: Admin PWA – shell + lazy loading

### 2.1 Nowa strona `public/admin-pwa.html`

**Rola:** Główna strona Admin PWA. Shell z wyborem trybu. Panel admina danego trybu ładuje się dopiero po wyborze.

**Struktura:**
```
┌─────────────────────────────────────┐
│  Imprezja Admin                     │
│  ─────────────────────────────────  │
│  [Ekran powitalny]  [Wyłącz ekran]  │  ← zawsze widoczne
│  ─────────────────────────────────  │
│  Wybierz tryb:                      │
│  [Quiz] [Familiada] [Statki]        │
│  [NJR Sampler] [Bitwa] [Śpiewaj]   │
│  [Whitney] [Imprezator]             │
│  ─────────────────────────────────  │
│  (po wyborze – panel admina)         │
│  [iframe lub div z załadowanym UI]  │
└─────────────────────────────────────┘
```

**Lazy loading – unikanie konfliktów:**
- Nie ładuj żadnego panelu admina przy starcie.
- Po kliknięciu „Quiz” – dynamicznie utwórz iframe `src="/admin.html"` (lub załaduj w div przez fetch + innerHTML – ale admin ma dużo JS, więc iframe bezpieczniejszy).
- Po kliknięciu „Familiada” – usuń/ukryj iframe Quiz, utwórz iframe `src="/familiada/admin.html"`.
- Każdy iframe ma własne Socket.IO – izolacja, brak konfliktów.
- Przycisk „← Powrót” – ukrywa panel, wraca do listy trybów. Iframe można zostawić w DOM (hidden) – połączenie zostaje – albo usunąć, żeby zwolnić pamięć.

**Przełączanie ekranu:**
- „Ekran powitalny” – `socket.emit('screen_switch', { mode: 'welcome' })`.
- „Wyłącz ekran” – `socket.emit('screen_switch', { mode: 'off' })`.
- Przy wyborze trybu (np. Quiz) – `socket.emit('screen_switch', { mode: 'quiz' })` + załaduj panel admin Quiz.
- Dla trybów muzycznych – `socket.emit('screen_switch', { mode: 'off' })` lub `mode: 'njr-sampler'` (jeśli chcemy minimalny ekran).

### 2.2 Ustawienia ekranu powitalnego

W Admin PWA – sekcja „Ekran powitalny” (może być w górnym pasku lub w osobnym panelu):
- Pole tekstowe: „Tekst na ekranie” (np. WESELE ANI I LESZKA).
- Wybór obrazka: przeglądarka plików `/uploads/` lub URL. (Edycja plików = na komputerze, ale wybór z listy uploadów może być przez API.)
- Checkbox: „Pokaż logo Imprezja Quiz”.
- Przycisk „Zastosuj i pokaż” – `welcome_update` + `screen_switch` → welcome.

**Przechowywanie:** Dane welcome w pamięci serwera (zmienna). Opcjonalnie: zapis do pliku `welcome-screen.json` w dataDir, żeby przetrwały restart.

---

## Część 3: PWA – manifest i Service Worker

### 3.1 Manifest dla Admin PWA

Nowy plik `public/manifest-admin.json`:
```json
{
  "name": "Imprezja Admin",
  "short_name": "Imprezja Admin",
  "description": "Panel prowadzącego Imprezja Quiz",
  "start_url": "/admin-pwa.html",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1a1a2e",
  "theme_color": "#3498db",
  "icons": [...]
}
```

W `admin-pwa.html`: `<link rel="manifest" href="/manifest-admin.json">`.

### 3.2 Service Worker

W `sw.js` – dopisać cache dla `admin-pwa.html`, `manifest-admin.json` oraz zasobów potrzebnych adminowi (socket.io, style). Nie trzeba cache’ować wszystkich trybów – każdy panel ładuje się na żądanie.

### 3.3 Banner „Dodaj do ekranu”

Na `admin-pwa.html` – przy pierwszej wizycie (localStorage) pokazać banner: „Dodaj do ekranu głównego, aby szybciej uruchamiać panel”. Opcjonalnie: `beforeinstallprompt` dla Chrome.

---

## Część 4: Przepływ użytkownika

### Scenariusz: Wesela Ani i Leszka

1. **Przygotowanie (na komputerze):**
   - Uruchomienie aplikacji.
   - Edycja quizu / Familiady w edytorze (na PC).
   - Opcjonalnie: wgranie zdjęcia pary do `/uploads/`.

2. **Na imprezie:**
   - Komputer z TV – okno w pełnym ekranie na `screen-controller.html`.
   - Prowadzący otwiera na telefonie `admin-pwa.html` (jednorazowo przez QR lub zapisany link).
   - Dodaje Admin PWA do ekranu głównego (zalecane).

3. **Ekran powitalny:**
   - W Admin PWA: „Ekran powitalny” → wpisuje „WESELE ANI I LESZKA”, wybiera zdjęcie, „Zastosuj”.
   - Na TV: logo + zdjęcie + napis.

4. **Quiz:**
   - W Admin PWA: wybór „Quiz” → ładuje panel admin Quiz, ekran TV przełącza się na Quiz.
   - Prowadzący wybiera quiz, włącza QR dla graczy (vote.html).
   - Steruje pytaniami z telefonu.

5. **Familiada:**
   - „← Powrót” w Admin PWA → wybór „Familiada” → panel Familiady, ekran TV = Familiada.

6. **Muzyka (Sampler, Bitwa):**
   - Wybór „NJR Sampler” → panel Samplera, ekran TV = off (czarny) lub minimalny.
   - Sterowanie z telefonu, dźwięk z komputera.

7. **Przerwa:**
   - „Wyłącz ekran” lub „Ekran powitalny” z pustym tekstem.

---

## Część 5: Unikanie konfliktów – szczegóły techniczne

### 5.1 Dlaczego lazy loading?

- Każdy tryb (Quiz, Familiada, Statki, Bitwa…) ma własne eventy Socket.IO, handlery, stan.
- Gdyby wszystkie panele były załadowane naraz (np. w zakładkach), każdy by się łączył do Socket.IO i mógłby reagować na eventy innych (np. Quiz na eventy Familiady).
- **Rozwiązanie:** Ładuj tylko jeden panel na raz. Iframe izoluje kontekst JS – każdy panel ma własny `window`, własny `io()`. Serwer rozróżnia po roomach (admin_room, familiada_admin itd.) – to już jest zrobione.

### 5.2 Kolejność ładowania

1. Admin PWA łączy się z Socket.IO (jeden socket dla shell’a – przełączanie ekranu, welcome_update).
2. Użytkownik klika „Quiz” → tworzony jest iframe z `admin.html`. Admin Quiz łączy się osobnym socketem (lub ten sam serwer, inny socket) i dołącza do `admin_room`.
3. Użytkownik klika „← Powrót” → iframe ukrywany (display:none) lub usuwany.
4. Użytkownik klika „Familiada” → iframe z `familiada/admin.html`. Brak kodu Quizu w pamięci – zero konfliktów.

### 5.3 Współdzielony socket vs osobne

**Opcja A (prostsza):** Shell Admin PWA ma jeden socket. Iframe z panelem admina ma drugi (własny) socket. Oba łączą się z tym samym serwerem. Serwer rozsyła eventy do odpowiednich roomów. Działa.

**Opcja B:** Jeden socket w shellu, panele w iframe komunikują się z parentem przez `postMessage`, a parent emituje do Socket.IO. Więcej pracy, mniej połączeń. Na start – Opcja A.

---

## Część 6: Migracja z obecnego flow

### Obecny flow
- `start.html` na TV – siatka trybów.
- Klik na tryb → overlay z iframe (Screen.html, familiada/screen.html itd.).
- Admin – osobne adresy (admin.html, familiada/admin.html…).

### Nowy flow
- `screen-controller.html` na TV – jeden ekran, stan sterowany z admina.
- Admin PWA – jeden adres, wybór trybu, lazy load panelu.
- Start aplikacji – okno Electron od razu na `screen-controller.html`.

### Zachowanie kompatybilności
- `start.html` – można zostawić jako „tryb klasyczny” (np. w menu Electron: „Otwórz siatkę trybów”) lub usunąć.
- Stare adresy admin.html, familiada/admin.html – nadal działają (używane wewnątrz iframe w Admin PWA).
- Edytor – nadal na komputerze (editor.html, familiada/editor.html itd.). Admin PWA może mieć link „Edytor (otwórz na komputerze)” – `window.open` z URL.

---

## Część 7: Kolejność implementacji

| # | Zadanie | Pliki | Szacunek |
|---|---------|-------|----------|
| 1 | screen-controller.html – szkielet, stany, Socket.IO | public/screen-controller.html | 2–3h |
| 2 | Serwer: screen_switch, welcome_update, screen_join | server.js | 1h |
| 3 | Ekran powitalny – layout, obrazek, tekst | screen-controller.html | 1–2h |
| 4 | admin-pwa.html – shell, lista trybów | public/admin-pwa.html | 2h |
| 5 | Lazy load iframe – wybór trybu → iframe | admin-pwa.html | 1h |
| 6 | Przełączanie ekranu z Admin PWA | admin-pwa.html, server | 0.5h |
| 7 | Ustawienia welcome (tekst, obrazek) w Admin PWA | admin-pwa.html | 1–2h |
| 8 | manifest-admin.json, PWA | public/manifest-admin.json, admin-pwa.html | 0.5h |
| 9 | Electron – domyślny URL screen-controller | electron-main.js | 0.5h |
| 10 | Opcjonalnie: zapis welcome do pliku | server.js | 0.5h |

---

## Część 8: QR i pierwsze połączenie

- Jeden QR na ekranie powitalnym: `http://<IP>:3000/admin-pwa.html` (lub z tunelem).
- Prowadzący skanuje raz, dodaje do ekranu głównego, dalej bez QR.
- Gracze (tylko Quiz) – QR do vote.html jak dotąd (może być pokazywany z poziomu panelu Quiz w Admin PWA).

---

## Podsumowanie

- **Ekran TV** = `screen-controller.html` w pełnym ekranie, sterowany z telefonu.
- **Admin PWA** = jedna aplikacja, lazy loading paneli, brak konfliktów.
- **Ekran powitalny** = spersonalizowany (logo, zdjęcie, tekst).
- **Tryby muzyczne** = ekran wyłączony lub minimalny.
- **Edycja plików** = nadal na komputerze.
