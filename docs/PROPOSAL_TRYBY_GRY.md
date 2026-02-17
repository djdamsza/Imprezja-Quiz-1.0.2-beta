# Propozycja: Tryby gry i rozszerzenie o gry bez logowania

## Cel

Dodać nowe typy gry, które **nie wymagają logowania** na telefonach uczestników:
- **Familiada** – drużyny, szybkie odzywanie się (buzzer)
- **Gry muzyczne** – admin puszcza kawałki na telefonie, uczestnicy słuchają (tylko dźwięk + telefon)

Zachować struktury: panel admina, aplikacja, Screen, vote, serwer. **Rozdzielić** widoki/UI per tryb, aby nic się nie rozpadło.

---

## Tryby gry – definicja

| Tryb | Ekran TV | Telefony | Admin | Logowanie na tel. | Opis |
|------|----------|----------|-------|-------------------|------|
| **1. Quiz ekranowy** | ✅ | ✅ | ✅ | **Tak** | Obecny tryb – quiz, głosowanie, statki, muzyka. |
| **2. Ekran + Telefon** | ✅ | ✅ | ✅ | **Tak** | Identyczny jak 1 – można zunifikować. |
| **3. Familiada** | ✅ | ✅ | ✅ (z tel.) | **Nie** | Ekran: tabela pytań. Admin na tel.: punkty, odsłanianie. Gracze: buzzer (offline) lub pola nieb./czerw. w app. |
| **4. Gry muzyczne** | ❌ | ✅ | ✅ | **Nie** | Admin puszcza muzykę, telefony jako odtwarzacze. |

---

## Architektura – rozdzielenie

### 1. Wybór trybu przy starcie

**Dodaj ekran startowy** (np. `/` lub `/mode-select.html`):
- Wybór trybu przed wejściem do admina / gry
- Po wyborze: przekierowanie do odpowiedniego URL

**Alternatywa:** wybór trybu w pierwszym widoku admina (np. zakładki/karty na górze).

### 2. URL-e i routing

| Tryb | URL Admin | URL Telefon | URL Ekran |
|------|-----------|-------------|-----------|
| Quiz ekranowy | `/admin.html` | `/vote.html` | `/Screen.html` |
| Familiada | `/admin.html?mode=phone` | `/vote.html?mode=anon` | `/Screen.html` (tabela) |
| Gry muzyczne | `/admin-music.html` | `/vote-music.html` | – |

**Propozycja minimalna:**  
Zamiast osobnych plików – **jeden plik z parametrem**:
- `/admin.html?mode=quiz` (domyślny)
- `/admin.html?mode=phone`
- `/admin.html?mode=music`
- `/vote.html?mode=anon` – bez logowania
- `/vote.html?mode=music` – odtwarzacz + info

**Zalety:** mniej duplikacji, wspólna logika (socket, style).

### 3. Stan gry na serwerze

**Rozszerzenie `gameState`:**

```javascript
gameState = {
    mode: 'quiz' | 'phone' | 'music',  // NOWE
    // ... reszta bez zmian
}
```

- **Tryb quiz:** obecna logika (players, nick, punkty, pytania).
- **Tryb phone:** brak `players` z nickami; zamiast tego `sessions` (socketId → team, np. A/B).
- **Tryb music:** `currentTrack`, `isPlaying`; telefony synchronizują odtwarzanie.

**Socket.io:** te same kanały (`update_state`, `request_state`), z różną zawartością w zależności od `mode`.

---

## Implementacja krok po kroku

### Faza 1: Fundament (bez rozdzielania plików)

1. **Dodaj `gameState.mode`** – domyślnie `'quiz'`.
2. **Dodaj ekran wyboru trybu** – na `/` lub przed adminem.
3. **Admin:** jeśli `mode !== 'quiz'`, ukryj sekcje nieważne dla danego trybu (np. quiz, ekran TV, tunel).
4. **Zachowaj całą obecną logikę** – tryb `quiz` działa jak dotychczas.

### Faza 2: Tryb „Telefon tylko” (Familiada)

1. **Admin:** `/admin.html?mode=phone`
   - Brak: wyboru quizu, listy pytań, ekranu TV, tunelu.
   - Jest: lista drużyn (A/B), przycisk „Pytanie”, „Kto pierwszy?” (buzzer), ewentualnie proste pytania.

2. **Telefon:** `/vote.html?mode=anon`
   - Brak ekranu logowania.
   - Od razu: wybór drużyny (A/B) + duży przycisk „Buzzer” / „Odzywam się”.
   - Identyfikacja: `socketId` (session) – bez nicka.

