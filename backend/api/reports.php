<?php
/**
 * 檢舉 API 端點
 */

require_once '../auth.php';
require_once '../content_filter.php';

Helper::handleCorsPreFlight();

class ReportAPI {

    private static function normalizeReason(string $reason, string $reportType): string {
        $trimmed = trim($reason);
        if ($trimmed !== '') {
            return $trimmed;
        }

        $fallback = [
            'inappropriate_content' => '不當內容',
            'false_information' => '不實資訊',
            'spam' => '垃圾訊息 / 廣告',
            'harassment' => '人身攻擊 / 騷擾',
            'other' => '其他'
        ];

        return $fallback[$reportType] ?? '其他';
    }

    private static function normalizeReportedTypeKey(string $rawType): string {
        $mapping = [
            'inappropriate' => 'inappropriate_content',
            'misinformation' => 'false_information'
        ];

        return $mapping[$rawType] ?? $rawType;
    }

    private static function getContentOwnerUserId($type, $contentId) {
        $sqlMap = [
            'qa_question' => 'SELECT user_id FROM q_and_a WHERE qa_id = ? LIMIT 1',
            'qa_reply' => 'SELECT user_id FROM qa_replies WHERE reply_id = ? LIMIT 1',
            'review' => 'SELECT user_id FROM reviews WHERE review_id = ? LIMIT 1',
            'event' => 'SELECT club_id FROM events WHERE event_id = ? LIMIT 1'
        ];

        if (!isset($sqlMap[$type])) {
            return null;
        }

        if ($type === 'event') {
            $event = Database::getInstance()->fetchOne($sqlMap[$type], [$contentId]);
            if (!$event || empty($event['club_id'])) {
                return null;
            }

            $owner = Database::getInstance()->fetchOne(
                'SELECT user_id FROM club_members WHERE club_id = ? AND is_active = 1 AND role IN ("president", "vice_president", "public_relations", "director") ORDER BY FIELD(role, "president", "vice_president", "public_relations", "director") LIMIT 1',
                [(int)$event['club_id']]
            );
            return $owner ? (int)$owner['user_id'] : null;
        }

        $row = Database::getInstance()->fetchOne($sqlMap[$type], [$contentId]);
        if (!$row || !isset($row['user_id'])) {
            return null;
        }
        return (int)$row['user_id'];
    }

    private static function normalizeReportType($rawType) {
        $type = trim((string)$rawType);
        $allowed = ['qa_question', 'qa_reply', 'review', 'event', 'club'];
        if (!in_array($type, $allowed, true)) {
            Helper::error('無效的檢舉內容類型', 400);
        }
        return $type;
    }

    private static function ensureContentExists($type, $contentId) {
        $tableMap = [
            'qa_question' => ['table' => 'q_and_a', 'id' => 'qa_id'],
            'qa_reply' => ['table' => 'qa_replies', 'id' => 'reply_id'],
            'review' => ['table' => 'reviews', 'id' => 'review_id'],
            'event' => ['table' => 'events', 'id' => 'event_id'],
            'club' => ['table' => 'clubs', 'id' => 'club_id']
        ];

        $meta = $tableMap[$type] ?? null;
        if (!$meta) {
            Helper::error('無效的檢舉內容類型', 400);
        }

        $row = Database::getInstance()->fetchOne(
            'SELECT ' . $meta['id'] . ' AS id FROM ' . $meta['table'] . ' WHERE ' . $meta['id'] . ' = ? LIMIT 1',
            [$contentId]
        );
        if (!$row) {
            Helper::error('檢舉目標不存在', 404);
        }
    }

