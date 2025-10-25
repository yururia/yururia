<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

/**
 * 通知管理クラス
 */
class Notification {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * 通知の作成
     */
    public function createNotification($notificationData) {
        try {
            $sql = "INSERT INTO notifications (user_id, student_id, title, message, type, priority) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $notificationData['user_id'] ?? null,
                $notificationData['student_id'] ?? null,
                $notificationData['title'],
                $notificationData['message'],
                $notificationData['type'],
                $notificationData['priority'] ?? 'medium'
            ]);
            
            return [
                'success' => true,
                'message' => '通知が作成されました',
                'data' => ['id' => $this->db->lastInsertId()]
            ];
        } catch (Exception $e) {
            error_log("通知作成エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '通知の作成に失敗しました'
            ];
        }
    }
    
    /**
     * ユーザーの通知一覧取得
     */
    public function getUserNotifications($userId, $isRead = null, $type = null) {
        try {
            $sql = "SELECT * FROM notifications WHERE user_id = ?";
            $params = [$userId];
            
            if ($isRead !== null) {
                $sql .= " AND is_read = ?";
                $params[] = $isRead;
            }
            
            if ($type) {
                $sql .= " AND type = ?";
                $params[] = $type;
            }
            
            $sql .= " ORDER BY created_at DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $notifications = $stmt->fetchAll();
            
            return [
                'success' => true,
                'data' => ['notifications' => $notifications]
            ];
        } catch (Exception $e) {
            error_log("通知一覧取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '通知一覧の取得に失敗しました'
            ];
        }
    }
    
    /**
     * 学生の通知一覧取得
     */
    public function getStudentNotifications($studentId, $isRead = null, $type = null) {
        try {
            $sql = "SELECT * FROM notifications WHERE student_id = ?";
            $params = [$studentId];
            
            if ($isRead !== null) {
                $sql .= " AND is_read = ?";
                $params[] = $isRead;
            }
            
            if ($type) {
                $sql .= " AND type = ?";
                $params[] = $type;
            }
            
            $sql .= " ORDER BY created_at DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $notifications = $stmt->fetchAll();
            
            return [
                'success' => true,
                'data' => ['notifications' => $notifications]
            ];
        } catch (Exception $e) {
            error_log("学生通知一覧取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '通知一覧の取得に失敗しました'
            ];
        }
    }
    
    /**
     * 通知を既読にする
     */
    public function markAsRead($notificationId, $userId = null) {
        try {
            $sql = "UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ?";
            $params = [$notificationId];
            
            if ($userId) {
                $sql .= " AND user_id = ?";
                $params[] = $userId;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            
            if ($stmt->rowCount() === 0) {
                return [
                    'success' => false,
                    'message' => '通知が見つからないか、権限がありません'
                ];
            }
            
            return [
                'success' => true,
                'message' => '通知を既読にしました'
            ];
        } catch (Exception $e) {
            error_log("通知既読エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '通知の既読処理に失敗しました'
            ];
        }
    }
    
    /**
     * 通知の削除
     */
    public function deleteNotification($notificationId, $userId = null) {
        try {
            $sql = "DELETE FROM notifications WHERE id = ?";
            $params = [$notificationId];
            
            if ($userId) {
                $sql .= " AND user_id = ?";
                $params[] = $userId;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            
            if ($stmt->rowCount() === 0) {
                return [
                    'success' => false,
                    'message' => '通知が見つからないか、権限がありません'
                ];
            }
            
            return [
                'success' => true,
                'message' => '通知が削除されました'
            ];
        } catch (Exception $e) {
            error_log("通知削除エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '通知の削除に失敗しました'
            ];
        }
    }
    
    /**
     * 未読通知数の取得
     */
    public function getUnreadCount($userId) {
        try {
            $sql = "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$userId]);
            $result = $stmt->fetch();
            
            return [
                'success' => true,
                'data' => ['unread_count' => $result['count']]
            ];
        } catch (Exception $e) {
            error_log("未読通知数取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '未読通知数の取得に失敗しました'
            ];
        }
    }
    
    /**
     * 出欠記録に関する通知の作成
     */
    public function createAttendanceNotification($studentId, $type, $message) {
        try {
            // 学生の登録されている授業の担当者に通知
            $sql = "SELECT DISTINCT c.teacher_name, e.student_id 
                    FROM enrollments e 
                    JOIN classes c ON e.class_id = c.id 
                    WHERE e.student_id = ? AND e.status = 'enrolled'";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$studentId]);
            $classes = $stmt->fetchAll();
            
            foreach ($classes as $class) {
                $this->createNotification([
                    'student_id' => $studentId,
                    'title' => '出欠記録通知',
                    'message' => $message,
                    'type' => $type,
                    'priority' => 'medium'
                ]);
            }
            
            return [
                'success' => true,
                'message' => '出欠記録通知が作成されました'
            ];
        } catch (Exception $e) {
            error_log("出欠記録通知作成エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '出欠記録通知の作成に失敗しました'
            ];
        }
    }
}
?>
