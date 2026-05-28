<?php
/**
 * 提問留言板 API 端點
 */

require_once '../auth.php';
require_once '../content_filter.php';

// Handle CORS preflight requests
Helper::handleCorsPreFlight();

class QandAAPI {
    private static $replyParentColumnExists = null;
    private static $clubAdminRoles = ['president', 'vice_president', 'director', 'public_relations', 'treasurer'];

    private static function canOfficialReplyForClub($userId, $clubId) {
        if (!$userId || !$clubId) {
            return false;
        }

        if (Auth::isAdmin()) {
            return true;
        }

        $roleList = '"' . implode('","', self::$clubAdminRoles) . '"';
        $row = Database::getInstance()->fetchOne(
            'SELECT 1
             FROM club_members
             WHERE user_id = ?
               AND club_id = ?
               AND is_active = 1
               AND role IN (' . $roleList . ')
             LIMIT 1',
            [(int)$userId, (int)$clubId]
        );

        return !empty($row);
    }

    private static function validateReplyParent($qa_id, $parent_reply_id) {
        if (!$parent_reply_id || !self::hasReplyParentColumn()) {
            return;
        }

        $parentReply = Database::getInstance()->fetchOne(
            'SELECT reply_id, qa_id FROM qa_replies WHERE reply_id = ?',
            [$parent_reply_id]
        );

        if (!$parentReply) {
            Helper::error('父回覆不存在', 404);
        }

        if ((int)$parentReply['qa_id'] !== (int)$qa_id) {
            Helper::error('父回覆不屬於此提問', 400);
        }
    }

    private static function createReplyRecord($qa_id, $data) {
        $parent_reply_id = isset($data['parent_reply_id']) && $data['parent_reply_id'] !== ''
            ? (int)$data['parent_reply_id']
            : null;
        $isOfficial = !empty($data['is_official']);

        $question = Database::getInstance()->fetchOne(
            'SELECT qa_id, club_id, user_id, question_title FROM q_and_a WHERE qa_id = ?',
            [(int)$qa_id]
        );
        if (!$question) {
            Helper::error('提問不存在', 404);
        }

        if ($isOfficial && !self::canOfficialReplyForClub(Auth::getCurrentUserId(), (int)$question['club_id'])) {
            Helper::error('只有該社團幹部可使用官方回覆', 403);
        }

        self::validateReplyParent($qa_id, $parent_reply_id);

        $replyData = [
            'qa_id' => (int)$qa_id,
            'user_id' => Auth::getCurrentUserId(),
            'reply_content' => $data['content'],
            'is_official_answer' => $isOfficial ? 1 : 0
        ];

        if (self::hasReplyParentColumn() && $parent_reply_id) {
            $replyData['parent_reply_id'] = $parent_reply_id;
        }

        $reply_id = dbInsert('qa_replies', $replyData);
        if (!$reply_id) {
            Helper::error('回覆失敗', 500);
        }

        $questionOwnerId = (int)($question['user_id'] ?? 0);
        $replierId = (int)Auth::getCurrentUserId();

        // 回覆他人提問時，通知提問者；自己回自己的提問不通知。
        if ($questionOwnerId > 0 && $questionOwnerId !== $replierId) {
            $questionTitle = trim((string)($question['question_title'] ?? ''));
            $replyPreview = trim((string)($data['content'] ?? ''));
            if (function_exists('mb_substr')) {
                $replyPreview = mb_substr($replyPreview, 0, 60, 'UTF-8');
            } else {
                $replyPreview = substr($replyPreview, 0, 60);
            }

            $message = $questionTitle !== ''
                ? '你的提問「' . $questionTitle . '」收到新回覆：' . $replyPreview
                : '你的提問收到新回覆：' . $replyPreview;

            dbInsert('notifications', [
                'user_id' => $questionOwnerId,
                'title' => '提問有新回覆',
                'message' => $message,
                'notification_type' => 'qa_reply',
                'related_type' => 'qa',
                // qa_reply 通知以 related_id 儲存 reply_id，方便前端定位到特定回覆。
                'related_id' => (int)$reply_id,
                'is_read' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }

        return $reply_id;
    }

    private static function hasReplyParentColumn() {
        if (self::$replyParentColumnExists !== null) {
            return self::$replyParentColumnExists;
        }

        $row = Database::getInstance()->fetchOne(
            'SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [DB_NAME, 'qa_replies', 'parent_reply_id']
        );

        self::$replyParentColumnExists = !empty($row) && (int)($row['cnt'] ?? 0) > 0;
        return self::$replyParentColumnExists;
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
                $conditions[] = '(
                    qa.question_title LIKE ?
                    OR qa.question_content LIKE ?
                    OR qa.club_id IN (
                        SELECT c.club_id
                        FROM clubs c
                        LEFT JOIN club_categories cc ON cc.category_id = c.category_id
                        WHERE c.club_name LIKE ?
                           OR c.club_code LIKE ?
                           OR cc.category_name LIKE ?
                    )
                )';
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }

            if ($status) {
                $conditions[] = 'qa.status = ?';
                $params[] = $status;
            }

            $conditions[] = 'NOT EXISTS (
                SELECT 1 FROM reports r
                WHERE r.reported_content_type = "qa_question"
                  AND r.reported_content_id = qa.qa_id
                  AND r.status = "resolved"
                  AND r.action_taken = "force_hide"
            )';
            
