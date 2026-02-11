# Balansowanie drużyn – założenia i progi

## Cel
Mniejsza drużyna dostaje **mnożnik punktów**, żeby miała realną szansę wygrać mimo mniejszej liczby graczy.

## Zasada (Twoje założenie)
- **Gdy drużyna ma 50% mniej zawodników** niż druga → dostaje **100% więcej punktów** (czyli **×2**).
- Uogólnienie: im większa dysproporcja, tym większy mnożnik.

## Jak liczymy mnożnik

1. **Liczby graczy:**  
   `countA` = liczba graczy w drużynie A, `countB` = liczba graczy w drużynie B.

2. **Która drużyna jest mniejsza:**  
   Mniejsza drużyna to ta z mniejszą liczbą graczy. Tylko ona dostaje mnożnik; większa drużyna zawsze ×1.

3. **Współczynnik (ratio):**  
   `ratio = większa_liczba / mniejsza_liczba`  
   Np. A=21, B=7 → ratio = 21/7 = 3.

4. **Mnożnik punktów dla mniejszej drużyny:**  
   `mnożnik = ratio`  
   - 21 vs 7 → ratio = 3 → mniejsza (B) dostaje **×3**  
   - 10 vs 5 → ratio = 2 → mniejsza dostaje **×2** („50% mniej graczy = 100% więcej punktów”)  
   - 6 vs 4 → ratio = 1,5 → mniejsza dostaje **×1.5**

5. **Próg uruchomienia balansowania:**  
   Balansowanie włącza się tylko gdy jest **realna** dysproporcja, np.:
   - **ratio ≥ 1.5** (mniejsza ma co najwyżej ~67% graczy większej),  
   albo
   - **różnica ≥ 2 graczy** (np. 5 vs 3).

   Proponowany wariant: **ratio ≥ 1.5** (wtedy 4 vs 3 daje ×1.33, 6 vs 4 daje ×1.5 itd.).

6. **Górny limit mnożnika (opcjonalnie):**  
   Np. **max ×4**, żeby przy 20 vs 5 nie było ×4 bez limitu i żeby nie było wrażenia „przesady”.  
   Można też bez limitu i zostawić czysty ratio.

## Podsumowanie progów (propozycja)

| Większa drużyna | Mniejsza drużyna | Ratio | Mnożnik dla mniejszej |
|-----------------|------------------|--------|------------------------|
| 10              | 10               | 1.0    | brak (1×)              |
| 8               | 6                | 1.33   | brak (poniżej 1.5)     |
| 6               | 4                | 1.5    | ×1.5                   |
| 10              | 5                | 2.0    | ×2                     |
| 21              | 7                | 3.0    | ×3                     |
| 20              | 5                | 4.0    | ×4 (albo bez limitu)   |

- **Próg włączenia:** ratio ≥ 1.5 (albo, jeśli wolisz, „różnica ≥ 2 graczy”).  
- **Wzór:** mnożnik = ratio (z ewentualnym capem, np. max 4).

## Gdzie to działa
- **Serwer:** przy każdym przyznawaniu punktów drużynie sprawdzamy, czy jest w trybie drużynowym i czy balansowanie jest włączone; jeśli tak i drużyna jest mniejsza, punkty × mnożnik.
- **Ekran TV i admin:** przy nazwie mniejszej drużyny pokazujemy mnożnik, np. „Drużyna B (7) ×3”, żeby było widać, że balansowanie jest aktywne.

## Ustawienie w panelu
- Jedno pole: **„Balansowanie drużyn”** (checkbox).  
- Włączone = stosujemy powyższą logikę. Wyłączone = jak dotąd, bez mnożnika.

Jeśli chcesz inny próg (np. ratio ≥ 2) albo sztywny cap (np. max ×3), daj znać – dopasujemy opis i kod.
