<?php
/**
 * 社團 API 端點
 */

require_once '../auth.php';
require_once '../content_filter.php';

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    Helper::applyCorsHeaders();
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-CSRF-Token');
    header('Access-Control-Allow-Credentials: true');
    exit(0);
}

class ClubAPI {
    private static function splitSearchTokens($search) {
        $text = trim((string)$search);
        if ($text === '') {
            return [];
        }

        $tokens = preg_split('/\s+/u', $text);
        $tokens = array_values(array_filter(array_map('trim', $tokens), function ($token) {
            return $token !== '';
        }));

        return empty($tokens) ? [$text] : $tokens;
    }

    private static function normalizeSearchText($search) {
        return trim(preg_replace('/\s+/u', ' ', (string)$search));
    }

    private static function containsText($haystack, $needle) {
        $haystack = (string)$haystack;
        $needle = (string)$needle;
        if ($needle === '' || $haystack === '') {
            return false;
        }

        if (function_exists('mb_stripos')) {
            return mb_stripos($haystack, $needle, 0, 'UTF-8') !== false;
        }

        return stripos($haystack, $needle) !== false;
    }

    private static function getActivityBadgeLabel($badge) {
        if ($badge === 'high_active') {
            return '高活躍';
        }
        if ($badge === 'no_recent_activity') {
            return '近期無活動';
        }
        return '活躍中';
    }

    private static function scoreClubSearchResult($row, $tags, $search) {
        $query = self::normalizeSearchText($search);
        if ($query === '') {
            return 0;
        }

        $terms = self::splitSearchTokens($query);
        $tagNames = implode(' ', array_map(function ($tag) {
            return (string)($tag['tag_name'] ?? '');
        }, (array)$tags));

        $badgeLabel = self::getActivityBadgeLabel($row['activity_badge'] ?? 'normal_active');
        $searchBlob = implode(' ', [
            (string)($row['club_name'] ?? ''),
            (string)($row['description'] ?? ''),
            (string)($row['meeting_day'] ?? ''),
            (string)($row['meeting_time'] ?? ''),
            (string)($row['meeting_location'] ?? ''),
            (string)($row['club_code'] ?? ''),
            (string)($row['category_name'] ?? ''),
            $tagNames,
            $badgeLabel,
        ]);

        $score = 0;

        if (self::containsText($row['club_name'] ?? '', $query)) $score += 60;
        if (self::containsText($row['description'] ?? '', $query)) $score += 35;
        if (self::containsText($row['meeting_day'] ?? '', $query)) $score += 18;
        if (self::containsText($row['meeting_time'] ?? '', $query)) $score += 12;
        if (self::containsText($row['meeting_location'] ?? '', $query)) $score += 12;
        if (self::containsText($row['club_code'] ?? '', $query)) $score += 10;
        if (self::containsText($row['category_name'] ?? '', $query)) $score += 22;
        if (self::containsText($tagNames, $query)) $score += 24;
        if (self::containsText($badgeLabel, $query)) $score += 20;
        if (self::containsText($searchBlob, $query)) $score += 18;

        foreach ($terms as $term) {
            if ($term === '') {
                continue;
            }
            if (self::containsText($row['club_name'] ?? '', $term)) $score += 20;
            if (self::containsText($row['description'] ?? '', $term)) $score += 10;
            if (self::containsText($row['meeting_day'] ?? '', $term)) $score += 8;
            if (self::containsText($row['meeting_time'] ?? '', $term)) $score += 6;
            if (self::containsText($row['meeting_location'] ?? '', $term)) $score += 6;
            if (self::containsText($row['club_code'] ?? '', $term)) $score += 5;
            if (self::containsText($row['category_name'] ?? '', $term)) $score += 8;
            if (self::containsText($tagNames, $term)) $score += 10;
            if (self::containsText($searchBlob, $term)) $score += 8;
        }

        if ((self::containsText($query, '活躍') || self::containsText($query, '高')) && ($row['activity_badge'] ?? '') === 'high_active') {
            $score += 25;
        }

        if ((self::containsText($query, '近期無活動') || self::containsText($query, '無活動')) && ($row['activity_badge'] ?? '') === 'no_recent_activity') {
            $score += 25;
        }

        if (preg_match('/500內|五百內|社費500內|<=\s*500/u', $query) && (int)($row['club_fee'] ?? 0) <= 500) {
            $score += 14;
        }

        if (preg_match('/500\s*[-~到]\s*1000|社費500-1000/u', $query) && (int)($row['club_fee'] ?? 0) >= 500 && (int)($row['club_fee'] ?? 0) <= 1000) {
            $score += 14;
        }

        if (preg_match('/1000以上|一千以上|>=\s*1000/u', $query) && (int)($row['club_fee'] ?? 0) >= 1000) {
            $score += 14;
        }

        return $score;
    }

