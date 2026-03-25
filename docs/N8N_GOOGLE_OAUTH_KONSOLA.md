# Google Cloud — OAuth 2.0 dla n8n (Kalendarz, Arkusze, itd.)

Dla instancji **`https://n8n-automation-l1yt.onrender.com`** (podmień na swój host, jeśli inny — **lokalnie** np. `http://localhost:5678`).

---

## Pełna instrukcja: Google Cloud → OAuth → n8n

### Krok 1 — Projekt w Google Cloud

1. Wejdź na [Google Cloud Console](https://console.cloud.google.com/).
2. U góry obok logo Google Cloud wybierz **projekt** (lub **Nowy projekt** → nazwa np. `Imprezja n8n` → Utwórz).
3. Upewnij się, że **rozliczenia** (billing) są włączone dla projektu — bez tego czasem API nie działa; dla OAuth + API często wymagane jest podpięcie konta (nawet w ramach darmowego limitu).

### Krok 2 — Włącz potrzebne API

**Menu ≡ → APIs & Services → Library** (Biblioteka API). Dla każdej usługi: wyszukaj nazwę → **Włącz** (*Enable*).

| Chcesz w n8n… | Włącz API |
|---------------|-----------|
| Google Calendar | **Google Calendar API** |
| Google Sheets | **Google Sheets API** |
| Czasem pliki / Drive przy eksporcie | **Google Drive API** (opcjonalnie) |

### Krok 3 — Ekran zgody OAuth (consent screen)

**APIs & Services → OAuth consent screen** (lub **Google Auth Platform** w nowszym układzie konsoli).

1. **Typ użytkownika:** zwykle **External** (zewnętrzna) — dla własnej firmy / kont testowych wystarczy.
2. Kliknij **Create** / **Dalej**.
3. **App information:**  
   - **App name** — np. `n8n Imprezja`  
   - **User support email** — Twój Gmail  
   - **Developer contact** — ten sam e-mail  
4. **Scopes (zakresy)** — na tym etapie możesz **Dalej** i dodać zakresy w kolejnym kroku (patrz **Krok 3b** poniżej) albo **Add or Remove Scopes** i od razu dodać potrzebne URL-e (jak w sekcji **8** na końcu dokumentu).
5. **Test users:** jeśli status publikacji to **Testing** — **+ ADD USERS** i dopisz **każdy** adres Gmail, którym w n8n klikniesz *Zaloguj się przy OAuth* (np. `twoj@gmail.com`). Bez tego Google zwróci **403 access_denied** (patrz sekcja **0**).
6. Zapisz. Aplikacja może zostać w **Testing** na własny użytek (do ~100 testerów).

#### Krok 3b — Zakresy na ekranie zgody (zalecane)

W **OAuth consent screen → Edit app → Scopes → Add or Remove Scopes** dodaj m.in.:

- Kalendarz (odczyt): `https://www.googleapis.com/auth/calendar.readonly`  
- Kalendarz (pełny, jeśli zapisujesz wydarzenia): `https://www.googleapis.com/auth/calendar`  
- Arkusze (dopisywanie wierszy): `https://www.googleapis.com/auth/spreadsheets`  

Zapisz zmiany. Po zmianie zakresów w Google **ponów Connect** w n8n.

### Krok 4 — Dane logowania OAuth — „Client ID”

**APIs & Services → Credentials** (Dane logowania).

1. **+ Create Credentials → OAuth client ID**.
2. Jeśli konsola poprosi o **skonfigurowanie ekranu zgody** — dokończ **Krok 3**, potem wróć tutaj.
3. **Application type:** **Web application**.
4. **Name:** np. `n8n OAuth web`.
5. **Authorized JavaScript origins** — **+ Add URI**:  
   `https://TWOJ-HOST-n8n.pl`  
   Przykład: `https://n8n-automation-l1yt.onrender.com`  
   **Lokalnie:** `http://localhost:5678` (port jak w Twoim Dockerze / `n8n start`).
6. **Authorized redirect URIs** — **+ Add URI** — **musi być identyczny** z tym, co pokazuje n8n:  
   `https://TWOJ-HOST-n8n.pl/rest/oauth2-credential/callback`  
   W n8n: **Credentials → (nowy) Google OAuth2 →** często pole **OAuth Redirect URL** (tylko do kopiowania). Wklej **1:1** do Google.  
   Starsze n8n: czasem `/rest/oauth2-callback` — wtedy tak musi być w Google.
7. **Create**. Skopiuj **Client ID** i **Client secret** (sekret pokazuje się raz — zapisz w menedżerze haseł).

### Krok 5 — Credential w n8n

1. W n8n: **Credentials → Add credential** → wybierz **Google OAuth2 API** (lub **Google Sheets OAuth2 API** / **Google Calendar OAuth2 API** jeśli występują osobno — ważne, by typ pasował do node’a).
2. Wklej **Client ID** i **Client Secret** z Google Cloud.
3. Pole **Scope** — często zostaw puste i zrób **Connect**; albo wklej zakresy jak w sekcji **8**.
4. **Save**, potem **Connect my account** / **Sign in with Google** — zaloguj się **tym samym** kontem co na liście **Test users** (jeśli app jest w Testing).
5. Po sukcesie credential jest gotowy do node’ów **Google Calendar**, **Google Sheets**, itd.

### n8n: „**Workflow has issues**” / nie da się uruchomić

Często po **imporcie JSON** z **nieistniejącym ID credentiala** (np. placeholder `REPLACE_…` albo credential z innej instancji). **Otwórz każdy node** z ikoną ostrzeżenia (Google Sheets, Calendar, IMAP, HTTP z auth) i **wybierz ponownie** swój zapisany credential albo utwórz nowy.

### Krok 6 — Udostępnienie arkusza (tylko Arkusze)

OAuth łączy **konto Google**. Arkusz musi być **udostępniony** temu samemu użytkownikowi (lub dla Service Account — inna procedura). Wystarczy, że właścicielem pliku jest konto, którym się połączyłeś w kroku 5.

---

## 0. „Dostęp zablokowany” / **Błąd 403: `access_denied`** (ekran Google po **Connect** w n8n)

Komunikat w stylu: *aplikacja **n8n-automation-….onrender.com** nie przeszła weryfikacji* albo *dostępna tylko dla testerów zatwierdzonych przez dewelopera* — to prawie zawsze oznacza:

**OAuth consent screen** jest w stanie **Testowanie** (*Testing*), a konto Google, którym się logujesz (np. `nowaczykdamian@gmail.com`), **nie jest** na liście **Test users**.

### Co zrobić (najszybsza naprawa)

1. [Google Cloud Console](https://console.cloud.google.com/) → wybierz **ten sam projekt**, w którym masz OAuth Client ID dla n8n.  
2. **APIs & Services** → **OAuth consent screen** (lub **Google Auth Platform** → **Audience** / **Branding** — zależnie od layoutu konsoli).  
3. Sprawdź **Publishing status**: jeśli **Testing**:  
4. Sekcja **Test users** → **+ ADD USERS** → dodaj **dokładnie** adres(e-mail), którym logujesz się w oknie Google przy **Connect** w n8n (np. `nowaczykdamian@gmail.com`). Zapisz.  
5. Wróć do n8n → **Credentials** → **Connect my account** / połącz ponownie.

**Limit:** w trybie *Testing* działa to dla **dodanych** kont (do ok. 100 testerów). Każdy **inny** Gmail też musi być dopisany jako test user — inaczej zobaczy ten sam blok.

**Publikacja aplikacji** (*In production*) bez weryfikacji Google jest możliwa tylko dla niektórych zakresów; wrażliwe zakresy (np. pełny kalendarz) często wymagają **weryfikacji aplikacji** przez Google — na własny użytek wystarczy zwykle **Testing + Test users**.

---

## 1. Typ klienta

**Typ aplikacji:** **Aplikacja internetowa** (Web application).

**Nazwa** (dowolna, dla Ciebie): np. `n8n calendar imprezja` — OK.

---

## 2. Autoryzowane źródła JavaScript

Usuń przykład **`https://www.example.com`**.

Dodaj **dokładnie** (bez ścieżki na końcu, **bez** ukośnika na końcu):

```text
https://n8n-automation-l1yt.onrender.com
```

To jest tylko **origin** (protokół + host).

---

## 3. Autoryzowane identyfikatory URI przekierowania (najważniejsze)

Kliknij **+ Dodaj URI** i wklej **dokładnie** (wielkość liter, ścieżka — jak poniżej; **bez** końcowego `/`):

```text
https://n8n-automation-l1yt.onrender.com/rest/oauth2-credential/callback
```

**Jeśli Google lub n8n zwróci błąd `redirect_uri_mismatch`:**  
w n8n otwórz **Credentials → Twój credential Google** (przed połączeniem) — tam bywa pole **OAuth Redirect URL** / podgląd URI **tylko do odczytu**. **Skopiuj je 1:1** i **tę samą** wartość wklej w Google Cloud jako redirect URI.  
Starsze wersje n8n czasem używają ścieżki `/rest/oauth2-callback` (bez `-credential`) — wtedy musi być zgodnie z tym, co pokazuje **Twój** n8n.

---

## 4. Jaki typ credentialu w n8n?

- **Google OAuth2 API** — **OK**: po **Continue** wklejasz Client ID + Client Secret; nadaje się też do node **Google Calendar** (przy logowaniu Google dobiera zakresy).
- Jeśli na liście jest **Google Calendar OAuth2 API** (lub nazwa z **Calendar**) — dla samego kalendarza często **wygodniej** ten wariant.

**Potrzebne z Google Cloud zawsze:** Client ID **oraz** Client Secret (nie sam ID).

---

## 5. Po zapisaniu klienta w Google Cloud

1. Skopiuj **Identyfikator klienta** i **Sekret klienta**.  
2. Wklej je w n8n w wybranym credentialu (**Google OAuth2 API** lub Calendar).  
3. W n8n kliknij **Connect my account** / zaloguj się i zaakceptuj uprawnienia.

---

## 6. OAuth consent screen (ekran zgody)

W **Google Auth Platform** / **Ekran zgody OAuth**:

- **Obowiązkowo przy statusie „Testing”:** w **Test users** musi być **każdy** adres, którym klikasz *Zaloguj się* przy OAuth w n8n — w przeciwnym razie Google pokaże **403 `access_denied`** i tekst o braku weryfikacji aplikacji (jak na typowym screenie z przeglądarki).
- Zakresy (scopes): przy pierwszym łączeniu z Kalendarzem Google zwykle doda się czytanie/zapis kalendarza — zostaw zgodnie z prośbą n8n; trzymaj się też sekcji **8** (`calendar.readonly` vs `calendar`).

---

## 7. API musi być włączone

**APIs & Services → Library** → dla tego projektu włącz m.in. **Google Calendar API** oraz — jeśli używasz Arkuszy — **Google Sheets API**.

---

## 8. Co wpisać w **Scope** (zakresy)

### W n8n (pole Scope przy credentialu Google)

- Często **puste** — zapisz credential i **Connect**; n8n ustali zakresy przy logowaniu.
- Jeśli pole jest wymagane:
  - **tylko odczyt** kalendarza (sprawdzanie wolnych terminów, `events.list`, free/busy):  
    `https://www.googleapis.com/auth/calendar.readonly`
  - **odczyt + zapis** wydarzeń:  
    `https://www.googleapis.com/auth/calendar`

### Arkusze (Google Sheets)

- Zapis / dopisywanie wierszy:  
  `https://www.googleapis.com/auth/spreadsheets`  
- Czasem wystarczy szerszy dostęp (rzadziej):  
  `https://www.googleapis.com/auth/drive.file`

### W Google Cloud → **Ekran zgody OAuth** → dodaj zakresy

Te same adresy URL co powyżej (dokładnie, z `https://`). Dla automatyzacji „czy termin zajęty” zwykle wystarczy **`calendar.readonly`**.

Po zmianie zakresów w konsoli: **ponowne Connect** w n8n, żeby Google pokazał zaktualizowaną zgodę.

---

## Szybka lista (kopiuj-wklej)

| Pole | Wartość |
|------|---------|
| **Źródła JavaScript** | `https://n8n-automation-l1yt.onrender.com` |
| **Redirect URI** | `https://n8n-automation-l1yt.onrender.com/rest/oauth2-credential/callback` |

Powiązane: [`N8N_GOOGLE_CALENDAR_ALLDAY_BUSY.md`](./N8N_GOOGLE_CALENDAR_ALLDAY_BUSY.md) · [`RENDER_N8N.md`](./RENDER_N8N.md) (`WEBHOOK_URL`, `N8N_HOST`)
