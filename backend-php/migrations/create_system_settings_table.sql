-- システム設定テーブル
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key),
    INDEX idx_is_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- デフォルト設定の挿入
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('school_name', 'サンプル学校', 'string', '学校名', TRUE),
('attendance_threshold', '80', 'number', '出欠率の閾値（%）', FALSE),
('late_threshold_minutes', '15', 'number', '遅刻とみなす時間（分）', FALSE),
('auto_attendance_reminder', 'true', 'boolean', '出欠記録の自動リマインダー', FALSE),
('notification_enabled', 'true', 'boolean', '通知機能の有効/無効', FALSE);
