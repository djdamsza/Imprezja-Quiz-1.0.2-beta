# automail: jedna oferta do klienta (anty-duplikat)

## Problem

Formularz na stronie (np. potrójny submit, retry) mógł uruchomić workflow **wiele razy** — kilka identycznych maili z ofertą.

Dodatkowo ścieżka **zakresu dat** wcześniej wysyłała **`Code_ListSaturdayCalWindows`** jako **wiele itemów** (jeden na dzień), co przy niektórych wersjach n8n mogło powodować **wielokrotne** przejście do **Resend**.

## Co zrobił workflow (`automail-imap-fixed.json`)

1. **`Code_ListSaturdayCalWindows`** zwraca **jeden** item z tablicą **`range_day_items`** (zamiast N osobnych itemów).
2. **`Code_RollupRangeSaturdays`** czyta **`range_day_items`** z tego jednego itemu — **jedna** agregacja i **jedna** ścieżka do maila.
3. **`Code_BuildSheetRowZapytania`** — w **`$getWorkflowStaticData('global').automailOfferDedup`** zapisuje klucz:  
   `email klienta (lower) | wyslana_akcja | data_od_data_do`  
   Jeśli **ten sam klient** i **te same daty** w ciągu **20 minut** → **`automail_skip_duplicate_offer_send: true`**.
4. **`If_BlockDuplicateOfferSend`** (po **`If_SkipClientOfferResend`**, gałąź „wyślij ofertę”): przy duplikacie idzie do **`NoOp_DuplicateResendSkipped`** zamiast **`If_TerminWolny`** → **bez drugiego Resend**.

Arkusz Google nadal dostaje wiersz przy każdym przebiegu (jeśli dojdziesz do **`Code_BuildSheetRowZapytania`**); pomijany jest tylko **mail do klienta** przy duplikacie w oknie czasu.

## Po imporcie

- Sprawdź połączenia **If_SkipClientOfferResend** → **If_BlockDuplicateOfferSend** → **If_TerminWolny** / **NoOp_DuplicateResendSkipped**.
- W razie potrzeby wyczyść **`automailOfferDedup`** w static data (n8n), żeby zresetować okno anty-duplikatu.

Powiązane: [`N8N_AUTOMAIL_DEDUP_TERMIN.md`](./N8N_AUTOMAIL_DEDUP_TERMIN.md) (dedup Message-ID; bez limitu zapytań o terminy).
