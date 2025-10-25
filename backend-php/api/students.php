<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../classes/Auth.php';
require_once __DIR__ . '/../classes/Student.php';

/**
 * 学生管理API
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
    $student = new Student();
    
    switch ($method) {
        case 'POST':
            // 学生の作成
            $user = $auth->authenticate();
            
            // 管理者のみ学生を作成可能
            if ($user['role'] !== 'admin') {
                sendResponse([
                    'success' => false,
                    'message' => '管理者権限が必要です'
                ], 403);
            }
            
            $data = getInputData();
            
            // バリデーション
            if (empty($data['student_id'])) {
                sendResponse([
                    'success' => false,
                    'message' => '学生IDは必須です'
                ], 400);
            }
            
            if (empty($data['name'])) {
                sendResponse([
                    'success' => false,
                    'message' => '名前は必須です'
                ], 400);
            }
            
            $result = $student->createStudent($data);
            sendResponse($result, $result['success'] ? 201 : 400);
            break;
            
        case 'GET':
            $user = $auth->authenticate();
            $studentId = $_GET['studentId'] ?? null;
            $cardId = $_GET['cardId'] ?? null;
            
            if ($studentId) {
                // 特定学生の取得
                $result = $student->getStudent($studentId);
                sendResponse($result, $result['success'] ? 200 : 404);
            } elseif ($cardId) {
                // カードIDで学生を検索
                $result = $student->getStudentByCardId($cardId);
                sendResponse($result, $result['success'] ? 200 : 404);
            } else {
                // 学生一覧の取得
                $search = $_GET['search'] ?? null;
                $limit = $_GET['limit'] ?? null;
                $offset = $_GET['offset'] ?? 0;
                
                $result = $student->getStudents($search, $limit, $offset);
                sendResponse($result);
            }
            break;
            
        case 'PUT':
            // 学生情報の更新
            $user = $auth->authenticate();
            
            // 管理者のみ学生情報を更新可能
            if ($user['role'] !== 'admin') {
                sendResponse([
                    'success' => false,
                    'message' => '管理者権限が必要です'
                ], 403);
            }
            
            $studentId = $_GET['studentId'] ?? null;
            
            if (!$studentId) {
                sendResponse([
                    'success' => false,
                    'message' => '学生IDが必要です'
                ], 400);
            }
            
            $data = getInputData();
            $result = $student->updateStudent($studentId, $data);
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        case 'DELETE':
            // 学生の削除
            $user = $auth->authenticate();
            
            // 管理者のみ学生を削除可能
            if ($user['role'] !== 'admin') {
                sendResponse([
                    'success' => false,
                    'message' => '管理者権限が必要です'
                ], 403);
            }
            
            $studentId = $_GET['studentId'] ?? null;
            
            if (!$studentId) {
                sendResponse([
                    'success' => false,
                    'message' => '学生IDが必要です'
                ], 400);
            }
            
            $result = $student->deleteStudent($studentId);
            sendResponse($result, $result['success'] ? 200 : 400);
            break;
            
        default:
            sendResponse([
                'success' => false,
                'message' => 'サポートされていないHTTPメソッドです'
            ], 405);
    }
    
} catch (Exception $e) {
    error_log("学生管理APIエラー: " . $e->getMessage());
    sendResponse([
        'success' => false,
        'message' => 'サーバーエラーが発生しました'
    ], 500);
}
?>
