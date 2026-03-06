# Brakujące pliki graficzne na imprezja.pl

**Data weryfikacji:** 19 lutego 2026

**Uwaga:** Do czyszczenia nieużywanych mediów zalecamy wtyczkę **Media Cleaner** – zobacz `WTYCZKI_CZYSZCZENIE_MEDIOW.md`.

---

## Podsumowanie

Przeskanowano stronę główną, O mnie i Galerię. **Znaleziono 29 brakujących plików** (HTTP 404).

| Kategoria | Liczba | Uwagi |
|-----------|--------|-------|
| Oryginały (bez rozmiaru w nazwie) | 22 | Miniatury często działają |
| Pliki z rozmiarem (np. 768x512) | 7 | Brak całego zestawu |
| **Razem** | **29** | |

---

## Lista brakujących plików

### 1. Strona główna – DocFile, dyplomy, zdjęcia (2020/07)

| Plik | Status miniatury |
|------|------------------|
| `DocFile-1-1.jpeg` | ✅ 300x201, 768x514 OK |
| `DocFile-2-1.jpeg` | ✅ 300x211, 768x540 OK |
| `DocFile-3-1.jpeg` | ✅ 209x300 OK |
| `DocFile-4-1.jpeg` | ✅ 213x300 OK |
| `DocFile-5-1.jpeg` | ✅ 212x300 OK |
| `DocFile-6-1.jpeg` | ✅ 211x300 OK |
| `animator-1.jpeg` | ✅ 300x218, 768x558 OK |
| `braz2-1.jpeg` | ✅ 211x300 OK |
| `certyfikat-njr-1-1.jpeg` | ✅ 214x300 OK |
| `deejay-1.jpeg` | ✅ 300x212, 768x542 OK |
| `dyplom-njr-5-1.jpeg` | ✅ 300x209, 768x536 OK |
| `dyplom-njr-6-1.jpeg` | ✅ 300x218, 768x558 OK |
| `dyplom-njr-7-1.jpeg` | ✅ 300x205, 768x524 OK |

**Wniosek:** Brakują tylko oryginały. Miniatury działają – obrazy się wyświetlają, ale np. lightbox/zoom może nie działać.

---

### 2. dyplom.dj-union (2022/02) – brak całego zestawu

| Plik |
|------|
| `dyplom.dj-union.jpeg` |
| `dyplom.dj-union.webp` |
| `dyplom.dj-union-300x199.jpeg` |
| `dyplom.dj-union-300x199.webp` |
| `dyplom.dj-union-768x509.jpeg` |
| `dyplom.dj-union-768x509.webp` |
| `dyplom.dj-union-1024x679.jpeg` |
| `dyplom.dj-union-1024x679.webp` |

**Wniosek:** Plik został usunięty lub nigdy nie wgrany. Na stronie może być puste miejsce lub ikona „broken image”.

---

### 3. O mnie (2022/03)

| Plik |
|------|
| `247729738_2930142917315063_6898107888152943330_n-edited.jpeg` |

---

### 4. Galeria (2023/01)

| Plik |
|------|
| `batch_0360-1.webp` |

**Uwaga:** Inne rozmiary batch_0360-1 (300x200, 768x512, 1024x683 itd.) działają – brakuje tylko oryginału.

---

### 5. Galeria (2024/08)

| Plik |
|------|
| `KlaudiaiJacek-722.jpg` |
| `RFSI-513.jpg` |

**Uwaga:** Miniatury (200x133, 400x267 itd.) mogą działać – sprawdź na stronie.

---

### 6. Strona główna – nowsze zdjęcia

| Plik | Lokalizacja |
|------|-------------|
| `PM-330.jpg` | uploads/2025/09/ |
| `JR-344-1.jpg` | uploads/2025/12/ |
| `453617320_1021841319946964_2081097672691140249_n-1-1.jpg` | uploads/2026/02/ |
| `JR-344-2-1.jpg` | uploads/2026/02/ |

**Uwaga:** W dokumentacji PageSpeed jest `PM-330-edited.jpg` i `JR-344-2` – możliwe że wgrano wersje „edited” zamiast oryginałów, lub pliki są w innym katalogu.

---

## Co zrobić

### Priorytet 1: dyplom.dj-union
Brakuje całego zestawu – na stronie może być puste miejsce. **Wgraj ponownie** plik źródłowy do mediów WordPress (lub usuń blok, jeśli nie jest potrzebny).

### Priorytet 2: PM-330, JR-344, 453...n
Sprawdź w WordPress → Media, czy te pliki istnieją. Jeśli nie – wgraj ponownie. Jeśli używasz wersji „-edited”, upewnij się że bloki odwołują się do właściwych plików.

### Priorytet 3: Oryginały DocFile, animator, deejay itd.
Miniatury działają – obrazy się wyświetlają. Możesz:
- **Zostawić** – strona działa, lightbox może nie pokazywać pełnego rozmiaru
- **Wgrać oryginały** – jeśli chcesz pełny zoom/lightbox
- **Regenerować miniatury** – wtyczka „Regenerate Thumbnails” – nie pomoże, bo oryginały nie istnieją

### Priorytet 4: batch_0360-1.webp, KlaudiaiJacek, RFSI
Sprawdź w galerii czy zdjęcia się wyświetlają. Jeśli tak – miniatury wystarczą. Jeśli nie – wgraj oryginały.

---

## Jak sprawdzić ponownie

```bash
# Pobierz listę obrazów ze strony
curl -s -L "https://imprezja.pl" | grep -oE 'https://imprezja\.pl/wp-content/uploads/[^"'\''\s<>]+\.(jpg|jpeg|png|gif|webp)' | sort -u > images.txt

# Sprawdź każdy (404 = brakuje)
while read url; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -L "$url")
  [ "$code" != "200" ] && echo "404: $url"
done < images.txt
```

---

## Źródła skanowania

- https://imprezja.pl (strona główna)
- https://imprezja.pl/o-mnie-damian-nowaczyk/
- https://imprezja.pl/galeria/

Możliwe że inne podstrony (np. oferta, cennik) zawierają dodatkowe obrazy – warto przeskanować całą witrynę (np. Screaming Frog, Sitebulb).
