# Poprawki (Imprezja Quiz)

Lista wprowadzonych poprawek bez nowego builda.

## Zrobione (bez builda)

- **Panel admin na telefonie** – start zawsze od sekcji **Administracyjne** (nie Rozgrywka). Na urządzeniach uznanych za telefon (szerokość &lt; 768 px lub touch + &lt; 1024 px) przy pierwszym załadowaniu pokazywana jest sekcja Admin, niezależnie od zapisanego w localStorage stanu.
- **Przejście START → Rozgrywka** – po naciśnięciu „START – przejdź do rozgrywki” strona przewija się **na górę** (`window.scrollTo(0, 0)`), żeby od razu widać było początek sekcji Rozgrywka.

- **Familiada – ekran końcowy z muzyką** – wyświetlane są wyniki i nazwy drużyn; jeśli serwer nie prześle `team1`/`team2`, używane są wartości z ekranu (np. `#team-name-1`, `#score-1`).
- **Gry muzyczne w buildzie** – przy pierwszym uruchomieniu aplikacja kopiuje z zasobów aplikacji do `userData/uploads` wszystkie pliki audio wskazane w domyślnych configach (NJR Sampler / Whitney, Śpiewaj Dalej, Bitwa wokalna). Dzięki temu banki (Whitney, Prank Nerd itd.) mają od razu działające pliki; w buildzie muszą być zawarte pliki z `public/uploads` referencjonowane w tych configach (nie wykluczać ich w `package.json`).

---
*Ostatnia aktualizacja: ekran końcowy Familiady (wyniki/drużyny), import plików audio do banków w buildzie.*
