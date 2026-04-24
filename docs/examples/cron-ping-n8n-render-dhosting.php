<?php
/**
 * Ping n8n na Renderze — cron na dhosting (PHP), gdy nie ma curl w zadaniu CRON.
 *
 * 1. Wgraj np. do: public_html/cron-ping-n8n.php
 * 2. Ustaw URL (patrz niżej: $url LUB plik cron-ping-n8n.url).
 * 3. dPanel CRON: PROGRAM = PHP 8.x
 *    ŚCIEŻKA: pełna ścieżka absolutna do pliku (bez ~).
 *    KATALOG ROBOCZY: ten sam katalog co plik, np. .../public_html
 * 4. Interwał: *\/10 * * * * lub *\/12 * * * * (w panelu crona wpisujesz normalnie bez backslasha; w tym komentarzu *\/ zamiast gwiazda+ukośnik, żeby PHP nie uciął bloku).
 *
 * Diagnostyka bez żadnych dodatkowych plików:
 *   Po każdym uruchomieniu nadpisywany jest plik cron-n8n-ping-last.txt (OK/FAIL + kod HTTP).
 *   Wejście w skrypt z przeglądarki: krótki tekst plain (nie „biała strona”); cron z CLI nadal bez wyjścia na stdout.
 * Opcjonalnie: pusty plik cron-ping-n8n.debug obok skryptu → dopisywanie linii do cron-n8n-ping.log.
 */
declare(strict_types=1);

// Cron na hostingach często ma domyślny max_execution_time = 30 s — cold start Rendera bywa dłuższy.
@set_time_limit(130);
@ini_set('max_execution_time', '130');

// --- URL: plik .url obok skryptu (pierwsza linia), potem $url domyślny ---
// Szukane nazwy (kolejność): cron-ping-n8n.url ORAZ taka sama jak skrypt, np. cron-ping-n8n-render-dhosting.url
$url     = 'https://TWOJ-SERWIS.onrender.com/';
$urlUsed = '';
$base    = pathinfo(__FILE__, PATHINFO_FILENAME);
foreach ([__DIR__ . '/cron-ping-n8n.url', __DIR__ . '/' . $base . '.url'] as $urlFile) {
    if (!is_readable($urlFile)) {
        continue;
    }
    $raw = (string) file_get_contents($urlFile);
    if (strpos($raw, "\xEF\xBB\xBF") === 0) {
        $raw = substr($raw, 3);
    }
    $lines = preg_split('/\R/u', $raw, -1, PREG_SPLIT_NO_EMPTY);
    $line  = isset($lines[0]) ? trim($lines[0]) : '';
    if ($line !== '' && (strpos($line, 'https://') === 0 || strpos($line, 'http://') === 0)) {
        $url     = $line;
        $urlUsed = basename($urlFile);
        break;
    }
}

$ok          = false;
$detail      = '';
$httpCode    = 0;
$skipHttp    = false;

if (stripos($url, 'TWOJ-SERWIS') !== false) {
    $skipHttp = true;
    $detail   = 'Brak pliku .url lub pusty: wgraj obok PHP plik cron-ping-n8n.url LUB ' . $base
        . '.url (1. linia: https://twoja-instancja.onrender.com/). Teraz czytany URL to placeholder.';
}

$debugTrigger = __DIR__ . '/cron-ping-n8n.debug';
$debugLog     = __DIR__ . '/cron-n8n-ping.log';
$lastFile     = __DIR__ . '/cron-n8n-ping-last.txt';

/**
 * Render free: usługa zasypia po ~15 min bez HTTP.
 * Cron co 15 min (*\/15) często przegrywa z zegarem → ustaw co 10–12 min.
 */

// 1) Preferuj cURL
if (!$skipHttp && function_exists('curl_init')) {
    $ch = curl_init($url);
    if ($ch !== false) {
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 35,
            CURLOPT_TIMEOUT        => 120,
            CURLOPT_USERAGENT      => 'dhosting-cron-n8n-ping/1.2',
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $out = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $cerr     = curl_error($ch);
        curl_close($ch);

        if ($out !== false && $httpCode > 0) {
            $ok = true;
        } else {
            $detail = 'curl: ' . ($cerr !== '' ? $cerr : ('http_code=' . $httpCode));
        }
    } else {
        $detail = 'curl_init failed';
    }
} elseif (!$skipHttp) {
    $detail = 'brak rozszerzenia curl';
}

// 2) Zapas: file_get_contents (wymaga allow_url_fopen=On)
if (!$skipHttp && !$ok && $detail !== 'brak rozszerzenia curl') {
    $ctx = stream_context_create([
        'http' => [
            'method'        => 'GET',
            'timeout'       => 120,
            'ignore_errors' => true,
            'header'        => "User-Agent: dhosting-cron-n8n-ping/1.2\r\nAccept: */*\r\n",
        ],
        'ssl' => [
            'verify_peer'      => true,
            'verify_peer_name' => true,
        ],
    ]);

    $body = @file_get_contents($url, false, $ctx);
    if ($body !== false && $body !== '') {
        $ok = true;
        if (isset($http_response_header[0]) && preg_match('#\b(\d{3})\b#', $http_response_header[0], $m)) {
            $httpCode = (int) $m[1];
        }
    } elseif ($detail === '' || $detail === 'brak rozszerzenia curl') {
        $detail = 'file_get_contents failed (allow_url_fopen off lub błąd TLS/URL?)';
    }
}

// Zawsze: ostatni wynik (łatwo sprawdzić po FTP)
$lastLine = date('c')
    . ' ' . ($ok ? 'OK' : 'FAIL')
    . ' http=' . ($httpCode > 0 ? (string) $httpCode : '-')
    . ' url=' . $url
    . ($urlUsed !== '' ? (' src=' . $urlUsed) : '')
    . ($detail !== '' ? (' | ' . $detail) : '')
    . "\n";
@file_put_contents($lastFile, $lastLine, LOCK_EX);

if (is_file($debugTrigger)) {
    @file_put_contents($debugLog, $lastLine, FILE_APPEND | LOCK_EX);
}

// Przeglądarka: pokaż wynik (skrypt normalnie nic nie echouje — stąd „biała strona”).
// exit(1) przy FAIL na wielu hostingach daje pustą odpowiedź — po HTTP też kończymy 0, żebyś zobaczył treść.
$isCli = (PHP_SAPI === 'cli' || PHP_SAPI === 'phpdbg');
if (!$isCli) {
    header('Content-Type: text/plain; charset=UTF-8');
    if (!$ok) {
        header('HTTP/1.1 503 Service Unavailable');
    }
    echo $lastLine;
    echo 'Szczegóły zawsze w pliku: cron-n8n-ping-last.txt (ten sam katalog co ten skrypt).' . "\n";
    exit(0);
}

exit($ok ? 0 : 1);
