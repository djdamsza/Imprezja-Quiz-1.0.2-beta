# Rekordbox – ograniczenia planu Free a migracja VDJ→RB

## Tabela planów (rekordbox.com/plan)

Z oficjalnej tabeli porównawczej wynika, że część funkcji biblioteki jest dostępna **tylko w planach płatnych**:

| Funkcja | Professional | Creative | Core | Free |
|---------|:---:|:---:|:---:|:---:|
| **Collection Filter** (Artist, Genre, Album) | ✓ | ✓ | ? | ? |
| **Auto Relocate** | ✓ | ? | ? | ? |
| **Column View** (hierarchia playlist) | ✓ | ✓ | ? | ? |
| **Playlist Search** | ✓ | ✓ | ? | ? |

*Dokładne oznaczenia dla Core i Free wymagają sprawdzenia w tabeli na stronie.*

## Co działa w naszym eksporcie (zweryfikowane w backupie)

- **Artist** – zapisane w djmdArtist, powiązane przez ArtistID ✓
- **Rating** – wartości 0, 51, 102, 153, 204, 255 (0–5 gwiazdek) ✓
- **Playlisty** – 8739 wpisów w djmdSongPlaylist ✓
- **My Tags** – djmdMyTag + djmdSongMyTag ✓
- **DeviceID** – ustawiony (wymagany do Relocate) ✓
- **rb_data_status=257** ✓

## Co NIE działa w RB (interfejs użytkownika)

1. **Artist** – kolumna pusta mimo danych w bazie
2. **Rating** – tylko 5 lub 0 gwiazdek
3. **My Tags** – brak zaznaczeń, brak wyszukiwania po tagach
4. **Relocate / Auto Relocate** – nie działają
5. **Powiązanie plików** – czerwone ikony (brak pliku)

## Możliwe przyczyny

### 1. Ograniczenia planu Free
Plan Free może ograniczać wyświetlanie i używanie:
- Collection Filter (w tym Artist)
- Auto Relocate
- pełnej obsługi My Tags

### 2. Tabela contentFile (naprawione)
Od teraz uzupełniamy `contentFile` (ContentID, Path) – może to poprawić Relocate i powiązanie plików.

### 3. Cache / indeksy RB
RB może korzystać z własnych indeksów lub cache’u, które nie są odświeżane po Restore.

## Rekomendacje

1. **Test z planem płatnym** – skorzystaj z 30-dniowego trialu (Core lub Professional) i sprawdź, czy Artist, Relocate i My Tags zaczynają działać. To pozwoli ustalić, czy problem wynika z planu Free.

2. **Alternatywa: VirtualDJ** – VDJ może odczytywać `master.db` RB bezpośrednio (Settings → RekordboxFolder). Możesz wyeksportować nasz ZIP, rozpakować `master.db` do folderu i w VDJ wskazać ten folder. VDJ pokaże playlisty i utwory – bez konieczności używania RB.

3. **Alternatywa: Import XML** – zamiast Restore użyj eksportu „Eksport XML” (rekordbox.xml). W RB: File → Import → wybierz rekordbox.xml. To inna ścieżka importu, może zachowywać się inaczej niż Restore.

4. **Zapytanie do AlphaTheta** – warto napisać do supportu RB, czy Restore Library i Relocate są dostępne w planie Free, oraz czy import z zewnętrznego narzędzia jest w ogóle wspierany.
