# 出欠管理システム PHPバックエンド

## 概要
出欠管理システムのPHPバックエンドAPIサーバーです。PHPとMySQLを使用して構築されています。

## 必要な環境
- PHP 7.4以上
- MySQL 5.7以上 または MariaDB 10.3以上
- Apache または Nginx
- phpMyAdmin（推奨）

## セットアップ

### 1. データベースの作成
phpMyAdminまたはMySQLコマンドラインで以下のデータベースを作成してください：

```sql
CREATE DATABASE attendance_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 設定ファイルの編集
`config/config.php`でデータベース接続情報を設定してください：

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'attendance_system');
define('DB_USER', 'root');
define('DB_PASS', 'your_password');
```

### 3. データベースの初期化
```bash
php init.php
```

### 4. Webサーバーの設定
ApacheまたはNginxでこのディレクトリを公開してください。

## API エンドポイント

### 認証
- `POST /api/auth.php?action=login` - ログイン
- `POST /api/auth.php?action=register` - 新規登録
- `POST /api/auth.php?action=logout` - ログアウト
- `GET /api/auth.php?action=me` - ユーザー情報取得

### 出欠管理
- `POST /api/attendance.php` - 出欠記録作成・更新
- `GET /api/attendance.php?userId={id}` - 出欠記録取得
- `GET /api/attendance.php?action=report&userId={id}&year={year}&month={month}` - 月次レポート取得
- `PUT /api/attendance.php?id={id}` - 出欠記録更新
- `DELETE /api/attendance.php?id={id}` - 出欠記録削除
- `GET /api/attendance.php?action=stats&userId={id}` - 統計情報取得

### ユーザー管理
- `GET /api/users.php` - ユーザー一覧取得（管理者のみ）
- `GET /api/users.php?userId={id}` - ユーザー情報取得
- `PUT /api/users.php?userId={id}` - ユーザー情報更新
- `DELETE /api/users.php?userId={id}` - ユーザー削除（管理者のみ）

## データベーススキーマ

### users テーブル
- id (INT AUTO_INCREMENT PRIMARY KEY)
- name (VARCHAR(255))
- email (VARCHAR(255) UNIQUE)
- password (VARCHAR(255))
- employee_id (VARCHAR(50) UNIQUE)
- department (VARCHAR(100))
- role (ENUM('employee', 'admin'))
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### attendance_records テーブル
- id (INT AUTO_INCREMENT PRIMARY KEY)
- user_id (INT)
- date (DATE)
- status (ENUM('present', 'absent', 'late', 'early_departure'))
- check_in_time (DATETIME)
- check_out_time (DATETIME)
- reason (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

## セキュリティ機能
- JWT認証
- パスワードハッシュ化（password_hash）
- CORS設定
- 入力値検証
- SQLインジェクション対策（PDOプリペアドステートメント）

## 開発
- エラーログ出力
- デバッグモード対応
- レスポンス統一フォーマット
