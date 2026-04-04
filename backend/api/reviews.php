<?php
/**
 * 評論和評價 API 端點
 */

require_once '../auth.php';

class ReviewAPI {
    private static function toLower($text) {
        $value = (string)$text;
        if (function_exists('mb_strtolower')) {
            return mb_strtolower($value, 'UTF-8');
        }
        return strtolower($value);
    }

    private static function containsText($haystack, $needle) {
        if ($needle === '') {
            return false;
        }

        if (function_exists('mb_strpos')) {
            return mb_strpos($haystack, $needle, 0, 'UTF-8') !== false;
        }

        return strpos($haystack, $needle) !== false;
    }

    private static function getFilterRules() {
        static $rules = null;
        if ($rules === null) {
            $rules = require __DIR__ . '/../review_filter_rules.php';
        }
        return $rules;
    }

    private static function normalizeForFilter($text) {
        $normalized = self::toLower((string)$text);
        // 去掉空白/符號，減少簡單插字規避
        $result = preg_replace('/[\s\p{P}\p{S}]+/u', '', $normalized);
        return $result === null ? $normalized : $result;
    }

    private static function isWhitelistedContext($normalizedText) {
        $rules = self::getFilterRules();
        $whitelist = $rules['whitelist'] ?? [];

        foreach ($whitelist as $term) {
            if (self::containsText($normalizedText, $term)) {
                return true;
            }
        }

        return false;
    }