    public static function createReport($data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        $errors = Helper::validateRequired($data, ['reported_content_type', 'reported_content_id', 'report_type']);
        if (!empty($errors)) {
            Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
        }

        $type = self::normalizeReportType($data['reported_content_type']);
        $contentId = (int)$data['reported_content_id'];
        if ($contentId <= 0) {
            Helper::error('檢舉目標 ID 無效', 400);
        }

        if (ContentFilter::hasRestrictedInFields($data, ['reason', 'description'])) {
            Helper::error('檢舉內容包含不適當字眼，請修改後再送出', 400);
        }

        self::ensureContentExists($type, $contentId);

        $ownerUserId = self::getContentOwnerUserId($type, $contentId);
        if ($ownerUserId !== null && $ownerUserId === (int)Auth::getCurrentUserId()) {
            Helper::error('不能檢舉自己發佈的內容', 403);
        }

        $reportTypeRaw = self::normalizeReportedTypeKey((string)$data['report_type']);
        $reportType = in_array($reportTypeRaw, ['inappropriate_content', 'spam', 'false_information', 'harassment', 'other'], true)
            ? $reportTypeRaw
            : 'other';

        $uid = (int)Auth::getCurrentUserId();

        $recentCount = Database::getInstance()->fetchOne(
            'SELECT COUNT(*) AS cnt FROM reports
             WHERE reported_by_user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)',
            [$uid]
        );
        if ((int)($recentCount['cnt'] ?? 0) >= 5) {
            $oldest = Database::getInstance()->fetchOne(
                'SELECT created_at FROM reports
                 WHERE reported_by_user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
                 ORDER BY created_at ASC LIMIT 1',
                [$uid]
            );
            $cooldownEnds = strtotime($oldest['created_at']) + 600;
            $remaining = max(1, $cooldownEnds - time());
            $minutes = ceil($remaining / 60);
            Helper::error("檢舉頻率過高，請於 {$minutes} 分鐘後再試", 429);
        }

        $existingPending = Database::getInstance()->fetchOne(
            'SELECT report_id FROM reports WHERE reported_by_user_id = ? AND reported_content_type = ? AND reported_content_id = ? AND status IN ("pending", "reviewing") LIMIT 1',
            [$uid, $type, $contentId]
        );
        if ($existingPending) {
            Helper::error('你已檢舉過此內容，請等待審核結果', 409);
        }

        $reportId = dbInsert('reports', [
            'reported_by_user_id' => $uid,
            'report_type' => $reportType,
            'reported_content_type' => $type,
            'reported_content_id' => $contentId,
            'reason' => self::normalizeReason((string)($data['reason'] ?? ''), $reportType),
            'description' => trim((string)($data['description'] ?? '')),
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s')
        ]);

        if (!$reportId) {
            Helper::error('檢舉送出失敗', 500);
        }

        $admins = Database::getInstance()->fetchAll(
            "SELECT user_id FROM users WHERE role = 'platform_admin' AND is_active = 1"
        );
        $typeLabels = [
            'qa_question' => 'Q&A 提問',
            'qa_reply'    => 'Q&A 回覆',
            'review'      => '社團評價',
            'event'       => '活動',
            'club'        => '社團資料',
        ];
        $typeLabel = $typeLabels[$type] ?? $type;
        foreach ($admins as $admin) {
            dbInsert('notifications', [
                'user_id'           => $admin['user_id'],
                'title'             => '新檢舉待審核',
                'message'           => "有一筆【{$typeLabel}】被檢舉，請前往管理後台審核。",
                'notification_type' => 'system',
                'related_type'      => 'report',
                'related_id'        => $reportId,
                'is_read'           => 0,
                'created_at'        => date('Y-m-d H:i:s')
            ]);
        }

        Helper::success('檢舉已送出，感謝你的回饋', ['report_id' => $reportId]);
    }
}

$method = Helper::getRequestMethod();
$action = $_GET['action'] ?? 'create';
$data = ($method === 'POST' || $method === 'PUT') ? Helper::getRequestInput() : [];

if ($method === 'POST' && $action === 'create') {
    ReportAPI::createReport($data);
}

Helper::error('無效請求', 400);
