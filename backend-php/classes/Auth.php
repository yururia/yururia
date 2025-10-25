<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/JWT.php';

/**
 * 認証処理クラス
 */
class Auth {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * ユーザーログイン
     */
    public function login($email, $password) {
        try {
            error_log("Auth::login 開始: " . json_encode(['email' => $email, 'timestamp' => date('Y-m-d H:i:s')]));
            
            $sql = "SELECT * FROM users WHERE email = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            
            if (!$user) {
                error_log("Auth::login 失敗 - ユーザーが見つかりません: " . $email);
                return [
                    'success' => false,
                    'message' => 'メールアドレスまたはパスワードが正しくありません'
                ];
            }
            
            if (!password_verify($password, $user['password'])) {
                error_log("Auth::login 失敗 - パスワードが一致しません: " . $email);
                return [
                    'success' => false,
                    'message' => 'メールアドレスまたはパスワードが正しくありません'
                ];
            }
            
            $token = JWT::encode([
                'id' => $user['id'],
                'email' => $user['email']
            ]);
            
            error_log("Auth::login 成功: " . json_encode([
                'user_id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'timestamp' => date('Y-m-d H:i:s')
            ]));
            
            return [
                'success' => true,
                'message' => 'ログインに成功しました',
                'data' => [
                    'token' => $token,
                    'user' => [
                        'id' => $user['id'],
                        'name' => $user['name'],
                        'email' => $user['email'],
                        'employeeId' => $user['employee_id'],
                        'department' => $user['department'],
                        'role' => $user['role']
                    ]
                ]
            ];
        } catch (Exception $e) {
            error_log("ログインエラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'サーバーエラーが発生しました'
            ];
        }
    }
    
    /**
     * ユーザー新規登録
     */
    public function register($userData) {
        try {
            // メールアドレスの重複チェック
            $sql = "SELECT id FROM users WHERE email = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$userData['email']]);
            if ($stmt->fetch()) {
                return [
                    'success' => false,
                    'message' => 'このメールアドレスは既に使用されています'
                ];
            }
            
            // 社員IDの重複チェック
            $sql = "SELECT id FROM users WHERE employee_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$userData['employeeId']]);
            if ($stmt->fetch()) {
                return [
                    'success' => false,
                    'message' => 'この社員IDは既に使用されています'
                ];
            }
            
            // パスワードのハッシュ化
            $hashedPassword = password_hash($userData['password'], PASSWORD_DEFAULT);
            
            // ユーザーの作成
            $sql = "INSERT INTO users (name, email, password, employee_id, department) VALUES (?, ?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $userData['name'],
                $userData['email'],
                $hashedPassword,
                $userData['employeeId'],
                $userData['department']
            ]);
            
            $userId = $this->db->lastInsertId();
            
            $token = JWT::encode([
                'id' => $userId,
                'email' => $userData['email']
            ]);
            
            return [
                'success' => true,
                'message' => 'アカウントが作成されました',
                'data' => [
                    'token' => $token,
                    'user' => [
                        'id' => $userId,
                        'name' => $userData['name'],
                        'email' => $userData['email'],
                        'employeeId' => $userData['employeeId'],
                        'department' => $userData['department'],
                        'role' => 'employee'
                    ]
                ]
            ];
        } catch (Exception $e) {
            error_log("新規登録エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'サーバーエラーが発生しました'
            ];
        }
    }
    
    /**
     * トークンからユーザー情報を取得
     */
    public function getUserFromToken($token) {
        try {
            $payload = JWT::decode($token);
            
            $sql = "SELECT id, name, email, employee_id, department, role FROM users WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$payload['id']]);
            $user = $stmt->fetch();
            
            if (!$user) {
                return null;
            }
            
            return [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'employeeId' => $user['employee_id'],
                'department' => $user['department'],
                'role' => $user['role']
            ];
        } catch (Exception $e) {
            error_log("トークン検証エラー: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * 認証が必要なリクエストの検証
     */
    public function authenticate() {
        $token = JWT::getTokenFromHeader();
        
        if (!$token) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'アクセストークンが必要です'
            ]);
            exit;
        }
        
        $user = $this->getUserFromToken($token);
        
        if (!$user) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => '無効なトークンです'
            ]);
            exit;
        }
        
        return $user;
    }
}
?>
