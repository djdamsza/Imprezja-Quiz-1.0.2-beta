/**
 * Generuje web-watch-perplexity-weekly.json (workflow n8n: HTML → Perplexity → mail).
 * Uruchom: node docs/n8n-workflows/build-web-watch-perplexity.js
 */
const fs = require('fs');
const path = require('path');

const PPLX_SYSTEM = `Jesteś ekstraktorem informacji o turniejach i zawodach szachowych (w tym młodzieżowych, szkolnych, rejonowych) z surowego HTML stron.

Zwróć WYŁĄCZNIE jeden obiekt JSON — surowy, bez markdown, bez bloku kodu, bez komentarzy.

Struktura:
{
  "source_id": "string — musi być taka sama jak w wiadomości użytkownika",
  "items": [
    {
      "title": "string|null",
      "summary_pl": "1–4 zdania po polsku",
      "link": "string|null — pełny URL tylko jeśli wynika wyraźnie z HTML (atrybut href lub tekst)",
      "date_text": "string|null — termin lub data jak na stronie",
      "relevance": "high|medium|low",
      "matched_terms": ["opcjonalnie: które hasła z listy użytkownika pasują"]
    }
  ]
}

Zasady:
- Uwzględniaj treści związane ze szachy, turniejami, zawodami, rankingiem, dziećmi, młodzieżą, szkołą, OSZS, regionem — zgodnie z listą haseł od użytkownika (dopasowuj odmiany, synonimy).
- Jeśli nic nie pasuje: zwróć "items": [].
- Nie wymyślaj linków, dat ani nazw turniejów — opieraj się na HTML. Przy wątpliwościach: relevance "low" lub pomiń pozycję.
- Jedna pozycja w "items" = jeden turniej, komunikat, wiersz tabeli lub wyraźny blok treści.`;

const CODE_PREPARE = `const sites = $('Code_WebWatchConfig').all();
const i = typeof $itemIndex === 'number' ? $itemIndex : 0;
const site = sites[i] && sites[i].json ? sites[i].json : {};
const raw = $json;
let html = '';
if (typeof raw === 'string') html = raw;
else if (raw && typeof raw.data === 'string') html = raw.data;
else if (raw && typeof raw.body === 'string') html = raw.body;
else if (raw && typeof raw.text === 'string') html = raw.text;
else if (raw && typeof raw.content === 'string') html = raw.content;
else html = JSON.stringify(raw || {});

const maxChars = Math.min(Math.max(Number(site.maxHtmlChars) || 18000, 4000), 24000);
const htmlTrim = html.length > maxChars ? html.slice(0, maxChars) + '\\n\\n[... HTML obciety ...]' : html;
const kws = Array.isArray(site.keywords) ? site.keywords : [];
const keywordsLine = kws.map((k) => String(k).trim()).filter(Boolean).join(', ');

const pplx_system = ${JSON.stringify(PPLX_SYSTEM)};

const pplx_user =
  'Źródło: ' +
  String(site.name || '') +
  ' (' +
  String(site.url || '') +
  ')\\n' +
  'source_id: ' +
  String(site.id || '') +
  '\\n\\n' +
  'Szukaj treści powiązanych z hasłami (dowolne formy, odmiany): ' +
  (keywordsLine || '(brak listy)') +
  '\\n\\n' +
  'Poniżej surowy HTML strony (fragment). Wyciągnij tylko to, co pasuje do kryteriów:\\n\\n' +
  htmlTrim;

return [
  {
    json: {
      site_id: site.id,
      site_name: site.name,
      site_url: site.url,
      fetched_ok: html.length > 80,
      html_length: html.length,
      pplx_system,
      pplx_user,
    },
  },
];`;

