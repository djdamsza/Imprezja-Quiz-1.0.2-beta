<?php
/**
 * Ping Render stripe-shop co 10 min – zapobiega cold start (serwis zasypia po ~15 min).
 * Stripe webhook wymaga działającego serwera.
 * Użyj /health (nie /api/prices) – lekki, bez wywołań Stripe API.
 */
$url = 'https://imprezja.onrender.com/health';
$ctx = stream_context_create(['http' => ['timeout' => 15]]);
$result = @file_get_contents($url, false, $ctx);
// HTTP 200 = OK, serwis obudzony
