<?php
/**
 * OAuth 登入端點
 * GET  ?action=google_client_id  — 回傳 Google Client ID（無需認證）
 * POST ?action=google_verify     — 驗證 Google credential JWT，建立會話
 */

require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    Helper::applyCorsHeaders();
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    exit(0);
}

class OAuthAPI {

    /**
     * GET ?action=google_client_id
     * 公開端點：讓靜態前端取得 Client ID 以初始化 GIS SDK。
     * 若未設定則回傳 404，前端隱藏 Google 按鈕。
     */
    public static function getGoogleClientId(): void {
        $clientId = defined('GOOGLE_CLIENT_ID') ? GOOGLE_CLIENT_ID : '';
        if ($clientId === '') {
            Helper::error('Google 登入未啟用', 404);
        }
        Helper::success('取得成功', ['client_id' => $clientId]);
    }

    /**
     * POST ?action=google_verify
     * 驗證 Google Identity Services 回傳的 credential JWT。
     * 直接使用 Helper::getJsonInput() 而非 getRequestInput()，
     * 以跳過 enforceCSRFIfNeeded()（登入前無 session CSRF token）。
     * 安全性由 Google credential 本身的 aud 綁定與一次性特性保證。
     */
    public static function googleVerify(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Helper::error('僅支援 POST', 405);
        }

        $data = Helper::getJsonInput();
        if (!is_array($data)) {
            Helper::error('無效的請求格式', 400);
        }

        Helper::rejectDangerousCommandPayload($data);

        $credential = trim($data['credential'] ?? '');
        if ($credential === '') {
            Helper::error('缺少 credential 參數', 400);
        }

        $clientId = defined('GOOGLE_CLIENT_ID') ? GOOGLE_CLIENT_ID : '';
        if ($clientId === '') {
            Helper::error('Google 登入未啟用', 503);
        }

        // ── 1. 向 Google tokeninfo 驗證 credential ──────────────────────────
        $tokenInfo = self::verifyCredential($credential);
        if ($tokenInfo === null) {
            Helper::error('Google 憑證驗證失敗，請重試', 401);
        }

        if (($tokenInfo['aud'] ?? '') !== $clientId) {
            Helper::logError('Google OAuth aud 不符: ' . ($tokenInfo['aud'] ?? ''));
            Helper::error('Google 憑證無效', 401);
        }

        if (($tokenInfo['email_verified'] ?? '') !== 'true') {
            Helper::error('此 Google 帳戶的 Email 尚未驗證', 401);
        }

        $googleId = $tokenInfo['sub']   ?? '';
        $email    = $tokenInfo['email'] ?? '';
        $name     = $tokenInfo['name']  ?? ($tokenInfo['given_name'] ?? '');

        if ($googleId === '' || $email === '') {
            Helper::error('Google 憑證缺少必要欄位', 401);
        }

        // ── 2. 查詢或建立使用者 ──────────────────────────────────────────────
        try {
            $user = self::findOrCreateUser($googleId, $email, $name);
        } catch (Exception $e) {
            Helper::logError('Google OAuth 用戶查詢/建立失敗: ' . $e->getMessage());
            Helper::error('登入失敗，請稍後再試', 500);
        }

        if (isset($user['is_active']) && !$user['is_active']) {
            Helper::error('帳戶已被停用', 403);
        }

        // ── 3. 建立 session（與 password login 完全相同路徑）────────────────
        Auth::setLogin($user['user_id'], [
            'role' => $user['role'],
            'name' => $user['name'],
        ]);

        $row = Database::getInstance()->fetchOne(
            'SELECT COUNT(*) AS cnt
             FROM club_members
             WHERE user_id = ? AND is_active = 1
               AND role IN ("president","vice_president","public_relations","treasurer","director")',
            [(int)$user['user_id']]
        );
        $managedCount = (int)($row['cnt'] ?? 0);

        Helper::success('登入成功', [
            'user_id'            => $user['user_id'],
            'name'               => $user['name'],
            'email'              => $user['email'],
            'role'               => $user['role'],
            'can_manage_clubs'   => $managedCount > 0,
            'managed_club_count' => $managedCount,
            'csrf_token'         => Helper::generateCSRFToken(),
        ]);
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    public static function verifyCredential(string $credential): ?array {
        $url  = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($credential);
        $body = self::httpGet($url, 5);

        if ($body === null) {
            Helper::logError('Google tokeninfo 請求失敗（網路不可用？）');
            return null;
        }

        $info = json_decode($body, true);
        if (!is_array($info) || isset($info['error_description'])) {
            return null;
        }

        return $info;
    }

