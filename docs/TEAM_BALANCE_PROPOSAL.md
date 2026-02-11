# Propozycje wyrównywania drużyn w trybie drużynowym

## Problem
Gdy drużyny są bardzo nierówne (np. 21 vs 7 graczy), mniejsza drużyna ma małe szanse na wygraną.

## Proponowane rozwiązania

### Opcja 1: Automatyczne balansowanie przy dołączaniu (najprostsze)
**Jak działa:**
- Nowy gracz zawsze dołącza do **mniejszej** drużyny (lub losowo jeśli są równe).
- Jeśli różnica > 3 graczy, większa drużyna **nie przyjmuje** nowych graczy dopóki się nie wyrówna.

**Plusy:** Proste, automatyczne, gracze nie muszą nic robić.  
**Minusy:** Może być frustrujące dla graczy którzy chcą być w konkretnej drużynie.

---

### Opcja 2: Mnożnik punktów dla mniejszej drużyny (zalecane)
**Jak działa:**
- Gdy różnica w liczbie graczy ≥ 2, mniejsza drużyna dostaje **mnożnik punktów**:
  - Różnica 2-3 graczy: **1.5x** punktów
  - Różnica 4-6 graczy: **2x** punktów  
  - Różnica 7+ graczy: **3x** punktów
- Mnożnik widoczny na ekranie (np. "Drużyna B (7) ×2").
- Admin może włączyć/wyłączyć mnożnik w panelu.

**Plusy:** Sprawiedliwe, gracze widzą że jest wyrównanie, można wyłączyć.  
**Minusy:** Wymaga obliczeń przy każdym przyznaniu punktów.

---

### Opcja 3: Limit dołączania + mnożnik (hybrydowe)
**Jak działa:**
- Kombinacja Opcji 1 i 2:
  - Różnica ≤ 2: normalne dołączanie, brak mnożnika.
  - Różnica 3-5: automatyczne balansowanie (nowi tylko do mniejszej) + mnożnik 1.5x.
  - Różnica 6+: tylko mniejsza drużyna przyjmuje + mnożnik 2x.

**Plusy:** Najbardziej sprawiedliwe, automatyczne + wyrównanie punktów.  
**Minusy:** Najbardziej złożone.

---

### Opcja 4: Ręczne przenoszenie przez admina
**Jak działa:**
- Admin widzi listę graczy w każdej drużynie.
- Może ręcznie przenieść gracza z większej do mniejszej drużyny (przycisk "Przenieś do drużyny X").
- Opcjonalnie: automatyczne sugestie "Przenieś X graczy z A do B".

**Plusy:** Pełna kontrola, elastyczne.  
**Minusy:** Wymaga ręcznej interwencji, czasochłonne przy dużej liczbie graczy.

---

## Rekomendacja

**Opcja 2 (mnożnik punktów)** + opcjonalnie **Opcja 1 (automatyczne balansowanie)** jako ustawienie w panelu admina.

**Implementacja:**
1. W panelu Team Battle dodać checkbox: "Włącz automatyczne balansowanie drużyn" (domyślnie wyłączone).
2. Dodać checkbox: "Włącz mnożnik punktów dla mniejszej drużyny" (domyślnie włączone).
3. Mnożnik widoczny na ekranie TV i w adminie przy nazwie drużyny (np. "Drużyna B (7) ×2").
4. Mnożnik stosowany przy każdym przyznaniu punktów drużynie.

---

## Przykład działania (Opcja 2)

**Sytuacja:** Drużyna A: 21 graczy, Drużyna B: 7 graczy (różnica: 14)

**Bez mnożnika:**
- Drużyna A zdobywa 100 pkt → 100 pkt
- Drużyna B zdobywa 100 pkt → 100 pkt
- Wynik: A wygrywa bo ma więcej graczy (więcej szans na punkty)

**Z mnożnikiem (×3 dla B):**
- Drużyna A zdobywa 100 pkt → 100 pkt
- Drużyna B zdobywa 100 pkt → 300 pkt (×3)
- Wynik: B ma szansę wygrać mimo mniejszej liczby graczy
