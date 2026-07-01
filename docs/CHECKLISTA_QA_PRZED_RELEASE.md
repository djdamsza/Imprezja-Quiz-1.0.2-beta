# Checklista QA przed wydaniem builda – Imprezja Quiz

**Cel:** upewnić się, że współpraca modułów (serwer, WebSocket, przeglądarki, licencja, sieć) działa, zanim opublikujesz instalatory.

**Kto:** prowadzący / deweloper na **docelowej platformie** (Mac ARM64 / Mac Intel / Windows) + opcjonalnie **telefon w tej samej sieci Wi‑Fi**.

**Narzędzia:** zaznaczaj `[ ]` → `[x]` po wykonaniu. Zapisz datę i wersję z `package.json` w nagłówku sesji.

**Sugestie „co przeklikać” wg aktualnych zmian w git:**  
- `npm run qa:before-build` — krótkie podsumowanie (domyślnie `--short`).
- `npm run qa:before-build:full` — pełniejsza lista plików pogrupowana po typie wpływu.
- `npm run qa:before-build -- --json` — JSON dla skryptów / narzędzi.

(W Cursorze: przy prośbie o build asystent może uruchomić ten skrypt i streścić wynik.)

---

## 0. Przygotowanie sesji

| # | Test | OK |
|---|------|-----|
| 0.1 | Wersja w `package.json` zgodna z planowanym release (np. `1.2.2`). | [ ] |
| 0.2 | `CHANGELOG.md` i ewentualnie `public/poradniki/changelog.html` zaktualizowane. | [ ] |
| 0.3 | **Automatyczny smoke HTTP** (wymaga działającego serwera): `npm run qa:smoke-http` — wszystkie ścieżki ✅. | [ ] |
| 0.4 | `node --check server.js` oraz `node --check electron-main.js` bez błędów. | [ ] |

---

## 1. Start aplikacji i środowisko

| # | Test | OK |
|---|------|-----|
| 1.1 | **Electron:** uruchomienie z pulpitu / `.app` / `.exe` — brak natychmiastowego crasha. | [ ] |
| 1.2 | Otwiera się **`start.html`** (menu trybów), logo i siatka trybów widoczne. | [ ] |
| 1.3 | **Bez Electron:** `npm start` → `http://127.0.0.1:3000/start.html` działa. | [ ] |
| 1.4 | Zębatka ⚙️: menu poradników, link „Co nowego”, modale **Licencja** i **Kontakt** otwierają się i zamykają. | [ ] |
| 1.5 | Przycisk **Sprawdź aktualizacje** — odpowiedź sensowna (brak błędu w konsoli). | [ ] |
| 1.6 | Stop / ponowne uruchomienie — port nie „zawisa” (ew. `npm run kill-port` w dev). | [ ] |

---

## 2. Licencja i trial

| # | Test | OK |
|---|------|-----|
| 2.1 | `/api/license/status` w DevTools → Network zwraca JSON (trial / pełna / wygasła). | [ ] |
| 2.2 | **Trial:** tryby z kłódką (Sampler, Whitney, itd.) → przekierowanie na `license-required.html` lub blokada zgodna z UX. | [ ] |
| 2.3 | **Pełna licencja:** kłódki znikają, wejście w zablokowane tryby działa. | [ ] |
| 2.4 | Aktywacja klucza (jeśli testujesz na czystej maszynie): pole + „Aktywuj” → status się aktualizuje. | [ ] |
| 2.5 | (Dev) `IMPREZJA_SIMULATE_TRIAL=1` i `IMPREZJA_SIMULATE_LICENSE_EXPIRED=1` — zachowanie zgodne z oczekiwaniami. | [ ] |

---

## 3. Imprezja Quiz (rdzeń)

Wzorzec dla każdej sesji: **edytor / admin → ekran TV → telefon (vote)** — synchronizacja stanu.

| # | Test | OK |
|---|------|-----|
| 3.1 | `editor.html` — wczytanie quizu, lista pytań, zapis (lokalny stan bez błędów w konsoli). | [ ] |
| 3.2 | Typy pytań: jednokrotny wybór, wielokrotny, prawda/fałsz, (jeśli używasz) **Wyborczy** — wejście i wyjście z pytania, **audio nie gra w tle** po następnym pytaniu / IDLE. | [ ] |
| 3.3 | **Admin** (`admin.html` / flow z edytora) — start gry, następne pytanie, pauza, ranking, koniec. | [ ] |
| 3.4 | **Ekran TV** (`Screen.html` / ekran główny z kontrolera) — treść zgodna z adminem, bez „zaciętego” starego slajdu. | [ ] |
| 3.5 | **Telefon** `vote.html` / `/join` / `/dolacz` — głosowanie dociera, wyniki się aktualizują. | [ ] |
| 3.6 | **Dwóch graczy** (dwa urządzenia lub dwie karty prywatne) — brak konfliktu sesji. | [ ] |
| 3.7 | Upload obrazka w pytaniu / media z `/uploads/` — podgląd na ekranie i telefonie. | [ ] |
| 3.8 | Eksport / import pakietu quizu (jeśli używasz) — round-trip bez utraty danych. | [ ] |

