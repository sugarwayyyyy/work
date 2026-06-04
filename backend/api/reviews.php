<?php
/**
 * 評論和評價 API 端點
 */

require_once '../auth.php';
require_once '../content_filter.php';

// Handle CORS preflight requests
Helper::handleCorsPreFlight();

class ReviewAPI {
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
                                            AND NOT EXISTS (
                                                    SELECT 1 FROM reports rp
                                                    WHERE rp.reported_content_type = 'review'
                                                        AND rp.reported_content_id = r.review_id
                                                        AND rp.status = 'resolved'
                                                        AND rp.action_taken = 'force_hide'
                                            )
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
                                 WHERE club_id = ? AND review_status = "approved"
                                     AND NOT EXISTS (
                                             SELECT 1 FROM reports rp
                                             WHERE rp.reported_content_type = "review"
                                                 AND rp.reported_content_id = reviews.review_id
                                                 AND rp.status = "resolved"
                                                 AND rp.action_taken = "force_hide"
                                     )',
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

    public static function getEligibleEvents() {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        $club_id = (int)($_GET['club_id'] ?? 0);
        if ($club_id <= 0) {
            Helper::error('需要指定 club_id', 400);
        }

        try {
            $uid = Auth::getCurrentUserId();

            // 已結束的活動且有報名成功或簽到紀錄
            $events = Database::getInstance()->fetchAll(
                'SELECT DISTINCT e.event_id, e.event_name, e.event_date
                 FROM events e
                 LEFT JOIN event_registrations er ON er.event_id = e.event_id AND er.user_id = ? AND er.status = "approved"
                 LEFT JOIN event_attendance ea ON ea.event_id = e.event_id AND ea.user_id = ?
                 WHERE e.club_id = ?
                   AND e.event_date < NOW()
                   AND (er.registration_id IS NOT NULL OR ea.attendance_id IS NOT NULL)
                 ORDER BY e.event_date DESC',
                [$uid, $uid, $club_id]
            );

            // 曾加入此社團（包含已退出）
            $memberRow = Database::getInstance()->fetchOne(
                'SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ? LIMIT 1',
                [$club_id, $uid]
            );

            Helper::success('取得可評價資格成功', [
                'events'              => $events,
                'can_review_as_member' => !empty($memberRow),
            ]);
        } catch (Exception $e) {
            Helper::error('取得可評價活動失敗: ' . $e->getMessage(), 500);
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

            $uid     = Auth::getCurrentUserId();
            $club_id = (int)$data['club_id'];
            $event_id_raw = $data['event_attended_id'] ?? null;
            $event_id = ($event_id_raw !== null && $event_id_raw !== '' && (int)$event_id_raw > 0)
                ? (int)$event_id_raw
                : null;

            $existingReview = Database::getInstance()->fetchOne(
                'SELECT review_id FROM reviews WHERE club_id = ? AND user_id = ? LIMIT 1',
                [$club_id, $uid]
            );
            if (!empty($existingReview)) {
                Helper::error('您已評價過此社團，每位使用者僅能評價一次', 409);
            }

            $reviewText = trim(($data['review_title'] ?? '') . ' ' . ($data['review_content'] ?? ''));
            if (ContentFilter::containsRestrictedLanguage($reviewText)) {
                Helper::error('評價內容包含不適當字眼，請修改後再送出', 400);
            }

            $verified = false;

            if ($event_id !== null) {
                // ── 活動路徑：驗證活動屬於此社團、已結束、有報名/簽到紀錄 ──
                $event = Database::getInstance()->fetchOne(
                    'SELECT event_id, club_id, event_date FROM events WHERE event_id = ?',
                    [$event_id]
                );
                if (!$event || (int)$event['club_id'] !== $club_id) {
                    Helper::error('活動不存在或不屬於此社團', 400);
                }
                if (strtotime($event['event_date']) >= time()) {
                    Helper::error('活動尚未結束，無法評價', 400);
                }
                $registration = Database::getInstance()->fetchOne(
                    'SELECT registration_id FROM event_registrations WHERE event_id = ? AND user_id = ? AND status = "approved" LIMIT 1',
                    [$event_id, $uid]
                );
                $attendance = Database::getInstance()->fetchOne(
                    'SELECT attendance_id FROM event_attendance WHERE event_id = ? AND user_id = ? LIMIT 1',
                    [$event_id, $uid]
                );
                $verified = !empty($registration) || !empty($attendance);
                if (!$verified) {
                    Helper::error('僅限有報名成功或簽到紀錄的學生可評價此活動', 403);
                }
            } else {
                // ── 社員路徑：曾加入此社團（含已退出）即可評價 ──
                $memberRow = Database::getInstance()->fetchOne(
                    'SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ? LIMIT 1',
                    [$club_id, $uid]
                );
                if (empty($memberRow)) {
                    Helper::error('需曾加入此社團或參加過已結束的活動才能評價', 403);
                }
            }

            $review_id = dbInsert('reviews', [
                'club_id'            => $club_id,
                'user_id'            => $uid,
                'rating'             => $data['rating'],
                'review_title'       => $data['review_title'] ?? '',
                'review_content'     => $data['review_content'],
                'is_anonymous'       => $data['is_anonymous'] ?? false,
                'display_name'       => $data['display_name'] ?? '',
                'verified_participant' => $verified,
                'event_attended_id'  => $event_id,
                'review_status'      => 'approved',
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
    ? Helper::getRequestInput()
    : [];

if ($method === 'GET' && $action === 'list') {
    ReviewAPI::getReviews();
} elseif ($method === 'GET' && $action === 'eligible_events') {
    ReviewAPI::getEligibleEvents();
} elseif ($method === 'POST' && $action === 'create') {
    ReviewAPI::createReview($data);
} elseif ($method === 'PUT' && $action === 'approve' && $review_id) {
    ReviewAPI::approveReview($review_id);
}

Helper::error('無效的請求', 400);
