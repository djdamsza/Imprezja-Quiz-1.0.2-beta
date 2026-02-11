#!/usr/bin/env node
/**
 * Generator kluczy licencyjnych IMPREZJA (format RSA)
 *
 * Wymaga klucza prywatnego:
 *   - IMPREZJA_LICENSE_PRIVATE_KEY (env) – zawartość pliku .pem
 *   - lub plik license-private.pem w katalogu projektu
 *
 * Użycie:
 *   node scripts/generate-license-key.js                    → klucz LT dla tego komputera
 *   node scripts/generate-license-key.js --type 1Y          → klucz na 1 rok
 *   node scripts/generate-license-key.js <MachineID>       → klucz LT dla klienta
 *   node scripts/generate-license-key.js --type 1Y <MachineID>
 *
 * Typy: LT (dożywotnia), 1M, 3M, 6M, 1Y
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const license = require(path.join(__dirname, '..', 'license.js'));

const LICENSE_TYPES = license.LICENSE_TYPES;

function base64urlEncode(buf) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getPrivateKey() {
    const fromEnv = process.env.IMPREZJA_LICENSE_PRIVATE_KEY;
    if (fromEnv) return fromEnv.replace(/\\n/g, '\n');
    const keyPath = path.join(__dirname, '..', 'license-private.pem');
    if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath, 'utf8');
    }
    throw new Error('Brak klucza prywatnego! Ustaw IMPREZJA_LICENSE_PRIVATE_KEY lub utwórz license-private.pem (node scripts/generate-license-keys-pair.js)');
}

function generateLicenseKeyRSA(machineId, type = 'LT') {
    const id = machineId != null && String(machineId).trim() ? String(machineId).trim() : license.getMachineId();
    const typeUpper = String(type).toUpperCase();
    if (!['LT', '1M', '3M', '6M', '1Y'].includes(typeUpper)) {
        throw new Error(`Nieznany typ: ${type}. Dozwolone: LT, 1M, 3M, 6M, 1Y`);
    }
    let expires = null;
    const durationMs = LICENSE_TYPES[typeUpper];
    if (durationMs) {
        expires = Date.now() + durationMs;
    }
    const payload = { m: id, t: typeUpper, e: expires };
    const payloadStr = JSON.stringify(payload);
    const sign = crypto.createSign('SHA256');
    sign.update(payloadStr);
    sign.end();
    const signature = sign.sign(getPrivateKey());
    return `IMPREZJA-RSA-${base64urlEncode(Buffer.from(payloadStr))}.${base64urlEncode(signature)}`;
}

const args = process.argv.slice(2);
let machineId = null;
let type = 'LT';

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
        console.log(`
Generator kluczy licencyjnych IMPREZJA (RSA)
============================================

Wymaga klucza prywatnego (license-private.pem lub IMPREZJA_LICENSE_PRIVATE_KEY).

Użycie:
  node scripts/generate-license-key.js
    → Klucz dożywotni (LT) dla tego komputera.

  node scripts/generate-license-key.js --type <TYP>
    → Klucz określonego typu. Typy: LT, 1M, 3M, 6M, 1Y

  node scripts/generate-license-key.js <MachineID>
    → Klucz dożywotni dla Machine ID klienta.

  node scripts/generate-license-key.js --type <TYP> <MachineID>
    → Klucz danego typu dla klienta.

Klucz testowy: IMPREZJA-TEST-TEST-TEST-TEST
`);
        process.exit(0);
    }
    if (args[i] === '--type' && args[i + 1]) {
        type = args[i + 1].toUpperCase();
        i++;
        continue;
    }
    if (!args[i].startsWith('-')) {
        machineId = args[i].trim();
    }
}

if (!machineId) {
    let currentMachineId;
    try {
        currentMachineId = license.getMachineId();
    } catch (err) {
        console.error('Nie udało się odczytać Machine ID:', err.message);
        process.exit(1);
    }
    try {
        const key = generateLicenseKeyRSA(null, type);
        const typeLabel = license.LICENSE_TYPE_LABELS[type] || type;
        console.log('Ten komputer:');
        console.log('  Machine ID: ' + currentMachineId);
        console.log('  Typ: ' + typeLabel + ' (' + type + ')');
        console.log('  Klucz:');
        console.log('  ' + key);
        console.log('');
        console.log('Dla innego komputera: node scripts/generate-license-key.js --type ' + type + ' <MachineID>');
    } catch (err) {
        console.error('Błąd:', err.message);
        process.exit(1);
    }
    process.exit(0);
}

try {
    const key = generateLicenseKeyRSA(machineId, type);
    const typeLabel = license.LICENSE_TYPE_LABELS[type] || type;
    console.log('Machine ID: ' + machineId);
    console.log('Typ: ' + typeLabel + ' (' + type + ')');
    console.log('Klucz:');
    console.log(key);
} catch (err) {
    console.error('Błąd:', err.message);
    process.exit(1);
}
