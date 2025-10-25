<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../classes/Auth.php';
require_once __DIR__ . '/../classes/Attendance.php';

/**
 * 出欠管理API
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
    $attendance = new Attendance();
    
    switch ($method) {
        case 'POST':
            // 出欠記録の作成・更新
            $user = $auth->authenticate();
            $data = getInputData();
            
            // バリデーション
            if (empty($data['date'])) {
                sendResponse([
                    'success' => false,
                    'message' => '日付は必須です'
                ], 400);
            }
            
            if (empty($data['type']) || !in_array($data['type'], ['checkin', 'checkout', 'late', 'absent', 'early_departure'])) {
                sendResponse([
                    'success' => false,
                    'message' => '有効な出欠タイプを選択してください'
                ], 400);
            }
            
            $result = $attendance->recordAttendance(
                $user['id'],
                $data['date'],
                $data['type'],
                $data['timestamp'] ?? null,
                $data['reason'] ?? null,
                $data['studentId'] ?? null
            );
            
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        case 'GET':
            $user = $auth->authenticate();
            $userId = $_GET['userId'] ?? $user['id'];
            
            // 自分の記録のみ取得可能（管理者は全員の記録を取得可能）
            if ($userId != $user['id'] && $user['role'] !== 'admin') {
                sendResponse([
                    'success' => false,
                    'message' => '他のユーザーの記録を取得する権限がありません'
                ], 403);
            }
            
            $action = $_GET['action'] ?? '';
            
            switch ($action) {
                case 'report':
                    // 月次レポートの取得
                    $year = $_GET['year'] ?? null;
                    $month = $_GET['month'] ?? null;
                    
                    if (!$year || !$month) {
                        sendResponse([
                            'success' => false,
                            'message' => '年と月のパラメータが必要です'
                        ], 400);
                    }
                    
                    $result = $attendance->getMonthlyReport($userId, $year, $month);
                    sendResponse($result);
                    break;
                    
                case 'stats':
                    // 統計情報の取得
                    $period = $_GET['period'] ?? 'month';
                    $result = $attendance->getAttendanceStats($userId, $period);
                    sendResponse($result);
                    break;
                    
                default:
                    // 出欠記録の取得
                    $startDate = $_GET['startDate'] ?? null;
                    $endDate = $_GET['endDate'] ?? null;
                    
                    $result = $attendance->getAttendanceRecords($userId, $startDate, $endDate);
                    sendResponse($result);
            }
            break;
            
        case 'PUT':
            // 出欠記録の更新
            $user = $auth->authenticate();
            $recordId = $_GET['id'] ?? null;
            
            if (!$recordId) {
                sendResponse([
                    'success' => false,
                    'message' => '記録IDが必要です'
                ], 400);
            }
            
            $data = getInputData();
            $result = $attendance->updateAttendance($recordId, $user['id'], $data);
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        case 'DELETE':
            // 出欠記録の削除
            $user = $auth->authenticate();
            $recordId = $_GET['id'] ?? null;
            
            if (!$recordId) {
                sendResponse([
                    'success' => false,
                    'message' => '記録IDが必要です'
                ], 400);
            }
            
            $result = $attendance->deleteAttendance($recordId, $user['id']);
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        default:
            sendResponse([
                'success' => false,
                'message' => 'サポートされていないHTTPメソッドです'
            ], 405);
    }
    
} catch (Exception $e) {
    error_log("出欠管理APIエラー: " . $e->getMessage());
    sendResponse([
        'success' => false,
        'message' => 'サーバーエラーが発生しました'
    ], 500);
}
?>
