<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../classes/Auth.php';
require_once __DIR__ . '/../classes/AuditLog.php';

/**
 * 監査ログAPI
 */

// リクエストメソッドの取得
$method = $_SERVER['REQUEST_METHOD'];

// レスポンス関数
function sendResponse($data, $httpCode = 200) {
    http_response_code($httpCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $auth = new Auth();
    $auditLog = new AuditLog();
    
    // 認証チェック
    $user = $auth->authenticate();
    
    // 管理者権限チェック
    if ($user['role'] !== 'admin') {
        sendResponse([
            'success' => false,
            'message' => 'この機能は管理者のみ利用可能です'
        ], 403);
    }
    
    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? '';
            
            switch ($action) {
                case 'list':
                    // 監査ログ一覧の取得
                    $userId = $_GET['userId'] ?? null;
                    $tableName = $_GET['tableName'] ?? null;
                    $actionType = $_GET['actionType'] ?? null;
                    $startDate = $_GET['startDate'] ?? null;
                    $endDate = $_GET['endDate'] ?? null;
                    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
                    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
                    
                    $result = $auditLog->getAuditLogs($userId, $tableName, $actionType, $startDate, $endDate, $limit, $offset);
                    sendResponse($result);
                    break;
                    
                case 'record':
                    // 特定レコードの監査ログ取得
                    $tableName = $_GET['tableName'] ?? null;
                    $recordId = $_GET['recordId'] ?? null;
                    
                    if (!$tableName || !$recordId) {
                        sendResponse([
                            'success' => false,
                            'message' => 'テーブル名とレコードIDが必要です'
                        ], 400);
                    }
                    
                    $result = $auditLog->getRecordAuditLog($tableName, $recordId);
                    sendResponse($result);
                    break;
                    
                case 'stats':
                    // 監査ログ統計の取得
                    $startDate = $_GET['startDate'] ?? null;
                    $endDate = $_GET['endDate'] ?? null;
                    
                    $result = $auditLog->getAuditStats($startDate, $endDate);
                    sendResponse($result);
                    break;
                    
                default:
                    sendResponse([
                        'success' => false,
                        'message' => '無効なアクションです'
                    ], 400);
            }
            break;
            
        case 'DELETE':
            // 古い監査ログの削除
            $daysToKeep = isset($_GET['daysToKeep']) ? (int)$_GET['daysToKeep'] : 365;
            
            $result = $auditLog->cleanupOldLogs($daysToKeep);
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        default:
            sendResponse([
                'success' => false,
                'message' => 'サポートされていないHTTPメソッドです'
            ], 405);
    }
    
} catch (Exception $e) {
    error_log("監査ログAPIエラー: " . $e->getMessage());
    sendResponse([
        'success' => false,
        'message' => 'サーバーエラーが発生しました'
    ], 500);
}
?>
