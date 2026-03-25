#!/usr/bin/env node
/**
 * Sprawdza klucz względem tego komputera (bez zapisu).
 *   node scripts/verify-license-key-cli.js "IMPREZJA-RSA-..."
 */
const path = require('path');
const license = require(path.join(__dirname, '..', 'license.js'));
const key = (process.argv[2] || '').trim();
if (!key) {
  console.error('Użycie: node scripts/verify-license-key-cli.js "IMPREZJA-RSA-..."');
  process.exit(1);
}
const r = license.verifyLicenseKey(key);
console.log(r.valid ? 'OK' : 'BŁĄD', JSON.stringify(r, null, 2));
if (!r.valid) {
  console.log('\nTen komputer – akceptowane ID:', license.getMachineIdAlternatives().join(', '));
  process.exit(1);
}
