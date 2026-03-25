# SEO — Imprezja Quiz (strona produktu WooCommerce)

Skopiuj wartości do **Rank Math / Yoast / własnych pól meta** oraz do **krótkiego opisu produktu** w WooCommerce.

---

## Frazy kluczowe (PL)

| Typ | Fraza |
|-----|--------|
| **Główna (focus)** | `system do prowadzenia imprez` lub `quiz na wesele z telefonem` |
| **Pomocnicze** | imprezja quiz, familiada na imprezie, quiz dla DJ, głosowanie telefonem WiFi, quiz offline LAN, sampler na wesele, prezentacja na ekranie wesele |

---

## Title (tag `<title>`) — warianty (~50–60 znaków)

Wybierz jeden; nie duplikuj z meta description.

1. **Imprezja Quiz — system zabawy: quiz, Familiada, muzyka | 14 dni trial** *(58 zn.)*
2. **Quiz na wesele i imprezę z telefonem — Imprezja Quiz | LAN, offline** *(56 zn.)*
3. **Imprezja Quiz: Familiada, sampler, prezentacja na TV dla DJ-a** *(54 zn.)*

---

## Meta description — warianty (~150–160 znaków)

1. **Jedna aplikacja zamiast wielu narzędzi:** quiz i głosowanie na telefonach, Familiada, gry muzyczne, statki, prezentacja i wizualizacje na TV. Działa w sieci lokalnej bez internetu. **14 dni trial** — testujesz quiz bez licencji. Windows i Mac. *(159 zn.)*

2. Prowadzisz wesele lub event? **Imprezja Quiz** łączy quiz, Familiadę, sampler i ekran dla gości. Goście grają w przeglądarce — QR, bez aplikacji. Offline w WiFi. Pełna licencja odblokowuje muzykę i Familiadę. *(158 zn.)*

3. **System do prowadzenia zabawy na żywo** dla DJ-a i wodzireja: quiz z wieloma typami pytań, Familiada z importem pytań, NJR Sampler, śpiewaj dalej, statki, odliczanie, logo na ekranie. Trial 14 dni. *(155 zn.)*

---

## Krótki opis produktu (WooCommerce „Krótki opis”)

*Czysty tekst lub 1 akapit HTML — często widoczny nad przyciskiem „Dodaj do koszyka” i w listingach.*

**Wersja tekstowa:**

> Imprezja to **kompletny system do prowadzenia imprezy** z jednego komputera: quiz i głosowanie na telefonach gości (bez instalacji aplikacji), Familiada, gry muzyczne z samplerem, statki z nagrodami, prezentacja i wizualizacje na TV. **Działa offline w sieci lokalnej**; opcjonalnie tunel dla gości na LTE. **14 dni trial** — pełny quiz bez licencji; licencja odblokowuje Familiadę, muzykę i rozszerzony ekran. Windows 10/11 i macOS.

**Wersja HTML (opcjonalnie):**

```html
<p><strong>Imprezja Quiz</strong> — system do prowadzenia zabawy na żywo: quiz i głosowanie na telefonach (QR, bez aplikacji), Familiada, sampler, gry muzyczne, statki, prezentacja i wizualizacje na TV. <strong>Offline w LAN</strong>; trial <strong>14 dni</strong>. Windows i Mac.</p>
```

---

## Open Graph (Facebook / LinkedIn) — Rank Math / Yoast

| Pole | Wartość |
|------|---------|
| **og:title** | Imprezja Quiz — quiz, Familiada, muzyka i ekran na imprezę |
| **og:description** | Jedna aplikacja dla DJ-a: quiz na telefony, Familiada, NJR Sampler, prezentacja na TV. Działa w WiFi bez internetu. 14 dni trial. |
| **og:type** | product (jeśli dostępne) lub website |

*Obraz `og:image`:* miniatura 1200×630 px (np. grafika z telefonem + napis „Rewolucja w prowadzeniu imprez”).

---

## Twitter Card

