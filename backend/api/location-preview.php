<?php
/**
 * Google Maps URL 地點名稱解析端點
 * GET ?url=https://maps.app.goo.gl/xxx
 * 回傳 { success: true, place_name: "..." }
 */

require_once __DIR__ . '/../auth.php';
Helper::applyCorsHeaders();
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit(0);
}

function isGoogleMapsUrl(string $url): bool {
    return (bool) preg_match(
        '~^https?://(?:www\.)?(?:(?:[a-z0-9-]+\.)?google\.[^/\s]+/maps(?:[/?#][^\s]*)?|maps\.app\.goo\.gl/\S+|goo\.gl/maps/\S+)$~i',
        trim($url)
    );
}

function extractPlaceName(string $finalUrl): ?string {
    // /maps/place/PLACE_NAME/@ または /maps/place/PLACE_NAME?
    if (preg_match('#/maps/place/([^/@?]+)#u', $finalUrl, $m)) {
        $name = urldecode(str_replace('+', ' ', $m[1]));
        $name = trim($name);
        return $name !== '' ? $name : null;
    }
    return null;
}

function resolveGoogleMapsUrl(string $url): ?string {
    if (!function_exists('curl_init')) return null;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 6,
        CURLOPT_NOBODY         => true,     // HEAD request，不下載 body
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; location-preview/1.0)',
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    curl_exec($ch);
    $finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
    $err = curl_errno($ch);
    curl_close($ch);

    if ($err || !$finalUrl) return null;
    return $finalUrl;
}

$rawUrl = trim($_GET['url'] ?? '');

if ($rawUrl === '' || !isGoogleMapsUrl($rawUrl)) {
    echo json_encode(['success' => false, 'message' => 'invalid_url']);
    exit;
}

$finalUrl  = resolveGoogleMapsUrl($rawUrl);
$placeName = $finalUrl ? extractPlaceName($finalUrl) : null;

echo json_encode([
    'success'    => $placeName !== null,
    'place_name' => $placeName,
], JSON_UNESCAPED_UNICODE);
