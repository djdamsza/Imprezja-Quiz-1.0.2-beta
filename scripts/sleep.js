#!/usr/bin/env node
/**
 * Cross-platform: czeka N ms (domyślnie 2000).
 * Użycie: node scripts/sleep.js [ms]
 */
const ms = parseInt(process.argv[2], 10) || 2000;
setTimeout(() => process.exit(0), ms);
