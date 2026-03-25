// Reference sources for web-watch-weekly Code nodes (copy into JSON after JSON.stringify escape).
// --- Code_ScanKeywords body ---
function stripTags(h) {
  return String(h || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywordToRegExp(kw) {
  if (typeof kw !== 'string' || !kw.trim()) return null;
  try {
    return new RegExp(kw.trim(), 'i');
  } catch (e) {
    return null;
  }
}

function warsawTodayYmd() {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const s = fmt.format(new Date());
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  } catch (e) {}
  const d = new Date();
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}

function ymdCompare(a, b) {
  if (!a || !b) return 0;
  return a < b ? -1 : a > b ? 1 : 0;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toYmd(year, month, day) {
  return year + '-' + pad2(month) + '-' + pad2(day);
}

const MONTH_GEN =
  'stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|wrze(?:ś|s)nia|pa(?:ź|z)dziernika|listopada|grudnia';
const MONTH_MAP = {
  stycznia: 1,
  lutego: 2,
  marca: 3,
  kwietnia: 4,
  maja: 5,
  czerwca: 6,
  lipca: 7,
  sierpnia: 8,
  września: 9,
  wrzesnia: 9,
  października: 10,
  pazdziernika: 10,
  listopada: 11,
  grudnia: 12,
};

function normMonthKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ź/g, 'z')
    .replace(/ż/g, 'z');
}

const MONTH_MAP_N = {};
for (const k of Object.keys(MONTH_MAP)) {
  MONTH_MAP_N[normMonthKey(k)] = MONTH_MAP[k];
}

/** Mianownik w nagłówkach archiwum WP („luty 2026”) — MONTH_MAP ma głównie dopełniacz. */
const MONTH_NOMINATIVE = {
  styczeń: 1,
  styczen: 1,
  luty: 2,
  marzec: 3,
  kwiecień: 4,
  kwiecien: 4,
  maj: 5,
  czerwiec: 6,
  lipiec: 7,
  sierpień: 8,
  sierpien: 8,
  wrzesień: 9,
  wrzesien: 9,
  październik: 10,
  pazdziernik: 10,
  listopad: 11,
  grudzień: 12,
  grudzien: 12,
};

function extractDatesFromText(t) {
  const found = new Set();
  const s = String(t || '');
  let m;

  const reDMY = /\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/g;
  while ((m = reDMY.exec(s)) !== null) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const y = parseInt(m[3], 10);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) found.add(toYmd(y, mo, d));
  }

  const reYMD = /\b(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b/g;
  while ((m = reYMD.exec(s)) !== null) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) found.add(toYmd(y, mo, d));
  }

  // DD.MM.RR / DD-MM-RR (rok 00–69 → 2000+, 70–99 → 1900+); nie zjada DD.MM.2025 dzięki (?!\d).
  const reDMY2 = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2})(?!\d)\b/g;
  while ((m = reDMY2.exec(s)) !== null) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const y2 = parseInt(m[3], 10);
    const y = y2 >= 70 ? 1900 + y2 : 2000 + y2;
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 1990 && y <= 2099) found.add(toYmd(y, mo, d));
  }

  // WordPress: .../2026/02/ (archiwum miesiąca) → pierwszy dzień miesiąca (nie gdy jest dzień /2026/02/15/).
  const rePathYm = /\b(20\d{2})\/(\d{1,2})\/(?![0-9]{1,2}\/)/g;
  while ((m = rePathYm.exec(s)) !== null) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    if (mo >= 1 && mo <= 12) found.add(toYmd(y, mo, 1));
  }

  const rePL = new RegExp('\\b(\\d{1,2})\\s+(' + MONTH_GEN + ')\\s+(20\\d{2})\\b', 'gi');
  while ((m = rePL.exec(s)) !== null) {
    const d = parseInt(m[1], 10);
    const mo =
      MONTH_MAP[m[2].toLowerCase()] ||
      MONTH_MAP_N[normMonthKey(m[2])];
    const y = parseInt(m[3], 10);
    if (mo && d >= 1 && d <= 31) found.add(toYmd(y, mo, d));
  }

  const rePL_MY = new RegExp(
    '\\b(' +
      MONTH_GEN +
      '|styczeń|styczen|luty|marzec|kwiecień|kwiecien|maj|czerwiec|lipiec|sierpień|sierpien|wrzesień|wrzesien|październik|pazdziernik|listopad|grudzień|grudzien' +
      ')\\s+(20\\d{2})\\b',
    'gi',
  );
  while ((m = rePL_MY.exec(s)) !== null) {
    const key = m[1].toLowerCase();
    const mo =
      MONTH_MAP[key] ||
      MONTH_MAP_N[normMonthKey(m[1])] ||
      MONTH_NOMINATIVE[key] ||
      MONTH_NOMINATIVE[normMonthKey(m[1])];
    const y = parseInt(m[2], 10);
    if (mo) found.add(toYmd(y, mo, 1));
  }

  return Array.from(found);
}

