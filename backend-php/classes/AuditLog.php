<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

/**
 * 監査ログ管理クラス
 */
class AuditLog {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * 監査ログの記録
     */
    public function log($userId, $action, $tableName, $recordId = null, $oldValues = null, $newValues = null) {
        try {
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
            
            $sql = "INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $userId,
                $action,
                $tableName,
                $recordId,
                $oldValues ? json_encode($oldValues) : null,
                $newValues ? json_encode($newValues) : null,
                $ipAddress,
                $userAgent
            ]);
            
            return [
                'success' => true,
                'message' => '監査ログが記録されました'
            ];
        } catch (Exception $e) {
            error_log("監査ログ記録エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '監査ログの記録に失敗しました'
            ];
        }
    }
    
    /**
     * 監査ログの取得
     */
    public function getAuditLogs($userId = null, $tableName = null, $action = null, $startDate = null, $endDate = null, $limit = 100, $offset = 0) {
        try {
            $sql = "SELECT al.*, u.name as user_name 
                    FROM audit_logs al 
                    LEFT JOIN users u ON al.user_id = u.id";
            $params = [];
            $conditions = [];
            
            if ($userId) {
                $conditions[] = "al.user_id = ?";
                $params[] = $userId;
            }
            
            if ($tableName) {
                $conditions[] = "al.table_name = ?";
                $params[] = $tableName;
            }
            
            if ($action) {
                $conditions[] = "al.action = ?";
                $params[] = $action;
            }
            
            if ($startDate) {
                $conditions[] = "DATE(al.created_at) >= ?";
                $params[] = $startDate;
            }
            
            if ($endDate) {
                $conditions[] = "DATE(al.created_at) <= ?";
                $params[] = $endDate;
            }
            
            if (!empty($conditions)) {
                $sql .= " WHERE " . implode(" AND ", $conditions);
            }
            
            $sql .= " ORDER BY al.created_at DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $logs = $stmt->fetchAll();
            
            // JSONデータをデコード
            foreach ($logs as &$log) {
                if ($log['old_values']) {
                    $log['old_values'] = json_decode($log['old_values'], true);
                }
                if ($log['new_values']) {
                    $log['new_values'] = json_decode($log['new_values'], true);
                }
            }
            
            return [
                'success' => true,
                'data' => ['logs' => $logs]
            ];
        } catch (Exception $e) {
            error_log("監査ログ取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '監査ログの取得に失敗しました'
            ];
        }
    }
    
    /**
     * 特定のレコードの監査ログを取得
     */
    public function getRecordAuditLog($tableName, $recordId) {
        try {
            $sql = "SELECT al.*, u.name as user_name 
                    FROM audit_logs al 
                    LEFT JOIN users u ON al.user_id = u.id 
                    WHERE al.table_name = ? AND al.record_id = ? 
                    ORDER BY al.created_at ASC";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$tableName, $recordId]);
            $logs = $stmt->fetchAll();
            
            // JSONデータをデコード
            foreach ($logs as &$log) {
                if ($log['old_values']) {
                    $log['old_values'] = json_decode($log['old_values'], true);
                }
                if ($log['new_values']) {
                    $log['new_values'] = json_decode($log['new_values'], true);
                }
            }
            
            return [
                'success' => true,
                'data' => ['logs' => $logs]
            ];
        } catch (Exception $e) {
            error_log("レコード監査ログ取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '監査ログの取得に失敗しました'
            ];
        }
    }
    
    /**
     * 監査ログの統計情報を取得
     */
    public function getAuditStats($startDate = null, $endDate = null) {
        try {
            $sql = "SELECT 
                        COUNT(*) as total_logs,
                        COUNT(DISTINCT user_id) as unique_users,
                        COUNT(DISTINCT table_name) as unique_tables
                    FROM audit_logs";
            $params = [];
            $conditions = [];
            
            if ($startDate) {
                $conditions[] = "DATE(created_at) >= ?";
                $params[] = $startDate;
            }
            
            if ($endDate) {
                $conditions[] = "DATE(created_at) <= ?";
                $params[] = $endDate;
            }
            
            if (!empty($conditions)) {
                $sql .= " WHERE " . implode(" AND ", $conditions);
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $stats = $stmt->fetch();
            
            // アクション別の統計
            $sql = "SELECT action, COUNT(*) as count FROM audit_logs";
            if (!empty($conditions)) {
                $sql .= " WHERE " . implode(" AND ", $conditions);
            }
            $sql .= " GROUP BY action ORDER BY count DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $actionStats = $stmt->fetchAll();
            
            return [
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'action_stats' => $actionStats
                ]
            ];
        } catch (Exception $e) {
            error_log("監査ログ統計取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '監査ログ統計の取得に失敗しました'
            ];
        }
    }
    
    /**
     * 古い監査ログの削除
     */
    public function cleanupOldLogs($daysToKeep = 365) {
        try {
            $sql = "DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$daysToKeep]);
            
            $deletedCount = $stmt->rowCount();
            
            return [
                'success' => true,
                'message' => "{$deletedCount}件の古い監査ログを削除しました"
            ];
        } catch (Exception $e) {
            error_log("監査ログクリーンアップエラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '監査ログのクリーンアップに失敗しました'
            ];
        }
    }
}
?>
