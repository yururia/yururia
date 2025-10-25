<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

/**
 * 授業管理クラス
 */
class ClassManagement {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * 授業の作成
     */
    public function createClass($classData) {
        try {
            // 授業コードの重複チェック
            $sql = "SELECT id FROM classes WHERE class_code = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$classData['class_code']]);
            if ($stmt->fetch()) {
                return [
                    'success' => false,
                    'message' => 'この授業コードは既に使用されています'
                ];
            }
            
            // 科目の存在確認
            $sql = "SELECT id FROM subjects WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$classData['subject_id']]);
            if (!$stmt->fetch()) {
                return [
                    'success' => false,
                    'message' => '指定された科目が見つかりません'
                ];
            }
            
            // 授業の作成
            $sql = "INSERT INTO classes (class_code, subject_id, teacher_name, room, schedule_day, start_time, end_time, semester, academic_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $classData['class_code'],
                $classData['subject_id'],
                $classData['teacher_name'],
                $classData['room'] ?? null,
                $classData['schedule_day'],
                $classData['start_time'],
                $classData['end_time'],
                $classData['semester'] ?? null,
                $classData['academic_year'] ?? null
            ]);
            
            return [
                'success' => true,
                'message' => '授業が作成されました',
                'data' => ['id' => $this->db->lastInsertId()]
            ];
        } catch (Exception $e) {
            error_log("授業作成エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '授業の作成に失敗しました'
            ];
        }
    }
    
    /**
     * 授業一覧の取得
     */
    public function getClasses($search = null, $subjectId = null, $isActive = null) {
        try {
            $sql = "SELECT c.*, s.subject_name, s.subject_code 
                    FROM classes c 
                    JOIN subjects s ON c.subject_id = s.id";
            $params = [];
            $conditions = [];
            
            if ($search) {
                $conditions[] = "(c.class_code LIKE ? OR c.teacher_name LIKE ? OR s.subject_name LIKE ?)";
                $searchTerm = "%{$search}%";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
            
            if ($subjectId) {
                $conditions[] = "c.subject_id = ?";
                $params[] = $subjectId;
            }
            
            if ($isActive !== null) {
                $conditions[] = "c.is_active = ?";
                $params[] = $isActive;
            }
            
            if (!empty($conditions)) {
                $sql .= " WHERE " . implode(" AND ", $conditions);
            }
            
            $sql .= " ORDER BY c.schedule_day, c.start_time";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $classes = $stmt->fetchAll();
            
            return [
                'success' => true,
                'data' => ['classes' => $classes]
            ];
        } catch (Exception $e) {
            error_log("授業一覧取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '授業一覧の取得に失敗しました'
            ];
        }
    }
    
    /**
     * 特定授業の取得
     */
    public function getClass($classId) {
        try {
            $sql = "SELECT c.*, s.subject_name, s.subject_code 
                    FROM classes c 
                    JOIN subjects s ON c.subject_id = s.id 
                    WHERE c.id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$classId]);
            $class = $stmt->fetch();
            
            if (!$class) {
                return [
                    'success' => false,
                    'message' => '授業が見つかりません'
                ];
            }
            
            return [
                'success' => true,
                'data' => ['class' => $class]
            ];
        } catch (Exception $e) {
            error_log("授業取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '授業情報の取得に失敗しました'
            ];
        }
    }
    
    /**
     * 授業情報の更新
     */
    public function updateClass($classId, $updateData) {
        try {
            // 授業の存在確認
            $sql = "SELECT * FROM classes WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$classId]);
            $existingClass = $stmt->fetch();
            
            if (!$existingClass) {
                return [
                    'success' => false,
                    'message' => '授業が見つかりません'
                ];
            }
            
            // 授業コードの重複チェック（変更する場合）
            if (isset($updateData['class_code']) && $updateData['class_code'] !== $existingClass['class_code']) {
                $sql = "SELECT id FROM classes WHERE class_code = ? AND id != ?";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$updateData['class_code'], $classId]);
                if ($stmt->fetch()) {
                    return [
                        'success' => false,
                        'message' => 'この授業コードは既に使用されています'
                    ];
                }
            }
            
            // 科目の存在確認（変更する場合）
            if (isset($updateData['subject_id'])) {
                $sql = "SELECT id FROM subjects WHERE id = ?";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$updateData['subject_id']]);
                if (!$stmt->fetch()) {
                    return [
                        'success' => false,
                        'message' => '指定された科目が見つかりません'
                    ];
                }
            }
            
            // 更新処理
            $updateFields = [];
            $updateParams = [];
            
            if (isset($updateData['class_code'])) {
                $updateFields[] = 'class_code = ?';
                $updateParams[] = $updateData['class_code'];
            }
            if (isset($updateData['subject_id'])) {
                $updateFields[] = 'subject_id = ?';
                $updateParams[] = $updateData['subject_id'];
            }
            if (isset($updateData['teacher_name'])) {
                $updateFields[] = 'teacher_name = ?';
                $updateParams[] = $updateData['teacher_name'];
            }
            if (isset($updateData['room'])) {
                $updateFields[] = 'room = ?';
                $updateParams[] = $updateData['room'];
            }
            if (isset($updateData['schedule_day'])) {
                $updateFields[] = 'schedule_day = ?';
                $updateParams[] = $updateData['schedule_day'];
            }
            if (isset($updateData['start_time'])) {
                $updateFields[] = 'start_time = ?';
                $updateParams[] = $updateData['start_time'];
            }
            if (isset($updateData['end_time'])) {
                $updateFields[] = 'end_time = ?';
                $updateParams[] = $updateData['end_time'];
            }
            if (isset($updateData['semester'])) {
                $updateFields[] = 'semester = ?';
                $updateParams[] = $updateData['semester'];
            }
            if (isset($updateData['academic_year'])) {
                $updateFields[] = 'academic_year = ?';
                $updateParams[] = $updateData['academic_year'];
            }
            if (isset($updateData['is_active'])) {
                $updateFields[] = 'is_active = ?';
                $updateParams[] = $updateData['is_active'];
            }
            
            if (empty($updateFields)) {
                return [
                    'success' => false,
                    'message' => '更新するデータがありません'
                ];
            }
            
            $updateFields[] = 'updated_at = NOW()';
            $updateParams[] = $classId;
            
            $sql = "UPDATE classes SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($updateParams);
            
            return [
                'success' => true,
                'message' => '授業情報が更新されました'
            ];
        } catch (Exception $e) {
            error_log("授業更新エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '授業情報の更新に失敗しました'
            ];
        }
    }
    
    /**
     * 授業の削除
     */
    public function deleteClass($classId) {
        try {
            // 授業の存在確認
            $sql = "SELECT * FROM classes WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$classId]);
            $class = $stmt->fetch();
            
            if (!$class) {
                return [
                    'success' => false,
                    'message' => '授業が見つかりません'
                ];
            }
            
            // 関連する登録があるかチェック
            $sql = "SELECT COUNT(*) as count FROM enrollments WHERE class_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$classId]);
            $result = $stmt->fetch();
            
            if ($result['count'] > 0) {
                return [
                    'success' => false,
                    'message' => 'この授業に登録されている学生が存在するため削除できません'
                ];
            }
            
            // 授業の削除
            $sql = "DELETE FROM classes WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$classId]);
            
            return [
                'success' => true,
                'message' => '授業が削除されました'
            ];
        } catch (Exception $e) {
            error_log("授業削除エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '授業の削除に失敗しました'
            ];
        }
    }
}
?>
