#!/usr/bin/env node
/**
 * Nakładka Imprezja Booth na Imprezja Quiz — tylko do lokalnego buildu Beta.
 * Publiczna wersja NIE powinna mieć Booth (apply → build beta → strip).
 *
 * Usage:
 *   node scripts/booth-overlay.js apply [sourceDir]
 *   node scripts/booth-overlay.js strip
 *
 * sourceDir: katalog z lib/booth-live.js + public/booth-live-screen.html + admin-pwa ze stash (domyślnie /tmp/vb-booth-stash)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const cmd = process.argv[2];
const sourceDir = process.argv[3] || '/tmp/vb-booth-stash';

function die(msg) {
  console.error('❌', msg);
  process.exit(1);
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function write(p, t) {
  fs.writeFileSync(p, t);
}

function apply() {
  const boothLiveSrc = path.join(sourceDir, 'lib/booth-live.js');
  const boothScreenSrc = path.join(sourceDir, 'public/booth-live-screen.html');
  const stashAdmin = path.join(sourceDir, 'public/admin-pwa.html');
  if (!fs.existsSync(boothLiveSrc)) die('Brak ' + boothLiveSrc);
  if (!fs.existsSync(boothScreenSrc)) die('Brak ' + boothScreenSrc);
  if (!fs.existsSync(stashAdmin)) die('Brak ' + stashAdmin);

  fs.mkdirSync(path.join(root, 'lib'), { recursive: true });
  fs.copyFileSync(boothLiveSrc, path.join(root, 'lib/booth-live.js'));
  for (const extra of ['dom-utils.js', 'logger.js']) {
    const s = path.join(sourceDir, 'lib', extra);
    if (fs.existsSync(s)) fs.copyFileSync(s, path.join(root, 'lib', extra));
  }
  fs.copyFileSync(boothScreenSrc, path.join(root, 'public/booth-live-screen.html'));

  // server.js
  let server = read(path.join(root, 'server.js'));
  if (!server.includes("require('./lib/booth-live')")) {
    server = server.replace(
      "const trash = require('trash');\n",
      "const trash = require('trash');\nconst boothLive = require('./lib/booth-live');\n"
    );
  }
  if (!server.includes('boothLive.mountRoutes')) {
    server = server.replace(
      'app.use(express.json());',
      "app.use(express.json({ limit: '50mb' }));\nboothLive.mountRoutes(app, io, { dataDir });"
    );
  }
  if (!server.includes('boothLive.registerSocketHandlers')) {
    server = server.replace(
      "io.on('connection', (socket) => {\n    resetOrphanedGameState();\n",
      "io.on('connection', (socket) => {\n    resetOrphanedGameState();\n    boothLive.registerSocketHandlers(socket, io);\n"
    );
  }
  if (!server.includes("'booth-live'")) {
    server = server.replace(
      "'prezentacja', 'camera'",
      "'prezentacja', 'booth-live', 'camera'"
    );
  }
  write(path.join(root, 'server.js'), server);

  // screen-controller
  let sc = read(path.join(root, 'public/screen-controller.html'));
  if (!sc.includes('view-booth-live')) {
    sc = sc.replace(
      `    <div id="view-prezentacja" class="screen-view">
        <iframe id="iframe-prezentacja" data-src="/prezentacja-screen.html"></iframe>
    </div>
    <div id="view-camera" class="screen-view">`,
      `    <div id="view-prezentacja" class="screen-view">
        <iframe id="iframe-prezentacja" data-src="/prezentacja-screen.html"></iframe>
    </div>
    <div id="view-booth-live" class="screen-view">
        <iframe id="iframe-booth-live" data-src="/booth-live-screen.html"></iframe>
    </div>
    <div id="view-camera" class="screen-view">`
    );
    write(path.join(root, 'public/screen-controller.html'), sc);
  }

  // admin-pwa — inject from stash pieces into current clean file
  let html = read(path.join(root, 'public/admin-pwa.html'));
  if (html.includes('btn-mode-booth-live')) {
    console.log('✓ admin-pwa już ma Booth UI');
  } else {
    const stash = read(stashAdmin);
    const cssNeedle = `.screen-tile.party-tile.active {
            border-color: #f1c40f;
            background: linear-gradient(135deg, rgba(52, 152, 219, 0.30) 0%, rgba(231, 76, 60, 0.30) 100%);
        }`;
    if (!html.includes(cssNeedle)) die('admin-pwa CSS needle missing');
    html = html.replace(
      cssNeedle,
      cssNeedle + `
        .booth-screen-pair { display: contents; }
        .screen-tile.booth-clear-tile {
            border-color: rgba(192, 57, 43, 0.45);
            background: rgba(192, 57, 43, 0.12);
        }
        .screen-tile.booth-clear-tile:hover {
            border-color: #c0392b;
            background: rgba(192, 57, 43, 0.22);
        }
        .booth-settings-block { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); }
        .booth-settings-block h4 { font-size: 0.88rem; color: #f1c40f; margin-bottom: 8px; font-weight: 700; }
        .booth-sec-row { display: flex; align-items: center; gap: 10px; margin: 8px 0; flex-wrap: wrap; }
        .booth-sec-row label { flex: 1; min-width: 140px; font-size: 0.85rem; color: rgba(255,255,255,0.75); }
        .booth-sec-row select { flex: 0 0 100px; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.4); color: #fff; }
        .booth-filter-list { display: flex; flex-direction: column; gap: 8px; margin: 8px 0 4px; }
        .booth-filter-list label {
            display: flex; align-items: center; gap: 10px;
            font-size: 0.85rem; color: rgba(255,255,255,0.85);
            cursor: pointer; user-select: none;
        }
        .booth-filter-list input[type="checkbox"] { width: 18px; height: 18px; accent-color: #f1c40f; flex-shrink: 0; }`
    );

    const tileNeedle = `            <button type="button" class="btn-mode screen-tile" data-mode="prezentacja">
                <span class="icon">📽️</span>
                <span class="label">Prezentacja</span>
            </button>
            <button type="button" class="btn-mode screen-tile" data-mode="camera" id="btn-mode-camera">`;
    if (!html.includes(tileNeedle)) die('admin-pwa tile needle missing');
    html = html.replace(
      tileNeedle,
      `            <button type="button" class="btn-mode screen-tile" data-mode="prezentacja">
                <span class="icon">📽️</span>
                <span class="label">Prezentacja</span>
            </button>
            <button type="button" class="btn-mode screen-tile" data-mode="booth-live" id="btn-mode-booth-live">
                <span class="icon">📸</span>
                <span class="label">Imprezja Booth</span>
            </button>
            <button type="button" class="btn-mode screen-tile booth-clear-tile" id="btn-booth-clear-cache" title="Usuń zdjęcia Booth z dysku serwera">
                <span class="icon">🗑️</span>
                <span class="label">Wyczyść Booth</span>
            </button>
            <button type="button" class="btn-mode screen-tile" data-mode="camera" id="btn-mode-camera">`
    );

    const setupMatch = stash.match(
      /<div class="setup-card" id="setup-booth">[\s\S]*?<\/div>\n            <div class="setup-card" id="setup-kamera">/
    );
    if (!setupMatch) die('setup-booth block not in stash admin-pwa');
    const setupBooth = setupMatch[0].replace(/\n            <div class="setup-card" id="setup-kamera">$/, '');
    html = html.replace(
      '            <div class="setup-card" id="setup-kamera">',
      setupBooth + '\n            <div class="setup-card" id="setup-kamera">'
    );

    const jsStart = stash.indexOf(
      '        // Sekcja 1: Przełącz ekran (screen_switch)\n        const boothLiveTile'
    );
    const jsEnd = stash.indexOf(
      "        document.querySelectorAll('.screen-tile[data-mode]').forEach(btn => {",
      jsStart
    );
    if (jsStart < 0 || jsEnd < 0) die('booth JS markers missing in stash');
    const boothJs = stash.slice(jsStart, jsEnd);

    const handlerNeedle = `        // Sekcja 1: Przełącz ekran (screen_switch)
        document.querySelectorAll('.screen-tile[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode === 'camera') {
                    stopCameraStream();
                    startCameraMode();
                    return;
                }
                stopCameraStream();
                if (mode === 'familiada' && btn.classList.contains('active')) {
                    socket.emit('familiada_stop_music');
                    return;
                }
                if (mode === 'party') {
                    socket.emit('set_game_mode', 'party');
                }
                socket.emit('screen_switch', { mode });
                document.querySelectorAll('.screen-tile[data-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });`;
    if (!html.includes(handlerNeedle)) die('screen handler needle missing');
    html = html.replace(
      handlerNeedle,
      boothJs +
        `document.querySelectorAll('.screen-tile[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode === 'booth-live') {
                    toggleBoothLive();
                    return;
                }
                if (mode === 'camera') {
                    stopCameraStream();
                    startCameraMode();
                    return;
                }
                stopCameraStream();
                if (mode === 'familiada' && btn.classList.contains('active')) {
                    socket.emit('familiada_stop_music');
                    return;
                }
                if (mode === 'party') {
                    socket.emit('set_game_mode', 'party');
                }
                if (boothLiveActive) {
                    fetch('/api/booth-live/stop', { method: 'POST' })
                        .then(r => r.json())
                        .then(syncBoothLiveTile)
                        .catch(() => {});
                }
                socket.emit('screen_switch', { mode });
                document.querySelectorAll('.screen-tile[data-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });`
    );

    html = html.replace(
      `        document.getElementById('setup-prezentacja')?.classList.add('collapsed');\n        document.getElementById('setup-kamera')?.classList.add('collapsed');`,
      `        document.getElementById('setup-prezentacja')?.classList.add('collapsed');\n        document.getElementById('setup-booth')?.classList.add('collapsed');\n        document.getElementById('setup-kamera')?.classList.add('collapsed');`
    );

    write(path.join(root, 'public/admin-pwa.html'), html);
  }

  console.log('✅ Booth overlay APPLIED (do buildu Beta)');
}

function strip() {
  // Restore admin-pwa from git HEAD if available, else surgical strip
  const { execSync } = require('child_process');
  try {
    execSync('git show HEAD:public/admin-pwa.html', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 20 * 1024 * 1024,
    });
    execSync('git checkout HEAD -- public/admin-pwa.html', { cwd: root, stdio: 'inherit' });
    console.log('✓ admin-pwa restored from git HEAD');
  } catch (e) {
    die('Nie udało się przywrócić admin-pwa z gita: ' + (e.message || e));
  }

  let server = read(path.join(root, 'server.js'));
  server = server.replace("const boothLive = require('./lib/booth-live');\n", '');
  server = server.replace(
    "app.use(express.json({ limit: '50mb' }));\nboothLive.mountRoutes(app, io, { dataDir });",
    'app.use(express.json());'
  );
  server = server.replace('    boothLive.registerSocketHandlers(socket, io);\n', '');
  server = server.replace("'prezentacja', 'booth-live', 'camera'", "'prezentacja', 'camera'");
  write(path.join(root, 'server.js'), server);

  let sc = read(path.join(root, 'public/screen-controller.html'));
  sc = sc.replace(
    `    <div id="view-booth-live" class="screen-view">
        <iframe id="iframe-booth-live" data-src="/booth-live-screen.html"></iframe>
    </div>
`,
    ''
  );
  write(path.join(root, 'public/screen-controller.html'), sc);

  const rem = [
    path.join(root, 'public/booth-live-screen.html'),
    path.join(root, 'lib/booth-live.js'),
    path.join(root, 'lib/dom-utils.js'),
    path.join(root, 'lib/logger.js'),
  ];
  for (const f of rem) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  const libDir = path.join(root, 'lib');
  if (fs.existsSync(libDir) && fs.readdirSync(libDir).length === 0) fs.rmdirSync(libDir);

  console.log('✅ Booth overlay STRIPPED (publiczna wersja)');
}

if (cmd === 'apply') apply();
else if (cmd === 'strip') strip();
else die('Użycie: node scripts/booth-overlay.js apply|strip [sourceDir]');
