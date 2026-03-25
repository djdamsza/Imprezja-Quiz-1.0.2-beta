# Analiza ulepszeń po testach – propozycje rozwiązań

Po trzydniowych testach aplikacji zidentyfikowano poniższe problemy. Dokument zawiera **tylko analizę i propozycje** – bez implementacji.

---

## 1. Dźwięk niezależnie od minimalizacji / pełnego ekranu

**Problem:** Dźwięk nie gra we wszystkich trybach, gdy aplikacja jest zminimalizowana lub w tle.

**Analiza:**
- Przeglądarki (Chrome, Safari) i Electron mogą ograniczać lub pauzować audio, gdy strona jest niewidoczna (`document.visibilityState === 'hidden'`).
- Tryby muzyczne: Sampler, Whitney, Śpiewaj Dalej, Bitwa Wokalna, Imprezator – dźwięk gra w iframe na ekranie TV.
- W trybie web (PWA) ekran TV może być w osobnej karcie/oknie – gdy użytkownik przełącza się na admina, karta ekranu może być „throttled”.
- W Electronie główne okno ładuje `start.html` – ekran TV to iframe lub osobna strona. Gdy okno jest zminimalizowane, cały proces może być ograniczany.

**Propozycje rozwiązań:**

| Opcja | Opis | Złożoność |
|------|------|-----------|
| **A. Wake Lock** | Rozszerzyć `navigator.wakeLock.request('screen')` na wszystkie strony ekranu (TV, tryby muzyczne). Wake Lock może pomóc w utrzymaniu aktywności, ale nie gwarantuje ciągłego audio. | Niska |
| **B. AudioContext w tle** | Upewnić się, że `AudioContext` nie jest zawieszany – `audioContext.resume()` przy `visibilitychange` i sprawdzenie `audioContext.state`. | Średnia |
| **C. Osobne okno Electron** | Ekran TV w osobnym `BrowserWindow` z `fullscreen: true` na drugim monitorze – system operacyjny rzadziej ogranicza audio w pełnoekranowym oknie. | Średnia |
| **D. Preferencja „Nie przerywaj audio”** | W ustawieniach aplikacji dodać opcję: „Grać dźwięk w tle” – przy włączonej strona ekranu nie będzie pauzowana (np. przez `document.hidden`). | Średnia |

**Rekomendacja:** Zacząć od B (sprawdzenie `AudioContext` w trybach muzycznych) i C (osobne okno na drugim ekranie – patrz punkt 5).

---

## 2. Status połączenia na adminie PWA

**Problem:** Na adminie PWA nie widać, czy serwer jest połączony z telefonem. Potrzebny jest widoczny status, podobny do quizu (RETRY na czerwono przy braku połączenia).

**Analiza:**
- `admin-pwa.html` ma już status: „Połączono” / „Łączenie…” / „Rozłączono” (linie 480–494). Wykrywa `socket.on('connect')`, `disconnect`, `reconnect`.
- Status dotyczy połączenia **admina z serwerem**, nie „serwer ↔ telefon”.
- W quizie (`vote.html`) jest baner `#connection-lost-banner` z przyciskiem „Ponów” – widoczny gdy `socket.disconnected`.

**Propozycje rozwiązań:**

| Opcja | Opis | Złożoność |
|------|------|-----------|
| **A. Rozszerzyć obecny status** | Dodać wyraźnie „Połączono z serwerem” / „Brak połączenia – RETRY” w stylu quizu (czerwony baner, przycisk). | Niska |
| **B. Liczba połączonych telefonów** | Serwer emituje `admin_phone_count` – liczba połączonych telefonów w danym trybie (Quiz, Familiada, Sampler itd.). Admin PWA pokazuje np. „3 telefony połączone” lub „Brak telefonów”. | Średnia |
| **C. Oba** | Status połączenia z serwerem (RETRY) + opcjonalna liczba telefonów. | Średnia |

**Rekomendacja:** A – baner w stylu quizu (czerwony, „Brak połączenia. Ponów”) jest wystarczający. B można dodać później, jeśli będzie potrzebna informacja o liczbie telefonów.

---

## 3. Głośność master i hierarchia na panelu PWA

**Problem:** Potrzebny jest regulator głośności master (np. 50% jako bazowy poziom) oraz podrzędne regulatory dla Samplera, Familiady itd. DZINGIEL w Familiadzie może omijać korekcję głośności.

**Analiza:**
- **Master volume:** PWA ma już `master-volume` (0–100%), serwer ma `masterVolume`. Emitowane: `master_volume`, `master_volume_request`.
- **Familiada:** `familiada/screen.html` ma własny `masterVolume` z localStorage (`familiada_master_vol`), nie używa globalnego `master_volume` z serwera.
- **Dźwięki Familiady:** `audioFiles` (intro, correct, bad, win_round, **jingle**, outro) – wszystkie przechodzą przez `applyVolumes()` i używają `masterVolume`. DZINGIEL (jingle) jest w `audioFiles.jingle` i **jest** uwzględniany w `applyVolumes()`.
- **Różnica:** Familiada używa `familiada_volume` (z admina Familiady), nie `master_volume` z PWA. W PWA nie ma regulacji „master → podrzędne”.

**Propozycje rozwiązań:**

| Opcja | Opis | Złożoność |
|------|------|-----------|
| **A. Master jako mnożnik** | Master = 50% → wszystkie dźwięki × 0.5. Sampler, Familiada, Whitney mają własne suwaki (0–100%) jako mnożnik względem master. Finalna głośność = master × tryb. | Średnia |
| **B. Sprawdzenie DZINGIEL** | Zweryfikować w kodzie, czy `jingle` jest w `applyVolumes()`. Z analizy: **jest** – jeśli problem występuje, może chodzić o brak synchronizacji `familiada_volume` z `master_volume`. | Niska |
| **C. Ujednolicenie** | Familiada (i inne tryby) nasłuchują `master_volume` z serwera. Lokalny suwak w trybie (np. Familiada) to mnożnik względem master. | Średnia |

