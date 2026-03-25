#!/usr/bin/env node
/**
 * Analizuje zmiany w git i podpowiada, co przeklikać przed buildem.
 * Użycie: npm run qa:before-build
 *         node scripts/suggest-qa-before-build.js --short  (krótsze podsumowanie)
 *         node scripts/suggest-qa-before-build.js --json   (wynik maszynowy)
 *
 * Porównuje: niezacommitowane zmiany + (jeśli jest) zakres main..HEAD vs merge-base.
 */
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

/** Czytelne ścieżki UTF-8 z git (bez cudzysłowów i sekwencji \ooo) */
const GIT_NAME_OPTS = '-c core.quotePath=false';

function sh(cmd) {
  try {
    return execSync(cmd, { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }).trim();
  } catch {
    return '';
  }
}

function collectChangedFiles() {
  const set = new Set();
  const addLines = (s) => {
    s.split('\n').map((l) => l.trim()).filter(Boolean).forEach((f) => set.add(f));
  };
  addLines(sh(`git ${GIT_NAME_OPTS} diff --name-only HEAD`));
  addLines(sh(`git ${GIT_NAME_OPTS} diff --name-only --cached HEAD`));
  const base =
    sh('git merge-base HEAD main 2>/dev/null') ||
    sh('git merge-base HEAD master 2>/dev/null') ||
    '';
  if (base) {
    addLines(sh(`git ${GIT_NAME_OPTS} diff --name-only ${base}..HEAD`));
  }
  return [...set].sort();
}