function normalizeUrl(href, baseUrl) {
  try {
    const u = new URL(String(href).trim(), baseUrl);
    if (!/^https?:$/i.test(u.protocol)) return null;
    u.hash = '';
    return u.href;
  } catch (e) {
    return null;
  }
}

function linkLooksLikeNavOnly(anchor, href) {
  const a = (anchor || '').trim().toLowerCase();
  const h = (href || '').toLowerCase();
  if (!a) return true;
  if (a.length <= 1) return true;
  const junk =
    /^(strona główna|strona glowna|home|menu|szukaj|kontakt|english|polski|pl|en|»|›|››|\d{4})$/i;
  if (junk.test(a)) return true;
  const junk2 =
    /^(archiwum|kategorie|druki|korespondencja|zarząd|zarzad|trofea|wyniki|bieżące|biezace)$/i;
  if (junk2.test(a) && !/zawod|szach|turniej|mistrzostw|mp\b/i.test(h + ' ' + a)) return true;
  return false;
}

function anyKeywordMatches(blob, kws) {
  for (let i = 0; i < kws.length; i++) {
    const re = keywordToRegExp(kws[i]);
    if (re && re.test(blob)) return true;
  }
  return false;
}

/**
 * true = digest: wszystkie linki z trafieniami słów kluczowych (bez filtra „tylko przyszłe daty”).
 * Env n8n: WEB_WATCH_IGNORE_EVENT_DATE=1|0|true|false — nadpisuje domyślną wartość.
 */
const WEB_WATCH_DEFAULT_SKIP_EVENT_DATE = true;

function skipEventDateFilter() {
  try {
    const v = String($env.WEB_WATCH_IGNORE_EVENT_DATE || '')
      .trim()
      .toLowerCase();
    if (v === '0' || v === 'false' || v === 'no') return false;
    if (v === '1' || v === 'true' || v === 'yes') return true;
  } catch (e) {}
  return WEB_WATCH_DEFAULT_SKIP_EVENT_DATE;
}

