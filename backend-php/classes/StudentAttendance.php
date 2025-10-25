<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

/**
 * 学生出欠管理クラス（シンプル版）
 */
class StudentAttendance {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * 学生出欠記録の作成
     */
    public function recordAttendance($studentId, $timestamp = null) {
        try {
            // タイムスタンプが指定されていない場合は現在時刻を使用
            if (!$timestamp) {
                $timestamp = date('Y-m-d H:i:s');
            }
            
            // 学生の存在確認
            $sql = "SELECT student_id FROM students WHERE student_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$studentId]);
            if (!$stmt->fetch()) {
                return [
                    'success' => false,
                    'message' => '学生が見つかりません'
                ];
            }
            
            // 出欠記録を作成
            $sql = "INSERT INTO student_attendance_records (student_id, timestamp) VALUES (?, ?)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$studentId, $timestamp]);
            
            return [
                'success' => true,
                'message' => '出欠記録が作成されました',
                'data' => ['id' => $this->db->lastInsertId()]
            ];
        } catch (Exception $e) {
            error_log("学生出欠記録作成エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '出欠記録の保存に失敗しました'
            ];
        }
    }
    
    /**
     * 学生出欠記録の取得
     */
    public function getAttendanceRecords($studentId = null, $startDate = null, $endDate = null) {
        try {
            $sql = "SELECT sar.*, s.name as student_name 
                    FROM student_attendance_records sar 
                    JOIN students s ON sar.student_id = s.student_id";
            $params = [];
            
            if ($studentId) {
                $sql .= " WHERE sar.student_id = ?";
                $params[] = $studentId;
            }
            
            if ($startDate && $endDate) {
                $sql .= $studentId ? " AND" : " WHERE";
                $sql .= " DATE(sar.timestamp) BETWEEN ? AND ?";
                $params[] = $startDate;
                $params[] = $endDate;
            }
            
            $sql .= " ORDER BY sar.timestamp DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $records = $stmt->fetchAll();
            
            return [
                'success' => true,
                'data' => ['records' => $records]
            ];
        } catch (Exception $e) {
            error_log("学生出欠記録取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '出欠記録の取得に失敗しました'
            ];
        }
    }
    
    /**
     * 月次レポートの取得
     */
    public function getMonthlyReport($studentId = null, $year, $month) {
        try {
            $startDate = sprintf('%04d-%02d-01', $year, $month);
            $endDate = date('Y-m-t', strtotime($startDate));
            
            $sql = "SELECT sar.*, s.name as student_name 
                    FROM student_attendance_records sar 
                    JOIN students s ON sar.student_id = s.student_id 
                    WHERE DATE(sar.timestamp) BETWEEN ? AND ?";
            $params = [$startDate, $endDate];
            
            if ($studentId) {
                $sql .= " AND sar.student_id = ?";
                $params[] = $studentId;
            }
            
            $sql .= " ORDER BY sar.timestamp";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $records = $stmt->fetchAll();
            
            // 統計情報の計算
            $stats = [
                'totalRecords' => count($records),
                'uniqueStudents' => count(array_unique(array_column($records, 'student_id')))
            ];
            
            // 学生別の出欠回数
            $studentStats = [];
            foreach ($records as $record) {
                $studentId = $record['student_id'];
                if (!isset($studentStats[$studentId])) {
                    $studentStats[$studentId] = [
                        'student_id' => $studentId,
                        'student_name' => $record['student_name'],
                        'count' => 0
                    ];
                }
                $studentStats[$studentId]['count']++;
            }
            
            return [
                'success' => true,
                'data' => [
                    'records' => $records,
                    'stats' => $stats,
                    'studentStats' => array_values($studentStats),
                    'period' => ['year' => $year, 'month' => $month]
                ]
            ];
        } catch (Exception $e) {
            error_log("学生月次レポート取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '月次レポートの取得に失敗しました'
            ];
        }
    }
    
    /**
     * 出欠記録の削除
     */
    public function deleteAttendance($recordId) {
        try {
            // 記録の存在確認
            $sql = "SELECT * FROM student_attendance_records WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$recordId]);
            $record = $stmt->fetch();
            
            if (!$record) {
                return [
                    'success' => false,
                    'message' => '出欠記録が見つかりません'
                ];
            }
            
            $sql = "DELETE FROM student_attendance_records WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$recordId]);
            
            return [
                'success' => true,
                'message' => '出欠記録が削除されました'
            ];
        } catch (Exception $e) {
            error_log("学生出欠記録削除エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '出欠記録の削除に失敗しました'
            ];
        }
    }
    
    /**
     * 統計情報の取得
     */
    public function getAttendanceStats($studentId = null, $period = 'month') {
        try {
            $sql = "SELECT 
                        COUNT(*) as total_records,
                        COUNT(DISTINCT student_id) as unique_students
                    FROM student_attendance_records";
            $params = [];
            
            if ($studentId) {
                $sql .= " WHERE student_id = ?";
                $params[] = $studentId;
            }
            
            if ($period === 'month') {
                $now = new DateTime();
                $startOfMonth = $now->format('Y-m-01');
                $endOfMonth = $now->format('Y-m-t');
                $sql .= $studentId ? " AND" : " WHERE";
                $sql .= " DATE(timestamp) BETWEEN ? AND ?";
                $params[] = $startOfMonth;
                $params[] = $endOfMonth;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $stats = $stmt->fetch();
            
            return [
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'period' => $period
                ]
            ];
        } catch (Exception $e) {
            error_log("学生統計情報取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '統計情報の取得に失敗しました'
            ];
        }
    }
}
?>

