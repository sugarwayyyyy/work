<?php
require_once __DIR__ . '/../backend/db.php';
require_once __DIR__ . '/../backend/config.php';
$db = Database::getInstance()->getConnection();

$r = $db->query("
    SELECT q.qa_id, c.club_code, q.question_title, q.status,
           COUNT(DISTINCT r.reply_id) AS replies,
           COUNT(DISTINCT h.vote_id) AS helpful_votes,
           COUNT(DISTINCT tr.qa_tag_id) AS tags
    FROM q_and_a q
    JOIN clubs c ON c.club_id = q.club_id
    LEFT JOIN qa_replies r ON r.qa_id = q.qa_id
    LEFT JOIN qa_reply_helpful h ON h.reply_id = r.reply_id AND h.vote_type = 'helpful'
    LEFT JOIN qa_tag_relations tr ON tr.qa_id = q.qa_id
    WHERE q.question_title IN (
        'Python 入門後該如何繼續進階學習？','期末專題要怎麼找到合適的隊友？',
        '完全沒舞蹈基礎可以加入嗎？','每週需要練習幾次？對課業影響大嗎？',
        '入社需要自備相機嗎？手機可以嗎？','新生需要什麼體能程度才能參加行程？',
        '社員有機會參加校外演講或辯論比賽嗎？','社費包含哪些費用？需要自備桌遊嗎？'
    )
    GROUP BY q.qa_id, c.club_code, q.question_title, q.status
    ORDER BY q.qa_id
");
echo "=== Demo Q&A ===\n";
$total = 0;
while ($row = $r->fetch_assoc()) {
    $badge = $row['status'] === 'closed' ? '✅已解決' : '🔵待解決';
    echo "  [{$row['club_code']}] {$badge} {$row['question_title']}\n";
    echo "    → 回覆:{$row['replies']} 有幫助票:{$row['helpful_votes']} 標籤:{$row['tags']}\n";
    $total++;
}
echo "  共 $total 筆\n";
