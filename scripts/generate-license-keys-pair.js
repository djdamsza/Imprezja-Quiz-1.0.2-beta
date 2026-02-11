#!/usr/bin/env node
/**
 * Jednorazowe wygenerowanie pary kluczy RSA dla licencji IMPREZJA.
 * Uruchom raz, zapisz klucz prywatny w bezpiecznym miejscu (NIE w repozytorium).
 *
 * Użycie: node scripts/generate-license-keys-pair.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const projectRoot = path.join(__dirname, '..');
const privateKeyPath = path.join(projectRoot, 'license-private.pem');

fs.writeFileSync(privateKeyPath, privateKey);
console.log('✅ Klucz prywatny zapisany: license-private.pem');
console.log('');
console.log('⚠️  WAŻNE: Dodaj license-private.pem do .gitignore!');
console.log('   Ten plik służy TYLKO do generowania kluczy – nie pakuj go do aplikacji.');
console.log('');
console.log('📋 Klucz publiczny (wklej do license.js – PUBLIC_KEY_PEM):');
console.log('─'.repeat(60));
console.log(publicKey.replace(/\n/g, '\\n'));
console.log('─'.repeat(60));
console.log('');
console.log('Generator kluczy: IMPREZJA_LICENSE_PRIVATE_KEY="$(cat license-private.pem)" node scripts/generate-license-key.js --type 1Y <MachineID>');
console.log('Lub: node scripts/generate-license-key.js (odczyta license-private.pem z bieżącego katalogu)');