3. **Serwer:**
   - `register_anon(socketId, team)` – zapisanie drużyny.
   - `buzzer_pressed(socketId)` – pierwszy naciśnięty = wybrana drużyna.
   - Broadcast: `buzzer_winner` z team/socketId.

4. **Ekran TV:** nieużywany (lub opcjonalny „tryb mirror” – tylko powtórzenie tego, co admin widzi).

### Faza 3: Gry muzyczne

1. **Admin:** `/admin.html?mode=music`
   - Lista utworów (z `/uploads` lub playlisty).
   - Przyciski: Play / Stop / następny / poprzedni.
   - Wybór: odtwarzanie po stronie admina (na serwerze) vs. streaming do telefonów.

2. **Telefon:** `/vote.html?mode=music`
   - Brak logowania.
   - Odtwarzacz audio (HTML5 `<audio>` lub Web Audio API).
   - Serwer wysyła: `{ url: '/uploads/...', currentTime }` – synchronizacja.
   - Opcjonalnie: „Odgadnij wykonawcę” – bez logowania, tylko informacja.

3. **Serwer:**
   - `music_play` / `music_stop` / `music_seek`
   - Broadcast: `music_state` dla wszystkich klientów.

---

## Mapa plików – co zmienić

### Pliki istniejące (bez zmian w logice)

- `server.js` – rozszerzenie `gameState` i `socket.on` per tryb.
- `public/editor.html` – bez zmian (tylko tryb quiz).
- `public/Screen.html` – bez zmian (tylko tryb quiz).
- `electron-main.js` – domyślnie otwiera Screen; tryb phone/music może nie otwierać okna.

### Pliki do modyfikacji

- `public/admin.html` – warunkowe pokazywanie sekcji (if mode === 'quiz').
- `public/vote.html` – warunkowe: logowanie vs. od razu ekran „Buzzer” / „Odtwarzacz”.
- `server.js` – nowe `mode`, `socket.on` dla anon/buzzer/music.

### Pliki do utworzenia (opcjonalnie)

- `public/mode-select.html` – ekran wyboru trybu.
- `public/admin-phone.html` – uproszczony admin (jeśli nie chcemy parametru w `admin.html`).
- `public/vote-anon.html` – uproszczony vote (jeśli nie chcemy parametru).

---

## Zabezpieczenie przed regresją

1. **Domyślny tryb = quiz** – jeśli brak `mode`, zachowanie jak dziś.
2. **Testy:** po każdym kroku uruchomić quiz, vote, Screen – sprawdzić, czy wszystko działa.
3. **Warunki w kodzie:** `if (gameState.mode === 'quiz')` – obecna logika tylko dla quizu.
4. **Separacja:** logika phone/music w osobnych blokach w `server.js`, nie w środku `quiz`.

---

## Przykładowy przepływ – Familiada

Szczegóły: [FAMILIADA_SZCZEGOLY.md](FAMILIADA_SZCZEGOLY.md)

1. Admin otwiera `/admin.html?mode=phone`.
2. Widzi: „Drużyna A / Drużyna B”, „Nowe pytanie”, „Kto pierwszy?”.
3. Uczestnicy otwierają `/vote.html?mode=anon` (bez logowania).
4. Wybierają drużynę (A/B).
5. Admin klika „Kto pierwszy?” – telefony pokazują duży przycisk „Buzzer”.
6. Pierwszy naciśnięty – serwer emituje `buzzer_winner` (team).
7. Admin widzi: „Drużyna A!” – może przejść do odpowiedzi (ręcznie lub w kolejnym rozszerzeniu).

---

## Przykładowy przepływ – Gry muzyczne

1. Admin otwiera `/admin.html?mode=music`.
2. Wybiera playlistę / utwory.
3. Uczestnicy otwierają `/vote.html?mode=music` – odtwarzacz + tytuł.
4. Admin klika Play – serwer wysyła `music_play` z URL.
5. Telefony odtwarzają ten sam plik (z `/uploads`).
6. Opcjonalnie: po zakończeniu – „Odgadnij wykonawcę” (bez logowania, tylko feedback).

---

## Podsumowanie

| Krok | Działanie | Ryzyko |
|------|-----------|--------|
| 1 | Dodaj `gameState.mode`, ekran wyboru trybu | Niskie |
| 2 | Ukryj w adminie sekcje dla trybu ≠ quiz | Niskie |
| 3 | Tryb phone: admin + vote-anon + buzzer | Średnie |
| 4 | Tryb music: admin + vote-music + odtwarzacz | Średnie |

**Zalecenie:** zacząć od Fazy 1 (fundament + mode). Po weryfikacji – Faza 2 (Familiada), potem Faza 3 (muzyka).
