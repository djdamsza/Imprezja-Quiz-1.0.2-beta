# VirtualDJ – natywne odczytywanie baz innych programów DJ

## Źródła

- [VDJ Forum: RekordboxFolder](https://www.virtualdj.com/forums/250950/)
- [VDJ Forum: HELP! Picking up wrong Rekordbox file names](https://www.virtualdj.com/forums/258976/) – djdad (Development Manager): „VirtualDJ will read the Rekordbox database by looking for the master.db file"
- [VDJ Wiki: rekordboxsettings](https://virtualdj.com/wiki/rekordboxsettings.html)

---

## VirtualDJ czyta Rekordbox master.db bezpośrednio

**Od buildu 6106 (2020-09-14)** VirtualDJ może odczytywać bazę Rekordbox bez importu i migracji:

1. **Zamknij Rekordbox**
2. Otwórz VirtualDJ → **Settings → OPTIONS**
3. Ustawienie **RekordboxFolder** – wskaż folder zawierający `master.db`
4. Zrestartuj VirtualDJ

**Domyślne lokalizacje RB:**
- **Windows:** `C:\Users\[USERNAME]\AppData\Roaming\Pioneer\rekordbox`
- **Mac:** `/Users/[USERNAME]/Library/Pioneer/rekordbox`

VDJ może wskazać **dowolną ścieżkę** – np. gdy baza RB jest na innym dysku (F:/PIONEER).

**Co VDJ widzi:**
- Local Music → folder „Rekordbox” z playlistami
- Tylko **ręcznie utworzone playlisty** – inteligentne/dynamiczne nie są obsługiwane
- **Cue points z RB nie są przenoszone** do VDJ (VDJ czyta tylko ścieżki i playlisty)

**WAŻNE – metadane (Title, Artist, Rating, Tagi):**
VDJ przy odczycie RB **nie korzysta z metadanych z master.db**. Odczytuje głównie **ścieżki plików** i **strukturę playlist**. Title, Artist, Rating, Genre itd. są pobierane z **plików audio** (np. ID3). Gdy plik ma puste lub błędne tagi, VDJ może pokazywać np. nazwę folderu zamiast tytułu.

---

## VirtualDJ + Serato

- Ustawienie **SeratoFolder** – wskaż folder `_Serato_` (np. `/Music/_Serato_`)
- VDJ czyta crate’y Serato jako virtual folders

---

## VirtualDJ + Traktor

- Brak natywnego odczytu bazy Traktor (TraktorFolder nie istnieje)
- Migracja wymaga narzędzi zewnętrznych lub ręcznego importu

---

## Wnioski dla naszego konwertera VDJ→Rekordbox

### Kierunek RB→VDJ (już działa w VDJ)
- Użytkownik RB może od razu używać VDJ – wskazuje RekordboxFolder na folder z master.db
- **Żadnej migracji nie trzeba**

### Kierunek VDJ→RB (nasz cel)
- Rekordbox **nie ma** opcji „VDJFolder” ani odczytu bazy VDJ
- Jedyna droga: **Restore Library** z backupem (ZIP z master.db)
- Musimy generować master.db w formacie RB

### Potwierdzenie
- **master.db** to natywny format RB – VDJ go poprawnie odczytuje (reverse‑engineering)
- Format jest stabilny i czytelny – pyrekordbox i inne narzędzia go obsługują
- Struktura folderu RB: głównie `master.db` (plus ewentualnie ANLZ, obrazy)

### Rekomendacja: VDJ → VDJ (bez RB)
Jeśli celem jest **używanie VDJ** z poprawionymi danymi:
- **Zostań przy natywnym formacie VDJ** – ładuj backup VDJ (ZIP z database.xml)
- Edytuj tagi w naszym narzędziu
- Zapisz i używaj w VDJ – metadane (Title, Artist, Rating, Genre) będą poprawne
Ścieżka VDJ → RB → VDJ (RekordboxFolder) **nie przenosi metadanych** – VDJ czyta tylko ścieżki i playlisty z master.db, a Title/Artist/Rating bierze z plików audio.

---

## Ograniczenia VDJ przy odczycie RB

- **Metadane (Title, Artist, Rating, Tagi)** – VDJ **nie czyta ich z master.db**, tylko ze ścieżek i plików audio (ID3). Stąd: zamiast tytułu nazwa folderu, brak artysty itd.
- Stare/nieaktualne ścieżki w master.db – VDJ pokazuje to, co jest w bazie (w tym stare path’e)
- rekordbox.xml (eksport) może nie zawierać tych starych wpisów – RB ma wewnętrzne tabele z historią
- Cue points, waveformy – nie przenoszone do VDJ
