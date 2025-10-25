<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

/**
 * 出欠管理クラス
 */
class Attendance {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * 出欠記録の作成・更新（既存のユーザー管理システム）
     */
    public function recordAttendance($userId, $date, $type, $timestamp = null, $reason = null) {
        try {
            // 既存の記録を確認
            $sql = "SELECT * FROM user_attendance_records WHERE user_id = ? AND date = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$userId, $date]);
            $existingRecord = $stmt->fetch();
            
            $status = $type === 'checkin' ? 'present' : $type;
            
            if ($existingRecord) {
                // 既存の記録を更新
                $updateFields = ['status = ?', 'updated_at = NOW()'];
                $updateParams = [$status];
                
                if ($type === 'checkin' && $timestamp) {
                    $updateFields[] = 'check_in_time = ?';
                    $updateParams[] = $timestamp;
                } elseif ($type === 'checkout' && $timestamp) {
                    $updateFields[] = 'check_out_time = ?';
                    $updateParams[] = $timestamp;
                }
                
                if ($reason) {
                    $updateFields[] = 'reason = ?';
                    $updateParams[] = $reason;
                }
                
                $updateParams[] = $existingRecord['id'];
                
                $sql = "UPDATE user_attendance_records SET " . implode(', ', $updateFields) . " WHERE id = ?";
                $stmt = $this->db->prepare($sql);
                $stmt->execute($updateParams);
                
                return [
                    'success' => true,
                    'message' => '出欠記録が更新されました',
                    'data' => ['id' => $existingRecord['id']]
                ];
            } else {
                // 新しい記録を作成
                $insertFields = ['user_id', 'date', 'status'];
                $insertValues = ['?', '?', '?'];
                $insertParams = [$userId, $date, $status];
                
                if ($type === 'checkin' && $timestamp) {
                    $insertFields[] = 'check_in_time';
                    $insertValues[] = '?';
                    $insertParams[] = $timestamp;
                } elseif ($type === 'checkout' && $timestamp) {
                    $insertFields[] = 'check_out_time';
                    $insertValues[] = '?';
                    $insertParams[] = $timestamp;
                }
                
                if ($reason) {
                    $insertFields[] = 'reason';
                    $insertValues[] = '?';
                    $insertParams[] = $reason;
                }
                
                $sql = "INSERT INTO user_attendance_records (" . implode(', ', $insertFields) . ") VALUES (" . implode(', ', $insertValues) . ")";
                $stmt = $this->db->prepare($sql);
                $stmt->execute($insertParams);
                
                return [
                    'success' => true,
                    'message' => '出欠記録が作成されました',
                    'data' => ['id' => $this->db->lastInsertId()]
                ];
            }
        } catch (Exception $e) {
            error_log("出欠記録作成エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '出欠記録の保存に失敗しました'
            ];
        }
    }
    
    /**
     * 出欠記録の取得（既存のユーザー管理システム）
     */
    public function getAttendanceRecords($userId, $startDate = null, $endDate = null) {
        try {
            $sql = "SELECT * FROM user_attendance_records WHERE user_id = ?";
            $params = [$userId];
            
            if ($startDate && $endDate) {
                $sql .= " AND date BETWEEN ? AND ?";
                $params[] = $startDate;
                $params[] = $endDate;
            }
            
            $sql .= " ORDER BY date DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $records = $stmt->fetchAll();
            
            return [
                'success' => true,
                'data' => ['records' => $records]
            ];
        } catch (Exception $e) {
            error_log("出欠記録取得エラー: " . $e->getMessage());
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
            
            $sql = "SELECT ar.*, s.name as student_name 
                    FROM attendance_records ar 
                    JOIN students s ON ar.student_id = s.student_id 
                    WHERE DATE(ar.timestamp) BETWEEN ? AND ?";
            $params = [$startDate, $endDate];
            
            if ($studentId) {
                $sql .= " AND ar.student_id = ?";
                $params[] = $studentId;
            }
            
            $sql .= " ORDER BY ar.timestamp";
            
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
            error_log("月次レポート取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '月次レポートの取得に失敗しました'
            ];
        }
    }
    
    /**
     * 出欠記録の更新（タイムスタンプのみ）
     */
    public function updateAttendance($recordId, $timestamp) {
        try {
            // 記録の存在確認
            $sql = "SELECT * FROM attendance_records WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$recordId]);
            $record = $stmt->fetch();
            
            if (!$record) {
                return [
                    'success' => false,
                    'message' => '出欠記録が見つかりません'
                ];
            }
            
            // タイムスタンプを更新
            $sql = "UPDATE attendance_records SET timestamp = ? WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$timestamp, $recordId]);
            
            return [
                'success' => true,
                'message' => '出欠記録が更新されました'
            ];
        } catch (Exception $e) {
            error_log("出欠記録更新エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '出欠記録の更新に失敗しました'
            ];
        }
    }
    
    /**
     * 出欠記録の削除
     */
    public function deleteAttendance($recordId, $userId) {
        try {
            // 記録の存在確認と権限チェック
            $sql = "SELECT * FROM attendance_records WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$recordId]);
            $record = $stmt->fetch();
            
            if (!$record) {
                return [
                    'success' => false,
                    'message' => '出欠記録が見つかりません'
                ];
            }
            
            if ($record['user_id'] !== $userId) {
                return [
                    'success' => false,
                    'message' => 'この記録を削除する権限がありません'
                ];
            }
            
            $sql = "DELETE FROM attendance_records WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$recordId]);
            
            return [
                'success' => true,
                'message' => '出欠記録が削除されました'
            ];
        } catch (Exception $e) {
            error_log("出欠記録削除エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '出欠記録の削除に失敗しました'
            ];
        }
    }
    
    /**
     * 統計情報の取得
     */
    public function getAttendanceStats($userId, $period = 'month') {
        try {
            $dateCondition = '';
            $params = [$userId];
            
            if ($period === 'month') {
                $now = new DateTime();
                $startOfMonth = $now->format('Y-m-01');
                $endOfMonth = $now->format('Y-m-t');
                $dateCondition = 'AND date BETWEEN ? AND ?';
                $params[] = $startOfMonth;
                $params[] = $endOfMonth;
            }
            
            $sql = "SELECT 
                        COUNT(*) as total_days,
                        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
                        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
                        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
                        SUM(CASE WHEN status = 'early_departure' THEN 1 ELSE 0 END) as early_departure_days
                    FROM attendance_records 
                    WHERE user_id = ? {$dateCondition}";
            
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
            error_log("統計情報取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '統計情報の取得に失敗しました'
            ];
        }
    }
}
?>