function scanOneSite(site, raw) {
let html = '';
if (typeof raw === 'string') html = raw;
else if (raw && typeof raw.data === 'string') html = raw.data;
else if (raw && typeof raw.body === 'string') html = raw.body;
else if (raw && typeof raw.text === 'string') html = raw.text;
else if (raw && typeof raw.content === 'string') html = raw.content;
else html = JSON.stringify(raw || {});

let baseHost = '';
try {
  baseHost = new URL(site.url).hostname.replace(/^www\./i, '');
} catch (e) {}

const kws = site.keywords || [];
const linkRe = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const candidates = [];
let lm;
while ((lm = linkRe.exec(html)) !== null) {
  const hrefRaw = lm[1];
  if (/^\s*#|javascript:|mailto:/i.test(hrefRaw)) continue;
  const inner = lm[2];
  const anchor = stripTags(inner).slice(0, 220);
  const abs = normalizeUrl(hrefRaw, site.url);
  if (!abs) continue;
  let host = '';
  try {
    host = new URL(abs).hostname.replace(/^www\./i, '');
  } catch (e) {
    continue;
  }
  if (baseHost && host !== baseHost && !host.endsWith('.' + baseHost)) continue;
  if (linkLooksLikeNavOnly(anchor, abs)) continue;
  const start = Math.max(0, lm.index - 900);
  const windowHtml = html.slice(start, lm.index + 900);
  const windowText = stripTags(windowHtml);
  const blob = anchor + ' ' + abs + ' ' + windowText.slice(0, 800);
  if (!anyKeywordMatches(blob, kws)) continue;
  const dates = extractDatesFromText(blob);
  candidates.push({
    url: abs,
    title: anchor || abs,
    dates_found: dates,
    context: windowText.replace(/\s+/g, ' ').trim().slice(0, 300),
  });
}

// Domyślnie (skipEventDateFilter false): tylko daty ZAWODÓW od dziś w przyszłość (Europe/Warsaw).
// skipEventDateFilter true: wszystkie trafienia w linkach (dowolna data lub brak daty w kontekście).
const todayY = warsawTodayYmd();
const skipDates = skipEventDateFilter();
const futureRows = [];
const seenUrl = new Set();
for (const c of candidates) {
  let picked;
  if (skipDates) {
    picked = [...c.dates_found].sort(ymdCompare);
  } else {
    picked = c.dates_found.filter((d) => ymdCompare(d, todayY) >= 0).sort(ymdCompare);
  }
  if (!skipDates && picked.length === 0) continue;
  if (skipDates && picked.length === 0) {
    picked = [''];
  }
  const nextD = picked[0];
  const key = c.url.split('?')[0].replace(/\/$/, '');
  if (seenUrl.has(key)) continue;
  seenUrl.add(key);
  futureRows.push({
    date_ymd: nextD && /^\d{4}-\d{2}-\d{2}$/.test(nextD) ? nextD : '',
    date_label:
      nextD && /^\d{4}-\d{2}-\d{2}$/.test(nextD)
        ? nextD
        : '(brak daty w kontekście linku)',
    url: c.url,
    title: (c.title || '').trim() || c.url,
    excerpt: (c.context || '').trim(),
  });
}

futureRows.sort((a, b) => {
  const ka = a.date_ymd && /^\d{4}-\d{2}-\d{2}$/.test(a.date_ymd) ? a.date_ymd : '9999-12-31';
  const kb = b.date_ymd && /^\d{4}-\d{2}-\d{2}$/.test(b.date_ymd) ? b.date_ymd : '9999-12-31';
  return ymdCompare(ka, kb);
});

const text = stripTags(html);
const hits = [];
for (let i = 0; i < kws.length; i++) {
  const re = keywordToRegExp(kws[i]);
  if (!re || !re.test(text)) continue;
  const m = text.match(re);
  hits.push({ pattern: re.source, sample: m ? m[0] : '' });
}

const include_in_digest = futureRows.length > 0;

  return {
      site_id: site.id,
      site_name: site.name,
      site_url: site.url,
      fetched_ok: html.length > 80,
      html_length: html.length,
      keyword_hits: hits,
      has_keyword_hit: hits.length > 0,
      future_events: futureRows,
      skip_event_date_filter: skipDates,
      include_in_digest: include_in_digest,
      digest_note: include_in_digest
        ? skipDates
          ? 'Tryb bez filtra daty — widać wszystkie linki z trafieniami słów kluczowych (test). WEB_WATCH_IGNORE_EVENT_DATE=0 przywraca tylko przyszłe terminy.'
          : ''
        : 'Pominięto: brak linku z datą ZAWODÓW od dziś w przyszłość (Europe/Warsaw) przy słowach kluczowych. Data publikacji strony nie ma znaczenia.',
      text_snippet: text.slice(0, 400),
      text_hash: (function quickHash(s) {
        let h = 2166136261;
        for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
        return ('0000000' + (h >>> 0).toString(16)).slice(-16);
      })(text),
  };
}

const httpItems = $input.all();
const siteItems = $('Code_WebWatchConfig').all();
const out = [];
const n = Math.min(httpItems.length, siteItems.length);
for (let idx = 0; idx < n; idx++) {
  out.push({ json: scanOneSite(siteItems[idx].json, httpItems[idx].json) });
}
return out;
