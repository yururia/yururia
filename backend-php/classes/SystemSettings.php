<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

/**
 * システム設定管理クラス
 */
class SystemSettings {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * 設定値の取得
     */
    public function getSetting($key, $defaultValue = null) {
        try {
            $sql = "SELECT setting_value, setting_type FROM system_settings WHERE setting_key = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$key]);
            $result = $stmt->fetch();
            
            if (!$result) {
                return $defaultValue;
            }
            
            // 型に応じて値を変換
            switch ($result['setting_type']) {
                case 'number':
                    return is_numeric($result['setting_value']) ? (float)$result['setting_value'] : $defaultValue;
                case 'boolean':
                    return filter_var($result['setting_value'], FILTER_VALIDATE_BOOLEAN);
                case 'json':
                    return json_decode($result['setting_value'], true) ?: $defaultValue;
                default:
                    return $result['setting_value'];
            }
        } catch (Exception $e) {
            error_log("設定取得エラー: " . $e->getMessage());
            return $defaultValue;
        }
    }
    
    /**
     * 設定値の設定
     */
    public function setSetting($key, $value, $type = 'string', $description = null, $isPublic = false) {
        try {
            // 値を型に応じて変換
            switch ($type) {
                case 'number':
                    $value = (string)$value;
                    break;
                case 'boolean':
                    $value = $value ? 'true' : 'false';
                    break;
                case 'json':
                    $value = json_encode($value);
                    break;
                default:
                    $value = (string)$value;
            }
            
            $sql = "INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) 
                    VALUES (?, ?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE 
                    setting_value = VALUES(setting_value), 
                    setting_type = VALUES(setting_type),
                    description = VALUES(description),
                    is_public = VALUES(is_public),
                    updated_at = NOW()";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$key, $value, $type, $description, $isPublic]);
            
            return [
                'success' => true,
                'message' => '設定が保存されました'
            ];
        } catch (Exception $e) {
            error_log("設定保存エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '設定の保存に失敗しました'
            ];
        }
    }
    
    /**
     * 全設定の取得
     */
    public function getAllSettings($publicOnly = false) {
        try {
            $sql = "SELECT setting_key, setting_value, setting_type, description, is_public FROM system_settings";
            $params = [];
            
            if ($publicOnly) {
                $sql .= " WHERE is_public = TRUE";
            }
            
            $sql .= " ORDER BY setting_key";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $settings = $stmt->fetchAll();
            
            // 型に応じて値を変換
            foreach ($settings as &$setting) {
                switch ($setting['setting_type']) {
                    case 'number':
                        $setting['setting_value'] = is_numeric($setting['setting_value']) ? (float)$setting['setting_value'] : 0;
                        break;
                    case 'boolean':
                        $setting['setting_value'] = filter_var($setting['setting_value'], FILTER_VALIDATE_BOOLEAN);
                        break;
                    case 'json':
                        $setting['setting_value'] = json_decode($setting['setting_value'], true) ?: [];
                        break;
                }
            }
            
            return [
                'success' => true,
                'data' => ['settings' => $settings]
            ];
        } catch (Exception $e) {
            error_log("全設定取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '設定の取得に失敗しました'
            ];
        }
    }
    
    /**
     * 設定の削除
     */
    public function deleteSetting($key) {
        try {
            $sql = "DELETE FROM system_settings WHERE setting_key = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$key]);
            
            return [
                'success' => true,
                'message' => '設定が削除されました'
            ];
        } catch (Exception $e) {
            error_log("設定削除エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '設定の削除に失敗しました'
            ];
        }
    }
    
    /**
     * 出欠率の閾値を取得
     */
    public function getAttendanceThreshold() {
        return $this->getSetting('attendance_threshold', 80);
    }
    
    /**
     * 遅刻の閾値を取得（分）
     */
    public function getLateThreshold() {
        return $this->getSetting('late_threshold_minutes', 15);
    }
    
    /**
     * 学校名を取得
     */
    public function getSchoolName() {
        return $this->getSetting('school_name', 'サンプル学校');
    }
    
    /**
     * 通知機能が有効かチェック
     */
    public function isNotificationEnabled() {
        return $this->getSetting('notification_enabled', true);
    }
    
    /**
     * 自動リマインダーが有効かチェック
     */
    public function isAutoReminderEnabled() {
        return $this->getSetting('auto_attendance_reminder', true);
    }
}
?>
