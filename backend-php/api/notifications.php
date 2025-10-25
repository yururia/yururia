<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../classes/Auth.php';
require_once __DIR__ . '/../classes/Notification.php';

/**
 * 通知管理API
 */

// リクエストメソッドの取得
$method = $_SERVER['REQUEST_METHOD'];

// レスポンス関数
function sendResponse($data, $httpCode = 200) {
    http_response_code($httpCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// 入力データの取得
function getInputData() {
    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendResponse([
            'success' => false,
            'message' => '無効なJSONデータです'
        ], 400);
    }
    return $input;
}

try {
    $auth = new Auth();
    $notification = new Notification();
    
    // 認証チェック
    $user = $auth->authenticate();
    
    switch ($method) {
        case 'POST':
            // 通知の作成
            $data = getInputData();
            
            // バリデーション
            if (empty($data['title']) || empty($data['message'])) {
                sendResponse([
                    'success' => false,
                    'message' => 'タイトルとメッセージは必須です'
                ], 400);
            }
            
            $result = $notification->createNotification($data);
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        case 'GET':
            $action = $_GET['action'] ?? '';
            
            switch ($action) {
                case 'user':
                    // ユーザーの通知一覧取得
                    $isRead = isset($_GET['isRead']) ? filter_var($_GET['isRead'], FILTER_VALIDATE_BOOLEAN) : null;
                    $type = $_GET['type'] ?? null;
                    
                    $result = $notification->getUserNotifications($user['id'], $isRead, $type);
                    sendResponse($result);
                    break;
                    
                case 'student':
                    // 学生の通知一覧取得
                    $studentId = $_GET['studentId'] ?? null;
                    if (!$studentId) {
                        sendResponse([
                            'success' => false,
                            'message' => '学生IDが必要です'
                        ], 400);
                    }
                    
                    $isRead = isset($_GET['isRead']) ? filter_var($_GET['isRead'], FILTER_VALIDATE_BOOLEAN) : null;
                    $type = $_GET['type'] ?? null;
                    
                    $result = $notification->getStudentNotifications($studentId, $isRead, $type);
                    sendResponse($result);
                    break;
                    
                case 'unread-count':
                    // 未読通知数の取得
                    $result = $notification->getUnreadCount($user['id']);
                    sendResponse($result);
                    break;
                    
                default:
                    sendResponse([
                        'success' => false,
                        'message' => '無効なアクションです'
                    ], 400);
            }
            break;
            
        case 'PUT':
            // 通知を既読にする
            $notificationId = $_GET['notificationId'] ?? null;
            if (!$notificationId) {
                sendResponse([
                    'success' => false,
                    'message' => '通知IDが必要です'
                ], 400);
            }
            
            $result = $notification->markAsRead($notificationId, $user['id']);
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        case 'DELETE':
            // 通知の削除
            $notificationId = $_GET['notificationId'] ?? null;
            if (!$notificationId) {
                sendResponse([
                    'success' => false,
                    'message' => '通知IDが必要です'
                ], 400);
            }
            
            $result = $notification->deleteNotification($notificationId, $user['id']);
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        default:
            sendResponse([
                'success' => false,
                'message' => 'サポートされていないHTTPメソッドです'
            ], 405);
    }
    
} catch (Exception $e) {
    error_log("通知管理APIエラー: " . $e->getMessage());
    sendResponse([
        'success' => false,
        'message' => 'サーバーエラーが発生しました'
    ], 500);
}
?>
