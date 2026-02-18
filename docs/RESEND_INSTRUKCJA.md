# Instrukcja: Resend – wysyłka kluczy licencyjnych na e-mail

SMTP nie działa na Render (blokada portów). Resend używa API HTTPS – działa bez problemu.

---

## Domena: CyberFolks + dhosting

- **CyberFolks** – rejestracja domeny, w panelu masz pola **dns1** i **dns2** (nameservery)
- **dhosting** – hosting, serwer strony

**dns1 i dns2** – to adresy serwerów DNS (np. `dns1.dhosting.pl`). **Nie zmieniaj ich** – wskazują, gdzie są przechowywane rekordy DNS.

Rekordy TXT/CNAME dla Resend dodajesz w panelu, który **zarządza strefą DNS** – czyli tam, gdzie wskazują dns1/dns2 (dhosting lub CyberFolks).

---

## Krok 1: Załóż konto Resend

1. Wejdź na **https://resend.com/signup**
2. Zarejestruj się (e-mail + hasło)
3. Potwierdź e-mail, jeśli wymagane

---

## Krok 2: Dodaj domenę

1. Zaloguj się do Resend
2. Wejdź w **Domains** (menu po lewej) lub **https://resend.com/domains**
3. Kliknij **Add Domain**
4. Wpisz swoją domenę: `nowajakoscrozrywki.pl`
5. Kliknij **Add**

Resend pokaże rekordy DNS do dodania (SPF, DKIM, DMARC).

---

## Krok 3: Dodaj rekordy DNS (TXT, CNAME)

**Ważne:** Pola **dns1** i **dns2** w CyberFolks to **nameservery** – nie zmieniaj ich. Rekordy dla Resend dodajesz w panelu, który **zarządza strefą DNS** Twojej domeny.

### Gdzie dodać rekordy?

Sprawdź, gdzie ustawione są nameservery (dns1, dns2) w CyberFolks:

---

#### A) Jeśli dns1/dns2 wskazują na **dhosting** (np. `dns1.dhosting.pl`, `dns2.dhosting.pl`)

Rekordy dodajesz w **dhosting**:

1. Zaloguj się do **dPanel** dhosting (panel hostingowy)
2. **Domeny** → znajdź `nowajakoscrozrywki.pl`
3. **Akcje** → **Zarządzaj DNS**
4. Dodaj rekordy z Resend (TXT, CNAME) – skopiuj dokładnie nazwę i wartość
5. Zapisz zmiany

---

#### B) Jeśli dns1/dns2 wskazują na **CyberFolks** (np. `ns1.cyberfolks.pl`, `ns2.cyberfolks.pl`)

Rekordy dodajesz w **CyberFolks**:

1. Zaloguj się do **panelu klienta CyberFolks**
2. **Serwer WWW i domeny** → wybierz domenę `nowajakoscrozrywki.pl`
3. **Edycja strefy DNS** (lub **Zarządzanie DNS**)
4. **Dodaj rekord** → wybierz typ (TXT, CNAME)
5. Wpisz nazwę i wartość z Resend – skopiuj dokładnie
6. Zapisz zmiany

---

**Propagacja DNS:** 15 minut – 24 godziny (zwykle ok. 15–30 min)

---

## Krok 4: Zweryfikuj domenę w Resend

1. Wróć do Resend → **Domains**
2. Przy swojej domenie kliknij **Verify**
3. Poczekaj – Resend sprawdzi rekordy DNS
4. Gdy status zmieni się na **Verified** – możesz wysyłać e-maile z tej domeny

---

## Krok 5: Utwórz klucz API

1. W Resend wejdź w **API Keys** (menu) lub **https://resend.com/api-keys**
2. Kliknij **Create API Key**
3. Nazwa: np. `Imprezja Quiz Render`
4. Uprawnienia: **Sending access** (wystarczy)
5. Kliknij **Add**
6. **Skopiuj klucz** – wygląda jak `re_xxxxxxxxxxxxxxxx` – **zapiszesz go tylko raz**, potem nie będzie widoczny

---

## Krok 6: Ustaw zmienne w Render

1. Wejdź na **https://dashboard.render.com**
2. Otwórz swój serwis **imprezja-quiz**
3. Menu **Environment** (po lewej)
4. Dodaj zmienne:

| Key | Value |
|-----|-------|
| `RESEND_API_KEY` | `re_xxxxxxxx` (wklej swój klucz z Resend) |
| `LICENSE_EMAIL_FROM` | `licencje@nowajakoscrozrywki.pl` |

5. **Usuń** (jeśli są) zmienne SMTP, żeby nie kolidowały:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`

6. Kliknij **Save Changes**

---

## Krok 7: Redeploy

1. W Render, w tym samym serwisie
2. Menu **Manual Deploy** (u góry)
3. Kliknij **Deploy latest commit**
4. Poczekaj 2–3 minuty na zakończenie deployu

---

## Krok 8: Test

1. Wejdź na stronę cennika (nowajakoscrozrywki.pl)
2. Zrób płatność testową (np. karta 4242 4242 4242 4242)
3. Na stronie sukcesu wpisz Machine ID z programu
4. Kliknij **Wyślij klucz na e-mail**
5. Sprawdź skrzynkę (również spam) – powinien przyjść e-mail z kluczem

---

## Adres nadawcy (LICENSE_EMAIL_FROM)

Musi być z Twojej zweryfikowanej domeny. Przykłady:
- `licencje@nowajakoscrozrywki.pl`
- `kontakt@nowajakoscrozrywki.pl`
- `noreply@nowajakoscrozrywki.pl`

---

## Gdy coś nie działa

- **Domena nie weryfikuje się** – poczekaj na propagację DNS (do 24 h), sprawdź czy rekordy są dokładnie jak w Resend
- **Błąd „Unauthorized”** – sprawdź czy `RESEND_API_KEY` jest poprawny, bez spacji
- **E-mail nie przychodzi** – sprawdź spam, folder Oferty; w Resend → **Logs** zobaczysz status wysyłki
