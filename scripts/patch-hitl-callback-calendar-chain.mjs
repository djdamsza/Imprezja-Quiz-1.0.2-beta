/**
 * Wstawia do imprezja-hitl-telegram-callback.json łańcuch:
 * date_ok → Google Calendar → PrepareOfertaMails → BuildSheet || (bez) Perplexity Resend
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const automailPath = path.join(root, 'docs/n8n-workflows/automail-imap-fixed.json');
const callbackPath = path.join(root, 'docs/n8n-workflows/imprezja-hitl-telegram-callback.json');

const automail = JSON.parse(fs.readFileSync(automailPath, 'utf8'));
let callback = JSON.parse(fs.readFileSync(callbackPath, 'utf8'));

function cloneNode(name) {
  const n = automail.nodes.find((x) => x.name === name);
  if (!n) throw new Error('Missing node ' + name);
  return JSON.parse(JSON.stringify(n));
}

function prefixId(base, suffix) {
  return (base.slice(0, 28) + suffix).slice(0, 36);
}

const PREFIX = 'HitlCal_';
const nodesToAdd = [];

const nIfDate = cloneNode('If_DateOK1');
nIfDate.id = prefixId(nIfDate.id, 'a1');
nIfDate.name = PREFIX + 'If_DateOK1';
nIfDate.position = [2000, 1000];
nodesToAdd.push(nIfDate);

const nBuildCal = cloneNode('Code_BuildCalWindow');
nBuildCal.id = prefixId(nBuildCal.id, 'a2');
nBuildCal.name = PREFIX + 'Code_BuildCalWindow';
nBuildCal.position = [2220, 920];
nodesToAdd.push(nBuildCal);

const nIfCalRng = cloneNode('If_CalendarRangeOk');
nIfCalRng.id = prefixId(nIfCalRng.id, 'a3');
nIfCalRng.name = PREFIX + 'If_CalendarRangeOk';
nIfCalRng.position = [2440, 920];
nodesToAdd.push(nIfCalRng);

const nGcal = cloneNode('Google_Calendar_EventsForColorCheck');
nGcal.id = prefixId(nGcal.id, 'a4');
nGcal.name = PREFIX + 'Google_Calendar_EventsForColorCheck';
nGcal.position = [2660, 840];
const pG = JSON.stringify(nGcal.parameters);
nGcal.parameters = JSON.parse(
  pG.replaceAll("$('Code_BuildCalWindow')", "$('HitlCal_Code_BuildCalWindow')")
);
nodesToAdd.push(nGcal);

const nMerge = cloneNode('Code_MergeCalendarAvailability');
nMerge.id = prefixId(nMerge.id, 'a5');
nMerge.name = PREFIX + 'Code_MergeCalendarAvailability';
nMerge.position = [2880, 840];
nMerge.parameters.jsCode = nMerge.parameters.jsCode.replaceAll(
  "$('Code_BuildCalWindow')",
  "$('HitlCal_Code_BuildCalWindow')"
);
nodesToAdd.push(nMerge);

const nPrep = cloneNode('PrepareOfertaMails');
nPrep.id = prefixId(nPrep.id, 'a6');
nPrep.name = PREFIX + 'PrepareOfertaMails';
nPrep.position = [3100, 880];
nodesToAdd.push(nPrep);

const ifHasOffer = {
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
      conditions: [
        {
          id: 'ho1',
          leftValue: '={{ String($json.html_wolny || "").length > 50 }}',
          rightValue: true,
          operator: { type: 'boolean', operation: 'equals' },
        },
      ],
      combinator: 'and',
    },
    options: {},
  },
  id: 'hitl-if-has-offer-html',
  name: 'If_HitlHasPreparedOffer',
  type: 'n8n-nodes-base.if',
  typeVersion: 2.2,
  position: [2220, 1080],
  notesInFlow: true,
  notes: 'true = był **PrepareOfertaMails** (wolny/zajęty); false = tylko arkusz + ewentualnie Perplexity.',
};

const nSkip = cloneNode('If_SkipClientOfferResend');
nSkip.id = prefixId(nSkip.id, 'a7');
nSkip.name = PREFIX + 'If_SkipClientOfferResend';
nSkip.position = [2440, 1080];
nodesToAdd.push(nSkip);

const noOpSkipClar = {
  parameters: {},
  id: 'hitl-noop-skip-clar',
  name: 'NoOp_HitlSkipClarificationBranch',
  type: 'n8n-nodes-base.noOp',
  typeVersion: 1,
  position: [2660, 1000],
  notes: 'HITL: gałąź „skip oferty” z automaila — tu bez drugiego maila doprecyzowania.',
};

const nBlock = cloneNode('If_BlockDuplicateOfferSend');
nBlock.id = prefixId(nBlock.id, 'a8');
nBlock.name = PREFIX + 'If_BlockDuplicateOfferSend';
nBlock.position = [2660, 1160];
nodesToAdd.push(nBlock);

const nDupNo = cloneNode('NoOp_DuplicateResendSkipped');
nDupNo.id = prefixId(nDupNo.id, 'a9');
nDupNo.name = PREFIX + 'NoOp_DuplicateResendSkipped';
nDupNo.position = [2880, 1240];
nodesToAdd.push(nDupNo);

const nTerm = cloneNode('If_TerminWolny');
nTerm.id = prefixId(nTerm.id, 'b1');
nTerm.name = PREFIX + 'If_TerminWolny';
nTerm.position = [2880, 1080];
nodesToAdd.push(nTerm);

const nRw = cloneNode('Resend_WolnyTermin');
nRw.id = prefixId(nRw.id, 'b2');
nRw.name = PREFIX + 'Resend_WolnyTermin';
nRw.position = [3100, 1000];
nodesToAdd.push(nRw);

const nRz = cloneNode('Resend_TerminZajety');
nRz.id = prefixId(nRz.id, 'b3');
nRz.name = PREFIX + 'Resend_TerminZajety';
nRz.position = [3100, 1160];
nodesToAdd.push(nRz);

const nFu = cloneNode('NoOp_FollowUp3d_SheetHint');
nFu.id = prefixId(nFu.id, 'b4');
nFu.name = PREFIX + 'NoOp_FollowUp3d_SheetHint';
nFu.position = [3320, 1080];
nodesToAdd.push(nFu);

const noOpNoOfferBranch = {
  parameters: {},
  id: 'hitl-noop-no-offer-email',
  name: 'NoOp_HitlNoOfferEmailBranch',
  type: 'n8n-nodes-base.noOp',
  typeVersion: 1,
  position: [2440, 1200],
};

const ifNeedPerplexity = {
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
      conditions: [
        {
          id: 'p1',
          leftValue: '={{ String($("Code_BuildSheetRowZapytania").first().json.html_wolny || "").length < 50 }}',
          rightValue: true,
          operator: { type: 'boolean', operation: 'equals' },
        },
      ],
      combinator: 'and',
    },
    options: {},
  },
  id: 'hitl-if-need-perplexity',
  name: 'If_HitlNeedPerplexityResend',
  type: 'n8n-nodes-base.if',
  typeVersion: 2.2,
  position: [2880, 1320],
  notes: 'Gdy nie było szablonu wolny/zajęty — wyślij **proposed_email_reply** (Perplexity).',
};

const noOpAfterSheet = {
  parameters: {},
  id: 'hitl-noop-after-sheet-offer-sent',
  name: 'NoOp_HitlAfterSheetOfferAlreadySent',
  type: 'n8n-nodes-base.noOp',
  typeVersion: 1,
  position: [3100, 1400],
};

nodesToAdd.push(
  ifHasOffer,
  noOpSkipClar,
  noOpNoOfferBranch,
  ifNeedPerplexity,
  noOpAfterSheet
);

const existingNames = new Set(callback.nodes.map((n) => n.name));
for (const n of nodesToAdd) {
  if (!existingNames.has(n.name)) {
    callback.nodes.push(n);
    existingNames.add(n.name);
  }
}

const C = callback.connections;

C.Code_PreparePayloadFromLead = {
  main: [[{ node: PREFIX + 'If_DateOK1', type: 'main', index: 0 }]],
};

C[PREFIX + 'If_DateOK1'] = {
  main: [
    [{ node: PREFIX + 'Code_BuildCalWindow', type: 'main', index: 0 }],
    [{ node: 'Code_BuildSheetRowZapytania', type: 'main', index: 0 }],
  ],
};

C[PREFIX + 'Code_BuildCalWindow'] = {
  main: [[{ node: PREFIX + 'If_CalendarRangeOk', type: 'main', index: 0 }]],
};

C[PREFIX + 'If_CalendarRangeOk'] = {
  main: [
    [{ node: PREFIX + 'Google_Calendar_EventsForColorCheck', type: 'main', index: 0 }],
    [{ node: PREFIX + 'PrepareOfertaMails', type: 'main', index: 0 }],
  ],
};

C[PREFIX + 'Google_Calendar_EventsForColorCheck'] = {
  main: [[{ node: PREFIX + 'Code_MergeCalendarAvailability', type: 'main', index: 0 }]],
};

C[PREFIX + 'Code_MergeCalendarAvailability'] = {
  main: [[{ node: PREFIX + 'PrepareOfertaMails', type: 'main', index: 0 }]],
};

C[PREFIX + 'PrepareOfertaMails'] = {
  main: [[{ node: 'Code_BuildSheetRowZapytania', type: 'main', index: 0 }]],
};

C.Code_BuildSheetRowZapytania = {
  main: [
    [
      { node: 'Code_SheetColumnsOnly', type: 'main', index: 0 },
      { node: 'If_HitlHasPreparedOffer', type: 'main', index: 0 },
    ],
  ],
};

C.If_HitlHasPreparedOffer = {
  main: [
    [{ node: PREFIX + 'If_SkipClientOfferResend', type: 'main', index: 0 }],
    [{ node: 'NoOp_HitlNoOfferEmailBranch', type: 'main', index: 0 }],
  ],
};

C[PREFIX + 'If_SkipClientOfferResend'] = {
  main: [
    [{ node: 'NoOp_HitlSkipClarificationBranch', type: 'main', index: 0 }],
    [{ node: PREFIX + 'If_BlockDuplicateOfferSend', type: 'main', index: 0 }],
  ],
};

C[PREFIX + 'If_BlockDuplicateOfferSend'] = {
  main: [
    [{ node: PREFIX + 'If_TerminWolny', type: 'main', index: 0 }],
    [{ node: PREFIX + 'NoOp_DuplicateResendSkipped', type: 'main', index: 0 }],
  ],
};

C[PREFIX + 'If_TerminWolny'] = {
  main: [
    [{ node: PREFIX + 'Resend_WolnyTermin', type: 'main', index: 0 }],
    [{ node: PREFIX + 'Resend_TerminZajety', type: 'main', index: 0 }],
  ],
};

C[PREFIX + 'Resend_WolnyTermin'] = {
  main: [[{ node: PREFIX + 'NoOp_FollowUp3d_SheetHint', type: 'main', index: 0 }]],
};
C[PREFIX + 'Resend_TerminZajety'] = {
  main: [[{ node: PREFIX + 'NoOp_FollowUp3d_SheetHint', type: 'main', index: 0 }]],
};

C.GoogleSheets_AppendZapytania = {
  main: [[{ node: 'If_HitlNeedPerplexityResend', type: 'main', index: 0 }]],
};

C.If_HitlNeedPerplexityResend = {
  main: [
    [{ node: 'Code_HitlResendHtml', type: 'main', index: 0 }],
    [{ node: 'NoOp_HitlAfterSheetOfferAlreadySent', type: 'main', index: 0 }],
  ],
};

fs.writeFileSync(callbackPath, JSON.stringify(callback, null, 2));
console.log('Patched', callbackPath);
