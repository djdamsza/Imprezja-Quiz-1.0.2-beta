. A AD# Propozycje wygodniejszej współpracy z adminem

> **Szczegółowy plan PWA + zunifikowany ekran:** [PLAN_PWA_ADMIN_EKRAN.md](PLAN_PWA_ADMIN_EKRAN.md)  
> **Plan systemu prezentacji (tablice, zdjęcia, filmy):** [PLAN_SYSTEM_PREZENTACJI.md](PLAN_SYSTEM_PREZENTACJI.md)

## Obecny stan

- **Ekran startowy** (`start.html`) – siatka trybów na TV, każdy tryb otwiera się w overlay (iframe).
- **Admin** – każdy tryb ma osobny panel:
  - Quiz: `admin.html`
  - Familiada: `familiada/admin.html`
  - Statki Solo: `statki-solo/admin.html`
  - Bitwa Wokalna, NJR Sampler, Śpiewaj Dalej, Whitney, Imprezator: każdy ma własny flow (index.html → admin/editor/start).
- **QR** – osobne kody dla każdego trybu (admin, gracze, WiFi, tunel).
- **Połączenie** – każda strona łączy się z Socket.IO osobno; przełączenie trybu = nowa strona = nowe połączenie.

---

## Propozycja 1: Jeden QR „Admin Hub” – przełączanie trybów bez odświeżania

### Idea

Nowa strona **`/admin-hub.html`** – jeden adres dla admina na telefonie. Po zeskanowaniu jednego QR użytkownik widzi listę trybów i wybiera, który panel admina otworzyć.

### Działanie

1. **Jeden QR** prowadzi do `http://<IP>:3000/admin-hub.html` (lub z tunelem).
2. Na stronie: przyciski/kafelki: **Quiz** | **Familiada** | **Statki** | **Bitwa** | **Sampler** | **Śpiewaj** | **Whitney** | **Imprezator**.
3. Po kliknięciu – panel admina danego trybu ładuje się w **iframe** (lub w tym samym oknie jako SPA).
4. **Nawigacja** – przycisk „← Powrót” wraca do listy trybów bez przeładowania całej strony.
5. **Połączenie** – każdy iframe ma własne Socket.IO (do swojego pokoju), ale strona huba się nie przeładowuje, więc użytkownik nie traci kontekstu.

### Zalety

- Jeden QR do zapamiętania / wydrukowania.
- Szybkie przełączanie między trybami (np. Quiz → Familiada) bez wpisywania adresów.
- Możliwość dodania sekcji wspólnej (np. QR WiFi, tunel) na poziomie huba.

### Wymagane zmiany

- Nowy plik `public/admin-hub.html`.
- W `start.html` lub w każdym trybie – opcja „Pokaż QR Admin Hub” zamiast/obok obecnych QR.
- Serwer: ewentualnie endpoint `/api/admin-hub-url` zwracający aktualny adres (IP/tunel) do QR.

---

## Propozycja 2: Jeden QR „Dołącz” – wybór roli i trybu

### Idea

Strona **`/join.html`** – jeden punkt wejścia dla wszystkich (gracze i prowadzący). Po zeskanowaniu użytkownik wybiera, czy jest graczem, czy adminem, i w którym trybie uczestniczy.

### Działanie

1. **Jeden QR** prowadzi do `http://<IP>:3000/join.html`.
2. Ekran wyboru:
   - **Jestem prowadzącym** → przekierowanie do `/admin-hub.html` (Propozycja 1).
   - **Jestem graczem** → lista trybów: Quiz | Familiada | Bitwa | Sampler | … → przekierowanie do `vote.html`, `familiada/buttons.html`, `bitwa-wokalna/phone.html` itd.
3. Opcjonalnie: wykrywanie „aktywnego trybu” – serwer pamięta, który tryb jest aktualnie na ekranie, i domyślnie podświetla ten tryb (np. „Teraz gra: Quiz”).

### Zalety

- Jeden QR dla wszystkich – gracze i prowadzący.
- Mniej zamieszania na imprezie – „zeskanuj ten kod” zamiast kilku różnych.
- Możliwość dodania krótkiej instrukcji na stronie (np. „Połącz się z WiFi”).

### Wymagane zmiany

- Nowy plik `public/join.html`.
- Serwer: opcjonalnie event `active_mode` – ekran startowy wysyła, który tryb jest aktywny.
- W trybach (Screen, familiada/screen itd.) – emit przy przełączeniu trybu.

---

## Propozycja 3: PWA „Admin na telefonie” – aplikacja z ekranu głównego

### Idea

Strona Admin Hub jako **Progressive Web App** – użytkownik dodaje ją do ekranu głównego i korzysta jak z aplikacji.

### Działanie

1. `manifest.json` – nowa wersja z `start_url: "/admin-hub.html"` (lub osobny `admin-hub-manifest.json`).
2. Na `/admin-hub.html` – prompt „Dodaj do ekranu głównego” (np. przy pierwszej wizycie na telefonie).
3. Po dodaniu – ikona na pulpicie, uruchomienie w trybie standalone (bez paska przeglądarki).
4. Service Worker (`sw.js`) – cache stron admin-hub i powiązanych zasobów dla szybszego startu offline.