    private static function buildClubSearchScoreExpr($search, &$scoreParams) {
        $query = trim((string)$search);
        $terms = self::splitSearchTokens($query);
        if ($query === '' || empty($terms)) {
            return '0';
        }

        $scoreParams = [];
        $parts = [];


        $phraseLike = '%' . $query . '%';
        $parts[] = '(CASE WHEN clubs.club_name LIKE ? THEN 40 ELSE 0 END)';
        $scoreParams[] = $phraseLike;
        $parts[] = '(CASE WHEN clubs.description LIKE ? THEN 25 ELSE 0 END)';
        $scoreParams[] = $phraseLike;
        $parts[] = '(CASE WHEN clubs.meeting_day LIKE ? THEN 14 ELSE 0 END)';
        $scoreParams[] = $phraseLike;
        $parts[] = '(CASE WHEN clubs.meeting_time LIKE ? THEN 12 ELSE 0 END)';
        $scoreParams[] = $phraseLike;
        $parts[] = '(CASE WHEN clubs.meeting_location LIKE ? THEN 12 ELSE 0 END)';
        $scoreParams[] = $phraseLike;
        $parts[] = '(CASE WHEN clubs.club_code LIKE ? THEN 10 ELSE 0 END)';
        $scoreParams[] = $phraseLike;
        $parts[] = '(CASE WHEN ' . $searchBlob . ' LIKE ? THEN 18 ELSE 0 END)';
        $scoreParams[] = $phraseLike;

        if (mb_strpos($query, '活躍') !== false || mb_strpos($query, '高') !== false) {
            $parts[] = '(CASE WHEN clubs.activity_badge = "high_active" THEN 16 ELSE 0 END)';
        }

        if (mb_strpos($query, '近期無活動') !== false || mb_strpos($query, '無活動') !== false) {
            $parts[] = '(CASE WHEN clubs.activity_badge = "no_recent_activity" THEN 16 ELSE 0 END)';
        }

        foreach ($terms as $term) {
            $term = trim((string)$term);
            if ($term === '') {
                continue;
            }

            $termLike = '%' . $term . '%';
            $parts[] = '(CASE WHEN clubs.club_name LIKE ? THEN 20 ELSE 0 END)';
            $scoreParams[] = $termLike;
            $parts[] = '(CASE WHEN clubs.description LIKE ? THEN 10 ELSE 0 END)';
            $scoreParams[] = $termLike;
            $parts[] = '(CASE WHEN clubs.meeting_day LIKE ? THEN 8 ELSE 0 END)';
            $scoreParams[] = $termLike;
            $parts[] = '(CASE WHEN clubs.meeting_time LIKE ? THEN 6 ELSE 0 END)';
            $scoreParams[] = $termLike;
            $parts[] = '(CASE WHEN clubs.meeting_location LIKE ? THEN 6 ELSE 0 END)';
            $scoreParams[] = $termLike;
            $parts[] = '(CASE WHEN clubs.club_code LIKE ? THEN 5 ELSE 0 END)';
            $scoreParams[] = $termLike;
            $parts[] = '(CASE WHEN ' . $searchBlob . ' LIKE ? THEN 8 ELSE 0 END)';
            $scoreParams[] = $termLike;
        }

        return empty($parts) ? '0' : implode(' + ', $parts);
    }

    private static function validateMeetingLocationIfProvided($meetingLocation) {
        $value = trim((string)$meetingLocation);
        if ($value === '') {
            return;
        }

        if (preg_match('/https?:\/\/|www\./i', $value) && !ContentFilter::isGoogleMapsUrl($value)) {
            Helper::error('社課地點僅接受 Google 地圖分享連結或純文字地點', 400);
        }

        if (ContentFilter::containsRestrictedLanguageAllowingUrls($value)) {
            Helper::error('社課地點包含不適當字眼，請修改後再送出', 400);
        }
    }

    private static function calculateActivityBadge($clubId, $clubCreatedAt = null) {
        $eventRow = Database::getInstance()->fetchOne(
            'SELECT SUM(CASE WHEN COALESCE(e.published_at, e.created_at) >= DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 1 ELSE 0 END) AS recent_cnt,
                    MAX(COALESCE(e.published_at, e.created_at)) AS last_event_at
             FROM events e
             WHERE (
                    e.club_id = ?
                    OR e.event_id IN (
                        SELECT ce.event_id
                        FROM collaborative_events ce
                        WHERE ce.participated_club_id = ? AND ce.status = "approved"
                    )
             )
               AND e.event_status IN ("published", "ongoing", "completed")',
            [$clubId, $clubId]
        );

        $qaRow = Database::getInstance()->fetchOne(
            'SELECT SUM(CASE WHEN qa.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 1 ELSE 0 END) AS recent_cnt,
                    MAX(qa.created_at) AS last_qa_at
             FROM q_and_a qa
             WHERE qa.club_id = ?',
            [$clubId]
        );

        $recentEvents = (int)($eventRow['recent_cnt'] ?? 0);
        $recentPosts  = (int)($qaRow['recent_cnt'] ?? 0);

        $times = array_filter([
            $eventRow['last_event_at'] ?? null,
            $qaRow['last_qa_at'] ?? null,
            $clubCreatedAt,
        ]);
        $lastActivityAt = $times ? max($times) : null;

        $badge = ($recentEvents + $recentPosts) >= 1 ? 'high_active' : 'no_recent_activity';

        return ['badge' => $badge, 'last_activity_at' => $lastActivityAt];
    }
    