const CODE_PARSE = `const prepAll = $('Code_PrepareForAi').all();
const idx = typeof $itemIndex === 'number' ? $itemIndex : 0;
const prep = prepAll[idx] && prepAll[idx].json ? prepAll[idx].json : {};
const root = $json;
const body = root.body && typeof root.body === 'object' ? root.body : root;
const raw = body.choices && body.choices[0] && body.choices[0].message ? body.choices[0].message.content : '{}';
let text = typeof raw === 'string' ? raw.trim() : JSON.stringify(raw);
text = text.replace(/^\\u0060\\u0060\\u0060(?:json)?\\s*/i, '').replace(/\\u0060\\u0060\\u0060\\s*$/, '').trim();
let data;
try {
  data = JSON.parse(text);
} catch (e) {
  data = {
    source_id: prep.site_id,
    items: [],
    parse_error: true,
    raw_snippet: text.slice(0, 600),
  };
}
const items = Array.isArray(data.items) ? data.items : [];
return [
  {
    json: {
      site_id: prep.site_id,
      site_name: prep.site_name,
      site_url: prep.site_url,
      perplexity_items: items,
      parse_error: data.parse_error === true,
      raw_snippet: data.raw_snippet || '',
    },
  },
];`;

const CODE_AGGREGATE = `function quickHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ('0000000000000000' + (h >>> 0).toString(16)).slice(-16) + '_' + s.length;
}

const blocks = $input.all().map((x) => x.json);
const lines = [];
lines.push('web-watch (Perplexity) — szachy / turnieje / zawody');
lines.push('Wygenerowano (UTC): ' + new Date().toISOString());
lines.push('Model: sonar (Perplexity). Treść z HTML + ekstrakcja AI — sprawdź linki ręcznie.');
lines.push('');

let total = 0;
let sitesWithHits = 0;
for (const b of blocks) {
  const items = b.perplexity_items || [];
  lines.push('════════════════════════════════════════');
  lines.push(String(b.site_name || b.site_id || '?'));
  lines.push('URL: ' + String(b.site_url || ''));
  lines.push('');
  if (b.parse_error) {
    lines.push('(!) Błąd parsowania JSON z API — fragment odpowiedzi:');
    lines.push(String(b.raw_snippet || '').slice(0, 400));
    lines.push('');
    continue;
  }
  if (!items.length) {
    lines.push('— Brak pozycji spełniających kryteria (wg AI).');
    lines.push('');
    continue;
  }
  sitesWithHits++;
  for (const it of items) {
    total++;
    const rel = it.relevance || 'medium';
    lines.push('• [' + rel + '] ' + (it.title || '(bez tytułu)'));
    if (it.date_text) lines.push('  Termin / data: ' + it.date_text);
    if (it.summary_pl) lines.push('  ' + String(it.summary_pl).replace(/\\n/g, ' '));
    if (it.link) lines.push('  Link: ' + it.link);
    if (it.matched_terms && it.matched_terms.length) lines.push('  Hasła: ' + it.matched_terms.join(', '));
    lines.push('');
  }
}

const staticData = $getWorkflowStaticData('global');
if (!staticData.webWatchPplxDedup) staticData.webWatchPplxDedup = {};
const digestPlain = lines.join('\\n');
const digestHash = quickHash(digestPlain);
const prev = staticData.webWatchPplxDedup.lastDigestHash;
const hasContent = total > 0;
const anyParseErr = blocks.some((b) => b.parse_error);
const unchanged = prev === digestHash && hasContent;
if (hasContent && !unchanged) {
  staticData.webWatchPplxDedup.lastDigestHash = digestHash;
  staticData.webWatchPplxDedup.lastRunAt = new Date().toISOString();
}

const DIGEST_TO = 'nowaczykdamian@gmail.com';
const DIGEST_FROM = 'Biuro Imprezja <biuro@imprezja.pl>';

const digest_subject =
  '[web-watch AI] Szachy: ' +
  total +
  ' pozycji' +
  (sitesWithHits ? ' (' + sitesWithHits + ' stron)' : '') +
  (anyParseErr && !total ? ' - blad parsowania' : '');

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const resend_payload = {
  from: DIGEST_FROM,
  to: DIGEST_TO,
  subject: digest_subject,
  html:
    '<pre style="font-family:ui-monospace,monospace;font-size:13px;white-space:pre-wrap">' +
    escapeHtml(digestPlain) +
    '</pre>',
};

return [
  {
    json: {
      has_hits: hasContent || anyParseErr,
      skip_duplicate_week: unchanged,
      digest_plain: digestPlain,
      digest_subject,
      digest_to: DIGEST_TO,
      digest_from: DIGEST_FROM,
      hit_count: sitesWithHits,
      digest_event_count: total,
      had_parse_error: anyParseErr,
      resend_payload,
    },
  },
];`;

