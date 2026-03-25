# Sharp, jimp i luki bezpieczeństwa – wyjaśnienie prostymi słowami

## 1. Sharp w projekcie – co robi i dlaczego może być problem

### Co to jest sharp?
**Sharp** to biblioteka do przetwarzania obrazów (zmniejszanie, kompresja do WebP). Jest bardzo szybka, bo używa natywnych binarek (libvips) – osobnych dla Mac, Windows, Linux i każdej architektury (x64, arm64).

### Gdzie jest używany?
W `server.js` – przy uploadzie obrazków do quizu. Optymalizuje zdjęcia dla ekranu TV (max 1920px, WebP).

### Dlaczego sharp może się „wywalić”?
Sharp ma **binarki natywne** – osobne pliki dla Mac/Windows/Linux i dla każdej architektury. Typowe problemy:

1. **Cross-compile (budowanie na Macu dla Windows)**  
   Gdy budujesz na Macu instalator dla Windows, `npm install` pobiera binarki **dla Maca**, nie dla Windows. W gotowym .exe sharp nie znajdzie właściwych plików i się wywali.

2. **Universal build (Mac arm64 + x64 w jednym DMG)**  
   Sharp nie ma „uniwersalnych” binarek. Electron-builder pakuje tylko binarki dla **architektury maszyny, na której budujesz**. Na Intel Macu – brak binarek dla Apple Silicon (i odwrotnie).

3. **singleArchFiles w package.json**  
   Konfiguracja `**/node_modules/@img/**` mówi electron-builderowi: „pakuj tylko sharp dla bieżącej architektury”. Zmniejsza rozmiar DMG, ale na innym typie Maca sharp może nie działać.

### Dlaczego jest jimp jako zapas?
**Jimp** jest napisany w czystym JavaScript – nie ma binarek, działa na każdej platformie. Wolniejszy, ale niezawodny. Dlatego w kodzie jest:
- najpierw próba załadowania sharp,
- jeśli sharp się nie uda → używany jest jimp.

To zabezpieczenie przed sytuacją, gdy sharp nie ma właściwych binarek (np. po cross-compile).

---

## 2. Luki bezpieczeństwa – wyjaśnienie prostymi słowami

### ajv (moderate) – ReDoS
**Co to:** Biblioteka do walidacji JSON (schematy).  
**Problem:** Przy specjalnej opcji `$data` można podać taki wzorzec, że sprawdzanie trwa bardzo długo (minuty, godziny).  
**Prosty opis:** Atakujący wysyła „tricky” dane → serwer się zapętla w sprawdzaniu → CPU na 100%, aplikacja nie reaguje.  
**Ryzyko:** Średnie – trzeba celowo użyć `$data` i specjalnych wzorców.  
**Naprawa:** `npm audit fix`.

---

### electron (moderate) – ASAR Integrity Bypass
**Co to:** Electron pakuje pliki aplikacji w archiwum ASAR.  
**Problem:** Można zmodyfikować pliki na dysku tak, że Electron załaduje zmienioną wersję zamiast oryginału.  
**Prosty opis:** Ktoś z dostępem do komputera może podmienić pliki aplikacji (np. dodać złośliwy kod) i Electron tego nie wykryje.  
**Ryzyko:** Średnie – wymaga fizycznego/logicznego dostępu do maszyny użytkownika.  
**Naprawa:** Aktualizacja Electron do 35.7.5+ (lub 41 z `--force` – duża zmiana wersji).

---

### file-type / jimp (moderate) – Infinite loop
**Co to:** `file-type` rozpoznaje typ pliku (JPEG, PNG itd.). Używany przez jimp.  
**Problem:** Przy specjalnie spreparowanym pliku ASF parser wchodzi w nieskończoną pętlę.  
**Prosty opis:** Atakujący wgrywa „zepsuty” plik → serwer się zapętla → aplikacja się wiesza.  
**Ryzyko:** Średnie – trzeba wgrać konkretny, złośliwy plik.  
**Naprawa:** `npm audit fix --force` (jimp 1.6) lub zamiana jimp na sharp tam, gdzie to możliwe.

---

### minimatch (high) – ReDoS
**Co to:** Biblioteka do dopasowywania ścieżek (np. `*.js`, `**/dist/**`). Używana przez electron-builder, archiver, glob itd.  
**Problem:** Przy specjalnych wzorcach z wieloma `*` i `**` dopasowanie może trwać bardzo długo.  
**Prosty opis:** Atakujący podaje „tricky” ścieżkę/wzorzec → dopasowanie trwa wiecznie → DoS.  
**Ryzyko:** Wysokie – wzorce mogą pochodzić z zewnątrz (np. z konfiguracji, uploadu).  
**Naprawa:** `npm audit fix`.

---

### qs (moderate) – DoS
**Co to:** Parser parametrów URL (np. `?a=1&b=2`).  
**Problem:** Przy bardzo długich parametrach z przecinkami można obejść limit i spowodować duże zużycie pamięci.  
**Prosty opis:** Atakujący wysyła bardzo długi URL z wieloma przecinkami → serwer zużywa dużo RAM → może się wywalić.  
**Ryzyko:** Średnie – wymaga wysłania specjalnie skonstruowanego zapytania.  
**Naprawa:** `npm audit fix`.

---

### tar (high) – Path traversal
**Co to:** Biblioteka do rozpakowywania archiwów .tar.  
**Problem:** Przy rozpakowywaniu złośliwego archiwum można „wyskoczyć” poza docelowy folder i nadpisać dowolne pliki (np. konfigurację, skrypty).  
**Prosty opis:** Atakujący wgrywa „tricky” .tar → przy rozpakowaniu pliki trafiają w złe miejsca (np. nadpisują ważne pliki).  
**Ryzyko:** Wysokie – jeśli aplikacja rozpakowuje archiwa od użytkowników.  
**Naprawa:** `npm audit fix`.

---

## 3. Podsumowanie – co zrobić

| Działanie | Efekt |
|-----------|-------|
| `npm audit fix` | Naprawia ajv, minimatch, qs, tar – **bez ryzyka** |
| `npm audit fix --force` | Dodatkowo electron 41, jimp 1.6 – **może coś zepsuć** (breaking changes) |
| Zostawić sharp + jimp | Sharp gdy działa, jimp gdy nie – **obecne podejście jest sensowne** |
| Zamiana jimp → sharp | Możliwa tylko tam, gdzie jimp jest używany (optymalizacja obrazów). Sharp już jest priorytetem; jimp to fallback. Usunięcie jimp bez naprawy sharp na cross-compile spowoduje brak optymalizacji na niektórych platformach. |

**Rekomendacja:** Uruchom `npm audit fix`. Electron i jimp zostaw na później, chyba że planujesz większą aktualizację.