---

## 4. Admin PWA + ekran główny (współpraca)

| # | Test | OK |
|---|------|-----|
| 4.1 | `admin-pwa.html` / `admin-pwa-qr.html` — połączenie WebSocket: wskaźnik **Połączono** (lub równoważny). | [ ] |
| 4.2 | Po **rozłączeniu Wi‑Fi / przełączeniu karty** — ponowne połączenie lub odświeżenie przywraca stan bez ręcznej naprawy serwera. | [ ] |
| 4.3 | **Panel muzyczny / iframe** — po wejściu w NJR / gry muzyczne kafelki i listy ładują się **bez** wielokrotnego Ctrl+R (regresja cache). | [ ] |
| 4.4 | `screen-controller.html` — przełączanie widoków (quiz, familiada, idle) zgodne z wyborem w PWA. | [ ] |
| 4.5 | **Ekran powitalny** (`welcome-editor.html`) — treść widoczna na TV po wyborze z admina. | [ ] |

---

## 5. Familiada

| # | Test | OK |
|---|------|-----|
| 5.1 | `familiada/editor.html` — import / wybór banku, zapis. | [ ] |
| 5.2 | `familiada/admin.html` — start rundy, pytanie, X / XX / XXX, przekazanie, punkty. | [ ] |
| 5.3 | `familiada/screen.html` — widok dla publiczności zgodny z adminem. | [ ] |
| 5.4 | `familiada/buttons.html` na telefonie — buzzery / stany zgodne z grą. | [ ] |
| 5.5 | **Zakończ grę** z admina — ekran TV: stan idle (np. sam napis FAMILIADA), **bez** starego pilota; brak „wiszącej” muzyki. | [ ] |
| 5.6 | Złota lista Familiada / zapis `golden` — działa po odświeżeniu strony. | [ ] |

### Party Quiz — złota lista (osobny plik)

| # | Test | OK |
|---|------|-----|
| 5.7 | Admin Party Quiz — sekcja złotej listy: pytanie „Alkohol bez litery W” ma **8** odpowiedzi w podglądzie. | [ ] |
| 5.8 | **Uruchom na tablicy** ze złotej listy — TV i panel sterowania pokazują wszystkie odpowiedzi Familiady. | [ ] |
| 5.9 | Po restarcie serwera ze starym `party-quiz-golden.json` w userData (mniej odp.) — auto-sync z `public/`. | [ ] |

Dokumentacja: [PARTY_QUIZ_ZLOTA_LISTA.md](./PARTY_QUIZ_ZLOTA_LISTA.md).

---

## 6. Gry muzyczne (wzorzec: start → stop → telefon)

Dla każdej gry: **edytor**, **start z panelu**, **ekran + dźwięk**, **telefon** (QR / `phone.html`), **stop**, ponowny start.

| # | Moduł | Edytor / konfig | Start/stop | Telefon | OK |
|---|--------|-----------------|------------|---------|-----|
| 6.1 | **NJR Sampler** | `njr-sampler.html?editor=1` | API / panel | `njr-sampler/phone.html` | [ ] |
| 6.2 | **Whitney** | `whitney.html?editor=1` | tak | `whitney/phone.html` | [ ] |
| 6.3 | **Śpiewaj Dalej** | `spiewaj-dalej.html?editor=1` | tak | `spiewaj-dalej/phone.html` | [ ] |
| 6.4 | **Bitwa wokalna** | `bitwa-wokalna.html?editor=1` | tak | `bitwa-wokalna/phone.html` | [ ] |
| 6.5 | **Imprezator** | `imprezator.html?editor=1` | tak | `imprezator/` phone | [ ] |

**Uwagi integracyjne:** pierwsze wejście na telefonie po QR — pełna konfiguracja kafelków; **powrót na kartę** — odświeżenie listy (NJR). Odtwarzanie audio z komputera — właściwe urządzenie wyjściowe.