| Pole | Wartość |
|------|---------|
| **twitter:title** | Imprezja Quiz — system zabawy na wesele i event |
| **twitter:description** | Quiz + Familiada + muzyka + TV. Goście grają w przeglądarce. Trial 14 dni. |

---

## H1 na stronie (spójność z SEO)

Obecny H1 w szablonie: *„Imprezja Quiz – 14 dni bezpłatnych testów!”* — OK pod **CTR i trial**.

**Alternatywa pod frazę „system na imprezę”:**  
`Imprezja Quiz — system do prowadzenia imprezy: quiz, Familiada i ekran na TV`  
*(Zostaw jeden główny H1 — nie dubluj dwoma stylami na jednej stronie.)*

---

## Slug URL (jeśli tworzysz nową stronę)

Propozycje krótkie, po polsku lub angielsku wg sklepu:

- `imprezja-quiz-system-imprezy`
- `quiz-na-wesele-telefony-wifi`

*Nie zmieniaj slugów istniejącej strony bez przekierowań 301.*

---

## Fragmenty FAQ (pod rich results / treść na dole strony)

Możesz wkleić jako akordeon lub skonfigurować w pluginie FAQ Schema:

**Pytanie 1:** Czy Imprezja działa bez internetu?  
**Odpowiedź:** Tak. Pełna rozgrywka działa w **sieci lokalnej WiFi** między Twoim komputerem a telefonami gości. Opcjonalnie możesz włączyć **tunel**, gdy część gości jest na LTE.

**Pytanie 2:** Czy goście muszą instalować aplikację?  
**Odpowiedź:** Nie. Wchodzą w grę przez **przeglądarkę** na smartfonie — zwykle po zeskanowaniu kodu QR.

**Pytanie 3:** Co jest w trialu, a co po licencji?  
**Odpowiedź:** W **14-dniowym trialu** testujesz w pełni **quiz z głosowaniem**. **Pełna licencja** odblokowuje m.in. Familiadę, Statki, gry muzyczne (sampler, śpiewaj dalej, bitwa wokalna itd.) i rozszerzone moduły na ekranie oraz PWA admina.

---

## JSON-LD `SoftwareApplication` (opcjonalnie — wklej przez wtyczkę „Custom HTML” w stopce produktu lub filtr `wp_head`)

Sprawdź, czy wtyczka SEO już nie dodaje `Product` — unikaj duplikacji typu `Product` + `SoftwareApplication` na tej samej URL bez konsultacji.

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Imprezja Quiz",
  "applicationCategory": "GameApplication",
  "operatingSystem": "Windows 10, Windows 11, macOS",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "PLN",
    "availability": "https://schema.org/InStock",
    "description": "Subskrypcja lub licencja jednorazowa / dożywotnia — zgodnie z cennikiem na stronie."
  },
  "description": "System do prowadzenia imprez: quiz i głosowanie na telefonach, Familiada, gry muzyczne, prezentacja i wizualizacje na ekranie. Działa offline w sieci lokalnej.",
  "author": {
    "@type": "Person",
    "name": "Damian Nowaczyk"
  }
}
```

*Ceny w `offers` możesz zaktualizować do konkretnej oferty (np. 30 PLN), jeśli chcesz precyzyjny snippet cenowy.*

---

## Checklist przed publikacją

- [ ] Title i meta description **nie powtarzają się słowo w słowo**.
- [ ] Jeden wyraźny **H1** na stronie produktu.
- [ ] **Obraz wyróżniający** produktu: min. 1200 px szerokości, sensowny `alt` (np. „Imprezja Quiz — quiz na telefony na wesele”).
- [ ] Linki wewnętrzne: FAQ, regulamin, pobieranie — działające.
- [ ] **Canonical** na właściwą wersję URL (www vs bez www, https).

---

*Plik pomocniczy do `imprezja-quiz-produkt-pelna-tresc.html`. Aktualizuj przy zmianie cennika lub głównej obietnicy produktu.*