            $where = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
            
            // 取得提問列表
                $sql = "SELECT qa.*, u.name AS user_name, u.avatar_path AS user_avatar_path,
                       c.club_name, cc.category_name
                    FROM q_and_a qa
                    JOIN users u ON qa.user_id = u.user_id
                    LEFT JOIN clubs c ON qa.club_id = c.club_id
                    LEFT JOIN club_categories cc ON c.category_id = cc.category_id
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

                if (!Auth::isAdmin() && !empty($row['is_anonymous'])) {
                    unset($row['user_id']);
                    unset($row['user_name']);
                }

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
                'SELECT qa.*, u.name AS user_name, u.avatar_path AS user_avatar_path,
                        c.club_name, cc.category_name
                 FROM q_and_a qa
                 JOIN users u ON qa.user_id = u.user_id
                 LEFT JOIN clubs c ON qa.club_id = c.club_id
                 LEFT JOIN club_categories cc ON c.category_id = cc.category_id
                 WHERE qa.qa_id = ?',
                [$qa_id]
            );
            
            if (!$question) {
                Helper::error('提問不存在', 404);
            }

            if (!Auth::isAdmin()) {
                $hiddenReport = Database::getInstance()->fetchOne(
                    'SELECT report_id FROM reports
                     WHERE reported_content_type = "qa_question"
                       AND reported_content_id = ?
                       AND status = "resolved"
                       AND action_taken = "force_hide"
                     LIMIT 1',
                    [$qa_id]
                );
                if ($hiddenReport) {
                    Helper::error('提問不存在', 404);
                }
            }
            
            $question['author_name'] = !empty($question['is_anonymous'])
                ? ($question['display_name'] ?: '匿名用戶')
                : ($question['user_name'] ?: '匿名用戶');

            if ($track_view === 1) {
                $db = Database::getInstance();
                $upd = $db->prepare('UPDATE q_and_a SET views_count = views_count + 1 WHERE qa_id = ?');
                if ($upd) {
                    $upd->bind_param('i', $qa_id);
                    if ($upd->execute()) {
                        $question['views_count'] = (int)$question['views_count'] + 1;
                    } else {
                        error_log('views_count update failed for qa_id=' . $qa_id . ': ' . $upd->error);
                    }
                    $upd->close();
                } else {
                    error_log('views_count prepare failed for qa_id=' . $qa_id . ': ' . $db->getError());
                }
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
            $question['can_mark_solved'] = Auth::isLoggedIn()
                && ((int)Auth::getCurrentUserId() === (int)$question['user_id']);
            $question['can_report'] = Auth::isLoggedIn()
                && ((int)Auth::getCurrentUserId() !== (int)$question['user_id']);
            $question['can_official_reply'] = Auth::isLoggedIn()
                && self::canOfficialReplyForClub(Auth::getCurrentUserId(), (int)$question['club_id']);

            if (!Auth::isAdmin() && !empty($question['is_anonymous'])) {
                unset($question['user_id']);
                unset($question['user_name']);
            }
            
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
            if (ContentFilter::containsRestrictedLanguage($questionText)) {
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

            $clubAdmins = Database::getInstance()->fetchAll(
                'SELECT DISTINCT cm.user_id
                 FROM club_members cm
                 WHERE cm.club_id = ?
                   AND cm.is_active = 1
                   AND cm.role IN ("president", "vice_president", "public_relations", "treasurer", "director")',
                [$data['club_id']]
            );

            foreach ($clubAdmins as $admin) {
                $adminId = (int)($admin['user_id'] ?? 0);
                if ($adminId <= 0) {
                    continue;
                }

                dbInsert('notifications', [
                    'user_id' => $adminId,
                    'title' => '收到新的學生提問',
                    'message' => '你的社團有新提問，請前往留言板回覆。',
                    'notification_type' => 'qa_question',
                    'related_type' => 'qa',
                    'related_id' => $qa_id,
                    'is_read' => 0,
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }
            
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

            if (ContentFilter::containsRestrictedLanguage($data['content'] ?? '')) {
                Helper::error('回覆內容包含不適當字眼，請修改後再送出', 400);
            }
            
            $reply_id = self::createReplyRecord($qa_id, $data);
            
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
            $replyColumns = [
                'qr.reply_id',
                'qr.qa_id',
                'qr.user_id',
                'qr.reply_content AS content',
                'qr.is_official_answer AS is_official',
                'qr.is_anonymous',
                'qr.display_name',
                'qr.created_at',
                'qr.updated_at',
                'u.name as user_name',
                'u.avatar_path AS user_avatar_path'
            ];

            if (self::hasReplyParentColumn()) {
                $replyColumns[] = 'qr.parent_reply_id';
            }

            $replies = Database::getInstance()->fetchAll(
                'SELECT ' . implode(', ', $replyColumns) . '
                 FROM qa_replies qr
                 JOIN users u ON qr.user_id = u.user_id
                 WHERE qr.qa_id = ?
                   AND NOT EXISTS (
                       SELECT 1 FROM reports r
                       WHERE r.reported_content_type = "qa_reply"
                         AND r.reported_content_id = qr.reply_id
                         AND r.status = "resolved"
                         AND r.action_taken = "force_hide"
                   )
                 ORDER BY qr.created_at ASC',
                [$question_id]
            );

            // 取得每條回覆的有幫助數量
            foreach ($replies as &$reply) {
                $ownerUserId = (int)($reply['user_id'] ?? 0);
                $voteStats = Database::getInstance()->fetchOne(
                    'SELECT 
                        SUM(CASE WHEN vote_type = "helpful" THEN 1 ELSE 0 END) AS helpful_count,
                        SUM(CASE WHEN vote_type = "not_helpful" THEN 1 ELSE 0 END) AS not_helpful_count
                     FROM qa_reply_helpful
                     WHERE reply_id = ?',
                    [$reply['reply_id']]
                );
                $reply['helpful_count'] = (int)($voteStats['helpful_count'] ?? 0);
                $reply['not_helpful_count'] = (int)($voteStats['not_helpful_count'] ?? 0);

                $reply['author_name'] = !empty($reply['is_anonymous'])
                    ? ($reply['display_name'] ?: '匿名用戶')
                    : ($reply['user_name'] ?: '匿名用戶');

                // 只要登入即可投票（含自己的留言）
                    if (!Auth::isAdmin() && !empty($reply['is_anonymous'])) {
                        unset($reply['user_id']);
                        unset($reply['user_name']);
                    }
                if (Auth::isLoggedIn()) {
                    $user_id = Auth::getCurrentUserId();
                    $vote = Database::getInstance()->fetchOne(
                        'SELECT vote_type FROM qa_reply_helpful WHERE reply_id = ? AND user_id = ?',
                        [$reply['reply_id'], $user_id]
                    );
                    $reply['my_vote'] = $vote['vote_type'] ?? null;
                    $reply['can_vote'] = true;
                    $reply['is_mine'] = ((int)$user_id === $ownerUserId);
                    $reply['can_report'] = ((int)$user_id !== $ownerUserId);
                } else {
                    $reply['my_vote'] = null;
                    $reply['can_vote'] = false;
                    $reply['is_mine'] = false;
                    $reply['can_report'] = false;
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

            if (ContentFilter::containsRestrictedLanguage($data['content'] ?? '')) {
                Helper::error('回覆內容包含不適當字眼，請修改後再送出', 400);
            }

            $reply_id = self::createReplyRecord($data['question_id'], $data);

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
                'SELECT qa.*, qa.question_title AS title, c.club_name
                 FROM q_and_a qa
                 JOIN clubs c ON qa.club_id = c.club_id
                 WHERE qa.user_id = ?
                 ORDER BY qa.created_at DESC',
                [Auth::getCurrentUserId()]
            );

            foreach ($questions as &$row) {
                $row['is_solved'] = (int)(($row['status'] ?? '') === 'closed');
            }
            unset($row);

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
