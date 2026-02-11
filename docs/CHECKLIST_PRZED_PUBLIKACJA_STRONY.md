# Checklist przed publikacją Imprezja Quiz na stronie internetowej

Lista rzeczy do zrobienia przed wrzuceniem produktu na stronę sprzedażową / informacyjną.

---

## 1. Dokumenty prawne (ważne przy sprzedaży)

| Element | Status | Uwagi |
|---------|--------|-------|
| **Regulamin sklepu / sprzedaży** | ❓ | Określa zasady zakupu, zwrotów, reklamacji. Wymagany przy sprzedaży online. |
| **Polityka prywatności** | ❓ | Wymagana przy zbieraniu danych (np. e-mail przy zakupie, Machine ID). RODO dla UE. |
| **Polityka plików cookies** | ❓ | Jeśli strona używa cookies (np. analityka). |
| **Licencja oprogramowania (EULA)** | ❓ | Co użytkownik może / nie może robić z programem. Zakres licencji (dożywotnia, 1 urządzenie itp.). |

---

## 2. Treści na stronie

| Element | Status | Uwagi |
|---------|--------|-------|
| **Opis produktu** | ✅ | `docs/OPIS_SKLEP_INTERNETOWY.md` – gotowy |
| **Instrukcja użytkownika** | ✅ | `docs/INSTRUKCJA_UZYTKOWNIKA.md` – do pobrania lub link |
| **FAQ** | ❓ | Częste pytania: wymagania, instalacja, trial, licencja |
| **Cennik** | ❓ | Cena trial/dożywotnia/subskrypcja |
| **Dane kontaktowe** | ❓ | E-mail, formularz – do zamówienia licencji, wsparcia |

---

## 3. Materiały graficzne / marketingowe

| Element | Status | Uwagi |
|---------|--------|-------|
| **Zrzuty ekranu** | ❓ | Ekran TV, panel admina, głosowanie – kilka reprezentatywnych |
| **Ikona / logo produktu** | ❓ | Spójna z brandingiem Imprezja Quiz |
| **Film demonstracyjny (opcjonalnie)** | ❓ | Krótkie demo: instalacja → quiz → gracze na telefonach |
| **GIF / animacja** | ❓ | Do social media lub strony |

---

## 4. Pobieranie i dystrybucja

| Element | Status | Uwagi |
|---------|--------|-------|
| **Pliki do pobrania** | ❓ | `Imprezja Quiz Setup x.x.x.exe` (Windows), `Imprezja Quiz-x.x.x-arm64.dmg` (Mac) |
| **Wersja portable (Windows)** | ❓ | Dla użytkowników bez uprawnień admina |
| **Hosting plików** | ❓ | Gdzie trzymać pliki – własny serwer, CDN, Sklep |
| **Link do pobrania trial** | ❓ | Jak użytkownik pobiera wersję testową (14 dni) |

---

## 5. Proces zakupu i licencji

| Element | Status | Uwagi |
|---------|--------|-------|
| **Sklep / płatność** | ❓ | Integracja: Stripe, Przelewy24, PayPal, WooCommerce |
| **Wysyłka klucza** | ❓ | Automatyczna po zakupie (e-mail) czy ręcznie |
| **Generator kluczy** | ✅ | `node scripts/generate-license-key.js` |
| **Zbieranie Machine ID** | ✅ | Pokazywane w aplikacji przy braku licencji |

---

## 6. Techniczne – ostatnie szlify

| Element | Status | Uwagi |
|---------|--------|-------|
| **Build Windows** | ❓ | `npm run build:win` – zweryfikuj |
| **Build Mac** | ❓ | `npm run build:mac:universal` – zweryfikuj |
| **Manifest PWA** | ⚠️ | `public/manifest.json` – nazwa nadal „VoteBattle”, zmień na „Imprezja Quiz” |
| **Wyświetlanie wersji** | ❓ | Czy użytkownik widzi wersję w aplikacji (np. w panelu admina)? |
| **Test na czystej maszynie** | ❓ | Instalacja i uruchomienie na komputerze bez wcześniejszej wersji |

---

## 7. SEO i meta

| Element | Status | Uwagi |
|---------|--------|-------|
| **Meta description** | ❓ | Krótki opis strony (do ~160 znaków) |
| **Słowa kluczowe** | ❓ | quiz na imprezę, DJ, wesela, głosowanie, etc. |
| **Open Graph / social** | ❓ | Obrazki i opisy do udostępniania |

---

## 8. Obsługa klienta

| Element | Status | Uwagi |
|---------|--------|-------|
| **Informacja o wsparciu** | ❓ | Jak kontaktować się w razie problemów |
| **Czas odpowiedzi** | ❓ | Komunikat typu „Odpowiadamy w ciągu 24–48 h” |
| **Raport błędów** | ✅ | W panelu admina – wysyłka e-mailem |

---

## Skrót – minimum do startu

1. **Opis produktu** – masz w `OPIS_SKLEP_INTERNETOWY.md`
2. **Instrukcja** – masz w `INSTRUKCJA_UZYTKOWNIKA.md`
3. **Build** – zbuduj wersje Win + Mac (lub wybrane)
4. ** regulamin / polityka** – minimum: regulamin sprzedaży, polityka prywatności (jeśli zbierasz dane)
5. **Cennik i kontakt** – jasne na stronie
6. **Pliki do pobrania** – hostowane, linki działają
7. **Manifest** – zmień VoteBattle → Imprezja Quiz

---

*Dokument pomocniczy – dostosuj do własnych potrzeb.*
