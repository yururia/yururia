<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../classes/Auth.php';
require_once __DIR__ . '/../classes/Subject.php';

/**
 * 科目管理API
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
    $subject = new Subject();
    
    // 認証チェック
    $user = $auth->authenticate();
    
    switch ($method) {
        case 'POST':
            // 科目の作成
            $data = getInputData();
            
            // バリデーション
            if (empty($data['subject_code']) || empty($data['subject_name'])) {
                sendResponse([
                    'success' => false,
                    'message' => '科目コードと科目名は必須です'
                ], 400);
            }
            
            $result = $subject->createSubject($data);
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        case 'GET':
            // 科目一覧の取得
            $search = $_GET['search'] ?? null;
            $isActive = isset($_GET['isActive']) ? filter_var($_GET['isActive'], FILTER_VALIDATE_BOOLEAN) : null;
            
            $result = $subject->getSubjects($search, $isActive);
            sendResponse($result);
            break;
            
        case 'PUT':
            // 科目情報の更新
            $subjectId = $_GET['subjectId'] ?? null;
            if (!$subjectId) {
                sendResponse([
                    'success' => false,
                    'message' => '科目IDが必要です'
                ], 400);
            }
            
            $data = getInputData();
            $result = $subject->updateSubject($subjectId, $data);
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        case 'DELETE':
            // 科目の削除
            $subjectId = $_GET['subjectId'] ?? null;
            if (!$subjectId) {
                sendResponse([
                    'success' => false,
                    'message' => '科目IDが必要です'
                ], 400);
            }
            
            $result = $subject->deleteSubject($subjectId);
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        default:
            sendResponse([
                'success' => false,
                'message' => 'サポートされていないHTTPメソッドです'
            ], 405);
    }
    
} catch (Exception $e) {
    error_log("科目管理APIエラー: " . $e->getMessage());
    sendResponse([
        'success' => false,
        'message' => 'サーバーエラーが発生しました'
    ], 500);
}
?>