    // 第一層：粗俗/腥羶色（類似 profanity filter）
    private static function containsProfanity($normalizedText) {
        $rules = self::getFilterRules();
        $patterns = $rules['profanity_patterns'] ?? [];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $normalizedText) === 1) {
                return true;
            }
        }

        return false;
    }

    // 第二層：補充 bad words list zh（可依需求持續擴充）
    private static function containsExtraBadWords($normalizedText) {
        $rules = self::getFilterRules();
        $badWords = $rules['extra_bad_words'] ?? [];

        foreach ($badWords as $word) {
            if (self::containsText($normalizedText, $word)) {
                return true;
            }
        }

        return false;
    }

    // 第三層：反垃圾文本規則（廣告/導流/聯絡方式轟炸）
    private static function containsSpamPattern($rawText, $normalizedText) {
        $raw = (string)$rawText;
        $rules = self::getFilterRules();
        $spamPatterns = $rules['spam_patterns'] ?? [];

        foreach ($spamPatterns as $pattern) {
            if (preg_match($pattern, $raw) === 1 || preg_match($pattern, $normalizedText) === 1) {
                return true;
            }
        }

        // 同字連續灌水（例如：讚讚讚讚讚...）
        if (preg_match('/(.)\1{8,}/u', $normalizedText) === 1) {
            return true;
        }

        return false;
    }

    private static function containsRestrictedLanguage($text) {
        $normalized = self::normalizeForFilter($text);

        if (self::isWhitelistedContext($normalized)) {
            return false;
        }

        if (self::containsProfanity($normalized)) {
            return true;
        }

        if (self::containsExtraBadWords($normalized)) {
            return true;
        }

        if (self::containsSpamPattern($text, $normalized)) {
            return true;
        }

        return false;
    }
    
    /**
     * 取得社團評價列表
     * GET /api/reviews.php?club_id=1&page=1
     */
    public static function getReviews() {
        try {
            $club_id = $_GET['club_id'] ?? null;
            $page = (int)($_GET['page'] ?? 1);
            $per_page = ITEMS_PER_PAGE;
            $offset = ($page - 1) * $per_page;
            
            if (!$club_id) {
                Helper::error('需要指定 club_id', 400);
            }
            
                    $sql = "SELECT r.*, u.name AS user_name 
                    FROM reviews r
                    JOIN users u ON r.user_id = u.user_id
                    WHERE r.club_id = ? AND r.review_status = 'approved' 
                    ORDER BY created_at DESC LIMIT ? OFFSET ?";
            $stmt = Database::getInstance()->prepare($sql);
            $stmt->bind_param('sii', $club_id, $per_page, $offset);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $reviews = [];
            while ($row = $result->fetch_assoc()) {
                $row['author_name'] = !empty($row['is_anonymous'])
                    ? ($row['display_name'] ?: '匿名用戶')
                    : ($row['user_name'] ?: '匿名用戶');

                // 隱藏實名信息
                if ($row['is_anonymous']) {
                    $row['display_name'] = $row['display_name'] ?: '匿名用戶';
                    unset($row['user_id']);
                }
                $reviews[] = $row;
            }
            $stmt->close();
            
            // 取得總數和評分統計
            $info = Database::getInstance()->fetchOne(
                'SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM reviews 
                 WHERE club_id = ? AND review_status = "approved"',
                [$club_id]
            );
            
            Helper::success('取得評化成功', [
                'reviews' => $reviews,
                'average_rating' => $info['avg_rating'],
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $per_page,
                    'total' => $info['count'],
                    'total_pages' => ceil($info['count'] / $per_page)
                ]
            ]);
            
        } catch (Exception $e) {
            Helper::error('取得評價失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 建立評價
     * POST /api/reviews.php?action=create
     */
    public static function createReview($data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }
        
        try {
            $errors = Helper::validateRequired($data, ['club_id', 'rating', 'review_content']);
            if (!empty($errors)) {
                Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
            }
            
            if ($data['rating'] < 1 || $data['rating'] > 5) {
                Helper::error('評分必須在1-5之間', 400);
            }

            $existingReview = Database::getInstance()->fetchOne(
                'SELECT review_id FROM reviews WHERE club_id = ? AND user_id = ? LIMIT 1',
                [$data['club_id'], Auth::getCurrentUserId()]
            );
            if (!empty($existingReview)) {
                Helper::error('您已評價過此社團，每個社團僅能評價一次', 409);
            }

            $reviewText = trim(($data['review_title'] ?? '') . ' ' . ($data['review_content'] ?? ''));
            if (self::containsRestrictedLanguage($reviewText)) {
                Helper::error('評價內容包含不適當字眼，請修改後再送出', 400);
            }
            
            // 檢查是否曾參加過此社團的活動
            $verified = false;
            if (isset($data['event_attended_id'])) {
                $attendance = Database::getInstance()->fetchOne(
                    'SELECT * FROM event_attendance WHERE event_id = ? AND user_id = ?',
                    [$data['event_attended_id'], Auth::getCurrentUserId()]
                );
                $verified = !empty($attendance);
            }
            
            $review_id = dbInsert('reviews', [
                'club_id' => $data['club_id'],
                'user_id' => Auth::getCurrentUserId(),
                'rating' => $data['rating'],
                'review_title' => $data['review_title'] ?? '',
                'review_content' => $data['review_content'],
                'is_anonymous' => $data['is_anonymous'] ?? false,
                'display_name' => $data['display_name'] ?? '',
                'verified_participant' => $verified,
                'event_attended_id' => $data['event_attended_id'] ?? null,
                'review_status' => 'approved'
            ]);
            
            if (!$review_id) {
                Helper::error('評價發布失敗', 500);
            }
            
            Helper::success('評價已發布', ['review_id' => $review_id]);
            
        } catch (Exception $e) {
            Helper::error('發布評價失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 審核評價（管理員）
     * PUT /api/reviews.php?action=approve&id=1
     */
    public static function approveReview($review_id) {
        if (!Auth::isAdmin()) {
            Helper::error('您無權限執行此操作', 403);
        }
        
        try {
            dbUpdate('reviews', [
                'review_status' => 'approved'
            ], 'review_id = ?', [$review_id]);
            
            Helper::success('審核成功');
            
        } catch (Exception $e) {
            Helper::error('審核失敗: ' . $e->getMessage(), 500);
        }
    }
}

// 路由處理
$method = Helper::getRequestMethod();
$action = $_GET['action'] ?? 'list';
$review_id = $_GET['id'] ?? null;

$data = ($method === 'POST' || $method === 'PUT')
    ? (Helper::getJsonInput() ?? $_POST)
    : [];

if ($method === 'GET' && $action === 'list') {
    ReviewAPI::getReviews();
} elseif ($method === 'POST' && $action === 'create') {
    ReviewAPI::createReview($data);
} elseif ($method === 'PUT' && $action === 'approve' && $review_id) {
    ReviewAPI::approveReview($review_id);
}

Helper::error('無效的請求', 400);