### Zalety

- Szybki dostęp – jedna ikona zamiast wpisywania adresu.
- Wrażenie „prawdziwej” aplikacji.
- Możliwość lepszej pracy offline (cache paneli admina).

### Wymagane zmiany

- Rozszerzenie `manifest.json` lub nowy manifest dla admin-hub.
- Aktualizacja `sw.js` – cache dla admin-hub.
- Opcjonalnie: banner „Dodaj do ekranu” na admin-hub.

---

## Propozycja 4: Wspólna sekcja „Sieć i QR” w Admin Hub

### Idea

Admin Hub nie tylko przełącza tryby – zawiera też wspólną sekcję dla wszystkich trybów: WiFi, tunel, QR do gry.

### Działanie

1. Na górze Admin Hub (lub w osobnym panelu): **Generator QR WiFi**, **QR sieci lokalnej**, **Uruchom tunel**.
2. Te same funkcje co w `admin.html` (Quiz), ale dostępne niezależnie od wybranego trybu.
3. Prowadzący może: włączyć tunel, wygenerować QR WiFi, a potem przełączyć się na panel Bitwy czy Familiady – bez wracania do quizu.

### Zalety

- Jedno miejsce do konfiguracji sieci – nie trzeba wchodzić w Quiz, żeby włączyć tunel.
- Spójne UX – „najpierw sieć, potem gra”.

### Wymagane zmiany

- Logika z `admin.html` (QR WiFi, tunel, local QR) przeniesiona do współdzielonego modułu lub API.
- Admin Hub wywołuje te same endpointy / Socket.IO events co admin Quizu.

---

## Propozycja 5: Utrzymanie połączenia przy przełączaniu trybów

### Problem

Obecnie: każda strona admina łączy się z Socket.IO osobno. Przełączenie z Quizu na Familiadę = nowa strona = nowe połączenie. Socket.IO ma automatyczne reconnect, więc nie jest to krytyczne, ale może powodować krótkie „mignięcia” i ponowne logowanie.

### Rozwiązanie A: iframe w Admin Hub

Admin Hub ładuje panele w iframe. Każdy iframe ma własne połączenie Socket.IO – to normalne. Hub się nie przeładowuje, więc użytkownik nie „gubi” kontekstu. Połączenia w iframe są niezależne – to akceptowalne.

### Rozwiązanie B: współdzielony Socket w SharedWorker (zaawansowane)

Teoretycznie można by użyć SharedWorker do jednego połączenia Socket.IO współdzielonego między zakładkami/iframe. To skomplikowane i może nie być wspierane wszędzie – **nie rekomendowane** na start.

### Rozwiązanie C: SPA z jednym Socket

Zamiast iframe – jeden dokument, komponenty Vue/React lub zwykły JS przełączający widoki. Jedno połączenie Socket.IO, przełączanie „pokoju” (room) w zależności od trybu. Wymaga większej refaktoryzacji – **możliwe w dłuższej perspektywie**.

---

## Rekomendowana kolejność wdrożenia

| Krok | Propozycja | Nakład pracy | Wpływ |
|------|------------|--------------|-------|
| 1 | **Admin Hub** (Propozycja 1) | Średni | Jeden QR admin, przełączanie trybów |
| 2 | **Wspólna sekcja sieci** (Propozycja 4) | Średni | WiFi/tunel w jednym miejscu |
| 3 | **Join** (Propozycja 2) | Mały | Jeden QR dla wszystkich |
| 4 | **PWA** (Propozycja 3) | Mały | Aplikacja na ekran główny |

---

## Schemat przepływu (po wdrożeniu)

```
                    ┌─────────────────────────────────────────┐
                    │           Jeden QR na ekranie           │
                    │         /join.html (lub /admin-hub)     │
                    └─────────────────────┬───────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │                                             │
            ┌───────▼────────┐                         ┌──────────▼─────────┐
            │ Jestem graczem  │                         │ Jestem prowadzącym │
            └───────┬────────┘                         └──────────┬─────────┘
                    │                                              │
        ┌───────────┼───────────┐                      ┌───────────▼───────────┐
        │           │           │                      │     Admin Hub         │
        ▼           ▼           ▼                      │  • QR WiFi            │
   Quiz      Familiada   Bitwa ...                     │  • Tunel              │
   vote      buttons     phone                         │  • Wybór trybu        │
                                                       └───────────┬───────────┘
                                                                   │
                                        ┌──────────────────────────┼──────────────────────────┐
                                        ▼              ▼           ▼              ▼            ▼
                                    Quiz Admin   Familiada   Statki   Bitwa   Sampler ...
```

---

## Uwagi techniczne

- **Socket.IO** – każdy tryb używa własnego room/namespace. Admin Hub z iframe nie zmienia tego – iframe ładuje istniejące strony admina, które same się łączą.
- **Tunel** – adres tunelu jest generowany przez serwer. Admin Hub może pobierać go z `/api/tunnel/url` lub przez Socket.IO (jeśli tak jest zaimplementowane).
- **Licencja** – tryby wymagające licencji (Sampler, Bitwa, itd.) – sprawdzanie w Admin Hub przed pokazaniem przycisku (fetch `/api/license/status`).
