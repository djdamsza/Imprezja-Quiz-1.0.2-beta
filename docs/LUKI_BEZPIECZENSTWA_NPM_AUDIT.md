# Lista luk bezpieczeństwa (npm audit)

**Data:** 2025-03-12  
**Status:** 9 luk (1 low, 6 moderate, 2 high)

---

## 1. ajv (moderate)

| Pole | Wartość |
|------|---------|
| **Pakiet** | `ajv` |
| **Wersje zagrożone** | `&lt;6.14.0` |
| **Zależność** | Pośrednia |
| **CVE/Advisory** | [GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6) |
| **Opis** | ReDoS (Regular Expression Denial of Service) przy użyciu opcji `$data` |
| **CWE** | CWE-400 (Uncontrolled Resource Consumption), CWE-1333 (Inefficient Regular Expression) |
| **Naprawa** | `npm audit fix` |

---

## 2. electron (moderate)

| Pole | Wartość |
|------|---------|
| **Pakiet** | `electron` |
| **Wersje zagrożone** | `&lt;35.7.5` |
| **Zależność** | Bezpośrednia (devDependencies) |
| **CVE/Advisory** | [GHSA-vmqv-hx8q-j7mg](https://github.com/advisories/GHSA-vmqv-hx8q-j7mg) |
| **Opis** | ASAR Integrity Bypass – obejście integralności przez modyfikację zasobów |
| **CVSS** | 6.1 (AV:L/AC:L/PR:L/UI:R/S:U/C:L/I:H/A:L) |
| **CWE** | CWE-94 (Code Injection), CWE-829 (Inclusion of Functionality from Untrusted Control Sphere) |
| **Naprawa** | `npm audit fix --force` → **electron@41.0.2** (breaking change) |

---

## 3. file-type (moderate)

| Pole | Wartość |
|------|---------|
| **Pakiet** | `file-type` |
| **Wersje zagrożone** | `13.0.0 - 21.3.0` |
| **Zależność** | Pośrednia (przez `@jimp/core` → `jimp`) |
| **CVE/Advisory** | [GHSA-5v7r-6r5c-r473](https://github.com/advisories/GHSA-5v7r-6r5c-r473) |
| **Opis** | Infinite loop w parserze ASF przy zniekształconym wejściu z zerowym sub-headerem |
| **CVSS** | 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L) |
| **CWE** | CWE-835 (Infinite Loop) |
| **Naprawa** | `npm audit fix --force` → **jimp@1.6.0** (breaking change) |

---

## 4. jimp (moderate)

| Pole | Wartość |
|------|---------|
| **Pakiet** | `jimp` |
| **Wersje zagrożone** | `0.16.3 - 0.22.12` |
| **Zależność** | Bezpośrednia |
| **CVE/Advisory** | Zależność od `file-type` (patrz wyżej) |
| **Naprawa** | `npm audit fix --force` → **jimp@1.6.0** (breaking change) |

---

## 5. minimatch (high)

| Pole | Wartość |
|------|---------|
| **Pakiet** | `minimatch` |
| **Wersje zagrożone** | `&lt;=3.1.3` \|\| `5.0.0 - 5.1.7` \|\| `9.0.0 - 9.0.6` \|\| `10.0.0 - 10.2.2` |
| **Zależność** | Pośrednia (electron-builder, archiver, glob, cacache, itd.) |
| **CVE/Advisory** | [GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26), [GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj), [GHSA-23c5-xmqv-rm74](https://github.com/advisories/GHSA-23c5-xmqv-rm74) |
| **Opis** | ReDoS (Regular Expression Denial of Service) – wielokrotne wildcardy, GLOBSTAR, extglobs |
| **CWE** | CWE-1333 (Inefficient Regular Expression) |
| **Naprawa** | `npm audit fix` |

---

## 6. qs (moderate)

| Pole | Wartość |
|------|---------|
| **Pakiet** | `qs` |
| **Wersje zagrożone** | `6.7.0 - 6.14.1` |
| **Zależność** | Pośrednia |
| **CVE/Advisory** | [GHSA-w7fw-mjwx-w883](https://github.com/advisories/GHSA-w7fw-mjwx-w883) |
| **Opis** | arrayLimit bypass w parsowaniu przecinków – DoS (Denial of Service) |
| **Naprawa** | `npm audit fix` |

---

## 7. tar (high)

| Pole | Wartość |
|------|---------|
| **Pakiet** | `tar` |
| **Wersje zagrożone** | `&lt;=7.5.10` |
| **Zależność** | Pośrednia |
| **CVE/Advisory** | [GHSA-83g3-92jg-28cx](https://github.com/advisories/GHSA-83g3-92jg-28cx), [GHSA-qffp-2rhf-9h96](https://github.com/advisories/GHSA-qffp-2rhf-9h96), [GHSA-9ppj-qmqm-q256](https://github.com/advisories/GHSA-9ppj-qmqm-q256) |
| **Opis** | Arbitrary File Read/Write via Hardlink Target Escape Through Symlink Chain; Hardlink Path Traversal; Symlink Path Traversal via Drive-Relative Linkpath |
| **Naprawa** | `npm audit fix` |

---

## 8. @jimp/core (moderate)

| Pole | Wartość |
|------|---------|
| **Pakiet** | `@jimp/core` |
| **Zależność** | Pośrednia (przez jimp) |
| **CVE** | Zależność od `file-type` – patrz #3 |
| **Naprawa** | `npm audit fix --force` → jimp 1.6.0 |

---

## 9. @jimp/custom (moderate)

| Pole | Wartość |
|------|---------|
| **Pakiet** | `@jimp/custom` |
| **Zależność** | Pośrednia (przez jimp) |
| **CVE** | Zależność od `@jimp/core` → `file-type` |
| **Naprawa** | `npm audit fix --force` → jimp 1.6.0 |

---

## Zalecane działania

### 1. Bez breaking changes (bezpieczne)

```bash
npm audit fix
```

Naprawi: **ajv**, **minimatch**, **qs**, **tar**.

### 2. Z breaking changes (wymaga testów)

```bash
npm audit fix --force
```

Dodatkowo zaktualizuje: **electron** (28 → 41), **jimp** (0.22 → 1.6).  
**Uwaga:** electron 41 może wymagać zmian w kodzie; jimp 1.x ma API różne od 0.x.

### 3. Ręczne podejście

- **electron**: zaktualizować do `^35.7.5` (jeśli dostępna wersja patch) – sprawdzić `npm view electron versions`.
- **jimp**: rozważyć zamianę na `sharp` (już w projekcie) tam, gdzie jimp jest używany do przetwarzania obrazów; sharp jest szybszy i lepiej utrzymywany.
