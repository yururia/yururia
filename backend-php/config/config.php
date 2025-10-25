<?php
/**
 * アプリケーション設定
 */

// エラーレポート設定
error_reporting(E_ALL);
ini_set('display_errors', 0); // 本番環境ではエラー表示を無効にする
ini_set('log_errors', 1); // エラーログは有効にする

// タイムゾーン設定
date_default_timezone_set('Asia/Tokyo');

// CORS設定
header('Access-Control-Allow-Origin: http://192.168.12.200:3000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// OPTIONSリクエストの処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// レスポンスヘッダー設定
header('Content-Type: application/json; charset=utf-8');

// JWT設定
define('JWT_SECRET', 'i24103_attendance_system_jwt_secret_key_2024_secure_production');
define('JWT_EXPIRES_IN', 86400); // 24時間

// レート制限設定
define('RATE_LIMIT_WINDOW', 900); // 15分
define('RATE_LIMIT_MAX_REQUESTS', 100);
define('AUTH_RATE_LIMIT_MAX_REQUESTS', 5);

// データベース設定
define('DB_HOST', 'localhost');
define('DB_NAME', 'sotsuken');
define('DB_USER', 'server');
define('DB_PASS', 'pass');

// アプリケーション設定
define('APP_NAME', '出欠管理システム');
define('APP_VERSION', '1.0.0');
define('APP_ENV', 'production');
?>
