<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../classes/Auth.php';
require_once __DIR__ . '/../classes/Class.php';

/**
 * 授業管理API
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
    $classManagement = new ClassManagement();
    
    // 認証チェック
    $user = $auth->authenticate();
    
    switch ($method) {
        case 'POST':
            // 授業の作成
            $data = getInputData();
            
            // バリデーション
            if (empty($data['class_code']) || empty($data['subject_id']) || empty($data['teacher_name'])) {
                sendResponse([
                    'success' => false,
                    'message' => '授業コード、科目ID、担当者名は必須です'
                ], 400);
            }
            
            $result = $classManagement->createClass($data);
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        case 'GET':
            // 授業一覧の取得
            $search = $_GET['search'] ?? null;
            $subjectId = $_GET['subjectId'] ?? null;
            $isActive = isset($_GET['isActive']) ? filter_var($_GET['isActive'], FILTER_VALIDATE_BOOLEAN) : null;
            
            $result = $classManagement->getClasses($search, $subjectId, $isActive);
            sendResponse($result);
            break;
            
        case 'PUT':
            // 授業情報の更新
            $classId = $_GET['classId'] ?? null;
            if (!$classId) {
                sendResponse([
                    'success' => false,
                    'message' => '授業IDが必要です'
                ], 400);
            }
            
            $data = getInputData();
            $result = $classManagement->updateClass($classId, $data);
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        case 'DELETE':
            // 授業の削除
            $classId = $_GET['classId'] ?? null;
            if (!$classId) {
                sendResponse([
                    'success' => false,
                    'message' => '授業IDが必要です'
                ], 400);
            }
            
            $result = $classManagement->deleteClass($classId);
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        default:
            sendResponse([
                'success' => false,
                'message' => 'サポートされていないHTTPメソッドです'
            ], 405);
    }
    
} catch (Exception $e) {
    error_log("授業管理APIエラー: " . $e->getMessage());
    sendResponse([
        'success' => false,
        'message' => 'サーバーエラーが発生しました'
    ], 500);
}
?>