    /**
     * 取得所有社團列表（帶過濾）
     * GET /api/clubs.php?category_id=1&tags=1,2&search=社團名稱&page=1
     */
    public static function getClubs() {
        try {
            $category_id = $_GET['category_id'] ?? null;
            $club_id = $_GET['club_id'] ?? null;
            $tags = isset($_GET['tags']) ? explode(',', $_GET['tags']) : [];
            $search = $_GET['search'] ?? '';
            $tag_match_mode = strtolower((string)($_GET['tag_match_mode'] ?? 'or'));
            $min_fee = isset($_GET['min_fee']) && $_GET['min_fee'] !== '' ? (float)$_GET['min_fee'] : null;
            $max_fee = isset($_GET['max_fee']) && $_GET['max_fee'] !== '' ? (float)$_GET['max_fee'] : null;
            $page = (int)($_GET['page'] ?? 1);
            $per_page = ITEMS_PER_PAGE;
            $offset = ($page - 1) * $per_page;
            $useSearchRanking = trim((string)$search) !== '';
            
            $where_conditions = ['clubs.activity_status = "active"', 'clubs.deleted_at IS NULL'];
            $params = [];
            $categoryCondition = null;
            $clubCondition = null;
            $tagCondition = null;
            $tagConditionParams = [];
            $selectColumns = 'clubs.*';
            $orderBy = 'last_updated DESC';
            $selectTagScoreParams = [];
            
            if ($category_id) {
                $categoryCondition = 'clubs.category_id = ?';
            }

            if ($club_id) {
                $clubCondition = 'clubs.club_id = ?';
            }
            
            if ($min_fee !== null) {
                $where_conditions[] = 'clubs.club_fee >= ?';
                $params[] = $min_fee;
            }

            if ($max_fee !== null) {
                $where_conditions[] = 'clubs.club_fee <= ?';
                $params[] = $max_fee;
            }

            $tag_ids = array_values(array_filter(array_map('intval', $tags)));
            if (!empty($tag_ids)) {
                if ($tag_match_mode === 'and') {
                    $placeholders = implode(',', array_fill(0, count($tag_ids), '?'));
                    $tagCondition = 'club_id IN (
                        SELECT ctr.club_id
                        FROM club_tag_relations ctr
                        WHERE ctr.tag_id IN (' . $placeholders . ')
                        GROUP BY ctr.club_id
                        HAVING COUNT(DISTINCT ctr.tag_id) = ?
                    )';
                    foreach ($tag_ids as $tag_id) {
                        $tagConditionParams[] = $tag_id;
                    }
                    $tagConditionParams[] = count($tag_ids);
                } else {
                    // OR 模式改為排序優先：符合越多標籤越前面，未符合者仍保留在列表。
                    $placeholders = implode(',', array_fill(0, count($tag_ids), '?'));
                    $selectColumns .= ', (
                        SELECT COUNT(DISTINCT ctr.tag_id)
                        FROM club_tag_relations ctr
                        WHERE ctr.club_id = clubs.club_id
                          AND ctr.tag_id IN (' . $placeholders . ')
                    ) AS matched_tag_count';
                    $orderBy = 'matched_tag_count DESC, last_updated DESC';
                    foreach ($tag_ids as $tag_id) {
                        $selectTagScoreParams[] = $tag_id;
                    }
                }
            }

            if ($clubCondition) {
                $where_conditions[] = $clubCondition;
                $params[] = $club_id;
            }

            // 依新需求改為 OR：同時選分類與標籤時，符合其一即可
            if ($categoryCondition && $tagCondition) {
                $where_conditions[] = '(' . $categoryCondition . ' OR ' . $tagCondition . ')';
                $params[] = $category_id;
                $params = array_merge($params, $tagConditionParams);
            } elseif ($categoryCondition) {
                $where_conditions[] = $categoryCondition;
                $params[] = $category_id;
            } elseif ($tagCondition) {
                $where_conditions[] = $tagCondition;
                $params = array_merge($params, $tagConditionParams);
            }
            
            $where = implode(' AND ', $where_conditions);

            $clubs = [];
            $club_ids = [];
            $rows_temp = [];

