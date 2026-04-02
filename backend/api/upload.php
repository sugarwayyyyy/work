<?php
// 圖片上傳 API：社團 Logo、活動海報與使用者頭像。

require_once '../config.php';
require_once '../auth.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

class UploadAPI {
    private $db;
    private $uploadDir;
    private $maxFileSize;
    private $allowedTypes;

    public function __construct() {
        $this->db = Database::getInstance();
        $this->uploadDir = UPLOAD_DIR;
        $this->maxFileSize = MAX_FILE_SIZE;
        $this->allowedTypes = ALLOWED_IMAGE_TYPES;

        if (!is_dir($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }
    }

    public function handleRequest() {
        if (!Auth::isLoggedIn()) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => '未授權訪問']);
            return;
        }

        $action = $_GET['action'] ?? '';

        switch ($action) {
            case 'upload_club_logo':
                $this->uploadClubLogo();
                break;
            case 'upload_event_poster':
                $this->uploadEventPoster();
                break;
            case 'upload_user_avatar':
                $this->uploadUserAvatar();
                break;
            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => '無效的操作']);
        }
    }

    private function canManageClub($clubId) {
            if (Auth::isAdmin()) {
                return true;
            }

            $userId = Auth::getCurrentUserId();
            if (!$userId) {
                return false;
            }

            $member = $this->db->fetchOne(
                'SELECT member_id FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1 AND role IN ("president", "vice_president", "director", "public_relations")',
                [$clubId, $userId]
            );

            return !empty($member);
        }

        private function getClubIdByEvent($eventId) {
            $event = $this->db->fetchOne('SELECT club_id FROM events WHERE event_id = ?', [$eventId]);
            if (!$event) {
                return null;
            }
            return (int)$event['club_id'];
        }

    private function uploadClubLogo() {
        $clubId = (int)($_POST['club_id'] ?? 0);
        if (!$clubId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '缺少社團ID']);
            return;
        }

        if (!$this->canManageClub($clubId)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => '權限不足']);
            return;
        }

        $file = $_FILES['logo'] ?? null;
        if (!$file) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '沒有上傳文件']);
            return;
        }

        $result = $this->processUpload($file, 'club_' . $clubId . '_logo');
        if ($result['success']) {
            $stmt = $this->db->prepare("UPDATE clubs SET logo_path = ? WHERE club_id = ?");
            $stmt->bind_param("si", $result['path'], $clubId);
            $stmt->execute();
            $stmt->close();
        }

        echo json_encode($result);
    }

    private function uploadEventPoster() {
        $eventId = (int)($_POST['event_id'] ?? 0);
        if (!$eventId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '缺少活動ID']);
            return;
        }

        $clubId = $this->getClubIdByEvent($eventId);
        if (!$clubId) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '活動不存在']);
            return;
        }

        if (!$this->canManageClub($clubId)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => '權限不足']);
            return;
        }

        $file = $_FILES['poster'] ?? null;
        if (!$file) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '沒有上傳文件']);
            return;
        }

        $result = $this->processUpload($file, 'event_' . $eventId . '_poster');
        if ($result['success']) {
            $stmt = $this->db->prepare("UPDATE events SET poster_path = ? WHERE event_id = ?");
            $stmt->bind_param("si", $result['path'], $eventId);
            $stmt->execute();
            $stmt->close();
        }

        echo json_encode($result);
    }

    private function uploadUserAvatar() {
        $userId = Auth::getCurrentUserId();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => '未授權訪問']);
            return;
        }

        $file = $_FILES['avatar'] ?? null;
        if (!$file) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '沒有上傳文件']);
            return;
        }

        $result = $this->processUpload($file, 'user_' . $userId . '_avatar');
        if ($result['success']) {
            $stmt = $this->db->prepare("UPDATE users SET avatar_path = ? WHERE user_id = ?");
            $stmt->bind_param("si", $result['path'], $userId);
            $stmt->execute();
            $stmt->close();
        }

        echo json_encode($result);
    }

    private function processUpload($file, $prefix) {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => '文件上傳錯誤'];
        }

        if ($file['size'] > $this->maxFileSize) {
            return ['success' => false, 'message' => '文件大小超過限制'];
        }

        if (!in_array($file['type'], $this->allowedTypes)) {
            return ['success' => false, 'message' => '不支援的文件類型'];
        }

        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = $prefix . '_' . time() . '_' . uniqid() . '.' . $extension;
        $filepath = $this->uploadDir . $filename;

        if (move_uploaded_file($file['tmp_name'], $filepath)) {
            return [
                'success' => true,
                'message' => '上傳成功',
                'path' => 'assets/uploads/' . $filename,
                'filename' => $filename
            ];
        } else {
            return ['success' => false, 'message' => '文件保存失敗'];
        }
    }
}

$uploadAPI = new UploadAPI();
$uploadAPI->handleRequest();
?>