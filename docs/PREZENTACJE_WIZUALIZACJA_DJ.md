# Wizualizacja audio dla DJ-a – BlackHole (macOS)

## Źródło dźwięku: mikrofon

Wizualizacja w trybie Prezentacja używa **mikrofonu** jako źródła dźwięku. Przeglądarka prosi o uprawnienia do mikrofonu – **jeśli użytkownik nie udzieli dostępu, wizualizacja się nie wyświetli** (pojawia się komunikat zamiast animacji).

## BlackHole 18ch – przekierowanie dźwięku z oprogramowania DJ

Na Macu możesz użyć **BlackHole** – wirtualnego urządzenia audio, które pozwala przekierować dźwięk z dowolnej aplikacji (np. VirtualDJ, Serato, rekordery DJ) na „wejście mikrofonowe”, które widzi przeglądarka.

### Instalacja BlackHole

1. Pobierz BlackHole z: https://existential.audio/blackhole/
2. Wybierz wersję **2ch** (stereo) lub **16ch** – dla większości DJ-ów wystarczy 2ch
3. Zainstaluj (wymaga ponownego uruchomienia komputera)

### Konfiguracja dla wizualizacji

1. **Ustaw BlackHole jako wejście mikrofonowe systemu**
   - **System Settings** (Ustawienia systemowe) → **Sound** (Dźwięk) → **Input**
   - Wybierz **BlackHole 2ch** (lub 16ch) jako urządzenie wejściowe

2. **Przekieruj dźwięk z oprogramowania DJ na BlackHole**
   - W VirtualDJ / Serato / Traktor / innej aplikacji DJ:
   - Ustaw **wyjście audio** na **BlackHole**
   - Albo użyj **Audio MIDI Setup** (macOS): utwórz „Multi-Output Device” łączący wyjście DJ + BlackHole, jeśli chcesz jednocześnie słyszeć dźwięk i mieć wizualizację

3. **Otwórz ekran prezentacji** w przeglądarkach (Chrome/Safari)
   - Gdy slajd wizualizacji jest aktywny, przeglądarka poprosi o dostęp do mikrofonu
   - **Zezwól** – przeglądarka będzie „słuchać” BlackHole (który teraz jest wejściem systemowym)
   - Wizualizacja zareaguje na muzykę płynącą z oprogramowania DJ

### Schemat przepływu dźwięku

```
[Oprogramowanie DJ] → wyjście audio → [BlackHole]
                                            ↓
[System macOS] ← wejście = BlackHole
       ↓
[Przeglądarka getUserMedia] ← „mikrofon” = BlackHole
       ↓
[Wizualizacja audioMotion]
```

### Multi-Output (opcjonalnie)

Jeśli chcesz **jednocześnie** słyszeć muzykę przez głośniki i mieć wizualizację:

1. Otwórz **Audio MIDI Setup** (Aplikacje → Narzędzia)
2. Kliknij **+** → **Create Multi-Output Device**
3. Zaznacz: **BlackHole** + **głośniki/wyjście** (np. Built-in Output)
4. Ustaw Multi-Output jako wyjście systemowe
5. W oprogramowaniu DJ ustaw wyjście na **Multi-Output** (lub BlackHole, jeśli DJ ma własne wyjście)

### Brak uprawnień do mikrofonu

Jeśli użytkownik **nie udzieli** dostępu do mikrofonu:
- Zamiast wizualizacji pojawi się komunikat: *„Brak dostępu do mikrofonu – wizualizacja niedostępna”*
- Nie ma obejścia – przeglądarka wymaga uprawnień do odczytu wejścia audio

### BlackHole 18ch

BlackHole 18ch oferuje więcej kanałów (np. do zaawansowanego routingu). Dla wizualizacji wystarczą kanały 1–2 (stereo). Konfiguracja jest taka sama – wybierz BlackHole 18ch jako wejście w ustawieniach dźwięku macOS.
