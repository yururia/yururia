<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../classes/Auth.php';
require_once __DIR__ . '/../config/database.php';

/**
 * ユーザー管理API
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
    $database = new Database();
    $db = $database->getConnection();
    
    switch ($method) {
        case 'GET':
            $user = $auth->authenticate();
            $userId = $_GET['userId'] ?? null;
            
            if ($userId) {
                // 特定ユーザーの情報取得
                if ($userId != $user['id'] && $user['role'] !== 'admin') {
                    sendResponse([
                        'success' => false,
                        'message' => '他のユーザーの情報を取得する権限がありません'
                    ], 403);
                }
                
                $sql = "SELECT id, name, email, employee_id, department, role, created_at FROM users WHERE id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$userId]);
                $userData = $stmt->fetch();
                
                if (!$userData) {
                    sendResponse([
                        'success' => false,
                        'message' => 'ユーザーが見つかりません'
                    ], 404);
                }
                
                sendResponse([
                    'success' => true,
                    'data' => ['user' => $userData]
                ]);
            } else {
                // 全ユーザー一覧取得（管理者のみ）
                if ($user['role'] !== 'admin') {
                    sendResponse([
                        'success' => false,
                        'message' => '管理者権限が必要です'
                    ], 403);
                }
                
                $sql = "SELECT id, name, email, employee_id, department, role, created_at FROM users ORDER BY created_at DESC";
                $stmt = $db->prepare($sql);
                $stmt->execute();
                $users = $stmt->fetchAll();
                
                sendResponse([
                    'success' => true,
                    'data' => ['users' => $users]
                ]);
            }
            break;
            
        case 'PUT':
            // ユーザー情報の更新
            $user = $auth->authenticate();
            $userId = $_GET['userId'] ?? null;
            
            if (!$userId) {
                sendResponse([
                    'success' => false,
                    'message' => 'ユーザーIDが必要です'
                ], 400);
            }
            
            // 自分の情報のみ更新可能（管理者は全員の情報を更新可能）
            if ($userId != $user['id'] && $user['role'] !== 'admin') {
                sendResponse([
                    'success' => false,
                    'message' => 'このユーザーの情報を更新する権限がありません'
                ], 403);
            }
            
            $data = getInputData();
            
            // ロールの変更は管理者のみ可能
            if (isset($data['role']) && $data['role'] !== $user['role'] && $user['role'] !== 'admin') {
                sendResponse([
                    'success' => false,
                    'message' => 'ロールの変更権限がありません'
                ], 403);
            }
            
            // ユーザーの存在確認
            $sql = "SELECT * FROM users WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$userId]);
            $existingUser = $stmt->fetch();
            
            if (!$existingUser) {
                sendResponse([
                    'success' => false,
                    'message' => 'ユーザーが見つかりません'
                ], 404);
            }
            
            // メールアドレスの重複チェック（変更する場合）
            if (isset($data['email']) && $data['email'] !== $existingUser['email']) {
                $sql = "SELECT id FROM users WHERE email = ? AND id != ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$data['email'], $userId]);
                if ($stmt->fetch()) {
                    sendResponse([
                        'success' => false,
                        'message' => 'このメールアドレスは既に使用されています'
                    ], 409);
                }
            }
            
            // 更新処理
            $updateFields = [];
            $updateParams = [];
            
            if (isset($data['name'])) {
                $updateFields[] = 'name = ?';
                $updateParams[] = $data['name'];
            }
            if (isset($data['email'])) {
                $updateFields[] = 'email = ?';
                $updateParams[] = $data['email'];
            }
            if (isset($data['department'])) {
                $updateFields[] = 'department = ?';
                $updateParams[] = $data['department'];
            }
            if (isset($data['role'])) {
                $updateFields[] = 'role = ?';
                $updateParams[] = $data['role'];
            }
            
            if (empty($updateFields)) {
                sendResponse([
                    'success' => false,
                    'message' => '更新するデータがありません'
                ], 400);
            }
            
            $updateFields[] = 'updated_at = NOW()';
            $updateParams[] = $userId;
            
            $sql = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($updateParams);
            
            sendResponse([
                'success' => true,
                'message' => 'ユーザー情報が更新されました'
            ]);
            break;
            
        case 'DELETE':
            // ユーザーの削除（管理者のみ）
            $user = $auth->authenticate();
            
            if ($user['role'] !== 'admin') {
                sendResponse([
                    'success' => false,
                    'message' => '管理者権限が必要です'
                ], 403);
            }
            
            $userId = $_GET['userId'] ?? null;
            
            if (!$userId) {
                sendResponse([
                    'success' => false,
                    'message' => 'ユーザーIDが必要です'
                ], 400);
            }
            
            // 自分自身の削除は禁止
            if ($userId == $user['id']) {
                sendResponse([
                    'success' => false,
                    'message' => '自分自身のアカウントは削除できません'
                ], 400);
            }
            
            // ユーザーの存在確認
            $sql = "SELECT * FROM users WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$userId]);
            $targetUser = $stmt->fetch();
            
            if (!$targetUser) {
                sendResponse([
                    'success' => false,
                    'message' => 'ユーザーが見つかりません'
                ], 404);
            }
            
            // 関連する出欠記録も削除
            $sql = "DELETE FROM attendance_records WHERE user_id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$userId]);
            
            // ユーザーの削除
            $sql = "DELETE FROM users WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$userId]);
            
            sendResponse([
                'success' => true,
                'message' => 'ユーザーが削除されました'
            ]);
            break;
            
        default:
            sendResponse([
                'success' => false,
                'message' => 'サポートされていないHTTPメソッドです'
            ], 405);
    }
    
} catch (Exception $e) {
    error_log("ユーザー管理APIエラー: " . $e->getMessage());
    sendResponse([
        'success' => false,
        'message' => 'サーバーエラーが発生しました'
    ], 500);
}
?>
