#!/usr/bin/env node
/**
 * Usuwa folder dist/ (build). node_modules usuń ręcznie jeśli potrzeba.
 */
const fs = require('fs');
const path = require('path');

function rmdirRecursive(dir) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.lstatSync(full).isDirectory()) rmdirRecursive(full);
        else fs.unlinkSync(full);
    }
    fs.rmdirSync(dir);
}

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
if (fs.existsSync(dist)) {
    rmdirRecursive(dist);
    console.log('✅ Usunięto folder dist/');
} else {
    console.log('📁 Folder dist/ nie istnieje – nic do usunięcia');
}
