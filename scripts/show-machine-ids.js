#!/usr/bin/env node
/**
 * Wyświetla wszystkie Machine ID akceptowane przez Imprezja Quiz na tym komputerze.
 * Przy generowaniu klucza użyj: node scripts/generate-license-key.js <jeden_z_poniższych>
 */
const path = require('path');
const license = require(path.join(__dirname, '..', 'license.js'));
const ids = license.getMachineIdAlternatives();
console.log('Machine ID (główny – hostname+platform):', ids[0]);
if (ids.length > 1) {
  console.log('Alternatywne (np. UUID sprzętu) – klucz może być dla któregokolwiek:');
  ids.slice(1).forEach((id, i) => console.log('  ', id));
}
console.log('\nPełna lista (kopiuj do generatora):', ids.join(', '));
