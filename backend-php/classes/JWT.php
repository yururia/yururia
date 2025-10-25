<?php
/**
 * JWT（JSON Web Token）処理クラス
 */
class JWT {
    private static $secret;
    
    public static function init() {
        self::$secret = JWT_SECRET;
    }
    
    /**
     * JWTトークンを生成
     */
    public static function encode($payload) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['iat'] = time();
        $payload['exp'] = time() + JWT_EXPIRES_IN;
        $payload = json_encode($payload);
        
        $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        
        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, self::$secret, true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $base64Header . "." . $base64Payload . "." . $base64Signature;
    }
    
    /**
     * JWTトークンを検証・デコード
     */
    public static function decode($token) {
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            throw new Exception('無効なトークン形式');
        }
        
        list($base64Header, $base64Payload, $base64Signature) = $parts;
        
        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, self::$secret, true);
        $expectedSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        if (!hash_equals($expectedSignature, $base64Signature)) {
            throw new Exception('無効なトークン署名');
        }
        
        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $base64Payload)), true);
        
        if ($payload['exp'] < time()) {
            throw new Exception('トークンの有効期限が切れています');
        }
        
        return $payload;
    }
    
    /**
     * リクエストヘッダーからトークンを取得
     */
    public static function getTokenFromHeader() {
        $headers = getallheaders();
        
        if (isset($headers['Authorization'])) {
            $auth = $headers['Authorization'];
            if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
                return $matches[1];
            }
        }
        
        return null;
    }
}

// JWTクラスを初期化
JWT::init();
?>
