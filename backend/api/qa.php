<?php
/**
 * 提問留言板 API 端點
 */

require_once '../auth.php';
require_once '../content_filter.php';

class QandAAPI {
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

    private static function containsSpamPattern($rawText, $normalizedText) {
        $raw = (string)$rawText;
        $rules = self::getFilterRules();
        $spamPatterns = $rules['spam_patterns'] ?? [];

        foreach ($spamPatterns as $pattern) {
            if (preg_match($pattern, $raw) === 1 || preg_match($pattern, $normalizedText) === 1) {
                return true;
            }
        }

        if (preg_match('/(.)\1{8,}/u', $normalizedText) === 1) {
            return true;
        }

        return false;
    }

    private static function containsRestrictedLanguage($text) {
        return ContentFilter::containsRestrictedLanguage($text);
    }

    private static function getUrgencyLabel($urgency) {
        switch ($urgency) {
            case 'urgent':
                return '緊急';
            case 'important':
                return '重要';
            case 'normal':
            default:
                return '一般';
        }
    }

    /**
     * 取得 QA 標籤列表
     * GET /api/qa.php?action=tags
     */
    public static function getTags() {
        try {
            $tags = Database::getInstance()->fetchAll(
                'SELECT qa_tag_id, tag_name, tag_category FROM qa_tags ORDER BY tag_name ASC'
            );

            Helper::success('取得 QA 標籤成功', ['tags' => $tags]);
        } catch (Exception $e) {
            Helper::error('取得 QA 標籤失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 取得提問列表
     * GET /api/qa.php?club_id=1&tag_id=1&page=1
     */
    public static function getQuestions() {
        try {
            $club_id = $_GET['club_id'] ?? null;
            $tag_id = $_GET['tag_id'] ?? null;
            $search = $_GET['search'] ?? '';
            $status = $_GET['status'] ?? null;
            $page = (int)($_GET['page'] ?? 1);
            $per_page = ITEMS_PER_PAGE;
            $offset = ($page - 1) * $per_page;
            
            $conditions = [];
            $params = [];
            
            if ($club_id) {
                $conditions[] = 'qa.club_id = ?';
                $params[] = $club_id;
            }

            if ($tag_id) {
                $conditions[] = 'qa.qa_id IN (SELECT qa_id FROM qa_tag_relations WHERE qa_tag_id = ?)';
                $params[] = $tag_id;
            }

            if ($search) {
                $conditions[] = '(qa.question_title LIKE ? OR qa.question_content LIKE ?)';
                $params[] = "%$search%";
                $params[] = "%$search%";
            }

            if ($status) {
                $conditions[] = 'qa.status = ?';
                $params[] = $status;
            }
            
            $where = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
            
            // 取得提問列表
            $sql = "SELECT qa.*, u.name AS user_name, u.avatar_path AS user_avatar_path
                    FROM q_and_a qa
                    JOIN users u ON qa.user_id = u.user_id
                    $where ORDER BY qa.created_at DESC LIMIT ? OFFSET ?";
            $stmt = Database::getInstance()->prepare($sql);
            if ($stmt === false) {
                throw new Exception('查詢準備失敗: ' . Database::getInstance()->error);
            }

            $queryParams = $params;
            if (!empty($queryParams)) {
                $types = str_repeat('s', count($queryParams)) . 'ii';
                $queryParams[] = $per_page;
                $queryParams[] = $offset;
                $stmt->bind_param($types, ...$queryParams);
            } else {
                $stmt->bind_param('ii', $per_page, $offset);
            }
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            $questions = [];
            while ($row = $result->fetch_assoc()) {
                $row['author_name'] = !empty($row['is_anonymous'])
                    ? ($row['display_name'] ?: '匿名用戶')
                    : ($row['user_name'] ?: '匿名用戶');

                // 取得標籤
                $tags = Database::getInstance()->fetchAll(
                    'SELECT t.* FROM qa_tags t 
                     JOIN qa_tag_relations qtr ON t.qa_tag_id = qtr.qa_tag_id 
                     WHERE qtr.qa_id = ?',
                    [$row['qa_id']]
                );
                $row['tags'] = $tags;
                
                // 取得回覆數
                $replies = Database::getInstance()->fetchOne(
                    'SELECT COUNT(*) as count FROM qa_replies WHERE qa_id = ?',
                    [$row['qa_id']]
                );
                $row['replies_count'] = $replies['count'];
                $row['is_solved'] = ($row['status'] ?? '') === 'closed' ? 1 : 0;
                $row['urgency_label'] = self::getUrgencyLabel($row['urgency_level'] ?? 'normal');
                
                $questions[] = $row;
            }
            $stmt->close();
            
            // 取得總數
            $count_sql = "SELECT COUNT(*) as total FROM q_and_a qa $where";
            $count_stmt = Database::getInstance()->prepare($count_sql);
            if ($count_stmt === false) {
                throw new Exception('計數查詢準備失敗: ' . Database::getInstance()->error);
            }
            if (!empty($params)) {
                $count_types = str_repeat('s', count($params));
                $count_stmt->bind_param($count_types, ...$params);
            }
            $count_stmt->execute();
            $count_result = $count_stmt->get_result();
            $total = $count_result->fetch_assoc()['total'];
            $count_stmt->close();
            
            Helper::success('取得提問列表成功', [
                'questions' => $questions,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $per_page,
                    'total' => $total,
                    'total_pages' => ceil($total / $per_page)
                ]
            ]);
            
        } catch (Exception $e) {
            Helper::error('取得提問列表失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 取得單個提問詳情
     * GET /api/qa.php?action=detail&id=1
     */
    public static function getQuestionDetail($qa_id) {
        try {
            $track_view = isset($_GET['track_view']) ? (int)$_GET['track_view'] : 1;
            $question = Database::getInstance()->fetchOne(
                'SELECT qa.*, u.name AS user_name, u.avatar_path AS user_avatar_path
                 FROM q_and_a qa
                 JOIN users u ON qa.user_id = u.user_id
                 WHERE qa.qa_id = ?',
                [$qa_id]
            );
            
            if (!$question) {
                Helper::error('提問不存在', 404);
            }
            
            $question['author_name'] = !empty($question['is_anonymous'])
                ? ($question['display_name'] ?: '匿名用戶')
                : ($question['user_name'] ?: '匿名用戶');

            if ($track_view === 1) {
                dbUpdate('q_and_a', ['views_count' => $question['views_count'] + 1], 'qa_id = ?', [$qa_id]);
                $question['views_count'] = (int)$question['views_count'] + 1;
            }
            
            // 取得標籤
            $tags = Database::getInstance()->fetchAll(
                'SELECT t.* FROM qa_tags t 
                 JOIN qa_tag_relations qtr ON t.qa_tag_id = qtr.qa_tag_id 
                 WHERE qtr.qa_id = ?',
                [$qa_id]
            );
            $question['tags'] = $tags;
            
            // 取得統計信息
            $replies_count = Database::getInstance()->fetchOne(
                'SELECT COUNT(*) as count FROM qa_replies WHERE qa_id = ?',
                [$qa_id]
            );
            $question['replies_count'] = $replies_count['count'];
            
            $helpful_count = Database::getInstance()->fetchOne(
                'SELECT COUNT(*) as count FROM qa_replies qr 
                 JOIN qa_reply_helpful qrh ON qr.reply_id = qrh.reply_id AND qrh.vote_type = "helpful"
                 WHERE qr.qa_id = ?',
                [$qa_id]
            );
            $question['helpful_count'] = $helpful_count['count'];
            $not_helpful_count = Database::getInstance()->fetchOne(
                'SELECT COUNT(*) as count FROM qa_replies qr 
                 JOIN qa_reply_helpful qrh ON qr.reply_id = qrh.reply_id AND qrh.vote_type = "not_helpful"
                 WHERE qr.qa_id = ?',
                [$qa_id]
            );
            $question['not_helpful_count'] = $not_helpful_count['count'];
            $question['is_solved'] = ($question['status'] ?? '') === 'closed' ? 1 : 0;
            $question['urgency_label'] = self::getUrgencyLabel($question['urgency_level'] ?? 'normal');
            
            Helper::success('取得提問詳情成功', $question);
            
        } catch (Exception $e) {
            Helper::error('取得提問詳情失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 發布提問
     * POST /api/qa.php?action=create
     */
    public static function createQuestion($data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }
        
        try {
            $errors = Helper::validateRequired($data, ['club_id', 'question_title', 'question_content']);
            if (!empty($errors)) {
                Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
            }

            $questionText = trim(($data['question_title'] ?? '') . ' ' . ($data['question_content'] ?? ''));
            if (self::containsRestrictedLanguage($questionText)) {
                Helper::error('提問內容包含不適當字眼，請修改後再送出', 400);
            }
            
            $qa_id = dbInsert('q_and_a', [
                'club_id' => $data['club_id'],
                'user_id' => Auth::getCurrentUserId(),
                'question_title' => $data['question_title'],
                'question_content' => $data['question_content'],
                'urgency_level' => in_array(($data['urgency_level'] ?? 'normal'), ['normal', 'important', 'urgent'], true)
                    ? $data['urgency_level']
                    : 'normal',
                'is_anonymous' => $data['is_anonymous'] ?? false,
                'display_name' => $data['display_name'] ?? '',
                'status' => 'open'
            ]);
            
            if (!$qa_id) {
                Helper::error('提問發布失敗', 500);
            }
            
            // 新增標籤
            if (isset($data['tag_ids']) && is_array($data['tag_ids'])) {
                foreach ($data['tag_ids'] as $tag_id) {
                    dbInsert('qa_tag_relations', [
                        'qa_id' => $qa_id,
                        'qa_tag_id' => $tag_id
                    ]);
                }
            }
            
            // 紀錄活動日誌
            dbInsert('activity_logs', [
                'club_id' => $data['club_id'],
                'activity_type' => 'post_qa',
                'triggered_by' => Auth::getCurrentUserId(),
                'description' => '發布了新提問'
            ]);
            
            Helper::success('提問發布成功', ['qa_id' => $qa_id]);
            
        } catch (Exception $e) {
            Helper::error('提問發布失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 回覆提問
     * POST /api/qa.php?action=reply&id=1
     */
    public static function replyQuestion($qa_id, $data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }
        
        try {
            $errors = Helper::validateRequired($data, ['content']);
            if (!empty($errors)) {
                Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
            }

            if (self::containsRestrictedLanguage($data['content'] ?? '')) {
                Helper::error('回覆內容包含不適當字眼，請修改後再送出', 400);
            }
            
            $reply_id = dbInsert('qa_replies', [
                'qa_id' => $qa_id,
                'user_id' => Auth::getCurrentUserId(),
                'reply_content' => $data['content'],
                'is_official_answer' => $data['is_official'] ?? false
            ]);
            
            if (!$reply_id) {
                Helper::error('回覆失敗', 500);
            }
            
            Helper::success('回覆成功', ['reply_id' => $reply_id]);
            
        } catch (Exception $e) {
            Helper::error('回覆失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 取得提問回覆
     * GET /api/qa.php?action=replies&question_id=1
     */
    public static function getReplies() {
        $question_id = $_GET['question_id'] ?? null;
        if (!$question_id) {
            Helper::error('缺少提問ID', 400);
        }

        try {
            $replies = Database::getInstance()->fetchAll(
                'SELECT
                    qr.reply_id,
                    qr.qa_id,
                    qr.user_id,
                    qr.reply_content AS content,
                    qr.is_official_answer AS is_official,
                    qr.is_anonymous,
                    qr.display_name,
                    qr.created_at,
                    qr.updated_at,
                    u.name as user_name,
                    u.avatar_path AS user_avatar_path
                 FROM qa_replies qr
                 JOIN users u ON qr.user_id = u.user_id
                 WHERE qr.qa_id = ?
                 ORDER BY qr.created_at ASC',
                [$question_id]
            );

            // 取得每條回覆的有幫助數量
            foreach ($replies as &$reply) {
                $helpful_count = Database::getInstance()->fetchOne(
                    'SELECT COUNT(*) as count FROM qa_reply_helpful WHERE reply_id = ? AND vote_type = "helpful"',
                    [$reply['reply_id']]
                );
                $reply['helpful_count'] = $helpful_count['count'];
                $not_helpful_count = Database::getInstance()->fetchOne(
                    'SELECT COUNT(*) as count FROM qa_reply_helpful WHERE reply_id = ? AND vote_type = "not_helpful"',
                    [$reply['reply_id']]
                );
                $reply['not_helpful_count'] = $not_helpful_count['count'];

                $reply['author_name'] = !empty($reply['is_anonymous'])
                    ? ($reply['display_name'] ?: '匿名用戶')
                    : ($reply['user_name'] ?: '匿名用戶');

                // 檢查當前用戶是否可以標記為有幫助
                if (Auth::isLoggedIn()) {
                    $user_id = Auth::getCurrentUserId();
                    $vote = Database::getInstance()->fetchOne(
                        'SELECT vote_type FROM qa_reply_helpful WHERE reply_id = ? AND user_id = ?',
                        [$reply['reply_id'], $user_id]
                    );
                    $reply['my_vote'] = $vote['vote_type'] ?? null;
                    $reply['can_vote'] = (int)$reply['user_id'] !== (int)$user_id;
                } else {
                    $reply['my_vote'] = null;
                    $reply['can_vote'] = false;
                }
            }

            Helper::success('取得回覆成功', ['replies' => $replies]);

        } catch (Exception $e) {
            Helper::error('取得回覆失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 添加回覆
     * POST /api/qa.php?action=add_reply
     */
    public static function addReply($data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        try {
            $errors = Helper::validateRequired($data, ['question_id', 'content']);
            if (!empty($errors)) {
                Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
            }

            if (self::containsRestrictedLanguage($data['content'] ?? '')) {
                Helper::error('回覆內容包含不適當字眼，請修改後再送出', 400);
            }

            $reply_id = dbInsert('qa_replies', [
                'qa_id' => $data['question_id'],
                'user_id' => Auth::getCurrentUserId(),
                'reply_content' => $data['content'],
                'is_official_answer' => $data['is_official'] ?? false
            ]);

            if (!$reply_id) {
                Helper::error('回覆失敗', 500);
            }

            Helper::success('回覆成功', ['reply_id' => $reply_id]);

        } catch (Exception $e) {
            Helper::error('回覆失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 標記回覆回饋
     */
    public static function voteReply($data, $vote_type) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        try {
            $errors = Helper::validateRequired($data, ['reply_id']);
            if (!empty($errors)) {
                Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
            }

            if (!in_array($vote_type, ['helpful', 'not_helpful'], true)) {
                Helper::error('無效的回饋類型', 400);
            }

            $reply = Database::getInstance()->fetchOne(
                'SELECT reply_id, user_id FROM qa_replies WHERE reply_id = ?',
                [$data['reply_id']]
            );

            if (!$reply) {
                Helper::error('回覆不存在', 404);
            }

            if ((int)$reply['user_id'] === (int)Auth::getCurrentUserId()) {
                Helper::error('不能評價自己的回覆', 403);
            }

            $existing = Database::getInstance()->fetchOne(
                'SELECT vote_type FROM qa_reply_helpful WHERE reply_id = ? AND user_id = ?',
                [$data['reply_id'], Auth::getCurrentUserId()]
            );

            if ($existing) {
                dbUpdate('qa_reply_helpful', [
                    'vote_type' => $vote_type
                ], 'reply_id = ? AND user_id = ?', [$data['reply_id'], Auth::getCurrentUserId()]);
            } else {
                $insert = Database::getInstance()->prepare(
                    'INSERT INTO qa_reply_helpful (reply_id, user_id, vote_type) VALUES (?, ?, ?)'
                );
                if ($insert === false) {
                    throw new Exception('建立回饋失敗: ' . Database::getInstance()->error);
                }
                $reply_id = $data['reply_id'];
                $user_id = Auth::getCurrentUserId();
                $insert->bind_param('iis', $reply_id, $user_id, $vote_type);
                $insert->execute();
                $insert->close();
            }

            Helper::success('回饋已更新');

        } catch (Exception $e) {
            Helper::error('更新回饋失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 取得用戶的提問
     * GET /api/qa.php?action=my_questions
     */
    public static function getMyQuestions() {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        try {
            $questions = Database::getInstance()->fetchAll(
                'SELECT qa.*, qa.question_title AS title, c.club_name,
                        CASE WHEN qa.status = "closed" THEN 1 ELSE 0 END AS is_solved
                 FROM q_and_a qa
                 JOIN clubs c ON qa.club_id = c.club_id
                 WHERE qa.user_id = ?
                 ORDER BY qa.created_at DESC',
                [Auth::getCurrentUserId()]
            );

            Helper::success('取得我的提問成功', ['questions' => $questions]);

        } catch (Exception $e) {
            Helper::error('取得我的提問失敗: ' . $e->getMessage(), 500);
        }
    }
    public static function markSolved($data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        try {
            $errors = Helper::validateRequired($data, ['question_id']);
            if (!empty($errors)) {
                Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
            }

            // 檢查是否為提問者
            $question = Database::getInstance()->fetchOne(
                'SELECT * FROM q_and_a WHERE qa_id = ?',
                [$data['question_id']]
            );

            if (!$question) {
                Helper::error('提問不存在', 404);
            }

            if ($question['user_id'] !== Auth::getCurrentUserId()) {
                Helper::error('只有提問者才能標記為已解決', 403);
            }

            $result = dbUpdate('q_and_a', ['status' => 'closed'], 'qa_id = ?', [$data['question_id']]);

            if (!$result) {
                Helper::error('標記失敗', 500);
            }

            Helper::success('已標記為已解決');

        } catch (Exception $e) {
            Helper::error('標記失敗: ' . $e->getMessage(), 500);
        }
    }
}

// 路由處理
$method = Helper::getRequestMethod();
$action = $_GET['action'] ?? 'list';
$qa_id = $_GET['id'] ?? null;

$data = ($method === 'POST' || $method === 'PUT')
    ? Helper::getRequestInput()
    : [];

if ($method === 'GET') {
    if ($action === 'list') {
        QandAAPI::getQuestions();
    } elseif ($action === 'tags') {
        QandAAPI::getTags();
    } elseif ($action === 'detail' && $qa_id) {
        QandAAPI::getQuestionDetail($qa_id);
    } elseif ($action === 'replies') {
        QandAAPI::getReplies();
    } elseif ($action === 'my_questions') {
        QandAAPI::getMyQuestions();
    }
}

if ($method === 'POST') {
    if ($action === 'create') {
        QandAAPI::createQuestion($data);
    } elseif ($action === 'reply' && $qa_id) {
        QandAAPI::replyQuestion($qa_id, $data);
    } elseif ($action === 'add_reply') {
        QandAAPI::addReply($data);
    } elseif ($action === 'mark_helpful') {
        QandAAPI::voteReply($data, 'helpful');
    } elseif ($action === 'mark_not_helpful') {
        QandAAPI::voteReply($data, 'not_helpful');
    } elseif ($action === 'mark_solved') {
        QandAAPI::markSolved($data);
    }
}

Helper::error('無效的請求', 400);
