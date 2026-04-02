<?php
/**
 * 提問留言板 API 端點
 */

require_once '../auth.php';

class QandAAPI {
    
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
                $conditions[] = 'club_id = ?';
                $params[] = $club_id;
            }

            if ($tag_id) {
                $conditions[] = 'qa_id IN (SELECT qa_id FROM qa_replies WHERE tag_id = ?)';
                $params[] = $tag_id;
            }

            if ($search) {
                $conditions[] = '(question_title LIKE ? OR question_content LIKE ?)';
                $params[] = "%$search%";
                $params[] = "%$search%";
            }

            if ($status) {
                $conditions[] = 'status = ?';
                $params[] = $status;
            }
            
            $where = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
            
            // 取得提問列表
            $sql = "SELECT * FROM q_and_a $where ORDER BY created_at DESC LIMIT ? OFFSET ?";
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
                // 隱藏實名信息如果是匿名
                if ($row['is_anonymous']) {
                    $row['display_name'] = $row['display_name'] ?: '匿名用戶';
                    unset($row['user_id']);
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
                
                $questions[] = $row;
            }
            $stmt->close();
            
            // 取得總數
            $count_sql = "SELECT COUNT(*) as total FROM q_and_a $where";
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
            $question = Database::getInstance()->fetchOne(
                'SELECT * FROM q_and_a WHERE qa_id = ?',
                [$qa_id]
            );
            
            if (!$question) {
                Helper::error('提問不存在', 404);
            }
            
            // 隱藏實名信息
            if ($question['is_anonymous']) {
                $question['display_name'] = $question['display_name'] ?: '匿名用戶';
                unset($question['user_id']);
            }
            
            // 更新瀏覽次數
            dbUpdate('q_and_a', ['views_count' => $question['views_count'] + 1], 'qa_id = ?', [$qa_id]);
            
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
                 JOIN qa_reply_helpful qrh ON qr.reply_id = qrh.reply_id 
                 WHERE qr.qa_id = ?',
                [$qa_id]
            );
            $question['helpful_count'] = $helpful_count['count'];
            
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
            
            $qa_id = dbInsert('q_and_a', [
                'club_id' => $data['club_id'],
                'user_id' => Auth::getCurrentUserId(),
                'question_title' => $data['question_title'],
                'question_content' => $data['question_content'],
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
            
            $reply_id = dbInsert('qa_replies', [
                'qa_id' => $qa_id,
                'user_id' => Auth::getCurrentUserId(),
                'content' => $data['content'],
                'is_official' => $data['is_official'] ?? false
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
                'SELECT qr.*, u.name as user_name FROM qa_replies qr
                 JOIN users u ON qr.user_id = u.user_id
                 WHERE qr.qa_id = ?
                 ORDER BY qr.created_at ASC',
                [$question_id]
            );

            // 取得每條回覆的有幫助數量
            foreach ($replies as &$reply) {
                $helpful_count = Database::getInstance()->fetchOne(
                    'SELECT COUNT(*) as count FROM qa_reply_helpful WHERE reply_id = ?',
                    [$reply['reply_id']]
                );
                $reply['helpful_count'] = $helpful_count['count'];

                // 檢查當前用戶是否可以標記為有幫助
                if (Auth::isLoggedIn()) {
                    $user_id = Auth::getCurrentUserId();
                    $helpful = Database::getInstance()->fetchOne(
                        'SELECT * FROM qa_reply_helpful WHERE reply_id = ? AND user_id = ?',
                        [$reply['reply_id'], $user_id]
                    );
                    $reply['can_mark_helpful'] = !$helpful;
                } else {
                    $reply['can_mark_helpful'] = false;
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

            $reply_id = dbInsert('qa_replies', [
                'qa_id' => $data['question_id'],
                'user_id' => Auth::getCurrentUserId(),
                'content' => $data['content'],
                'is_official' => $data['is_official'] ?? false
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
     * 取得用戶的提問
     * GET /api/qa.php?action=my_questions
     */
    public static function getMyQuestions() {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        try {
            $questions = Database::getInstance()->fetchAll(
                'SELECT qa.*, c.club_name FROM q_and_a qa
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

            $result = dbUpdate('q_and_a', ['is_solved' => 1], 'qa_id = ?', [$data['question_id']]);

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
    ? (Helper::getJsonInput() ?? $_POST)
    : [];

if ($method === 'GET') {
    if ($action === 'list') {
        QandAAPI::getQuestions();
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
    } elseif ($action === 'mark_solved') {
        QandAAPI::markSolved($data);
    }
}

Helper::error('無效的請求', 400);
