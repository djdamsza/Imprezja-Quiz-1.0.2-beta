# Instalacja lekkiego banera cookies – imprezja.pl

Baner ma ~2 KB (CookieYes ~34 KB). Zawiera: informację o cookies, link do polityki, przyciski „Akceptuję” i „Tylko niezbędne”.

---

## Krok 1: Usuń CookieYes

1. **WordPress** → **Wtyczki** → znajdź **CookieYes**
2. **Dezaktywuj** (nie usuwaj od razu – na wszelki wypadek)
3. Sprawdź czy baner CookieYes zniknął ze strony
4. Jeśli wszystko OK – **Usuń** wtyczkę

---

## Krok 2: Dodaj lekki baner

### Opcja A: Przez motyw Blocksy (zalecane)

1. **Wygląd** → **Dostosuj** (Customize)
2. **Footer** → **Elementy stopki** lub **Widgety**
3. Dodaj blok **„Własny HTML”** (Custom HTML)
4. Wklej całą zawartość pliku **`baner-cookies-lekki.html`**
5. Ustaw pozycję: **na samym dole** (po wszystkich elementach stopki)
6. **Opublikuj**

### Opcja B: Przez wtyczkę „Insert Headers and Footers”

1. Zainstaluj wtyczkę **Insert Headers and Footers** (WPCode) – darmowa
2. **Ustawienia** → **Insert Headers and Footers**
3. W polu **„Scripts in Footer”** wklej zawartość **`baner-cookies-lekki.html`**
4. **Zapisz**

### Opcja C: Edytor motywu (functions.php / szablon)

1. **Wygląd** → **Edytor plików motywu**
2. Otwórz **footer.php** (lub szablon stopki)
3. Przed `</body>` wklej zawartość **`baner-cookies-lekki.html`**
4. **Zapisz**

**Uwaga:** Przy aktualizacji motywu zmiany w footer.php mogą zniknąć. Lepiej użyć **Opcji A** (Customizer) lub **child theme**.

---

## Krok 3: Sprawdź link do polityki cookies

W banerze jest link: `/polityka-prywatnosci/` (strona działa na imprezja.pl)

- Jeśli polityka cookies jest na innej stronie, **zmień** w kodzie:
  ```html
  <a href="/TWOJA-SCIEZKA/">Polityka cookies</a>
  ```

---

## Krok 4: Integracja z Google Analytics / Clarity (opcjonalnie)

Jeśli chcesz ładować Analytics/Clarity **dopiero po akceptacji**, dodaj przed `</body>` (po banerze):

```html
<script>
window.impCookieAccept=function(choice){
  if(choice==='all'){
    // Tutaj uruchom Analytics, Clarity, Tag Manager itp.
    // np. gtag('consent','update',{analytics_storage:'granted'});
  }
};
</script>
```

Jeśli używasz **Google Tag Manager** z trybem consent – skonfiguruj trigger na „cookie consent granted”. Lekki baner tylko zapisuje wybór w `localStorage` – GTM/GA muszą to odczytać.

**Prosty przykład** (gtag.js):
```javascript
window.impCookieAccept=function(c){
  if(c==='all'&&typeof gtag==='function'){
    gtag('consent','update',{analytics_storage:'granted',ad_storage:'granted'});
  }
};
// Przy pierwszym ładowaniu – jeśli już była zgoda:
if(localStorage.getItem('imp_cookie_consent')==='all'){
  if(typeof gtag==='function')gtag('consent','update',{analytics_storage:'granted',ad_storage:'granted'});
}
```

---

## Krok 5: Test

1. Otwórz imprezja.pl w trybie **incognito** (lub wyczyść cookies)
2. Baner powinien się pojawić na dole
3. Kliknij **„Akceptuję”** – baner znika
4. Odśwież stronę – baner nie pojawia się (zapisane w localStorage)
6. Wyczyść localStorage (`imp_cookie_consent`) i odśwież – baner pojawia się ponownie

---

## Treść banera (do ewentualnej edycji)

Obecna treść:
> „Ta strona używa plików cookies, aby działać poprawnie i analizować ruch. Kontynuując, wyrażasz zgodę na ich użycie. [Polityka cookies]”

Możesz zmienić tekst w bloku **Własny HTML** – zachowaj link do polityki cookies.

---

## Klucz localStorage

Baner zapisuje wybór jako:
- `imp_cookie_consent = "all"` – pełna zgoda
- `imp_cookie_consent = "essential"` – tylko niezbędne

Aby zresetować (np. do testów): DevTools → Application → Local Storage → usuń `imp_cookie_consent`.
