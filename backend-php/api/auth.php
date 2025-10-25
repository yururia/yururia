<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../classes/Auth.php';

/**
 * 認証API
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

// バリデーション関数
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function validatePassword($password) {
    return strlen($password) >= 6;
}

function validateRequired($value, $fieldName) {
    if (empty($value)) {
        sendResponse([
            'success' => false,
            'message' => "{$fieldName}は必須です"
        ], 400);
    }
}

try {
    $auth = new Auth();
    
    // リクエストログ
    error_log("認証API リクエスト: " . json_encode([
        'method' => $method,
        'action' => $_GET['action'] ?? '',
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'timestamp' => date('Y-m-d H:i:s')
    ]));
    
    switch ($method) {
        case 'POST':
            $action = $_GET['action'] ?? '';
            
            switch ($action) {
                case 'login':
                    $data = getInputData();
                    
                    // ログイン試行ログ
                    error_log("ログイン試行: " . json_encode([
                        'email' => $data['email'] ?? '',
                        'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
                        'timestamp' => date('Y-m-d H:i:s')
                    ]));
                    
                    // バリデーション
                    validateRequired($data['email'] ?? '', 'メールアドレス');
                    validateRequired($data['password'] ?? '', 'パスワード');
                    
                    if (!validateEmail($data['email'])) {
                        error_log("ログイン失敗 - 無効なメールアドレス: " . ($data['email'] ?? ''));
                        sendResponse([
                            'success' => false,
                            'message' => '有効なメールアドレスを入力してください'
                        ], 400);
                    }
                    
                    if (!validatePassword($data['password'])) {
                        error_log("ログイン失敗 - パスワード長不足: " . ($data['email'] ?? ''));
                        sendResponse([
                            'success' => false,
                            'message' => 'パスワードは6文字以上で入力してください'
                        ], 400);
                    }
                    
                    $result = $auth->login($data['email'], $data['password']);
                    
                    if ($result['success']) {
                        error_log("ログイン成功: " . json_encode([
                            'email' => $data['email'],
                            'user_id' => $result['data']['user']['id'] ?? '',
                            'timestamp' => date('Y-m-d H:i:s')
                        ]));
                    } else {
                        error_log("ログイン失敗: " . json_encode([
                            'email' => $data['email'],
                            'message' => $result['message'] ?? '',
                            'timestamp' => date('Y-m-d H:i:s')
                        ]));
                    }
                    
                    sendResponse($result, $result['success'] ? 200 : 401);
                    break;
                    
                case 'register':
                    $data = getInputData();
                    
                    // 新規登録試行ログ
                    error_log("新規登録試行: " . json_encode([
                        'email' => $data['email'] ?? '',
                        'name' => $data['name'] ?? '',
                        'employee_id' => $data['employeeId'] ?? '',
                        'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
                        'timestamp' => date('Y-m-d H:i:s')
                    ]));
                    
                    // バリデーション
                    validateRequired($data['name'] ?? '', '名前');
                    validateRequired($data['email'] ?? '', 'メールアドレス');
                    validateRequired($data['password'] ?? '', 'パスワード');
                    validateRequired($data['employeeId'] ?? '', '社員ID');
                    validateRequired($data['department'] ?? '', '部署');
                    
                    if (!validateEmail($data['email'])) {
                        error_log("新規登録失敗 - 無効なメールアドレス: " . ($data['email'] ?? ''));
                        sendResponse([
                            'success' => false,
                            'message' => '有効なメールアドレスを入力してください'
                        ], 400);
                    }
                    
                    if (!validatePassword($data['password'])) {
                        error_log("新規登録失敗 - パスワード長不足: " . ($data['email'] ?? ''));
                        sendResponse([
                            'success' => false,
                            'message' => 'パスワードは6文字以上で入力してください'
                        ], 400);
                    }
                    
                    $result = $auth->register($data);
                    
                    if ($result['success']) {
                        error_log("新規登録成功: " . json_encode([
                            'email' => $data['email'],
                            'name' => $data['name'],
                            'employee_id' => $data['employeeId'],
                            'timestamp' => date('Y-m-d H:i:s')
                        ]));
                    } else {
                        error_log("新規登録失敗: " . json_encode([
                            'email' => $data['email'],
                            'message' => $result['message'] ?? '',
                            'timestamp' => date('Y-m-d H:i:s')
                        ]));
                    }
                    
                    sendResponse($result, $result['success'] ? 201 : 400);
                    break;
                    
                case 'logout':
                    // ログアウト処理（トークンの無効化は実装しない）
                    sendResponse([
                        'success' => true,
                        'message' => 'ログアウトしました'
                    ]);
                    break;
                    
                default:
                    sendResponse([
                        'success' => false,
                        'message' => '無効なアクションです'
                    ], 400);
            }
            break;
            
        case 'GET':
            $action = $_GET['action'] ?? '';
            
            switch ($action) {
                case 'me':
                    $user = $auth->authenticate();
                    sendResponse([
                        'success' => true,
                        'data' => ['user' => $user]
                    ]);
                    break;
                    
                default:
                    sendResponse([
                        'success' => false,
                        'message' => '無効なアクションです'
                    ], 400);
            }
            break;
            
        default:
            sendResponse([
                'success' => false,
                'message' => 'サポートされていないHTTPメソッドです'
            ], 405);
    }
    
} catch (Exception $e) {
    error_log("認証APIエラー: " . json_encode([
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString(),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'timestamp' => date('Y-m-d H:i:s')
    ]));
    
    sendResponse([
        'success' => false,
        'message' => 'サーバーエラーが発生しました。管理者にお問い合わせください。',
        'error_code' => 'AUTH_ERROR_500',
        'timestamp' => date('Y-m-d H:i:s')
    ], 500);
}
?>
