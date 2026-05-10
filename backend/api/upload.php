<?php
// 圖片上傳 API：社團 Logo、活動海報與使用者頭像。

require_once '../config.php';
require_once '../auth.php';

header('Content-Type: application/json; charset=UTF-8');
Helper::applyCorsHeaders();
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// 確保 API 錯誤也以 JSON 形式返回，避免前端解析失敗。
set_exception_handler(function ($e) {
    Helper::logError('upload.php exception: ' . $e->getMessage());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
    }
    echo json_encode([
        'success' => false,
        'message' => '上傳服務發生錯誤，請稍後再試'
    ]);
    exit;
});

set_error_handler(function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        Helper::logError('upload.php fatal: ' . $error['message']);
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=UTF-8');
        }
        echo json_encode([
            'success' => false,
            'message' => '上傳服務發生致命錯誤，請稍後再試'
        ]);
    }
});

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

    private function respondJson(int $statusCode, array $payload): void {
        http_response_code($statusCode);
        echo json_encode($payload);
    }

    private function parseIniSize(string $val): int {
        $val = trim($val);
        $last = strtolower($val[-1] ?? '');
        $num  = (int)$val;
        if ($last === 'g') return $num * 1073741824;
        if ($last === 'm') return $num * 1048576;
        if ($last === 'k') return $num * 1024;
        return $num;
    }

    public function handleRequest() {
        $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($contentLength > 0 && empty($_FILES) && empty($_POST)) {
            $limit = $this->parseIniSize((string)ini_get('post_max_size'));
            if ($limit > 0 && $contentLength > $limit) {
                http_response_code(413);
                echo json_encode(['success' => false, 'message' => '上傳檔案超過伺服器大小限制，請壓縮後再試']);
                return;
            }
        }

        if (!Auth::isLoggedIn()) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => '未授權訪問']);
            return;
        }

        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!Helper::verifyCSRFToken($token)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'CSRF 驗證失敗，請重新整理後再試']);
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

    private function hasColumn($tableName, $columnName) {
        $row = $this->db->fetchOne(
            'SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [DB_NAME, $tableName, $columnName]
        );
        return !empty($row) && (int)($row['cnt'] ?? 0) > 0;
    }

    private function ensureEventPosterColumn() {
        return $this->hasColumn('events', 'poster_path');
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

        $this->respondJson(200, $result);
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
            if (!$this->ensureEventPosterColumn()) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => '資料庫缺少 events.poster_path 欄位，請先執行 migration']);
                return;
            }

            $stmt = $this->db->prepare("UPDATE events SET poster_path = ? WHERE event_id = ?");
            if (!$stmt) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => '資料庫更新失敗（無法準備 SQL）']);
                return;
            }
            $stmt->bind_param("si", $result['path'], $eventId);
            $stmt->execute();
            $stmt->close();
        }

        $this->respondJson(200, $result);
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

        $this->respondJson(200, $result);
    }

    private function processUpload($file, $prefix) {
        $uploadError = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($uploadError !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => $this->getUploadErrorMessage($uploadError)];
        }

        if ($file['size'] > $this->maxFileSize) {
            return ['success' => false, 'message' => '文件大小超過限制'];
        }

        $normalizedAllowedTypes = array_unique(array_merge($this->allowedTypes, [
            'image/jpg',
            'image/webp'
        ]));

        $detectedType = null;
        if (!empty($file['tmp_name']) && function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo) {
                $detectedType = finfo_file($finfo, $file['tmp_name']) ?: null;
                finfo_close($finfo);
            }
        }

        $typeToCheck = $detectedType ?? ($file['type'] ?? '');
        $isSupportedType = in_array($typeToCheck, $normalizedAllowedTypes, true);

        if (!$isSupportedType) {
            return ['success' => false, 'message' => '不支援的文件類型'];
        }

        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!in_array($extension, $allowedExtensions, true)) {
            return ['success' => false, 'message' => '不支援的副檔名'];
        }

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

    private function getUploadErrorMessage($errorCode) {
        switch ((int)$errorCode) {
            case UPLOAD_ERR_INI_SIZE:
                return '文件超過伺服器上傳大小限制（upload_max_filesize）';
            case UPLOAD_ERR_FORM_SIZE:
                return '文件超過表單允許大小限制';
            case UPLOAD_ERR_PARTIAL:
                return '文件僅部分上傳，請檢查網路後重試';
            case UPLOAD_ERR_NO_FILE:
                return '未收到上傳文件';
            case UPLOAD_ERR_NO_TMP_DIR:
                return '伺服器缺少暫存目錄';
            case UPLOAD_ERR_CANT_WRITE:
                return '伺服器無法寫入上傳文件';
            case UPLOAD_ERR_EXTENSION:
                return '上傳被伺服器擴充套件中止';
            default:
                return '文件上傳錯誤（錯誤碼：' . (int)$errorCode . '）';
        }
    }
}

$uploadAPI = new UploadAPI();
$uploadAPI->handleRequest();
?>