    private static function httpGet(string $url, int $timeout): ?string {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => $timeout,
                CURLOPT_CONNECTTIMEOUT => 3,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_USERAGENT      => 'ClubPlatformOAuth/1.0',
            ]);
            $result = curl_exec($ch);
            $err    = curl_errno($ch);
            curl_close($ch);
            return ($err === 0 && is_string($result)) ? $result : null;
        }

        if (ini_get('allow_url_fopen')) {
            $ctx    = stream_context_create(['http' => ['timeout' => $timeout, 'method' => 'GET']]);
            $result = @file_get_contents($url, false, $ctx);
            return is_string($result) ? $result : null;
        }

        return null;
    }

    /**
     * 查詢策略：
     *   1. google_id 精確比對（已連結帳號）
     *   2. email 比對（自動連結現有 email 帳號，補寫 google_id）
     *   3. 建立新帳號
     */
    private static function findOrCreateUser(string $googleId, string $email, string $name): array {
        $user = dbFetchOne('SELECT * FROM users WHERE google_id = ? LIMIT 1', [$googleId]);
        if ($user) {
            return $user;
        }

        $user = dbFetchOne('SELECT * FROM users WHERE email = ? LIMIT 1', [$email]);
        if ($user) {
            dbUpdate('users',
                ['google_id' => $googleId, 'oauth_provider' => 'google'],
                'user_id = ?',
                [$user['user_id']]
            );
            $user['google_id']      = $googleId;
            $user['oauth_provider'] = 'google';
            return $user;
        }

        $displayName    = ($name !== '') ? $name : explode('@', $email)[0];
        $randomPassword = bin2hex(random_bytes(32));

        $userId = dbInsert('users', [
            'email'          => $email,
            'password'       => Helper::hashPassword($randomPassword),
            'name'           => $displayName,
            'role'           => 'student',
            'google_id'      => $googleId,
            'oauth_provider' => 'google',
            'is_active'      => 1,
        ]);

        if (!$userId) {
            throw new Exception('INSERT INTO users 失敗');
        }

        $user = dbFetchOne('SELECT * FROM users WHERE user_id = ? LIMIT 1', [$userId]);
        if (!$user) {
            throw new Exception('新建用戶後查詢失敗');
        }

        return $user;
    }
}

// ── 綁定 / 解除綁定（需登入）────────────────────────────────────────────────

class OAuthBindAPI {

    /**
     * POST ?action=link_google
     * 將目前登入帳號與 Google 帳號綁定。
     */
    public static function linkGoogle(): void {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Helper::error('僅支援 POST', 405);
        }

        $data = Helper::getJsonInput();
        if (!is_array($data)) {
            Helper::error('無效的請求格式', 400);
        }

        $credential = trim($data['credential'] ?? '');
        if ($credential === '') {
            Helper::error('缺少 credential 參數', 400);
        }

        $clientId = defined('GOOGLE_CLIENT_ID') ? GOOGLE_CLIENT_ID : '';
        if ($clientId === '') {
            Helper::error('Google 登入未啟用', 503);
        }

        $tokenInfo = OAuthAPI::verifyCredential($credential);
        if ($tokenInfo === null) {
            Helper::error('Google 憑證驗證失敗，請重試', 401);
        }

        if (($tokenInfo['aud'] ?? '') !== $clientId) {
            Helper::error('Google 憑證無效', 401);
        }

        if (($tokenInfo['email_verified'] ?? '') !== 'true') {
            Helper::error('此 Google 帳戶的 Email 尚未驗證', 401);
        }

        $googleId = $tokenInfo['sub'] ?? '';
        if ($googleId === '') {
            Helper::error('無法取得 Google 帳戶資訊', 401);
        }

        $userId = (int)Auth::getCurrentUserId();

        $conflict = dbFetchOne(
            'SELECT user_id FROM users WHERE google_id = ? AND user_id != ? LIMIT 1',
            [$googleId, $userId]
        );
        if ($conflict) {
            Helper::error('此 Google 帳號已綁定其他帳戶', 409);
        }

        dbUpdate('users',
            ['google_id' => $googleId, 'oauth_provider' => 'google'],
            'user_id = ?',
            [$userId]
        );

        Helper::success('Google 帳號綁定成功', ['google_id' => $googleId]);
    }

    /**
     * POST ?action=unlink_google
     * 解除目前帳號的 Google 綁定。
     * 注意：以 Google 建立且從未設定密碼的帳號解除後將無法登入。
     */
    public static function unlinkGoogle(): void {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Helper::error('僅支援 POST', 405);
        }

        $userId = (int)Auth::getCurrentUserId();
        $user   = dbFetchOne('SELECT google_id, oauth_provider FROM users WHERE user_id = ? LIMIT 1', [$userId]);

        if (!$user || !$user['google_id']) {
            Helper::error('目前尚未綁定 Google 帳號', 400);
        }

        dbUpdate('users',
            ['google_id' => null, 'oauth_provider' => 'email'],
            'user_id = ?',
            [$userId]
        );

        Helper::success('Google 帳號已解除綁定');
    }
}

// ── Router ───────────────────────────────────────────────────────────────────
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'google_client_id':
        OAuthAPI::getGoogleClientId();
        break;
    case 'google_verify':
        OAuthAPI::googleVerify();
        break;
    case 'link_google':
        OAuthBindAPI::linkGoogle();
        break;
    case 'unlink_google':
        OAuthBindAPI::unlinkGoogle();
        break;
    default:
        Helper::error('無效的操作', 400);
}