const CONFIG_JS = `/**
 * SITES: url + keywords = zwykłe frazy dla Perplexity (nie RegExp).
 * maxHtmlChars: ile znaków HTML wysłać do API (domyślnie 18k).
 */
const SITES = [
  {
    id: 'oszs_zawody',
    name: 'OSZS — ZAWODY 2025/2026',
    url: 'https://www.oszs.info/5146-2',
    maxHtmlChars: 18000,
    keywords: [
      'szachy',
      'szach',
      'turniej',
      'zawody',
      'młodzież',
      'dzieci',
      'szkoła',
      'OSZS',
      'Ostrów',
      'Kalisz',
    ],
  },
  {
    id: 'wzszach_home',
    name: 'WZ Szach Poznań — start',
    url: 'https://wzszach.poznan.pl/',
    maxHtmlChars: 18000,
    keywords: ['Ostrów', 'Kalisz', 'szachy', 'turniej', 'młodzież', 'junior'],
  },
  {
    id: 'chessarbiter_list',
    name: 'Chessarbiter — lista turniejów',
    url: 'https://www.chessarbiter.com/turnieje.php',
    maxHtmlChars: 18000,
    keywords: ['Ostrów', 'Kalisz', 'szachy', 'dzieci', 'młodzież', 'turniej'],
  },
];

return SITES.map((s) => ({ json: s }));`;

