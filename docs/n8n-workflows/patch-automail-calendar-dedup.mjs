#!/usr/bin/env node
/**
 * Patch automail-imap-fixed.json:
 * 1) **Uwaga:** w repo zajętość = tylko **całodniowe** (`start.date`), **bez** kolorów — patrz aktualny **Code_MergeCalendarAvailability** / **Code_RollupRangeSaturdays** w JSON. Poniższy MERGE/ROLLUP w tym skrypcie może być niezsynchronizowany.
 * 2) Code_ListSaturdayCalWindows → single item + range_day_items (stops N duplicate Rollup/Resend runs).
 * 3) Dedup: automail_skip_duplicate_offer_send within 20 min (same client + action + dates).
 * 4) If_BlockDuplicateOfferSend + NoOp before Resend when duplicate.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jpath = path.join(__dirname, 'automail-imap-fixed.json');
const j = JSON.parse(fs.readFileSync(jpath, 'utf8'));

const LIST_SATURDAY = `const j = $input.first().json;
let tz = '+02:00';
try {
  if (typeof $env !== 'undefined' && $env.CALENDAR_BUSY_TZ_OFFSET) tz = String($env.CALENDAR_BUSY_TZ_OFFSET);
} catch (e) {}
function addOneDay(ymd) {
  const p = ymd.split('-').map((x) => parseInt(x, 10));
  const t = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  t.setUTCDate(t.getUTCDate() + 1);
  return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0');
}
let start = String(j.event_date_start || '').slice(0, 10);
let end = String(j.event_date_end || '').slice(0, 10);
if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(start) || !/^\\d{4}-\\d{2}-\\d{2}$/.test(end)) {
  return [{ json: { ...j, calStart: null, calEnd: null, range_day_items: [], calendar_check_note: 'range_invalid_dates' } }];
}
if (start > end) { const x = start; start = end; end = x; }
const span = (new Date(end + 'T12:00:00.000Z') - new Date(start + 'T12:00:00.000Z')) / 86400000;
if (span > 92) {
  return [{ json: { ...j, calStart: null, calEnd: null, range_day_items: [], calendar_check_note: 'range_too_long' } }];
}
const allDays = [];
for (let d = start; d <= end; ) {
  allDays.push(d);
  d = addOneDay(d);
}
const cap = 62;
const daysUse = allDays.slice(0, cap);
const range_day_items = [];
for (let day of daysUse) {
  const dayNext = addOneDay(day);
  range_day_items.push({
    calStart: day + 'T00:00:00.000' + tz,
    calEnd: dayNext + 'T00:00:00.000' + tz,
    check_date_ymd: day,
  });
}
const first = range_day_items[0] || null;
return [{
  json: {
    ...j,
    range_day_items,
    calStart: first ? first.calStart : null,
    calEnd: first ? first.calEnd : null,
    check_date_ymd: first ? first.check_date_ymd : null,
    calendar_query_mode: 'range_all_days',
    range_days_total_in_period: allDays.length,
    range_days_capped: allDays.length > cap,
    range_saturday_total_in_period: allDays.length,
    range_saturday_capped: allDays.length > cap,
  },
}];`;

const MERGE_CAL = `const route = $('Code_BuildCalWindow').first().json;

function parseBusyColorSet() {
  let raw = '';
  try {
    if (typeof $env !== 'undefined' && $env.CALENDAR_BUSY_COLOR_IDS != null && String($env.CALENDAR_BUSY_COLOR_IDS).trim() !== '') {
      raw = String($env.CALENDAR_BUSY_COLOR_IDS).trim();
    }
  } catch (e) {}
  if (!raw || /^off|false|0$/i.test(raw)) return new Set();
  return new Set(raw.split(/[,\\s]+/).map(function (s) { return s.trim(); }).filter(Boolean));
}
function addOneDayYmd(ymd) {
  const p = ymd.split('-').map(function (x) { return parseInt(x, 10); });
  const t = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  t.setUTCDate(t.getUTCDate() + 1);
  return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0');
}
function eventOverlapsYmd(ev, ymd) {
  if (!ev || !ev.start) return false;
  if (ev.start.date) {
    const s = String(ev.start.date).slice(0, 10);
    const e = ev.end && ev.end.date ? String(ev.end.date).slice(0, 10) : addOneDayYmd(s);
    return s <= ymd && e > ymd;
  }
  if (ev.start.dateTime) {
    const ds = String(ev.start.dateTime).slice(0, 10);
    const de = ev.end && ev.end.dateTime ? String(ev.end.dateTime).slice(0, 10) : ds;
    return ds <= ymd && de >= ymd;
  }
  return false;
}
/** Zajęty: dowolne wydarzenie (całodniowe lub z godziną) z colorId ∈ CALENDAR_BUSY_COLOR_IDS, które nachodzi na ten dzień kalendarzowy. */
function dayBlockedColoredEventOnYmd(events, ymd, colorSet) {
  if (!colorSet.size) return false;
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const cid = ev.colorId != null ? String(ev.colorId) : '';
    if (!colorSet.has(cid)) continue;
    if (eventOverlapsYmd(ev, ymd)) return true;
  }
  return false;
}