/** Reguły: wzorzec ścieżki → etykiety + opis wpływu */
const RULES = [
  { re: /^server\.js$/i, tags: ['api', 'quiz', 'ws', 'upload', 'wszystkie-tryby'], hint: 'Backend: API, WebSocket, upload, routing — wpływa na całą aplikację i integrację z telefonem.' },
  { re: /^electron-main\.js$/i, tags: ['electron', 'okna', 'auto-update'], hint: 'Electron: okna, auto-update, ścieżki — sprawdź uruchomienie .app/.exe i „Sprawdź aktualizacje”.' },
  { re: /^license\.js$/i, tags: ['licencja'], hint: 'Licencja / trial — modal w start.html, tryby z kłódką, aktywacja klucza.' },
  { re: /^preload.*\.js$/i, tags: ['electron'], hint: 'Preload Electron — powiązane z uprawnieniami i mostkiem do UI.' },
  { re: /^package\.json$/i, tags: ['wersja', 'build'], hint: 'Wersja builda i zależności — upewnij się co do numeru wersji przed release.' },
  { re: /^package-lock\.json$/i, tags: ['deps'], hint: 'Zależności npm — po dużych zmianach warto `npm run qa:smoke-http` i szybki start aplikacji.' },

  { re: /^public\/admin\.html$/i, tags: ['quiz-admin'], hint: 'Panel admina quizu — pytania, start/koniec, synchronizacja z Screen i vote.' },
  { re: /^public\/Screen\.html$/i, tags: ['quiz-screen'], hint: 'Ekran TV quizu — slajdy, audio Wyborczego, przejścia między stanami.' },
  { re: /^public\/vote\.html$/i, tags: ['quiz-phone'], hint: 'Telefon gracza — głosowanie, dołączanie do sesji.' },
  { re: /^public\/editor\.html$/i, tags: ['quiz-editor'], hint: 'Edytor quizu — import, typy pytań, media.' },
  { re: /^public\/start\.html$/i, tags: ['start-menu'], hint: 'Menu startowe — tryby, zębatka, licencja, linki do poradników.' },

  { re: /^public\/admin-pwa/i, tags: ['admin-pwa'], hint: 'Admin PWA — status WebSocket, iframe muzyki, przełączanie ekranu głównego.' },
  { re: /^public\/screen-controller\.html$/i, tags: ['screen-controller'], hint: 'Kontroler ekranu głównego — współpraca z Admin PWA.' },

  /* Quiz — dane i warianty UI */
  { re: /^public\/quizzes\//i, tags: ['quiz-data'], hint: 'Pliki quizów (JSON) — wczytanie w edytorze, gra, import/eksport.' },
  { re: /^public\/editor-standalone\.html$/i, tags: ['quiz-editor'], hint: 'Edytor quizu (standalone) — jak editor.html.' },
  { re: /^public\/wyborczy-demo\//i, tags: ['wyborczy'], hint: 'Demo / flow Wyborczy — audio, ekran + telefon (regresja §13.4).' },

  /* Media, style, współdzielone zasoby frontu */
  { re: /^public\/uploads\//i, tags: ['upload'], hint: 'Upload użytkownika — obrazy/audio w pytaniach i grach (ścieżki / 404).' },
  { re: /^public\/css\//i, tags: ['public-styles'], hint: 'CSS globalny — wygląd start, PWA, ekranów (sprawdź kilka kluczowych stron).' },
  { re: /^public\/js\//i, tags: ['public-scripts'], hint: 'JS współdzielony (np. filtry) — edytor / vote / admin.' },
  { re: /^public\/lib\//i, tags: ['shared-libs'], hint: 'Biblioteki (audio, wizualizacje) — odtwarzanie, Milkdrop, normalizacja (§11).' },
  { re: /^public\/img\//i, tags: ['static-assets'], hint: 'Grafiki (logo, ikony PWA) — menu start, skróty.' },
  { re: /^public\/sfx\//i, tags: ['quiz-sfx'], hint: 'Efekty dźwiękowe — quiz / nakładki (głośność, odtwarzanie).' },
  { re: /^public\/favicon\.ico$/i, tags: ['static-assets'], hint: 'Favicon — zakładki przeglądarki / PWA.' },
  { re: /^public\/jszip\.min\.js$/i, tags: ['shared-libs'], hint: 'JSZip na froncie — eksport/import pakietów w edytorze.' },

  /* PWA / licencja / powitanie */
  { re: /^public\/manifest-admin\.json$/i, tags: ['admin-pwa', 'pwa-cache'], hint: 'Manifest Admin PWA — instalacja na telefonie, ikony.' },
  { re: /^public\/manifest\.json$/i, tags: ['quiz-phone', 'pwa-cache'], hint: 'Manifest (gra / strona) — PWA na telefonie.' },
  { re: /^public\/license-required\.html$/i, tags: ['licencja'], hint: 'Ekran „licencja wymagana” — trial, przekierowania z menu.' },
  { re: /^public\/onboarding-demo\.html$/i, tags: ['start-menu'], hint: 'Onboarding demo — pierwsze wrażenie, linki z menu.' },
  { re: /^public\/welcome-editor\.html$/i, tags: ['welcome-screen'], hint: 'Edytor ekranu powitalnego — TV + sterowanie z Admin PWA (§4).' },

  /* Wejścia HTML w katalogu public (skróty do trybów) */
  { re: /^public\/njr-sampler\.html$/i, tags: ['njr-sampler'], hint: 'Strona wejścia NJR Sampler (root).' },
  { re: /^public\/whitney\.html$/i, tags: ['whitney'], hint: 'Strona wejścia Whitney (root).' },
  { re: /^public\/spiewaj-dalej\.html$/i, tags: ['spiewaj-dalej'], hint: 'Strona wejścia Śpiewaj Dalej (root).' },
  { re: /^public\/bitwa-wokalna\.html$/i, tags: ['bitwa-wokalna'], hint: 'Strona wejścia Bitwa wokalna (root).' },
  { re: /^public\/imprezator\.html$/i, tags: ['imprezator'], hint: 'Strona wejścia Imprezator (root).' },

  /* Konfiguracje w katalogu głównym projektu */
  { re: /^njr-sampler-config\.json$/i, tags: ['njr-sampler'], hint: 'Główna konfiguracja NJR (ostatnio wybrany bank).' },
  { re: /^njr-sampler-last\.json$/i, tags: ['njr-sampler'], hint: 'Ostatni stan NJR — przywracanie po restarcie.' },
  { re: /^njr-sampler-bank-assignment\.json$/i, tags: ['njr-sampler'], hint: 'Przypisanie banków NJR — telefony / kanały.' },
  { re: /^public\/spiewaj-dalej-last\.json$/i, tags: ['spiewaj-dalej'], hint: 'Ostatnia lista Śpiewaj Dalej (public/).' },
  { re: /^spiewaj-dalej-last\.json$/i, tags: ['spiewaj-dalej'], hint: 'Ostatnia lista Śpiewaj Dalej (katalog główny).' },

  { re: /^public\/spiewaj-dalej-configs\//i, tags: ['spiewaj-dalej'], hint: 'Konfiguracje utworów Śpiewaj Dalej — lista na PC i telefonie.' },
  { re: /^public\/bitwa-wokalna-configs\//i, tags: ['bitwa-wokalna'], hint: 'Konfiguracje Bitwa wokalna.' },

  /* Build / tunel / Electron */
  { re: /^launcher\.js$/i, tags: ['electron'], hint: 'Launcher Windows — ścieżka do aplikacji.' },
  { re: /^build\//i, tags: ['electron-build-assets'], hint: 'Ikony .icns / .ico / PNG — instalator, dock, skróty (§12).' },
  { re: /^certs\//i, tags: ['tunnel-https'], hint: 'Certyfikaty dev HTTPS — admin Familiady / port 3443 (§10).' },
  { re: /^resources\/cloudflared/i, tags: ['tunnel-cloudflared'], hint: 'Binarka cloudflared — tunel zewnętrzny, pierwszy start (§10).' },

  { re: /^public\/familiada\//i, tags: ['familiada'], hint: 'Familiada — edytor, admin, ekran TV, przyciski na telefonie, koniec gry / idle.' },
  { re: /^public\/njr-sampler\//i, tags: ['njr-sampler'], hint: 'NJR Sampler — edytor, panel telefonu, kafelki, start/stop, cache.' },
  { re: /^public\/njr-sampler-configs\//i, tags: ['njr-sampler'], hint: 'Konfiguracje NJR — wczytanie banków na PC i telefonie.' },
  { re: /^public\/whitney\//i, tags: ['whitney'], hint: 'Whitney — telefon + ekran + audio.' },
  { re: /^public\/spiewaj-dalej\//i, tags: ['spiewaj-dalej'], hint: 'Śpiewaj Dalej — telefon, odtwarzanie, konfiguracje.' },
  { re: /^public\/bitwa-wokalna\//i, tags: ['bitwa-wokalna'], hint: 'Bitwa wokalna — jak wyżej (scenariusz muzyczny).' },
  { re: /^public\/imprezator\//i, tags: ['imprezator'], hint: 'Imprezator — playlisty, telefon, stream/kamera jeśli używasz.' },
  { re: /^public\/statki-solo\//i, tags: ['statki-solo'], hint: 'Statki Solo — edytor, admin PWA, ekran.' },
  { re: /^statki-solo-config\.json$/i, tags: ['statki-solo'], hint: 'Konfig Statki — wczytanie planszy w grze.' },

  { re: /^public\/prezentacje\//i, tags: ['prezentacja'], hint: 'Prezentacje — slajdy, media.' },
  { re: /^public\/editor-prezentacja\.html$/i, tags: ['prezentacja'], hint: 'Edytor prezentacji.' },
  { re: /^public\/prezentacja-screen\.html$/i, tags: ['prezentacja'], hint: 'Odtwarzanie prezentacji na TV.' },

  { re: /^public\/hot-or-not-champion\//i, tags: ['hot-or-not'], hint: 'Hot or Not — admin, głosowanie, ekran.' },
  { re: /^public\/wifi-analyzer\.html$/i, tags: ['wifi'], hint: 'WiFi Analyzer — skan 2,4 GHz.' },
  { re: /^public\/sw\.js$/i, tags: ['pwa-cache'], hint: 'Service Worker — cache PWA; po zmianach wymuś odświeżenie / tryb incognito na telefonie.' },

  { re: /^public\/poradniki\//i, tags: ['docs-poradniki'], hint: 'Poradniki — tylko treść pomocy (nie gameplay), chyba że linkowane z aplikacji.' },
  { re: /^CHANGELOG\.md$/i, tags: ['changelog'], hint: 'Changelog — treść release; opcjonalnie `npm run release:changelog` po publikacji.' },
  { re: /^docs\//i, tags: ['docs-only'], hint: 'Tylko dokumentacja — bez wpływu na build aplikacji (pomijaj testy UI).' },

  { re: /^scripts\/publish-release\.js$/i, tags: ['publish'], hint: 'Publikacja GitHub — nie wpływa na runtime aplikacji.' },
  { re: /^scripts\/update-release-changelog\.js$/i, tags: ['publish'], hint: 'Opis release na GitHubie.' },
  { re: /^scripts\/release-smoke-http\.js$/i, tags: ['qa-script'], hint: 'Skrypt smoke — uruchom `npm run qa:smoke-http`.' },
  { re: /^scripts\/suggest-qa-before-build\.js$/i, tags: ['qa-script'], hint: 'Ten skrypt sugestii — brak wpływu na runtime.' },
  { re: /^scripts\//i, tags: ['scripts-dev'], hint: 'Skrypt w scripts/ — oceń wpływ (build: cloudflared, ikona, clean; pomocnicze do serwera).' },

  { re: /^stripe-shop\//i, tags: ['stripe-shop'], hint: 'Sklep Stripe — osobny serwis; testy tylko jeśli zmieniasz checkout.' },
  { re: /^tools\//i, tags: ['tools-external'], hint: 'Narzędzia zewnętrzne (np. NJR editor) — poza głównym buildem Imprezji.' },

  { re: /^\.gitignore$/i, tags: ['repo-meta'], hint: 'Konfiguracja repozytorium — bez wpływu na runtime aplikacji.' },
  { re: /^Votebattle$/i, tags: ['repo-meta'], hint: 'Plik pomocniczy / stary zasób — oceń ręcznie czy wchodzi do builda.' },
];

const TAG_TO_CHECKLIST = {
  'api': { section: '§3–§6, §10', title: 'API / serwer — priorytet: Quiz + telefony + gry muzyczne + sieć' },
  'ws': { section: '§4', title: 'WebSocket — Admin PWA, synchronizacja z ekranem' },
  'quiz-admin': { section: '§3, §4', title: 'Admin quizu + ewentualnie PWA' },
  'quiz-screen': { section: '§3, §13.4', title: 'Ekran TV quizu (także Wyborczy / audio)' },
  'quiz-phone': { section: '§3', title: 'Telefon / vote.html' },
  'quiz-editor': { section: '§3', title: 'Edytor quizu' },
  'electron': { section: '§1, §12', title: 'Electron / instalator' },
  'okna': { section: '§11.2', title: 'Okna / drugi monitor' },
  'auto-update': { section: '§1.5, §12.4', title: 'Aktualizacje' },
  'licencja': { section: '§2', title: 'Licencja i trial' },
  'start-menu': { section: '§1', title: 'Menu startowe start.html' },
  'admin-pwa': { section: '§4, §13.1', title: 'Admin PWA (iframe muzyki, połączenie)' },
  'screen-controller': { section: '§4', title: 'Screen controller' },
  'familiada': { section: '§5, §13.3', title: 'Familiada (w tym koniec gry / idle na TV)' },
  'njr-sampler': { section: '§6.1, §13.2', title: 'NJR Sampler (PC + telefon)' },
  'whitney': { section: '§6.2', title: 'Whitney' },
  'spiewaj-dalej': { section: '§6.3', title: 'Śpiewaj Dalej' },
  'bitwa-wokalna': { section: '§6.4', title: 'Bitwa wokalna' },
  'imprezator': { section: '§6.5, §11.3', title: 'Imprezator' },
  'statki-solo': { section: '§7', title: 'Statki Solo' },
  'prezentacja': { section: '§8', title: 'Prezentacja' },
  'hot-or-not': { section: '§9', title: 'Hot or Not Champion' },
  'wifi': { section: '§10.2', title: 'WiFi Analyzer' },
  'pwa-cache': { section: '§4', title: 'PWA — wyczyść cache / ponowna instalacja na telefonie po deploy' },
  'upload': { section: '§3.7, §8.3', title: 'Upload plików / media' },
  'wszystkie-tryby': { section: '§0–§6', title: 'Zmiana server.js — rozważ szeroki smoke (wszystkie kluczowe tryby)' },
  'wersja': { section: '§0.1', title: 'Wersja w package.json' },
  'build': { section: '§12', title: 'Build / electron-builder' },
  'deps': { section: '§0', title: 'Zależności — start aplikacji + smoke HTTP' },
  'quiz-data': { section: '§3', title: 'Bazy quizów (JSON) — wczytanie, gra, eksport' },
  'wyborczy': { section: '§3, §13.4', title: 'Pytanie Wyborczy — ekran, telefon, stop audio po wyjściu' },
  'public-styles': { section: '§1, §4', title: 'CSS — start, PWA, główne ekrany' },
  'public-scripts': { section: '§3, §4', title: 'JS współdzielony — edytor / vote / panel' },
  'shared-libs': { section: '§6, §11', title: 'Biblioteki frontu — audio, wizualizacje, ZIP' },
  'static-assets': { section: '§1', title: 'Grafiki / favicon — menu start, ikony' },
  'quiz-sfx': { section: '§3, §11', title: 'Efekty dźwiękowe quizu / nakładki' },
  'welcome-screen': { section: '§4', title: 'Ekran powitalny — współpraca z Admin PWA i TV' },
  'electron-build-assets': { section: '§12', title: 'Zasoby builda (ikony w build/)' },
  'tunnel-https': { section: '§10', title: 'HTTPS lokalny (certs) — Familiada / sieć' },
  'tunnel-cloudflared': { section: '§10', title: 'Cloudflared / tunel — pierwszy build i test LTE' },
  'scripts-dev': { section: '§0, §12', title: 'Skrypty — smoke / build zależnie od pliku' },
};

function matchRules(files) {
  const hints = [];
  const tagSet = new Set();
  const matchedFiles = new Set();
  for (const file of files) {
    const norm = file.replace(/\\/g, '/');
    for (const rule of RULES) {
      if (rule.re.test(norm)) {
        hints.push({ file: norm, hint: rule.hint });
        rule.tags.forEach((t) => tagSet.add(t));
        matchedFiles.add(norm);
        break;
      }
    }
  }
  return { hints, tags: [...tagSet], matchedFiles };
}

function buildSuggestions(tags) {
  const skip = new Set(['docs-only', 'publish', 'qa-script', 'tools-external', 'stripe-shop', 'changelog', 'docs-poradniki', 'repo-meta']);
  const actionable = tags.filter((t) => !skip.has(t));
  const checklistRefs = new Map();
  for (const t of actionable) {
    const m = TAG_TO_CHECKLIST[t];
    if (m) checklistRefs.set(m.section, m.title);
  }
  if (tags.includes('api') || tags.includes('wszystkie-tryby')) {
    checklistRefs.set('§0–§6', TAG_TO_CHECKLIST['wszystkie-tryby'].title);
  }
  return { actionable, checklistRefs };
}

function groupHintsByText(hints) {
  const m = new Map();
  for (const h of hints) {
    if (!m.has(h.hint)) m.set(h.hint, []);
    m.get(h.hint).push(h.file);
  }
  return m;
}

function main() {
  const json = process.argv.includes('--json');
  const short = process.argv.includes('--short');
  const files = collectChangedFiles();

  if (files.length === 0) {
    const out = {
      changedFiles: [],
      message: 'Brak wykrytych zmian (working tree czysty i brak różnic względem main?).',
      always: [
        'npm run qa:smoke-http (przy działającym serwerze)',
        'docs/CHECKLISTA_QA_PRZED_RELEASE.md — minimum §1, §3, §4 przed pierwszym buildem po większej zmianie',
        'node --check server.js && node --check electron-main.js'
      ]
    };
    if (json) console.log(JSON.stringify(out, null, 2));
    else {
      console.log('📋 Sugestie QA przed buildem — Imprezja Quiz\n');
      console.log(out.message);
      console.log('\n**Zawsze warto:**');
      out.always.forEach((x) => console.log('  •', x));
    }
    return;
  }

  const { hints, tags, matchedFiles } = matchRules(files);
  const { actionable, checklistRefs } = buildSuggestions(tags);

  const payload = {
    changedFileCount: files.length,
    changedFiles: files,
    matchedHints: hints,
    tags,
    checklistSections: [...checklistRefs.entries()].map(([section, title]) => ({ section, title })),
    commands: [
      'npm run qa:smoke-http',
      'node --check server.js && node --check electron-main.js'
    ],
    doc: 'docs/CHECKLISTA_QA_PRZED_RELEASE.md'
  };

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log('📋 Sugestie QA przed buildem — Imprezja Quiz\n');
  console.log(`Zmienione / śledzone pliki: **${files.length}** (working tree + ostatnie commity vs merge-base main, jeśli dostępny)\n`);

  console.log('### Pliki i możliwy wpływ\n');
  const grouped = groupHintsByText(hints);
  if (short) {
    for (const [hint, flist] of grouped) {
      const n = flist.length;
      const sample = flist.slice(0, 4).map((f) => `\`${f}\``).join(', ');
      const more = n > 4 ? ` *+${n - 4} plików*` : '';
      console.log(`- **(${n})** ${sample}${more} — ${hint}`);
    }
  } else {
    for (const [hint, flist] of grouped) {
      if (flist.length <= 3) {
        flist.forEach((f) => console.log(`- \`${f}\` — ${hint}`));
      } else {
        console.log(`- **${flist.length} plików** — ${hint}`);
        flist.slice(0, 8).forEach((f) => console.log(`  - \`${f}\``));
        if (flist.length > 8) console.log(`  - *… +${flist.length - 8} więcej*`);
      }
    }
  }
  const unmatched = files.filter((f) => !matchedFiles.has(f.replace(/\\/g, '/')));
  if (unmatched.length) {
    console.log('\n*Bez dopasowanego wzorca (przeklikać według kontekstu):*');
    unmatched.slice(0, 20).forEach((f) => console.log(`  - ${f}`));
    if (unmatched.length > 20) console.log(`  - *… +${unmatched.length - 20} więcej*`);
  }

  console.log('\n### Co przeklikać (wg checklisty)\n');
  console.log(`Pełna lista: **${payload.doc}**\n`);
  if (checklistRefs.size === 0) {
    console.log('(Tylko dokumentacja / skrypty pomocnicze — brak krytycznych obszarów UI z mapowania.)');
  } else {
    [...checklistRefs.entries()].forEach(([section, title]) => {
      console.log(`- **${section}** — ${title}`);
    });
  }

  console.log('\n### Komendy automatyczne\n');
  payload.commands.forEach((c) => console.log(`  ${c}`));

  if (actionable.length) {
    console.log('\n### Tagi wpływu (dla AI / notatek)\n');
    console.log(`  ${actionable.join(', ')}`);
  }
}

main();
