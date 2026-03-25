const fs = require('fs');
const path = require('path');
const scan = fs.readFileSync(path.join(__dirname, '_web-watch-scan-aggregate.js'), 'utf8');
const scanBody = scan.split('// --- Code_ScanKeywords body ---')[1].trim();

const aggregate = `function quickHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ('0000000000000000' + (h >>> 0).toString(16)).slice(-16) + '_' + s.length;
}
const items = $input.all().map((x) => x.json).filter((x) => x.include_in_digest && (x.future_events || []).length > 0);
const staticData = $getWorkflowStaticData('global');
if (!staticData.webWatchDedup) staticData.webWatchDedup = {};

const DIGEST_TO = 'nowaczykdamian@gmail.com';
const DIGEST_FROM = 'Biuro Imprezja <biuro@imprezja.pl>';

const totalEvents = items.reduce((acc, it) => acc + (it.future_events || []).length, 0);

const lines = [];
const skipDateHeader = items.length > 0 && items.some((x) => x.skip_event_date_filter);
if (skipDateHeader) {
  lines.push('web-watch — PODGLĄD (bez filtra daty): wszystkie trafienia w linkach');
  lines.push('Kryterium czasu WYŁĄCZONE — widać przeszłe terminy i wpisy bez daty w kontekście. Produkcja: WEB_WATCH_IGNORE_EVENT_DATE=0 lub WEB_WATCH_DEFAULT_SKIP_EVENT_DATE=false w skanie.');
} else {
  lines.push('web-watch — nadchodzące turnieje / zawody');
  lines.push('Kryterium: DATA ZAWODÓW (nie data ogłoszenia) od dziś w górę — jutro, za miesiąc, rok itd. Stara strona z przyszłym terminem jest OK.');
}
lines.push('Strefa „dziś”: Europe/Warsaw. Wygenerowano (UTC): ' + new Date().toISOString());
lines.push('Stron z treścią: ' + items.length + ' | Wydarzeń: ' + totalEvents);
lines.push('');

for (const it of items) {
  lines.push('────────────────────────────────────────');
  lines.push(it.site_name);
  lines.push('Strona startowa: ' + it.site_url);
  lines.push('');
  for (const ev of it.future_events) {
    lines.push('• ' + ev.date_label + ' — ' + ev.title);
    lines.push('  Link: ' + ev.url);
    if (ev.excerpt) lines.push('  Kontekst: ' + ev.excerpt);
    lines.push('');
  }
}

const body = lines.join('\\n');
const digestHash = quickHash(body);
const prev = staticData.webWatchDedup.lastDigestHash;
const unchanged = prev === digestHash && items.length > 0;
if (items.length > 0 && !unchanged) {
  staticData.webWatchDedup.lastDigestHash = digestHash;
  staticData.webWatchDedup.lastRunAt = new Date().toISOString();
}

const digest_subject = skipDateHeader
  ? '[web-watch] Podgląd (bez filtra daty): ' + totalEvents + ' pozycji (' + items.length + ' stron)'
  : '[web-watch] Nadchodzące terminy: ' + totalEvents + ' wydarzeń (' + items.length + ' stron)';

return [{
  json: {
    has_hits: items.length > 0,
    skip_duplicate_week: unchanged,
    digest_plain: body,
    digest_subject: digest_subject,
    digest_to: DIGEST_TO,
    digest_from: DIGEST_FROM,
    hit_count: items.length,
    digest_event_count: totalEvents,
  },
}];`;

function esc(s) {
  return JSON.stringify(s).slice(1, -1);
}

console.log('SCAN_LEN', scanBody.length);
console.log('AGG_LEN', aggregate.length);
const jpath = path.join(__dirname, 'web-watch-weekly.json');
const j = JSON.parse(fs.readFileSync(jpath, 'utf8'));
const nScan = j.nodes.find((n) => n.name === 'Code_ScanKeywords');
const nAgg = j.nodes.find((n) => n.name === 'Code_AggregateDigest');
nScan.parameters.jsCode = scanBody;
nScan.parameters.mode = 'runOnceForAllItems';
nAgg.parameters.jsCode = aggregate;
fs.writeFileSync(jpath, JSON.stringify(j, null, 2) + '\n');
console.log('Updated web-watch-weekly.json');
