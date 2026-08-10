# Dokumentacja projektu VoteBattle / Imprezja Quiz

Ten folder zawiera dokumentację. Pliki **nie są dołączane do buildu** (electron-builder wyklucza `docs/`).

## Kluczowe pliki

| Plik | Dla kogo | Opis |
|------|----------|------|
| **ADMIN_FAQ.md** | Ty (admin) | Wskazówki techniczne: build, Stripe, WordPress, sieć, Electron |
| **ROUTER_SIECI.md** | Ty | Problemy z siecią i routerem – do dopracowania |
| **FAQ.md** | Gracze, klienci | Najczęściej zadawane pytania (instalacja, licencja, połączenie) |
| **INSTRUKCJA_UZYTKOWNIKA.md** | Gracze | Pełna instrukcja obsługi |
| **PARTY_QUIZ_LLM_INSTRUKCJA.md** | LLM / organizatorzy | Party Quiz: pytania z kartki → JSON (typy, szybka lista, familiada). Kopia: `public/party-quiz/PARTY_QUIZ_LLM_INSTRUKCJA.md` |
| **QUIZ_LLM_INSTRUKCJA.md** | LLM / organizatorzy | Klasyczny quiz telefoniczny: typy pytań, JSON, speedrun. Kopia: `public/QUIZ_LLM_INSTRUKCJA.md` |
| **FAMILIADA_LLM_INSTRUKCJA.md** | LLM / organizatorzy | Familiada: lista pytań z punktami, import tekst/XML. Kopia: `public/familiada/FAMILIADA_LLM_INSTRUKCJA.md` |

## Pozostałe

- **wordpress/** – instrukcje WordPress, cennik, Stripe
- **marketing/** – materiały promocyjne
- **RELEASE_*.md** – notatki do wydań
