<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../classes/Auth.php';
require_once __DIR__ . '/../classes/SystemSettings.php';

/**
 * システム設定API
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
    $settings = new SystemSettings();
    
    // 認証チェック
    $user = $auth->authenticate();
    
    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? '';
            
            switch ($action) {
                case 'get':
                    // 特定の設定値を取得
                    $key = $_GET['key'] ?? null;
                    if (!$key) {
                        sendResponse([
                            'success' => false,
                            'message' => '設定キーが必要です'
                        ], 400);
                    }
                    
                    $value = $settings->getSetting($key);
                    sendResponse([
                        'success' => true,
                        'data' => ['value' => $value]
                    ]);
                    break;
                    
                case 'all':
                    // 全設定の取得
                    $publicOnly = isset($_GET['publicOnly']) ? filter_var($_GET['publicOnly'], FILTER_VALIDATE_BOOLEAN) : false;
                    $result = $settings->getAllSettings($publicOnly);
                    sendResponse($result);
                    break;
                    
                case 'attendance-threshold':
                    // 出欠率の閾値を取得
                    $threshold = $settings->getAttendanceThreshold();
                    sendResponse([
                        'success' => true,
                        'data' => ['threshold' => $threshold]
                    ]);
                    break;
                    
                case 'late-threshold':
                    // 遅刻の閾値を取得
                    $threshold = $settings->getLateThreshold();
                    sendResponse([
                        'success' => true,
                        'data' => ['threshold' => $threshold]
                    ]);
                    break;
                    
                case 'school-name':
                    // 学校名を取得
                    $name = $settings->getSchoolName();
                    sendResponse([
                        'success' => true,
                        'data' => ['name' => $name]
                    ]);
                    break;
                    
                default:
                    sendResponse([
                        'success' => false,
                        'message' => '無効なアクションです'
                    ], 400);
            }
            break;
            
        case 'POST':
            // 設定値の設定
            $data = getInputData();
            
            // バリデーション
            if (empty($data['key'])) {
                sendResponse([
                    'success' => false,
                    'message' => '設定キーは必須です'
                ], 400);
            }
            
            $result = $settings->setSetting(
                $data['key'],
                $data['value'] ?? null,
                $data['type'] ?? 'string',
                $data['description'] ?? null,
                $data['isPublic'] ?? false
            );
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        case 'DELETE':
            // 設定の削除
            $key = $_GET['key'] ?? null;
            if (!$key) {
                sendResponse([
                    'success' => false,
                    'message' => '設定キーが必要です'
                ], 400);
            }
            
            $result = $settings->deleteSetting($key);
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        default:
            sendResponse([
                'success' => false,
                'message' => 'サポートされていないHTTPメソッドです'
            ], 405);
    }
    
} catch (Exception $e) {
    error_log("システム設定APIエラー: " . $e->getMessage());
    sendResponse([
        'success' => false,
        'message' => 'サーバーエラーが発生しました'
    ], 500);
}
?>
