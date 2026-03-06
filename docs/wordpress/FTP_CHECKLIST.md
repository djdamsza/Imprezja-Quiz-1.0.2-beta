# Checklist FTP – imprezja.pl

Co sprawdzić i posprzątać przez FTP (FileZilla, Cyberduck, lub wbudowany w cPanel).

---

## 1. Połączenie

- **Host:** ftp.imprezja.pl lub IP serwera (sprawdź w panelu hostingu)
- **Użytkownik / hasło:** z panelu hostingu (często te same co do WordPress)
- **Port:** 21 (FTP) lub 22 (SFTP – bezpieczniejszy)

---

## 2. Struktura WordPress

```
/public_html/          (lub /www/, /htdocs/ – zależy od hostingu)
├── wp-admin/
├── wp-content/
│   ├── plugins/       ← wtyczki
│   ├── themes/        ← motywy
│   ├── uploads/       ← media
│   └── ...
├── wp-includes/
└── wp-config.php
```

---

## 3. Co sprawdzić

### wp-content/plugins/
- Wylistuj foldery
- Każdy folder = jedna wtyczka
- **Puste lub stare nazwy** (np. `plugin-old`, `hello.php` usunięty ale folder został) – można usunąć
- **Uwaga:** usuwaj tylko gdy masz pewność – lepiej dezaktywować w panelu WP

### wp-content/themes/
- Powinny być: **blocksy** (aktywny) + może **twentytwentyfour** (fallback)
- Motywy z nazwami typu `old-theme-backup` – jeśli nie używasz, można usunąć (oszczędność miejsca)

### wp-content/uploads/
- Sprawdź rozmiary plików
- Obrazy > 500 KB – warto skompresować (TinyPNG) i wgrać ponownie przez WP
- **Nie usuwaj** podfolderów `2024/`, `2025/` – WordPress ich używa

---

## 4. Czego NIE robić przez FTP

- Nie edytuj `wp-config.php` bez kopii (chyba że wiesz co robisz)
- Nie usuwaj folderów `wp-admin`, `wp-includes`
- Nie usuwaj aktywnych wtyczek „na ślepo” – najpierw dezaktywuj w panelu

---

## 5. Backup przez FTP

- Pobierz cały folder `wp-content` na dysk (archiwum ZIP)
- Lub użyj wtyczki UpdraftPlus – prostsze
