#!/usr/bin/env node
/**
 * Wbija zawartość napraw-uninstaller.bat (Base64) w pliki WordPress HTML,
 * żeby przycisk „Pobierz” działał bez zewnętrznego linku.
 *
 * Ten skrypt **tylko podmienia** istniejący blok `<script …__impzqNaprawDl…>` — nie usuwa
 * sekcji z HTML ani niczego „bo link nie działa”.
 *
 * Uruchom z katalogu głównego repo:
 *   node scripts/embed-napraw-uninstaller-in-wordpress-docs.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const batPath = path.join(root, 'napraw-uninstaller.bat');
if (!fs.existsSync(batPath)) {
  console.error('Brak pliku:', batPath);
  process.exit(1);
}
const b64 = fs.readFileSync(batPath).toString('base64');
const scriptOpen = '<script data-no-optimize="1">(function(){var b64=\'';
const scriptRest = `';if(window.__impzqNaprawDl)return;window.__impzqNaprawDl=1;document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('.impzq-napraw-dl');if(!t)return;e.preventDefault();try{var s=atob(b64),n=s.length,u=new Uint8Array(n);for(var i=0;i<n;i++)u[i]=s.charCodeAt(i);var blob=new Blob([u],{type:'application/octet-stream'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='napraw-uninstaller.bat';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(a.href);}catch(err){alert('Nie udało się pobrać pliku. Odśwież stronę i spróbuj ponownie.');}},true);})();</script>`;

const fullScript = scriptOpen + b64 + scriptRest;

/** Cały tag &lt;script data-no-optimize&gt; z wbudowanym Base64 (dowolna wersja alertu). */
const reEmbedScript = /<script data-no-optimize="1">\(function\(\)\{var b64='[^']*';[\s\S]*?__impzqNaprawDl[\s\S]*?<\/script>/g;

const files = [
  'docs/wordpress/imprezja-quiz-produkt-pelna-tresc.html',
  'docs/wordpress/stripe-cennik.html',
  'docs/wordpress/01-pobierz.html'
];

for (const file of files) {
  const fp = path.join(root, file);
  let html = fs.readFileSync(fp, 'utf8');
  const count = (html.match(reEmbedScript) || []).length;
  if (count === 0) {
    console.warn('⚠️ Pominięto (brak bloku impzq napraw):', file);
    continue;
  }
  html = html.replace(reEmbedScript, fullScript);
  fs.writeFileSync(fp, html);
  console.log('✅', file, '(' + count + ' bloków)');
}

const ref = fs.readFileSync(batPath);
const dec = Buffer.from(b64, 'base64');
if (!dec.equals(ref)) throw new Error('base64 roundtrip');
const crypto = require('crypto');
console.log('SHA256 napraw-uninstaller.bat:', crypto.createHash('sha256').update(ref).digest('hex'));
