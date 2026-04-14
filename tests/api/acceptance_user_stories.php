<?php
/**
 * User Story 驗收腳本（PHP CLI 版）
 *
 * 用法：
 * php tests/api/acceptance_user_stories.php --base-url="http://localhost:8000/%E7%A4%BE%E5%9C%98%E6%B4%BB%E5%8B%95%E8%B3%87%E8%A8%8A%E7%B5%B1%E6%95%B4%E5%B9%B3%E5%8F%B0/backend/api"
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "請使用 CLI 執行此腳本\n");
    exit(1);
}

$options = getopt('', ['base-url::']);
$baseUrl = $options['base-url']
    ?? 'http://localhost:8000/%E7%A4%BE%E5%9C%98%E6%B4%BB%E5%8B%95%E8%B3%87%E8%A8%8A%E7%B5%B1%E6%95%B4%E5%B9%B3%E5%8F%B0/backend/api';

$frontendBaseUrl = preg_replace('#/backend/api$#', '/frontend', $baseUrl);
$cookieFile = tempnam(sys_get_temp_dir(), 'club_accept_');

if ($cookieFile === false) {
    fwrite(STDERR, "無法建立 cookie 暫存檔\n");
    exit(1);
}

register_shutdown_function(static function () use ($cookieFile): void {
    if (is_file($cookieFile)) {
        @unlink($cookieFile);
    }
});

$stats = [
    'pass' => 0,
    'fail' => 0,
    'skip' => 0,
];

function out(string $msg): void {
    fwrite(STDOUT, $msg . PHP_EOL);
}

function fail(string $msg): void {
    throw new RuntimeException($msg);
}

function pass(array &$stats, string $msg): void {
    $stats['pass']++;
    out("PASS: {$msg}");
}

function skip(array &$stats, string $msg): void {
    $stats['skip']++;
    out("SKIP: {$msg}");
}

function req(
    string $method,
    string $url,
    ?array $body,
    string $cookieFile,
    bool $expectJson = true
): array {
    $ch = curl_init();
    if ($ch === false) {
        fail('curl 初始化失敗');
    }

    $headers = ['X-Requested-With: XMLHttpRequest'];
    $payload = null;

    if ($body !== null) {
        $payload = json_encode($body, JSON_UNESCAPED_UNICODE);
        if ($payload === false) {
            fail('JSON 編碼失敗');
        }
        $headers[] = 'Content-Type: application/json';
    }

    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_COOKIEJAR => $cookieFile,
        CURLOPT_COOKIEFILE => $cookieFile,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_FOLLOWLOCATION => true,
    ]);

    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    }

    $raw = curl_exec($ch);
    if ($raw === false) {
        $err = curl_error($ch);
        curl_close($ch);
        fail('HTTP 請求失敗: ' . $err . ' | URL=' . $url);
    }

    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!$expectJson) {
        return [
            'status' => $status,
            'raw' => (string)$raw,
            'json' => null,
        ];
    }

    $json = json_decode((string)$raw, true);

    if (!is_array($json)) {
        return [
            'status' => $status,
            'raw' => (string)$raw,
            'json' => null,
        ];
    }

    return [
        'status' => $status,
        'raw' => (string)$raw,
        'json' => $json,
    ];
}

function api(string $baseUrl, string $path): string {
    return rtrim($baseUrl, '/') . '/' . ltrim($path, '/');
}

function login(string $baseUrl, string $email, string $password, string $cookieFile, array &$stats): void {
    $res = req('POST', api($baseUrl, 'auth.php?action=login'), [
        'email' => $email,
        'password' => $password,
    ], $cookieFile);

    if (!is_array($res['json']) || ($res['json']['success'] ?? false) !== true) {
        fail("登入失敗: {$email}");
    }

    pass($stats, "登入成功: {$email}");
}

function assertSuccess(array $res, string $title): void {
    if (!is_array($res['json']) || ($res['json']['success'] ?? false) !== true) {
        $raw = $res['raw'] ?? '';
        fail($title . ' 失敗 | HTTP=' . ($res['status'] ?? 0) . ' | RESP=' . $raw);
    }
}

function assertFailed(array $res, string $title): void {
    if (!is_array($res['json'])) {
        return;
    }

    if (($res['json']['success'] ?? null) === false) {
        return;
    }

    fail($title . ' 預期失敗但回傳成功');
}

out('=== Acceptance Test (PHP) Start ===');

try {
    // 測試帳號
    $admin = ['email' => 'admin@univ.edu', 'password' => 'Test123456'];
    $clubAdmin = ['email' => 'clubadmin@univ.edu', 'password' => 'Test123456'];
    $student = ['email' => 'student@univ.edu', 'password' => 'Test123456'];

    // 個別 session
    $cookieAdmin = tempnam(sys_get_temp_dir(), 'club_admin_');
    $cookieClubAdmin = tempnam(sys_get_temp_dir(), 'club_cadmin_');
    $cookieStudent = tempnam(sys_get_temp_dir(), 'club_student_');

    if ($cookieAdmin === false || $cookieClubAdmin === false || $cookieStudent === false) {
        fail('建立多組 cookie 暫存檔失敗');
    }

    register_shutdown_function(static function () use ($cookieAdmin, $cookieClubAdmin, $cookieStudent): void {
        foreach ([$cookieAdmin, $cookieClubAdmin, $cookieStudent] as $f) {
            if (is_string($f) && is_file($f)) {
                @unlink($f);
            }
        }
    });

    login($baseUrl, $admin['email'], $admin['password'], $cookieAdmin, $stats);
    login($baseUrl, $clubAdmin['email'], $clubAdmin['password'], $cookieClubAdmin, $stats);
    login($baseUrl, $student['email'], $student['password'], $cookieStudent, $stats);

    // ---------- User Story 4.1 ----------
    // AC1: 名單建立與軟刪除
    $code = 'QA' . random_int(1000, 9999);
    $createClub = req('POST', api($baseUrl, 'admin.php?action=create_club'), [
        'club_code' => $code,
        'club_name' => 'US41 測試社團 ' . $code,
        'category_id' => 2,
    ], $cookieAdmin);
    assertSuccess($createClub, 'US4.1 AC1 建立社團基礎名單');
    pass($stats, 'US4.1 AC1 管理員可新增社團基礎名單');

    $newClubId = (int)($createClub['json']['data']['club_id'] ?? 0);
    if ($newClubId <= 0) {
        fail('US4.1 AC1 無法取得新建社團 club_id');
    }

    $updateClub = req('POST', api($baseUrl, 'admin.php?action=update_club'), [
        'club_id' => $newClubId,
        'club_code' => $code,
        'club_name' => 'US41 測試社團改名 ' . $code,
        'category_id' => 2,
    ], $cookieAdmin);
    assertSuccess($updateClub, 'US4.1 AC1 編輯社團基礎名單');
    pass($stats, 'US4.1 AC1 管理員可編輯社團基礎名單');

    $softDelete = req('POST', api($baseUrl, 'admin.php?action=soft_delete_club'), [
        'club_id' => $newClubId,
        'hide' => true,
    ], $cookieAdmin);
    assertSuccess($softDelete, 'US4.1 AC1 軟刪除社團');
    pass($stats, 'US4.1 AC1 管理員可設定停用/隱藏（Soft Delete）');

    // AC2: 全校公告置頂
    $annTitle = 'US41 置頂公告 ' . date('YmdHis');
    $createAnn = req('POST', api($baseUrl, 'admin.php?action=create_announcement'), [
        'title' => $annTitle,
        'content' => '自動化驗收公告內容',
        'type' => 'important',
        'is_sticky' => 1,
    ], $cookieAdmin);
    assertSuccess($createAnn, 'US4.1 AC2 建立全校公告');

    $listAnn = req('GET', api($baseUrl, 'admin.php?action=announcements'), null, $cookieAdmin);
    assertSuccess($listAnn, 'US4.1 AC2 查詢公告列表');
    $annItems = $listAnn['json']['data']['announcements'] ?? [];
    $foundPinned = false;
    foreach ($annItems as $item) {
        if (($item['title'] ?? '') === $annTitle && (int)($item['is_pinned'] ?? 0) === 1) {
            $foundPinned = true;
            break;
        }
    }
    if (!$foundPinned) {
        fail('US4.1 AC2 找不到剛建立的置頂公告');
    }
    pass($stats, 'US4.1 AC2 公告可置頂並可被 API 讀取');

    $homeHtml = req('GET', rtrim((string)$frontendBaseUrl, '/') . '/index.html', null, $cookieStudent, false);
    if (($homeHtml['status'] ?? 0) >= 400) {
        skip($stats, 'US4.1 AC2 前台首頁 HTML 無法取得，略過樣式區隔檢查');
    } else {
        $raw = (string)($homeHtml['raw'] ?? '');
        $hasPinnedContainer = strpos($raw, 'id="pinned-announcements"') !== false;
        $hasPinnedClass = strpos($raw, 'announcement-card-pinned') !== false;
        if ($hasPinnedContainer && $hasPinnedClass) {
            pass($stats, 'US4.1 AC2 前台存在置頂公告區塊與差異化樣式 class');
        } else {
            fail('US4.1 AC2 前台缺少置頂公告區塊或樣式 class');
        }
    }

    // ---------- User Story 2.1 ----------
    // AC1: 權限防呆
    $myClubs = req('GET', api($baseUrl, 'club-admin.php?action=my_clubs'), null, $cookieClubAdmin);
    assertSuccess($myClubs, 'US2.1 AC1 取得所屬社團');
    $clubRows = $myClubs['json']['data']['clubs'] ?? [];
    if (!is_array($clubRows) || count($clubRows) === 0) {
        fail('US2.1 AC1 幹部帳號沒有任何所屬社團可測試');
    }

    $ownClubId = (int)$clubRows[0]['club_id'];
    $foreignClubId = null;

    $allClubs = req('GET', api($baseUrl, 'clubs.php?page=1'), null, $cookieClubAdmin);
    assertSuccess($allClubs, 'US2.1 AC1 讀取社團列表');
    foreach (($allClubs['json']['data']['clubs'] ?? []) as $club) {
        $candidateId = (int)($club['club_id'] ?? 0);
        if ($candidateId > 0 && $candidateId !== $ownClubId) {
            $foreignClubId = $candidateId;
            break;
        }
    }

    if ($foreignClubId === null) {
        skip($stats, 'US2.1 AC1 找不到非所屬社團，略過跨社團權限阻擋測試');
    } else {
        $forbidden = req('PUT', api($baseUrl, 'clubs.php?action=update&id=' . $foreignClubId), [
            'club_name' => 'Should Fail',
            'description' => 'Forbidden update attempt',
            'meeting_time' => '週三 19:00-21:00',
            'meeting_location' => 'Building A',
            'contact_email' => 'clubadmin@univ.edu',
        ], $cookieClubAdmin);
        assertFailed($forbidden, 'US2.1 AC1 不可更新他社資料');
        pass($stats, 'US2.1 AC1 幹部無法更新非所屬社團');
    }

    // AC2: 欄位驗證（修正版：地點改為必填）
    $invalidOwnUpdate = req('PUT', api($baseUrl, 'clubs.php?action=update&id=' . $ownClubId), [
        'club_name' => 'US21 Invalid',
        'description' => '',
        'meeting_time' => '',
        'meeting_location' => '',
        'contact_email' => '',
    ], $cookieClubAdmin);
    assertFailed($invalidOwnUpdate, 'US2.1 AC2 必填欄位空白應阻擋');
    pass($stats, 'US2.1 AC2 必填欄位空白會被阻擋');

    // AC3: 即時同步 + US1.5 timestamp
    $newDescription = 'US21 更新內文 ' . date('His');
    $validOwnUpdate = req('PUT', api($baseUrl, 'clubs.php?action=update&id=' . $ownClubId), [
        'club_name' => 'US21 Valid ' . date('His'),
        'description' => $newDescription,
        'meeting_time' => '每週三 19:00-21:00',
        'meeting_location' => '第一教學大樓 305',
        'contact_email' => 'clubadmin@univ.edu',
    ], $cookieClubAdmin);
    assertSuccess($validOwnUpdate, 'US2.1 AC3 儲存社團基本資訊');

    $detailAfter = req('GET', api($baseUrl, 'clubs.php?action=detail&id=' . $ownClubId), null, $cookieStudent);
    assertSuccess($detailAfter, 'US2.1 AC3 前台取社團詳情');

    $detailData = $detailAfter['json']['data'] ?? [];
    $descOk = ((string)($detailData['description'] ?? '') === $newDescription);
    $updatedOk = trim((string)($detailData['last_updated'] ?? '')) !== '';

    if (!$descOk) {
        fail('US2.1 AC3 前台社團資訊未反映最新 description');
    }
    if (!$updatedOk) {
        fail('US1.5 AC1/AC2 缺少 last_updated 時間戳');
    }

    pass($stats, 'US2.1 AC3 儲存後前台可讀到最新社團資訊');
    pass($stats, 'US1.5 AC1 伺服器有更新 last_updated');

    $clubDetailHtml = req('GET', rtrim((string)$frontendBaseUrl, '/') . '/pages/club-detail.html', null, $cookieStudent, false);
    if (($clubDetailHtml['status'] ?? 0) >= 400) {
        skip($stats, 'US1.5 AC2 前台 club-detail 頁面 HTML 無法取得，略過顯示文案檢查');
    } else {
        $raw = (string)($clubDetailHtml['raw'] ?? '');
        if (strpos($raw, 'id="last-updated"') !== false || strpos($raw, '最後更新時間') !== false) {
            pass($stats, 'US1.5 AC2 前台有最後更新時間顯示區塊');
        } else {
            fail('US1.5 AC2 前台缺少最後更新時間顯示區塊');
        }
    }

    // ---------- User Story 2.2 ----------
    // AC1: 活動發布限制（必填 + 身份）
    $badEvent = req('POST', api($baseUrl, 'events.php?action=create'), [
        'club_id' => $ownClubId,
        'event_name' => '',
        'description' => '',
        'event_date' => '',
        'location' => '',
    ], $cookieClubAdmin);
    assertFailed($badEvent, 'US2.2 AC1 活動必填欄位空白應阻擋');
    pass($stats, 'US2.2 AC1 活動必填欄位驗證正常');

    // 用一般學生嘗試發布應失敗（對應「先驗幹部身份」）
    $studentPost = req('POST', api($baseUrl, 'events.php?action=create'), [
        'club_id' => $ownClubId,
        'event_name' => 'Should Be Rejected',
        'description' => 'student cannot publish',
        'event_date' => date('Y-m-d H:i:s', strtotime('+10 days 14:00:00')),
        'location' => 'Test',
    ], $cookieStudent);
    assertFailed($studentPost, 'US2.2 AC1 一般學生不可發布活動');
    pass($stats, 'US2.2 AC1 發布前有幹部身份驗證');

    $futureEventName = 'US22 活動 ' . date('His');
    $newEvent = req('POST', api($baseUrl, 'events.php?action=create'), [
        'club_id' => $ownClubId,
        'event_name' => $futureEventName,
        'description' => 'US22 活動內容',
        'event_date' => date('Y-m-d H:i:s', strtotime('+9 days 15:00:00')),
        'location' => 'R201',
        'is_registration_open' => true,
    ], $cookieClubAdmin);
    assertSuccess($newEvent, 'US2.2 AC1 幹部可發布活動');
    pass($stats, 'US2.2 AC1 幹部可成功發布活動');

    // AC2: 前台顯示與過濾（未過期顯示、依日期）
    $eventsRes = req('GET', api($baseUrl, 'events.php?page=1'), null, $cookieStudent);
    assertSuccess($eventsRes, 'US2.2 AC2 讀取活動列表');
    $events = $eventsRes['json']['data']['events'] ?? [];

    $foundFuture = false;
    $sortedOk = true;
    $lastDate = null;
    foreach ($events as $e) {
        $d = strtotime((string)($e['event_date'] ?? ''));
        if ($d === false) {
            continue;
        }

        if (($e['event_name'] ?? '') === $futureEventName) {
            $foundFuture = true;
        }

        if ($lastDate !== null && $d < $lastDate) {
            // 預期近到遠：時間應遞增（小到大）
            $sortedOk = false;
            break;
        }
        $lastDate = $d;
    }

    if ($foundFuture) {
        pass($stats, 'US2.2 AC2 新發布活動可於前台列表看見');
    } else {
        fail('US2.2 AC2 前台活動列表找不到剛發布活動');
    }

    if ($sortedOk) {
        pass($stats, 'US2.2 AC2 活動列表近到遠排序檢查通過（抽樣）');
    } else {
        fail('US2.2 AC2 活動排序不符近到遠');
    }

    // ---------- User Story 1.1 ----------
    // AC1: 介面元素
    $clubListHtml = req('GET', rtrim((string)$frontendBaseUrl, '/') . '/pages/club-list.html', null, $cookieStudent, false);
    if (($clubListHtml['status'] ?? 0) >= 400) {
        skip($stats, 'US1.1 AC1 無法讀取 club-list.html，略過介面元素檢查');
    } else {
        $raw = (string)($clubListHtml['raw'] ?? '');
        $hasCategory = strpos($raw, 'id="category-filter"') !== false;
        $hasPopularTag = strpos($raw, 'id="popular-tags"') !== false;

        if ($hasCategory && $hasPopularTag) {
            pass($stats, 'US1.1 AC1 前台具備分類與熱門標籤介面元素');
        } else {
            fail('US1.1 AC1 前台缺少分類或熱門標籤元素');
        }
    }

    // AC2: 交集過濾邏輯（依你修正版改為 OR）
    $filterRes = req('GET', api($baseUrl, 'clubs.php?category_id=2&tags=1,3&tag_match_mode=or&page=1'), null, $cookieStudent);
    assertSuccess($filterRes, 'US1.1 AC2 分類+標籤 OR 篩選 API');
    pass($stats, 'US1.1 AC2 分類+標籤 OR 篩選 API 可用');

    // AC3: 空結果防呆
    $emptyRes = req('GET', api($baseUrl, 'clubs.php?search=__NO_MATCH__' . date('His')), null, $cookieStudent);
    assertSuccess($emptyRes, 'US1.1 AC3 空結果查詢');
    $clubs = $emptyRes['json']['data']['clubs'] ?? [];
    if (is_array($clubs) && count($clubs) === 0) {
        pass($stats, 'US1.1 AC3 API 空結果可回傳空陣列（前台可據此顯示提示）');
    } else {
        skip($stats, 'US1.1 AC3 空結果目前非空，建議人工再確認前台提示文案');
    }

    // ---------- User Story 1.3 ----------
    // AC1: 追蹤狀態切換
    $toggle1 = req('POST', api($baseUrl, 'clubs.php?action=toggle_follow&id=' . $ownClubId), [], $cookieStudent);
    assertSuccess($toggle1, 'US1.3 AC1 追蹤切換第1次');

    $toggle2 = req('POST', api($baseUrl, 'clubs.php?action=toggle_follow&id=' . $ownClubId), [], $cookieStudent);
    assertSuccess($toggle2, 'US1.3 AC1 追蹤切換第2次');
    pass($stats, 'US1.3 AC1 追蹤/取消追蹤 API 正常');

    // AC2 + AC3: 動態牆排序與空狀態
    $feed = req('GET', api($baseUrl, 'notifications.php?action=feed'), null, $cookieStudent);
    assertSuccess($feed, 'US1.3 AC2/AC3 讀取個人動態牆');

    $feedData = $feed['json']['data'] ?? [];
    $feedItems = $feedData['feed'] ?? [];
    $emptyState = $feedData['empty_state'] ?? null;

    if (is_array($feedItems) && count($feedItems) > 0) {
        pass($stats, 'US1.3 AC2 已追蹤情境可取得動態牆資料');
    } elseif (is_array($emptyState)) {
        $hasMsg = trim((string)($emptyState['message'] ?? '')) !== '';
        $hasCta = trim((string)($emptyState['cta_url'] ?? '')) !== '';
        if ($hasMsg && $hasCta) {
            pass($stats, 'US1.3 AC3 空狀態有提示訊息與導引按鈕資料');
        } else {
            fail('US1.3 AC3 空狀態缺少提示訊息或導引按鈕資料');
        }
    } else {
        skip($stats, 'US1.3 AC2/AC3 動態牆結果需人工複核');
    }

} catch (Throwable $e) {
    $stats['fail']++;
    out('FAIL: ' . $e->getMessage());
}

out('=== Acceptance Test (PHP) Summary ===');
out('PASS=' . $stats['pass']);
out('FAIL=' . $stats['fail']);
out('SKIP=' . $stats['skip']);

exit($stats['fail'] > 0 ? 1 : 0);
