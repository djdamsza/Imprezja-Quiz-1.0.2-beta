# Motyw ciemny – imprezja.pl

## Instalacja

1. WordPress → **Wygląd** → **Dostosuj**
2. **Dodatkowy CSS** (lub „Dodatkowe style CSS”)
3. Wklej całą zawartość pliku **`imprezja-motyw-ciemny-global.css`**
4. Kliknij **Opublikuj**

## Co zmienia

| Element | Zmiana |
|---------|--------|
| Tło strony | Czarne (#0a0a0a) |
| Tekst | Jasny kremowy (#f5f0e8) |
| Linki | Złoty akcent (#fcb424) |
| Bloki | Ciemnoszare tło (#161616), cienie w odcieniach szarości |
| Zdjęcia | Zaokrąglone rogi, cienie |
| Tabele | Dopasowane do ciemnego tła |
| Formularze | Ciemne pola wejścia |
| Nagłówek / stopka | Czarne tło, subtelne obramowanie |

## Dopasowanie do motywu

Jeśli motyw (np. Blocksy, Kadence) ma własne kolory i nadpisuje style:

- W **Dostosuj** sprawdź, czy motyw ma ustawienia kolorów – wyłącz lub ustaw na ciemne
- Możesz dodać prefiks `body` przed selektorami w pliku CSS, aby zwiększyć specyficzność
- Niektóre bloki mogą wymagać dopisania klas – edytuj `imprezja-motyw-ciemny-global.css` i dodaj selektory dla konkretnych elementów

## Wyłączenie

Usuń zawartość z **Dodatkowy CSS** lub skomentuj bloki w pliku (/* ... */).