**Rekomendacja:** B – potwierdzić w logach/runtime, że jingle jest w `applyVolumes()`. Jeśli tak – problem może być w tym, że Familiada nie używa globalnego master. Następnie wdrożyć A/C: master jako bazowy poziom, regulator trybu jako mnożnik.

---

## 4. Powitanie – zdjęcie w złej orientacji (do góry nogami)

**Problem:** Zdjęcie w powitaniu ładuje się w złej orientacji (do góry nogami). Odwrócenie w edytorze na telefonie i ponowne ładowanie nie rozwiązuje problemu.

**Analiza:**
- Zdjęcia z telefonów często mają EXIF Orientation (np. 6 = obrót 90°, 3 = 180°). Przeglądarka może renderować poprawnie, ale `img` bez `image-orientation` lub po zapisaniu do WebP może nie stosować EXIF.
- Serwer: `optimizeImageForScreen()` używa **sharp** lub **jimp**. Sharp domyślnie stosuje orientację EXIF przy `resize`. Jimp **nie** obsługuje EXIF – przy fallbacku obrazek może być nieprawidłowo obrócony.
- **Sharp:** `sharp()` powinien auto-orientować przy `resize`. Warto dodać `.rotate()` (bez argumentu – auto-orient) dla pewności.
- **Jimp:** Nie obsługuje EXIF – przy użyciu jimp obrazek może być obrócony do góry nogami.

**Propozycje rozwiązań:**

| Opcja | Opis | Złożoność |
|------|------|-----------|
| **A. Sharp – auto-orient** | W `optimizeImageForScreen` przed `resize` dodać `.rotate()` (Sharp stosuje auto-orient z EXIF). | Niska |
| **B. ExifImage / sharp metadata** | Jawnie odczytać EXIF orientation i zastosować obrót (np. exif-parser lub sharp metadata). | Średnia |
| **C. Klient – przed uploadem** | Przed wysłaniem na serwer: `createImageBitmap(file, { imageOrientation: 'from-image' })` → narysować na canvas → przekonwertować na blob. Usunięcie EXIF z danych, obrazek już „prosty”. | Średnia |

**Rekomendacja:** A – Sharp ma `.rotate()` bez argumentów, co stosuje orientację z EXIF. Jeśli używany jest jimp, rozważyć B albo przejście na sharp w tym fallbacku.

---

## 5. Wygrywanie na dwóch ekranach – automatyzacja

**Problem:** Aplikacja ma mieć tryb prezentacji na pełnym ekranie na jednym monitorze, a na drugim – edytory admina. Otwieranie na drugim ekranie nie powinno wymagać trafiania w kafelek – ma być zautomatyzowane.

**Analiza:**
- Obecnie: Electron ma jedno okno (`mainWindow`) z `start.html`, które pokazuje kafelki (Quiz, Familiada, Ekran TV itd.). Użytkownik klika kafelek, żeby otworzyć ekran.
- Wymagania: **Monitor 1** – pełny ekran z prezentacją/ekranem TV. **Monitor 2** – admin (edytory).

**Propozycje rozwiązań:**

| Opcja | Opis | Złożoność |
|------|------|-----------|
| **A. Dwa okna Electron** | `mainWindow` – ekran TV na monitorze 1 (fullscreen). `adminWindow` – nowe okno na monitorze 2 z `/admin-pwa.html` lub `/admin.html`. Pozycjonowanie: `screen.setDisplayNearestPoint()` + `screen.getDisplayNearestPoint()`. | Średnia |
| **B. Jedno okno, rozciągnięte** | Jedno okno na 2 monitory – lewa połowa = ekran, prawa = admin. Mało wygodne (różne rozdzielczości). | Niska |
| **C. Ustawienia „Monitor ekranu”** | W ustawieniach wybór: „Ekran TV na monitorze 1, Admin na drugim”. Przy starcie: automatyczne otwarcie okna ekranu na wybranym monitorze w fullscreen. | Średnia |
| **D. Skrót / przycisk** | Przycisk „Ekran na drugim monitorze” – otwiera drugie okno na pełnym ekranie na innym displayu. | Niska |

**Rekomendacja:** A + C – dwa okna Electron: jedno na ekran TV (fullscreen na wybranym monitorze), drugie na admin. Ustawienia zapisują preferowany monitor (np. indeks 0 lub 1). Przy starcie aplikacji automatyczne otwarcie obu okien w odpowiednich miejscach.

**Implementacja (szkic):**
- `electron.screen.getAllDisplays()` – lista monitorów.
- `new BrowserWindow({ ... fullscreen: true })` – okno fullscreen.
- `win.setBounds(display.bounds)` – ustawienie okna na konkretnym monitorze przed `setFullScreen(true)`.
- Opcja w ustawieniach: „Ekran na: Monitor 1 / Monitor 2”.

---

## Podsumowanie priorytetów

| # | Problem | Priorytet | Szacowany nakład |
|---|---------|-----------|------------------|
| 1 | Dźwięk w tle / przy minimalizacji | Średni | 2–4 h |
| 2 | Status połączenia (RETRY) na adminie PWA | Wysoki | 1–2 h |
| 3 | Master volume + hierarchia | Średni | 2–3 h |
| 4 | Orientacja zdjęcia powitania (EXIF) | Wysoki | 1–2 h |
| 5 | Dwa ekrany – automatyzacja | Średni | 3–5 h |

---

*Dokument wygenerowany po analizie kodu. Wersja: 2026-03-15.*