            if ($useSearchRanking) {
                $sql = "SELECT clubs.*, cc.category_name FROM clubs LEFT JOIN club_categories cc ON cc.category_id = clubs.category_id WHERE $where ORDER BY clubs.last_updated DESC";
                $stmt = Database::getInstance()->prepare($sql);
                if ($stmt === false) {
                    throw new Exception('查詢準備失敗: ' . Database::getInstance()->error);
                }

                if (!empty($params)) {
                    $types = str_repeat('s', count($params));
                    $stmt->bind_param($types, ...$params);
                }

                $stmt->execute();
                $result = $stmt->get_result();
                while ($row = $result->fetch_assoc()) {
                    $club_ids[] = $row['club_id'];
                    $rows_temp[] = $row;
                }
                $stmt->close();
            } else {
                // 取得社團列表
                $sql = "SELECT $selectColumns FROM clubs WHERE $where ORDER BY $orderBy LIMIT ? OFFSET ?";
                $stmt = Database::getInstance()->prepare($sql);
                if ($stmt === false) {
                    throw new Exception('查詢準備失敗: ' . Database::getInstance()->error);
                }

                $queryParams = array_merge($selectTagScoreParams, $params);
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

                // 先收集所有 club_id
                while ($row = $result->fetch_assoc()) {
                    $club_ids[] = $row['club_id'];
                    $rows_temp[] = $row;
                }
                $stmt->close();
            }
            
            // 一次性查詢所有評分
            $ratings_map = [];
            if (!empty($club_ids)) {
                $placeholders = implode(',', array_fill(0, count($club_ids), '?'));
                $ratings_result = Database::getInstance()->fetchAll(
                    "SELECT club_id, AVG(rating) as avg_rating, COUNT(*) as count 
                     FROM reviews 
                     WHERE club_id IN ($placeholders) AND review_status = 'approved'
                     GROUP BY club_id",
                    $club_ids
                );
                foreach ($ratings_result as $rating) {
                    $ratings_map[$rating['club_id']] = $rating;
                }
            }
            
            // 處理每個社團
            foreach ($rows_temp as $row) {
                // 取得標籤
                $tags_result = Database::getInstance()->fetchAll(
                    'SELECT t.* FROM club_tags t 
                     JOIN club_tag_relations ctr ON t.tag_id = ctr.tag_id 
                     WHERE ctr.club_id = ?',
                    [$row['club_id']]
                );
                $row['tags'] = $tags_result;
                
                // 取得成員數（社團平台定義為追蹤數）
                $member_count = Database::getInstance()->fetchOne(
                    'SELECT COUNT(*) as count FROM club_followers WHERE club_id = ?',
                    [$row['club_id']]
                );
                $row['member_count'] = $member_count['count'];
                
                // 取得平均評分和評價數
                if (isset($ratings_map[$row['club_id']])) {
                    $rating = $ratings_map[$row['club_id']];
                    $row['average_rating'] = (float)($rating['avg_rating'] ?? 0);
                    $row['reviews_count'] = (int)($rating['count'] ?? 0);
                } else {
                    $row['average_rating'] = 0;
                    $row['reviews_count'] = 0;
                }

                $activityInfo = self::calculateActivityBadge((int)$row['club_id'], $row['created_at'] ?? null);
                $row['activity_badge']   = $activityInfo['badge'];
                $row['last_activity_at'] = $activityInfo['last_activity_at'];

                if ($useSearchRanking) {
                    $row['_search_score'] = self::scoreClubSearchResult($row, $tags_result, $search);
                }
                
                $clubs[] = $row;
            }

            if ($useSearchRanking) {
                usort($clubs, function ($left, $right) {
                    $leftScore = (int)($left['_search_score'] ?? 0);
                    $rightScore = (int)($right['_search_score'] ?? 0);
                    if ($leftScore === $rightScore) {
                        return strcmp((string)($right['last_updated'] ?? ''), (string)($left['last_updated'] ?? ''));
                    }
                    return $rightScore <=> $leftScore;
                });
            }

            $total = count($clubs);
            if ($useSearchRanking) {
                $clubs = array_slice($clubs, $offset, $per_page);
            }
            
            // 取得總數
            $count_sql = "SELECT COUNT(*) as total FROM clubs WHERE $where";
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
            