| # | Test | OK |
|---|------|-----|
| 6.6 | Ten sam plik `.vdjsample` / utwór — **Sampler** vs **Bitwa wokalna** przy suwaku Gry 100%: zbliżona głośność (wspólny `music-screen-audio.js`). | [ ] |
| 6.7 | Zmiana suwaku Gry w trakcie odtwarzania — bez skoku w dół ~−6 dB (brak podwójnego clamp). | [ ] |

---

## 7. Statki Solo

| # | Test | OK |
|---|------|-----|
| 7.1 | `statki-solo/editor.html` — plansza, nagrody, zapis. | [ ] |
| 7.2 | Gra z **Admin PWA** — stany gry na ekranie i w adminie. | [ ] |
| 7.3 | Panel telefonu (`phone-qr` → admin) — zgodność z dokumentacją. | [ ] |

---

## 8. Prezentacja

| # | Test | OK |
|---|------|-----|
| 8.1 | `editor-prezentacja.html` — lista / edycja slajdów. | [ ] |
| 8.2 | `prezentacja-screen.html` (lub odtwarzanie na TV z kontrolera) — nawigacja slajdów. | [ ] |
| 8.3 | Upload pliku do prezentacji (jeśli używasz) — `api/prezentacje/*` bez 500 w konsoli serwera. | [ ] |

---

## 9. Hot or Not Champion (jeśli włączasz w ofercie)

| # | Test | OK |
|---|------|-----|
| 9.1 | `hot-or-not-champion/admin.html`, `screen.html`, `vote.html` — pełny przebieg głosowania. | [ ] |

---

## 10. Sieć, Wi‑Fi, tunel

| # | Test | OK |
|---|------|-----|
| 10.1 | Telefon w **tej samej sieci** co host — `http://IP:3000/vote.html` (lub join) działa. | [ ] |
| 10.2 | `wifi-analyzer.html` — skan lub komunikat błędu kontrolowany (brak białego ekranu). | [ ] |
| 10.3 | **Cloudflared / tunel** (jeśli używasz na produkcji imprezy) — URL zewnętrzny, telefon przez LTE — jedna runda quizu „na sucho”. | [ ] |

---

## 11. Audio i multimedia

| # | Test | OK |
|---|------|-----|
| 11.1 | **Jedno źródło audio** naraz w scenariuszu (quiz + sampler) — brak podwójnego odtwarzania z przeglądarki i aplikacji (patrz dokumentacja konfliktów). | [ ] |
| 11.2 | **Wiele monitorów** — okno ekranu na właściwym displayu, brak czarnego ekranu po przeciągnięciu. | [ ] |
| 11.3 | (Opcjonalnie) **Kamera / stream** — jeśli używasz w pakiecie imprezator / TV. | [ ] |

---

## 12. Build instalatora

| # | Test | OK |
|---|------|-----|
| 12.1 | **Windows:** instalacja, skrót, pierwsze uruchomienie, firewall (zezwól jeśli pyta). | [ ] |
| 12.2 | **Mac:** Gatekeeper / podpis (jeśli niepodpisany — użytkownik wie, jak otworzyć). | [ ] |
| 12.3 | Po instalacji z **czystego** profilu: trial/licencja działa jak w dev. | [ ] |
| 12.4 | Auto-update lub ręczne „Sprawdź aktualizacje” — brak crasha (nawet gdy „brak nowszej wersji”). | [ ] |

---

## 13. Regresje „znane problemy” (szybkie)

| # | Obszar | OK |
|---|--------|-----|
| 13.1 | Admin PWA + iframe muzyki — bez pustych kafelków do momentu ręcznego reload. | [ ] |
| 13.2 | NJR phone — pierwsze połączenie widzi właściwą konfigurację. | [ ] |
| 13.3 | Familiada TV po zakończeniu gry — czysty idle. | [ ] |
| 13.4 | Quiz Wyborczy — brak „latającego” audio po wyjściu z pytania. | [ ] |

---

## Jak zapisywać wyniki

- **Zaliczone / nie:** krótka notatka z datą, wersją builda i OS.
- **Bug:** kroki odtworzenia, który ekran (URL), log z konsoli przeglądarki + terminal/Electron.

---

## Powiązane dokumenty

- `docs/BUILD_TODO_PRZED_RELEASE.md` — ikony, cloudflared, audit.
- `docs/BUILD_WINDOWS_MAC.md` — budowa platform.
- `docs/LUKI_BEZPIECZENSTWA_NPM_AUDIT.md` — `npm audit`.
