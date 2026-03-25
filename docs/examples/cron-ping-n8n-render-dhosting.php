<?php
/**
 * Ping n8n na Renderze — cron na dhosting (PHP), gdy nie ma curl w zadaniu CRON.
 *
 * 1. Wgraj np. do: public_html/cron-ping-n8n.php (albo poza www i wywołuj pełną ścieżką).
 * 2. W dPanel CRON: PROGRAM = PHP 8.x, ŚCIEŻKA = pełna ścieżka do tego pliku,
 *    KATALOG ROBOCZY = katalog zawierający skrypt (np. ~/twojadomena.pl/public_html).
 * 3. Interwał: co 10–15 min (Render free budzi się po ~15 min bez ruchu).
 *
 * Zmień $url na swój host n8n (z https://, końcowy / opcjonalny).
 */
declare(strict_types=1);

$url = 'https://n8n-automation-l1yt.onrender.com/';

$ok = false;

// 1) file_get_contents (wymaga allow_url_fopen=On na hostingu)
$ctx = stream_context_create([
    'http' => [
        'method'          => 'GET',
        'timeout'         => 90,
        'ignore_errors'   => true,
        'header'          => "User-Agent: dhosting-cron-n8n-ping/1.0\r\nAccept: */*\r\n",
    ],
    'ssl' => [
        'verify_peer'      => true,
        'verify_peer_name' => true,
    ],
]);

$body = @file_get_contents($url, false, $ctx);
if ($body !== false) {
    $ok = true;
}

// 2) Zapas: rozszerzenie curl w PHP (jeśli włączone)
if (!$ok && function_exists('curl_init')) {
    $ch = curl_init($url);
    if ($ch !== false) {
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT        => 90,
            CURLOPT_USERAGENT      => 'dhosting-cron-n8n-ping/1.0',
        ]);
        $out = curl_exec($ch);
        curl_close($ch);
        $ok = ($out !== false);
    }
}

// Cron nie musi nic wyświetlać; kod wyjścia 0 = OK
exit($ok ? 0 : 1);