            Helper::success('取得社團列表成功', [
                'clubs' => $clubs,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $per_page,
                    'total' => $useSearchRanking ? $total : $total,
                    'total_pages' => ceil($total / $per_page)
                ]
            ]);
            
        } catch (Exception $e) {
            Helper::error('取得社團列表失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 取得社團分類列表
     * GET /api/clubs.php?action=categories
     */
    public static function getCategories() {
        try {
            $categories = Database::getInstance()->fetchAll(
                'SELECT * FROM club_categories ORDER BY category_name'
            );
            
            Helper::success('取得分類成功', ['categories' => $categories]);
            
        } catch (Exception $e) {
            Helper::error('取得分類失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 依分類取得社團（不分頁）
     * GET /api/clubs.php?action=by_category&category_id=1
     */
    public static function getClubsByCategory() {
        try {
            $category_id = (int)($_GET['category_id'] ?? 0);
            if ($category_id <= 0) {
                Helper::error('缺少或無效的分類', 400);
            }

            $clubs = Database::getInstance()->fetchAll(
                'SELECT club_id, club_name, club_code
                 FROM clubs
                 WHERE category_id = ?
                   AND activity_status = "active"
                   AND deleted_at IS NULL
                 ORDER BY club_name ASC',
                [$category_id]
            );

            Helper::success('取得分類社團成功', ['clubs' => $clubs]);
        } catch (Exception $e) {
            Helper::error('取得分類社團失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 取得所有可用社團（供篩選下拉）
     * GET /api/clubs.php?action=all_for_filter
     */
    public static function getAllClubsForFilter() {
        try {
            $clubs = Database::getInstance()->fetchAll(
                'SELECT c.club_id, c.club_name, c.club_code, cc.category_name
                 FROM clubs c
                 LEFT JOIN club_categories cc ON cc.category_id = c.category_id
                 WHERE c.activity_status = "active"
                   AND c.deleted_at IS NULL
                 ORDER BY c.club_name ASC'
            );

            Helper::success('取得社團篩選清單成功', ['clubs' => $clubs]);
        } catch (Exception $e) {
            Helper::error('取得社團篩選清單失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 取得熱門標籤（可供前端過濾）
     * GET /api/clubs.php?action=popular_tags
     */
    public static function getPopularTags() {
        try {
            $tags = Database::getInstance()->fetchAll(
                'SELECT t.*, COUNT(ctr.club_id) AS usage_count
                 FROM club_tags t
                 LEFT JOIN club_tag_relations ctr ON ctr.tag_id = t.tag_id
                 LEFT JOIN clubs c ON c.club_id = ctr.club_id
                    AND c.activity_status = "active"
                    AND c.deleted_at IS NULL
                 GROUP BY t.tag_id
                 HAVING usage_count > 0
                 ORDER BY usage_count DESC, t.tag_name ASC
                 LIMIT 20'
            );

            Helper::success('取得熱門標籤成功', ['tags' => $tags]);

        } catch (Exception $e) {
            Helper::error('取得熱門標籤失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 取得單個社團詳細信息
     * GET /api/clubs.php?action=detail&id=1
     */
    public static function getClubDetail($club_id) {
        try {
            $club = Database::getInstance()->fetchOne(
                'SELECT c.*, cc.category_name
                 FROM clubs c
                 LEFT JOIN club_categories cc ON cc.category_id = c.category_id
                 WHERE c.club_id = ?',
                [$club_id]
            );
            
            if (!$club) {
                Helper::error('社團不存在', 404);
            }

            if (!Auth::isAdmin() && !empty($club['deleted_at'])) {
                Helper::error('社團不存在', 404);
            }
            
            // 取得標籤
            $tags = Database::getInstance()->fetchAll(
                'SELECT t.* FROM club_tags t 
                 JOIN club_tag_relations ctr ON t.tag_id = ctr.tag_id 
                 WHERE ctr.club_id = ?',
                [$club_id]
            );
            $club['tags'] = $tags;
            
            // 取得成員（僅計算仍有效的成員）
            $members = Database::getInstance()->fetchAll(
                'SELECT u.*, cm.role FROM users u 
                 JOIN club_members cm ON u.user_id = cm.user_id 
                 WHERE cm.club_id = ? AND cm.is_active = 1',
                [$club_id]
            );
            $club['members'] = $members;
            
            // 取得近期活動
            $events = Database::getInstance()->fetchAll(
                'SELECT * FROM events 
                 WHERE (
                    club_id = ?
                    OR event_id IN (
                        SELECT ce.event_id
                        FROM collaborative_events ce
                        WHERE ce.participated_club_id = ? AND ce.status = "approved"
                    )
                 )
                 AND event_status IN ("published", "ongoing") 
                 AND NOT EXISTS (
                     SELECT 1 FROM reports rp
                     WHERE rp.reported_content_type = "event"
                       AND rp.reported_content_id = events.event_id
                       AND rp.status = "resolved"
                       AND rp.action_taken = "force_hide"
                 )
                 AND event_date >= NOW()
                 ORDER BY event_date ASC LIMIT 5',
                [$club_id, $club_id]
            );
            $club['upcoming_events'] = $events;
            
            // 取得評價
            $reviews = Database::getInstance()->fetchAll(
                'SELECT r.*, u.name AS user_name 
                 FROM reviews r
                 LEFT JOIN users u ON u.user_id = r.user_id
                 WHERE club_id = ? AND review_status = "approved"
                 AND NOT EXISTS (
                     SELECT 1 FROM reports rp
                     WHERE rp.reported_content_type = "review"
                       AND rp.reported_content_id = r.review_id
                       AND rp.status = "resolved"
                       AND rp.action_taken = "force_hide"
                 )
                 ORDER BY created_at DESC LIMIT 10',
                [$club_id]
            );

            foreach ($reviews as &$review) {
                $review['author_name'] = !empty($review['is_anonymous'])
                    ? ($review['display_name'] ?: '匿名用戶')
                    : ($review['user_name'] ?: '匿名用戶');

                if ($review['is_anonymous']) {
                    $review['display_name'] = $review['display_name'] ?: '匿名用戶';
                    unset($review['user_id']);
                }
            }
            unset($review);
            
            // 計算平均評分
            $rating_result = Database::getInstance()->fetchOne(
                'SELECT AVG(rating) as avg_rating, COUNT(*) as count 
                 FROM reviews 
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
            $club['average_rating'] = (float)($rating_result['avg_rating'] ?? 0);
            $club['reviews_count'] = (int)($rating_result['count'] ?? 0);
            $club['reviews'] = $reviews;
            $activityInfo = self::calculateActivityBadge((int)$club_id, $club['created_at'] ?? null);
            $club['activity_badge']   = $activityInfo['badge'];
            $club['last_activity_at'] = $activityInfo['last_activity_at'];
            
            // 取得成員數（社團平台定義為追蹤數）
            $member_count = Database::getInstance()->fetchOne(
                'SELECT COUNT(*) as count FROM club_followers WHERE club_id = ?',
                [$club_id]
            );
            $club['member_count'] = $member_count['count'];
            
            // 檢查用戶是否追蹤此社團
            $is_following = false;
            $follow_state_known = false;
            $has_reviewed = false;
            $user_review_status = null;
            if (Auth::isLoggedIn()) {
                $follow_state_known = true;
                $following = Database::getInstance()->fetchOne(
                    'SELECT * FROM club_followers WHERE club_id = ? AND user_id = ?',
                    [$club_id, Auth::getCurrentUserId()]
                );
                $is_following = !empty($following);

                $userReview = Database::getInstance()->fetchOne(
                    'SELECT review_status FROM reviews WHERE club_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
                    [$club_id, Auth::getCurrentUserId()]
                );
                if (!empty($userReview)) {
                    $has_reviewed = true;
                    $user_review_status = $userReview['review_status'] ?? null;
                }
            }
            $club['is_following'] = $is_following;
            $club['follow_state_known'] = $follow_state_known;
            $club['user_has_reviewed'] = $has_reviewed;
            $club['user_review_status'] = $user_review_status;
            
            Helper::success('取得社團詳細信息成功', $club);
            
        } catch (Exception $e) {
            Helper::error('取得社團詳細信息失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 建立新社團（管理員）
     * POST /api/clubs.php
     */
    public static function createClub($data) {
        if (!Auth::isAdmin()) {
            Helper::error('您無權限執行此操作', 403);
        }
        
        try {
            $errors = Helper::validateRequired($data, ['club_name', 'category_id', 'description']);
            if (!empty($errors)) {
                Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
            }

            if (ContentFilter::hasRestrictedInFields($data, ['club_name', 'description'])) {
                Helper::error('社團資料包含不適當字眼，請修改後再送出', 400);
            }

            if (isset($data['meeting_location'])) {
                self::validateMeetingLocationIfProvided($data['meeting_location']);
            }

            $club_code = trim($data['club_code'] ?? '');
            if ($club_code === '') {
                $club_code = 'CLB' . date('YmdHis') . rand(10, 99);
            }
            
            $club_id = dbInsert('clubs', [
                'club_code' => $club_code,
                'club_name' => $data['club_name'],
                'category_id' => $data['category_id'],
                'description' => $data['description'],
                'founding_year' => $data['founding_year'] ?? date('Y'),
                'club_fee' => $data['club_fee'] ?? 0,
                'club_fee_semester' => isset($data['club_fee_semester']) && $data['club_fee_semester'] !== '' ? (int)$data['club_fee_semester'] : null,
                'meeting_day' => $data['meeting_day'] ?? '',
                'meeting_time' => $data['meeting_time'] ?? '',
                'meeting_location' => $data['meeting_location'] ?? '',
                'contact_email' => $data['contact_email'] ?? '',
                'contact_phone' => $data['contact_phone'] ?? '',
                'activity_status' => 'active'
            ]);
            
            if (!$club_id) {
                Helper::error('建立社團失敗', 500);
            }
            
            // 新增標籤關連
            if (isset($data['tags']) && is_array($data['tags'])) {
                foreach ($data['tags'] as $tag_id) {
                    dbInsert('club_tag_relations', [
                        'club_id' => $club_id,
                        'tag_id' => $tag_id
                    ]);
                }
            }
            
            Helper::success('社團建立成功', ['club_id' => $club_id]);
            
        } catch (Exception $e) {
            Helper::error('建立社團失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 更新社團信息
     * PUT /api/clubs.php?action=update&id=1
     */
    public static function updateClub($club_id, $data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }
        
        try {
            // 檢查權限
            $member = Database::getInstance()->fetchOne(
                'SELECT * FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1 AND role IN ("president", "vice_president", "public_relations", "treasurer", "director")',
                [$club_id, Auth::getCurrentUserId()]
            );
            
            if (!$member) {
                Helper::error('您無法編輯此社團', 403);
            }
            
            // 更新基本信息
            $requiredFields = ['description', 'meeting_time', 'contact_email', 'meeting_location'];
            $requiredErrors = Helper::validateRequired($data, $requiredFields);
            if (!empty($requiredErrors)) {
                Helper::error('驗證失敗: ' . implode(', ', $requiredErrors), 400);
            }

            if (ContentFilter::hasRestrictedInFields($data, ['club_name', 'description'])) {
                Helper::error('社團資料包含不適當字眼，請修改後再送出', 400);
            }

            if (isset($data['meeting_location'])) {
                self::validateMeetingLocationIfProvided($data['meeting_location']);
            }

            if (!Helper::validateEmail($data['contact_email'])) {
                Helper::error('聯絡信箱格式錯誤', 400);
            }

            $current = Database::getInstance()->fetchOne('SELECT club_name, last_updated FROM clubs WHERE club_id = ?', [$club_id]);
            if (!$current) {
                Helper::error('社團不存在', 404);
            }

            if (!Auth::isAdmin() && array_key_exists('club_name', $data)) {
                $incomingClubName = trim((string)$data['club_name']);
                $existingClubName = trim((string)($current['club_name'] ?? ''));
                if ($incomingClubName !== '' && $incomingClubName !== $existingClubName) {
                    Helper::error('社團管理員無權修改社團名稱', 403);
                }
            }
            if (isset($data['last_updated'])) {
                if (!empty($current['last_updated']) && $current['last_updated'] !== $data['last_updated']) {
                    Helper::error('資料已被其他幹部更新，請重新整理後再儲存', 409);
                }
            }

            $update_data = [
                'description' => $data['description'] ?? '',
                'meeting_day' => $data['meeting_day'] ?? '',
                'meeting_time' => $data['meeting_time'] ?? '',
                'meeting_location' => $data['meeting_location'] ?? '',
                'contact_email' => $data['contact_email'] ?? '',
                'contact_phone' => $data['contact_phone'] ?? '',
                'club_fee' => $data['club_fee'] ?? 0,
                'club_fee_semester' => isset($data['club_fee_semester']) && $data['club_fee_semester'] !== '' ? (int)$data['club_fee_semester'] : null,
                'last_updated' => date('Y-m-d H:i:s')
            ];

            if (Auth::isAdmin()) {
                $update_data['club_name'] = $data['club_name'] ?? '';
            }
            if (isset($data['logo_path'])) {
                $update_data['logo_path'] = $data['logo_path'];
            }
            
            // 過濾未設置的值
            $update_data = array_filter($update_data, function($v) { return $v !== ''; });
            
            if (!empty($update_data)) {
                dbUpdate('clubs', $update_data, 'club_id = ?', [$club_id]);
            }
            
            // 記錄活動
            dbInsert('activity_logs', [
                'club_id' => $club_id,
                'activity_type' => 'activity',
                'triggered_by' => Auth::getCurrentUserId(),
                'description' => '更新社團信息'
            ]);
            
            $fresh = Database::getInstance()->fetchOne('SELECT last_updated FROM clubs WHERE club_id = ?', [$club_id]);
            Helper::success('社團更新成功', [
                'club_id'      => (int)$club_id,
                'last_updated' => $fresh['last_updated'] ?? null,
            ]);

        } catch (Exception $e) {
            Helper::error('更新社團失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 取得用戶追蹤的社團
     * GET /api/clubs.php?action=my_follows
     */
    public static function getMyFollows() {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        try {
            $clubs = Database::getInstance()->fetchAll(
                'SELECT c.* FROM clubs c
                 JOIN club_followers cf ON c.club_id = cf.club_id
                 WHERE cf.user_id = ?
                 ORDER BY cf.followed_at DESC',
                [Auth::getCurrentUserId()]
            );

            foreach ($clubs as &$club) {
                $activityInfo = self::calculateActivityBadge((int)$club['club_id'], $club['created_at'] ?? null);
                $club['activity_badge']   = $activityInfo['badge'];
                $club['last_activity_at'] = $activityInfo['last_activity_at'];
            }
            unset($club);

            Helper::success('取得追蹤社團成功', ['clubs' => $clubs]);

        } catch (Exception $e) {
            Helper::error('取得追蹤社團失敗: ' . $e->getMessage(), 500);
        }
    }
    public static function toggleFollowClub($club_id) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }
        
        try {
            $existing = Database::getInstance()->fetchOne(
                'SELECT * FROM club_followers WHERE club_id = ? AND user_id = ?',
                [$club_id, Auth::getCurrentUserId()]
            );
            
            if ($existing) {
                // 已追蹤，取消追蹤
                dbDelete('club_followers', 'club_id = ? AND user_id = ?', [$club_id, Auth::getCurrentUserId()]);
                $is_following = false;
            } else {
                // 未追蹤，新增追蹤
                dbInsert('club_followers', [
                    'club_id' => $club_id,
                    'user_id' => Auth::getCurrentUserId()
                ]);
                $is_following = true;
            }

            $member_count = Database::getInstance()->fetchOne(
                'SELECT COUNT(*) as count FROM club_followers WHERE club_id = ?',
                [$club_id]
            );
            $current_member_count = (int)($member_count['count'] ?? 0);
            
            Helper::success('操作成功', [
                'is_following' => $is_following,
                'member_count' => $current_member_count
            ]);
            
        } catch (Exception $e) {
            Helper::error('操作失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 取得所有標籤
     * GET /api/clubs.php?action=get_all_tags
     */
    public static function getAllTags() {
        try {
            $tags = Database::getInstance()->fetchAll(
                'SELECT * FROM club_tags ORDER BY tag_type, tag_name'
            );
            Helper::success('取得標籤成功', $tags);
        } catch (Exception $e) {
            Helper::error('取得標籤失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 建立新標籤
     * POST /api/clubs.php?action=create_tag
     */
    public static function createTag($data) {
        $tag_name = trim($data['tag_name'] ?? '');
        $tag_type = trim($data['tag_type'] ?? 'other');
        $description = trim($data['description'] ?? '');

        if (empty($tag_name)) {
            Helper::error('標籤名稱不能為空', 400);
        }

        if (ContentFilter::hasRestrictedInFields($data, ['tag_name', 'description'])) {
            Helper::error('標籤內容包含不適當字眼，請修改後再送出', 400);
        }

        if (!in_array($tag_type, ['experience', 'fee', 'time', 'other'])) {
            $tag_type = 'other';
        }

        try {
            // 檢查標籤是否已存在
            $existing = Database::getInstance()->fetchOne(
                'SELECT * FROM club_tags WHERE tag_name = ?',
                [$tag_name]
            );

            if ($existing) {
                Helper::success('標籤已存在', $existing);
                return;
            }

            $tag_id = dbInsert('club_tags', [
                'tag_name' => $tag_name,
                'tag_type' => $tag_type,
                'description' => $description
            ]);

            $tag = Database::getInstance()->fetchOne(
                'SELECT * FROM club_tags WHERE tag_id = ?',
                [$tag_id]
            );

            Helper::success('標籤建立成功', $tag);
        } catch (Exception $e) {
            Helper::error('建立標籤失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 更新社團標籤
     * POST /api/clubs.php?action=update_tags
     * Body: { club_id, tag_ids: [1, 2, 3] }
     */
    public static function updateTags($data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        $club_id = (int)($data['club_id'] ?? 0);
        $tag_ids = (array)($data['tag_ids'] ?? []);

        if (!$club_id) {
            Helper::error('社團 ID 不能為空', 400);
        }

        try {
            // 驗證權限：檢查用戶是否為該社團的幹部
            $is_admin = Database::getInstance()->fetchOne(
                'SELECT member_id FROM club_members WHERE club_id = ? AND user_id = ? AND role IN ("president", "vice_president", "public_relations", "treasurer", "director")',
                [$club_id, Auth::getCurrentUserId()]
            );

            if (!$is_admin && !Auth::isAdmin()) {
                Helper::error('您沒有權限修改此社團的標籤', 403);
            }

            // 刪除舊標籤關聯
            $stmt = Database::getInstance()->prepare('DELETE FROM club_tag_relations WHERE club_id = ?');
            if ($stmt === false) {
                throw new Exception('刪除舊標籤關聯準備失敗: ' . Database::getInstance()->error);
            }
            $stmt->bind_param('i', $club_id);
            $stmt->execute();
            $stmt->close();

            // 新增新標籤關聯
            $tag_ids = array_filter(array_map('intval', $tag_ids));
            foreach ($tag_ids as $tag_id) {
                dbInsert('club_tag_relations', [
                    'club_id' => $club_id,
                    'tag_id' => $tag_id
                ]);
            }

            Helper::success('標籤更新成功');
        } catch (Exception $e) {
            Helper::error('更新標籤失敗: ' . $e->getMessage(), 500);
        }
    }
}

// 路由處理
$method = Helper::getRequestMethod();
$action = $_GET['action'] ?? 'list';
$club_id = $_GET['id'] ?? null;

if ($method === 'GET') {
    if ($action === 'list') {
        ClubAPI::getClubs();
    } elseif ($action === 'categories') {
        ClubAPI::getCategories();
    } elseif ($action === 'by_category') {
        ClubAPI::getClubsByCategory();
    } elseif ($action === 'all_for_filter') {
        ClubAPI::getAllClubsForFilter();
    } elseif ($action === 'popular_tags') {
        ClubAPI::getPopularTags();
    } elseif ($action === 'get_all_tags') {
        ClubAPI::getAllTags();
    } elseif ($action === 'detail' && $club_id) {
        ClubAPI::getClubDetail($club_id);
    } elseif ($action === 'my_follows') {
        ClubAPI::getMyFollows();
    }
}

if ($method === 'POST') {
    $data = Helper::getRequestInput();
    if ($action === 'create') {
        ClubAPI::createClub($data);
    } elseif ($action === 'create_tag') {
        ClubAPI::createTag($data);
    } elseif ($action === 'update_tags') {
        ClubAPI::updateTags($data);
    } elseif ($action === 'toggle_follow' && $club_id) {
        ClubAPI::toggleFollowClub($club_id);
    }
}

if ($method === 'PUT') {
    $data = Helper::getRequestInput();
    if ($action === 'update' && $club_id) {
        ClubAPI::updateClub($club_id, $data);
    }
}

Helper::error('無效的請求', 400);
