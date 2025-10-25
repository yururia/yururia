<?php
/**
 * データベース初期化スクリプト
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';

try {
    echo "データベースを初期化しています...\n";
    
    $database = new Database();
    
    // データベーステーブルの初期化
    if ($database->initializeTables()) {
        echo "✓ データベーステーブルが初期化されました\n";
    } else {
        echo "✗ データベーステーブルの初期化に失敗しました\n";
        exit(1);
    }
    
    // サンプルデータの挿入
    if ($database->insertSampleData()) {
        echo "✓ サンプルデータが挿入されました\n";
    } else {
        echo "✗ サンプルデータの挿入に失敗しました\n";
    }
    
    echo "\nデータベースの初期化が完了しました！\n";
    echo "サンプルユーザー:\n";
    echo "- 管理者: admin@example.com / password123\n";
    echo "- 一般ユーザー: tanaka@example.com / password123\n";
    
} catch (Exception $e) {
    echo "エラー: " . $e->getMessage() . "\n";
    exit(1);
}
?>
