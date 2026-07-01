# NJR Sampler – panel samplera na telefonie

## Opis

NJR Sampler to tryb zabawy w Imprezja Quiz: panel na telefonie/tablecie z kafelkami, które odtwarzają dźwięki na komputerze. Idealne do imprez – DJ lub prowadzący steruje dźwiękami z telefonu.

## Flow

1. **Ekran startowy** → wybierz **NJR Sampler**
2. **Edycja** – skonfiguruj 8 lub 10 kafelków (kolor, opis, emoji/obrazek, dźwięk)
3. **Włącz sampler** – pojawi się QR kod
4. **Telefon** – zeskanuj QR, wybierz kafelek → dźwięk gra na komputerze
5. **Ponowne naciśnięcie** – zatrzymuje dźwięk

## Konfiguracja kafelka

- **Numer** – kafelek 1, 2, 3… (wyświetlane na ekranie)
- **Kolor** – 16 kolorów RGB (paleta)
- **Kolor** – tło kafelka
- **Opis** – tekst (np. „Uśmiech”, „Wybuch”)
- **Ikona** – wybór ze skromnego zbioru emoji (😊, 💥, 🎵, 🥁, 🎤…) lub URL obrazka (ładowany z internetu, nie pobierany na dysk)
- **Dźwięk** – plik MP3/WAV: upload („Upload”) lub wyszukanie w katalogu uploads (pole „Szukaj w uploads…”)

## Wiele konfiguracji

- **Zapisz** – zapisuje do aktualnie wybranej konfiguracji
- **Zapisz jako…** – zapis pod nową nazwą (np. „impreza_urodziny”, „disco”)
- **Wybór konfiguracji** – dropdown na górze; przy uruchamianiu ładowana jest ostatnio używana

## Głośność

- **Suwak 🎮 Gry** — wspólny dla wszystkich gier (Admin PWA lub pasek na dole ekranu Samplera). Reguluje `gamesVolume` (0–100%).
- **Per-kafelek** — w edycji ustaw głośność każdego kafelka (0–100%) → `tileVolume` w payloadzie odtwarzania.
- **Normalizacja** — serwer liczy `normalizedGain` (ffmpeg); klient stosuje wzór przez `music-screen-audio.js`: `tileVolume × gamesVolume × gain` → jeden clamp −3 dB.
- **Odsłuch** — przyciski ▶ / ⏹ przy każdym kafelku w edycji do podglądu dźwięku.

Szczegóły: [GLOSNOSC_NORMALIZACJA_AUTO_GAIN.md](./GLOSNOSC_NORMALIZACJA_AUTO_GAIN.md).

## TŁO MUZYCZNE

Zaznacz checkbox „TŁO MUZYCZNE” przy kafelku, aby:
- Grał do momentu wyłączenia (klik na telefonie) lub końca utworu
- Inne dźwięki (oklaski, efekty) odtwarzają się **na nim** – nie zastępują go

## Niegasnący ekran (Wake Lock)

Dla niegasnącego ekranu na telefonie użyj **HTTPS**:
- tunel Pinggy (LTE) – automatycznie HTTPS
- lub lokalnie: `https://IP:3443/njr-sampler/phone.html`

**Główny ekran:** `/njr-sampler.html` (bez przekierowań – unika ERR_TOO_MANY_REDIRECTS)

## Pliki

- `public/njr-sampler/index.html` – ekran główny (edycja + QR)
- `public/njr-sampler/phone.html` – panel na telefonie
- Konfiguracja: `njr-sampler-config.json` (w katalogu danych)