if (route.calendar_check_note) {
  return [{ json: { ...route } }];
}

const colorSet = parseBusyColorSet();
const dayY = route.calStart ? String(route.calStart).slice(0, 10) : String(route.event_date_start || '').slice(0, 10);
const rawEv = $input.all().map(function (x) { return x.json; }).filter(function (e) { return e && (e.id || e.summary); });

let wolny = true;
let dbg = 'ok';
if (!colorSet.size) {
  dbg = 'ustaw_CALENDAR_BUSY_COLOR_IDS_inaczej_zawsze_wolny';
} else if (!dayY || !/^\\d{4}-\\d{2}-\\d{2}$/.test(dayY)) {
  dbg = 'brak_dnia';
} else {
  wolny = !dayBlockedColoredEventOnYmd(rawEv, dayY, colorSet);
  dbg = wolny ? 'brak_blokady' : 'cal_colored_overlap';
}

return [{ json: {
  ...route,
  demo_termin_wolny: wolny,
  google_calendar_available: wolny,
  calendar_block_rule: 'colored_timed_or_allday',
  calendar_busy_by_all_day_color: !wolny,
  calendar_busy_color_ids: Array.from(colorSet).join(','),
  calendar_block_debug: dbg
} }];`;

// Rollup: read range_day_items from single input item; colored overlap (not only all-day)
const ROLLUP_START = `const inputBundle = $input.first().json;
const rangeItems = Array.isArray(inputBundle.range_day_items) ? inputBundle.range_day_items : [];
const listAll = rangeItems.map(function (w) {
  return { json: { ...inputBundle, calStart: w.calStart, calEnd: w.calEnd, check_date_ymd: w.check_date_ymd } };
});
if (!listAll.length) {
  const p = $('ParseAndRoute').first().json;
  return [{ json: { ...p, calendar_check_note: 'rollup_empty', demo_termin_wolny: true } }];
}
const j = { ...inputBundle };
function parseBusyColorSetRollup() {
  let raw = '';
  try {
    if (typeof $env !== 'undefined' && $env.CALENDAR_BUSY_COLOR_IDS != null && String($env.CALENDAR_BUSY_COLOR_IDS).trim() !== '') {
      raw = String($env.CALENDAR_BUSY_COLOR_IDS).trim();
    }
  } catch (e) {}
  if (!raw || /^off|false|0$/i.test(raw)) return new Set();
  return new Set(raw.split(/[,\\s]+/).map(function (s) { return s.trim(); }).filter(Boolean));
}
function addOneDayYmdR(y) {
  const p = y.split('-').map(function (x) { return parseInt(x, 10); });
  const t = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  t.setUTCDate(t.getUTCDate() + 1);
  return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0');
}
function eventOverlapsYmdR(ev, ymd) {
  if (!ev || !ev.start) return false;
  if (ev.start.date) {
    const s = String(ev.start.date).slice(0, 10);
    const e = ev.end && ev.end.date ? String(ev.end.date).slice(0, 10) : addOneDayYmdR(s);
    return s <= ymd && e > ymd;
  }
  if (ev.start.dateTime) {
    const ds = String(ev.start.dateTime).slice(0, 10);
    const de = ev.end && ev.end.dateTime ? String(ev.end.dateTime).slice(0, 10) : ds;
    return ds <= ymd && de >= ymd;
  }
  return false;
}
function dayBlockedColoredEventOnYmdR(events, ymd, colorSet) {
  if (!colorSet.size) return false;
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const cid = ev.colorId != null ? String(ev.colorId) : '';
    if (!colorSet.has(cid)) continue;
    if (eventOverlapsYmdR(ev, ymd)) return true;
  }
  return false;
}
const colorSetRollup = parseBusyColorSetRollup();
const evListRange = Array.isArray(j.rangeEventsForColor) ? j.rangeEventsForColor : [];
const free = [];
const busy = [];
const n = listAll.length;
for (let i = 0; i < n; i++) {
  const day = listAll[i].json.check_date_ymd;
  const av = !dayBlockedColoredEventOnYmdR(evListRange, day, colorSetRollup);
  if (av) free.push(day); else busy.push(day);
}`;

function findRollupSuffix(original) {
  const idx = original.indexOf('function plDate(ymd)');
  if (idx === -1) throw new Error('Rollup: plDate not found');
  return original.slice(idx);
}

const rollupNode = j.nodes.find((n) => n.name === 'Code_RollupRangeSaturdays');
const ROLLUP_FULL = ROLLUP_START + '\n' + findRollupSuffix(rollupNode.parameters.jsCode);

// --- Apply ---
const nList = j.nodes.find((x) => x.name === 'Code_ListSaturdayCalWindows');
nList.parameters.jsCode = LIST_SATURDAY;
nList.notes =
  'Zakres → **jeden item** z tablicą **range_day_items** (unik wielokrotnej wysyłki). Każdy dzień: calStart/calEnd/check_date_ymd.';

const nIfRange = j.nodes.find((x) => x.name === 'If_RangeSaturdayListOk');
nIfRange.parameters.conditions.conditions[0].leftValue =
  '={{ Array.isArray($json.range_day_items) && $json.range_day_items.length > 0 }}';

const nMerge = j.nodes.find((x) => x.name === 'Code_MergeCalendarAvailability');
nMerge.parameters.jsCode = MERGE_CAL;
nMerge.notes =
  '**Zajęty** = wydarzenie **z godziną lub całodniowe** + `colorId` ∈ **`CALENDAR_BUSY_COLOR_IDS`**. Wesela jako slot czasowy też blokują dzień.';

rollupNode.parameters.jsCode = ROLLUP_FULL;
rollupNode.notes =
  '**Run once for all items** — wejście = 1 item z **range_day_items**. Blokada: **kolor + nakładanie na dzień** (także timed).';

const nGCalRange = j.nodes.find((x) => x.name === 'Google_Calendar_RangeEventsForColor');
if (nGCalRange.notes) {
  nGCalRange.notes = nGCalRange.notes.replace('tylko całodniowe', 'kolory + całodniowe i z godziną');
}

// Code_BuildSheetRowZapytania: dedup + return fields
const nBuild = j.nodes.find((x) => x.name === 'Code_BuildSheetRowZapytania');
let bc = nBuild.parameters.jsCode;
const needle = `const resend_to = pickRecipientEmail(j);
const emailFromReadable = emailFromStr(j.emailFrom);`;
if (!bc.includes(needle)) throw new Error('BuildSheet: needle not found');
const insert = `const resend_to = pickRecipientEmail(j);
let automail_skip_duplicate_offer_send = false;
let automail_skip_duplicate_offer_reason = '';
try {
  const staticData = $getWorkflowStaticData('global');
  if (!staticData.automailOfferDedup) staticData.automailOfferDedup = {};
  const emailK = String(resend_to || '').trim().toLowerCase();
  const wa = String(j.wyslana_akcja || 'single_date');
  const rk = (dataTerminIso || '').slice(0, 10) + '_' + (dataTerminZakresDo || '').slice(0, 10);
  const dedupKey = emailK + '|' + wa + '|' + rk;
  const WINDOW_MS = 20 * 60 * 1000;
  const now = Date.now();
  const prev = staticData.automailOfferDedup[dedupKey];
  if (emailK.includes('@')) {
    if (prev != null && now - prev < WINDOW_MS) {
      automail_skip_duplicate_offer_send = true;
      automail_skip_duplicate_offer_reason = 'duplicate_within_20m_same_client_dates';
    } else {
      staticData.automailOfferDedup[dedupKey] = now;
    }
  }
} catch (e) {
  automail_skip_duplicate_offer_reason = 'dedup_err';
}
const emailFromReadable = emailFromStr(j.emailFrom);`;
bc = bc.replace(needle, insert);
const retNeedle = `return [{ json: { ...j, ...fullSheet, skip_client_offer_resend: skipOfferOnly } }];`;
if (!bc.includes(retNeedle)) throw new Error('BuildSheet return not found');
bc = bc.replace(
  retNeedle,
  `return [{ json: { ...j, ...fullSheet, skip_client_offer_resend: skipOfferOnly, automail_skip_duplicate_offer_send, automail_skip_duplicate_offer_reason } }];`
);
nBuild.parameters.jsCode = bc;

// New nodes
const ID_IF_DEDUP = 'c0ffee00-0001-4000-8000-000000000001';
const ID_NOOP_DEDUP = 'c0ffee00-0001-4000-8000-000000000002';

if (!j.nodes.some((n) => n.name === 'If_BlockDuplicateOfferSend')) {
  j.nodes.push({
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [
          {
            id: 'bd1',
            leftValue: '={{ $json.automail_skip_duplicate_offer_send !== true }}',
            rightValue: true,
            operator: { type: 'boolean', operation: 'equals' },
          },
        ],
        combinator: 'and',
      },
      options: {},
    },
    id: ID_IF_DEDUP,
    name: 'If_BlockDuplicateOfferSend',
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [5248, 2580],
    notesInFlow: true,
    notes:
      'Pomija **Resend** gdy ten sam klient + ten sam zakres/termin w ciągu **20 min** (np. potrójny submit formularza).',
  });
  j.nodes.push({
    parameters: {},
    id: ID_NOOP_DEDUP,
    name: 'NoOp_DuplicateResendSkipped',
    type: 'n8n-nodes-base.noOp',
    typeVersion: 1,
    position: [5488, 2720],
    notesInFlow: true,
    notes: 'Duplikat oferty w oknie czasu — bez drugiego maila do klienta.',
  });
}

// Rewire: If_SkipClientOfferResend branch 1 -> If_BlockDuplicateOfferSend -> If_TerminWolny / NoOp
const conn = j.connections;
conn.If_SkipClientOfferResend = {
  main: [
    conn.If_SkipClientOfferResend.main[0],
    [{ node: 'If_BlockDuplicateOfferSend', type: 'main', index: 0 }],
  ],
};
conn.If_BlockDuplicateOfferSend = {
  main: [
    [{ node: 'If_TerminWolny', type: 'main', index: 0 }],
    [{ node: 'NoOp_DuplicateResendSkipped', type: 'main', index: 0 }],
  ],
};

fs.writeFileSync(jpath, JSON.stringify(j, null, 2) + '\n');
console.log('Patched', jpath);

// Validate
JSON.parse(fs.readFileSync(jpath, 'utf8'));
new Function(j.nodes.find((n) => n.name === 'Code_ListSaturdayCalWindows').parameters.jsCode);
new Function(j.nodes.find((n) => n.name === 'Code_MergeCalendarAvailability').parameters.jsCode);
new Function(j.nodes.find((n) => n.name === 'Code_RollupRangeSaturdays').parameters.jsCode);
new Function(j.nodes.find((n) => n.name === 'Code_BuildSheetRowZapytania').parameters.jsCode);
console.log('JS syntax OK');
