/**
 * Walidacja eksportu imprezja-hitl-enqueue pod kątem znanych literówek n8n (=={{, =Authorization).
 * Użycie: node scripts/validate-hitl-n8n-export.mjs [ścieżka/do/imprezja-hitl-enqueue.json]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const enqueuePath =
  process.argv[2] ||
  path.join(process.env.HOME || '', 'Downloads/imprezja-hitl-enqueue.json');

let raw;
try {
  raw = fs.readFileSync(enqueuePath, 'utf8');
} catch (e) {
  console.error('Nie można odczytać pliku:', enqueuePath, e.message);
  process.exit(1);
}

const wf = JSON.parse(raw);
const nodes = wf.nodes || [];

const perplexity = nodes.find((n) => n.name === 'HTTP_Perplexity_DraftReply');
const respondOk = nodes.find((n) => n.name === 'Respond_OK');

const headers = perplexity?.parameters?.headerParameters?.parameters || [];
const authHeader = headers.find((h) =>
  String(h.name || '').toLowerCase().includes('authorization')
);

const badAuthName = authHeader && String(authHeader.name) !== 'Authorization';
const badAuthValue =
  authHeader && String(authHeader.value || '').startsWith('=={{');
const badRespondOk =
  respondOk &&
  String(respondOk.parameters?.responseBody || '').startsWith('=={{');

const result = { badAuthName, badAuthValue, badRespondOk, path: enqueuePath };
console.log(JSON.stringify(result, null, 2));
if (badAuthName || badAuthValue || badRespondOk) {
  process.exit(2);
}
