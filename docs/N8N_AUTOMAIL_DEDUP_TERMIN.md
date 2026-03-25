# automail: deduplikacja Message-ID

Dotyczy workflowu **`docs/n8n-workflows/automail-imap-fixed.json`**.

## 1. Deduplikacja po Message-ID

- **`PrzykladMaila1`** dopisuje pole **`imap_message_id`** z nagłówka `Message-Id` (lub pól `messageId` z IMAP).
- **`Code_DedupAndTerminGuard`** (zaraz po **`Filter_WP_Formularz`**):
  - normalizuje ID (bez `<`/`>`, lower case),
  - jeśli ID jest **już w** `$getWorkflowStaticData('global').automailDedupTermin.processedMsgIds` i nie minęło **14 dni** → **`return []`** — workflow się nie kontynuuje (brak drugiego wywołania Perplexity itd.),
  - po przejściu zapisuje timestamp pod tym ID.

**Bez Message-ID** (np. ręczny test z **Set_WP_Formularz_Przyklad**) dedup się **nie stosuje** — świadomie, żeby testy działały.

**Uwaga:** jeśli workflow **padnie w połowie**, a ID zostało już zapisane, ponowne pobranie tego samego maila z IMAP może zostać **odrzucone**. W razie potrzeby wyczyść wpis w static data w n8n albo poczekaj 14 dni (TTL).

## 2. Limit „3. zapytania o terminy” — **wyłączony**

Wcześniej workflow liczył maile „o terminy” per **`wp_form_client_email`** i od **3. zapytania** ustawiał **`automail_force_human_termin_flood`** + specjalny mail do DJ. **To zostało usunięte** — ten sam klient może pytać o terminy **dowolną liczbę razy**; pola **`automail_force_human_termin_flood`** i **`automail_termin_flood_dj_note`** są zawsze **`false`** / puste (zachowane dla kompatybilności z **ParseAndRoute** / szablonami).

Stary opis mechanizmu (historia, **`terminByClient`**) — tylko archiwum: nie dotyczy bieżącego JSON workflowu.

## 3. Dostosowanie

- **TTL Message-ID:** w kodzie `MSG_ID_TTL_MS` (domyślnie 14 dni).

## 4. Import do n8n

Po imporcie JSON sprawdź, że połączenia to:

`Filter_WP_Formularz` → **`Code_DedupAndTerminGuard`** → **`Perplexity_Analyze`**.

## 5. „Workflow się zatrzymuje” / brak danych po Dedup — co sprawdzić

| Objaw | Przyczyna | Co zrobić |
|--------|-----------|-----------|
| **`Code_DedupAndTerminGuard`**: sukces, **brak outputu** | Node zwrócił **`[]`** (to nie jest błąd JS) | Zobacz poniżej: filtr vs Message-ID. |
| **`Filter_WP_Formularz`**: *no items* do Dedup | Mail **nie spełnia** warunków „formularz WP” | Sprawdź temat/treść vs lista w kodzie **`Filter_WP_Formularz`** (SUBJECT / BODY_FINGERPRINTS). |
| Dedup z **wejściem 1 item**, potem pusto | **Ten sam `Message-ID`** co wcześniej (14 dni) | W n8n: **Workflow → … → Clear static data** albo usuń wpis w **`automailDedupTermin.processedMsgIds`**. Albo na **test** ustaw **`AUTOMAIL_DISABLE_MESSAGE_ID_DEDUP=1`** (wyłącza tylko blokadę po Message-ID; **nie** zostawiaj na produkcji bez przemyślenia). |

## 6. Powiązane

- **`N8N_AUTOMAIL_DUPLICATE_RESEND.md`** — dedup przy ponownej wysyłce oferty do klienta (osobny temat).