const workflow = {
  name: 'web-watch-perplexity-weekly',
  nodes: [
    {
      parameters: {},
      id: 'pplx-m-001',
      name: 'Manual_Test',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [240, 300],
    },
    {
      parameters: {
        rule: {
          interval: [
            {
              field: 'weeks',
              weeksInterval: 1,
              triggerAtDay: [1],
              triggerAtHour: 8,
            },
          ],
        },
      },
      id: 'pplx-s-002',
      name: 'Schedule_Weekly',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [240, 480],
      notesInFlow: true,
      notes: 'Ustaw dzień/godzinę w UI. Strefa = serwer n8n.',
    },
    {
      parameters: { jsCode: CONFIG_JS },
      id: 'pplx-c-003',
      name: 'Code_WebWatchConfig',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [520, 380],
      notesInFlow: true,
      notes: 'Edytuj SITES — frazy keywords trafiają do promptu Perplexity.',
    },
    {
      parameters: {
        url: '={{ $json.url }}',
        options: {
          timeout: 60000,
          response: {
            response: {
              fullResponse: false,
              neverError: true,
              responseFormat: 'text',
            },
          },
        },
      },
      id: 'pplx-h-004',
      name: 'HTTP_FetchPage',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [760, 380],
      notesInFlow: true,
      notes: 'GET HTML (text). neverError — przy błędzie i tak idziemy dalej.',
    },
    {
      parameters: { jsCode: CODE_PREPARE },
      id: 'pplx-c-005',
      name: 'Code_PrepareForAi',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1000, 380],
      notesInFlow: true,
      notes: 'Łączy HTML z Code_WebWatchConfig (po indeksie). Buduje pplx_system + pplx_user.',
    },
    {
      parameters: {
        method: 'POST',
        url: 'https://api.perplexity.ai/chat/completions',
        authentication: 'none',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Accept', value: 'application/json' },
            {
              name: 'Authorization',
              value:
                "={{ 'Bearer ' + ($env.PERPLEXITY_API_KEY || $env.PPLX_API_KEY || '') }}",
            },
          ],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody:
          "={{ JSON.stringify({ model: 'sonar', temperature: 0.15, max_tokens: 3500, messages: [{ role: 'system', content: $json.pplx_system }, { role: 'user', content: $json.pplx_user }] }) }}",
        options: {},
      },
      id: 'pplx-h-006',
      name: 'HTTP_Perplexity',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [1240, 380],
      notesInFlow: true,
      notes:
        'Klucz: env PERPLEXITY_API_KEY lub PPLX_API_KEY, albo Credential Header Auth (usuń nagłówek z wyrażenia i dodaj Bearer w credential). Bez response_format: json_object.',
    },
    {
      parameters: { jsCode: CODE_PARSE },
      id: 'pplx-c-007',
      name: 'Code_ParsePerplexity',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1480, 380],
      notesInFlow: true,
      notes: 'JSON.parse treści choices[0].message.content; scala z metadanymi strony.',
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: CODE_AGGREGATE },
      id: 'pplx-c-008',
      name: 'Code_AggregateDigest',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1720, 380],
      notesInFlow: true,
      notes: 'Jeden digest + deduplikacja tygodnia (webWatchPplxDedup). Ustaw DIGEST_TO w kodzie.',
    },
    {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: '',
            typeValidation: 'loose',
            version: 2,
          },
          conditions: [
            {
              id: 'c1',
              leftValue: '={{ $json.has_hits && !$json.skip_duplicate_week }}',
              rightValue: true,
              operator: { type: 'boolean', operation: 'equals' },
            },
          ],
          combinator: 'and',
        },
        options: {},
      },
      id: 'pplx-i-009',
      name: 'If_HasHits',
      type: 'n8n-nodes-base.if',
      typeVersion: 2.2,
      position: [1960, 380],
    },
    {
      parameters: {
        method: 'POST',
        url: 'https://api.resend.com/emails',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: 'Authorization',
              value:
                "={{ 'Bearer ' + ($env.RESEND_API_KEY || $env.RESENDAPIKEY || '') }}",
            },
            { name: 'Content-Type', value: 'application/json' },
          ],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ JSON.stringify($json.resend_payload) }}',
        options: {},
      },
      id: 'pplx-h-010',
      name: 'HTTP_Resend_Digest',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [2200, 280],
      notesInFlow: true,
      notes: 'RESEND_API_KEY / RESENDAPIKEY — jak web-watch-weekly.',
    },
    {
      parameters: {},
      id: 'pplx-n-011',
      name: 'NoOp_NoMail',
      type: 'n8n-nodes-base.noOp',
      typeVersion: 1,
      position: [2200, 480],
      notesInFlow: true,
      notes: 'Brak trafień / błąd / ten sam hash co poprzednio.',
    },
  ],
  pinData: {},
  connections: {
    Manual_Test: { main: [[{ node: 'Code_WebWatchConfig', type: 'main', index: 0 }]] },
    Schedule_Weekly: { main: [[{ node: 'Code_WebWatchConfig', type: 'main', index: 0 }]] },
    Code_WebWatchConfig: { main: [[{ node: 'HTTP_FetchPage', type: 'main', index: 0 }]] },
    HTTP_FetchPage: { main: [[{ node: 'Code_PrepareForAi', type: 'main', index: 0 }]] },
    Code_PrepareForAi: { main: [[{ node: 'HTTP_Perplexity', type: 'main', index: 0 }]] },
    HTTP_Perplexity: { main: [[{ node: 'Code_ParsePerplexity', type: 'main', index: 0 }]] },
    Code_ParsePerplexity: { main: [[{ node: 'Code_AggregateDigest', type: 'main', index: 0 }]] },
    Code_AggregateDigest: { main: [[{ node: 'If_HasHits', type: 'main', index: 0 }]] },
    If_HasHits: {
      main: [
        [{ node: 'HTTP_Resend_Digest', type: 'main', index: 0 }],
        [{ node: 'NoOp_NoMail', type: 'main', index: 0 }],
      ],
    },
  },
  active: false,
  settings: { executionOrder: 'v1' },
  versionId: 'f7a8b9c0-1234-5678-9abc-def012345678',
  meta: { templateCredsSetupCompleted: false },
  id: 'f7a8b9c0-1234-5678-9abc-def012345678',
  tags: [],
};

const outPath = path.join(__dirname, 'web-watch-perplexity-weekly.json');
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2) + '\n');
console.log('Wrote', outPath);
