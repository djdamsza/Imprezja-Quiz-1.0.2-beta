# Indeks dokumentacji — Imprezja Quiz (VoteBattle)

Repozytorium zawiera **pełną aplikację** (Electron + Node + `public/`) oraz dokumentację w `docs/`.

---

## Start

| Plik | Opis |
|------|------|
| [README.md](../README.md) | Pobieranie, dev (`npm start`), QA |
| [CHANGELOG.md](../CHANGELOG.md) | Historia wydań + sekcja **[Niewydane]** |
| [PRE_RELEASE_CHECKLIST.md](../PRE_RELEASE_CHECKLIST.md) | Skrócona checklista przed buildem |

---

## Tryby gry i funkcje

| Dokument | Temat |
|----------|--------|
| [party-quiz-plan.md](./party-quiz-plan.md) | Plan architektury Party Quiz (hybryda Quiz + Familiada) |
| [PARTY_QUIZ_ZLOTA_LISTA.md](./PARTY_QUIZ_ZLOTA_LISTA.md) | Złota lista Party (`party-quiz-golden.json`), sync, API |
| [FAMILIADA_SZCZEGOLY.md](./FAMILIADA_SZCZEGOLY.md) | Tryb Familiada |
| [NJR_SAMPLER.md](./NJR_SAMPLER.md) | NJR Sampler — flow, kafelki, głośność |
| [GLOSNOSC_NORMALIZACJA_AUTO_GAIN.md](./GLOSNOSC_NORMALIZACJA_AUTO_GAIN.md) | Normalizacja audio, `music-screen-audio.js` |
| [AUDIO_KONFLIKTY_PRZEGLADARKA_VS_APLIKACJA.md](./AUDIO_KONFLIKTY_PRZEGLADARKA_VS_APLIKACJA.md) | Stop/start między grami, Electron vs przeglądarka |
| [INSTRUKCJA_UZYTKOWNIKA.md](./INSTRUKCJA_UZYTKOWNIKA.md) | Instrukcja użytkownika |
| [FAQ.md](./FAQ.md) | FAQ |

---

## Build, release, QA

| Dokument | Temat |
|----------|--------|
| [CHECKLISTA_QA_PRZED_RELEASE.md](./CHECKLISTA_QA_PRZED_RELEASE.md) | Checklista manualna przed release |
| [BUILD_WINDOWS_MAC.md](./BUILD_WINDOWS_MAC.md) | Build Windows / macOS |
| [GITHUB_RELEASES_INSTRUKCJA.md](./GITHUB_RELEASES_INSTRUKCJA.md) | Publikacja na GitHub Releases |
| [AUTO_UPDATE.md](./AUTO_UPDATE.md) | Auto-update w aplikacji |

---

## WordPress / sklep

| Dokument | Temat |
|----------|--------|
| [wordpress/LINKI-1.2.7-WORDPRESS.md](./wordpress/LINKI-1.2.7-WORDPRESS.md) | Linki pobierania i opis v1.2.7 |
| [wordpress/INSTRUKCJA_PRODUKT_IMPREZJA_QUIZ.md](./wordpress/INSTRUKCJA_PRODUKT_IMPREZJA_QUIZ.md) | Strona produktu |

---

## Kluczowe ścieżki kodu (wyszukiwanie)

| Tag / ścieżka | Znaczenie |
|---------------|-----------|
| `server.js` → `// === Party Quiz ===` | Backend Party Quiz |
| `party-quiz-golden.json` | Złota lista Party (osobno od Familiady) |
| `public/lib/music-screen-audio.js` | Wspólna głośność Sampler / Whitney / Śpiewaj / Bitwa |
| `buildMusicScreenPlayPayload` | Payload odtwarzania z serwera |
| `broadcastEffectiveVolumes` | Broadcast suwaków Gry / Imprezator |
| `gameMode === 'party'` | Tryb Party na TV i serwerze |

---

*Ostatnia aktualizacja indeksu: czerwiec 2026.*
