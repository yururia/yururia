<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

/**
 * 学生管理クラス
 */
class Student {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * 学生の作成
     */
    public function createStudent($studentData) {
        try {
            // 学生IDの重複チェック
            $sql = "SELECT student_id FROM students WHERE student_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$studentData['student_id']]);
            if ($stmt->fetch()) {
                return [
                    'success' => false,
                    'message' => 'この学生IDは既に使用されています'
                ];
            }
            
            // カードIDの重複チェック（カードIDが提供されている場合）
            if (!empty($studentData['card_id'])) {
                $sql = "SELECT student_id FROM students WHERE card_id = ?";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$studentData['card_id']]);
                if ($stmt->fetch()) {
                    return [
                        'success' => false,
                        'message' => 'このカードIDは既に使用されています'
                    ];
                }
            }
            
            // 学生の作成
            $sql = "INSERT INTO students (student_id, name, card_id) VALUES (?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $studentData['student_id'],
                $studentData['name'],
                $studentData['card_id'] ?? null
            ]);
            
            return [
                'success' => true,
                'message' => '学生が作成されました',
                'data' => ['student_id' => $studentData['student_id']]
            ];
        } catch (Exception $e) {
            error_log("学生作成エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '学生の作成に失敗しました'
            ];
        }
    }
    
    /**
     * 学生一覧の取得
     */
    public function getStudents($search = null, $limit = null, $offset = 0) {
        try {
            $sql = "SELECT * FROM students";
            $params = [];
            
            if ($search) {
                $sql .= " WHERE name LIKE ? OR student_id LIKE ? OR card_id LIKE ?";
                $searchTerm = "%{$search}%";
                $params = [$searchTerm, $searchTerm, $searchTerm];
            }
            
            $sql .= " ORDER BY student_id";
            
            if ($limit) {
                $sql .= " LIMIT ? OFFSET ?";
                $params[] = $limit;
                $params[] = $offset;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $students = $stmt->fetchAll();
            
            return [
                'success' => true,
                'data' => ['students' => $students]
            ];
        } catch (Exception $e) {
            error_log("学生一覧取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '学生一覧の取得に失敗しました'
            ];
        }
    }
    
    /**
     * 特定学生の取得
     */
    public function getStudent($studentId) {
        try {
            $sql = "SELECT * FROM students WHERE student_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$studentId]);
            $student = $stmt->fetch();
            
            if (!$student) {
                return [
                    'success' => false,
                    'message' => '学生が見つかりません'
                ];
            }
            
            return [
                'success' => true,
                'data' => ['student' => $student]
            ];
        } catch (Exception $e) {
            error_log("学生取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '学生情報の取得に失敗しました'
            ];
        }
    }
    
    /**
     * 学生情報の更新
     */
    public function updateStudent($studentId, $updateData) {
        try {
            // 学生の存在確認
            $sql = "SELECT * FROM students WHERE student_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$studentId]);
            $existingStudent = $stmt->fetch();
            
            if (!$existingStudent) {
                return [
                    'success' => false,
                    'message' => '学生が見つかりません'
                ];
            }
            
            // カードIDの重複チェック（変更する場合）
            if (isset($updateData['card_id']) && $updateData['card_id'] !== $existingStudent['card_id']) {
                if (!empty($updateData['card_id'])) {
                    $sql = "SELECT student_id FROM students WHERE card_id = ? AND student_id != ?";
                    $stmt = $this->db->prepare($sql);
                    $stmt->execute([$updateData['card_id'], $studentId]);
                    if ($stmt->fetch()) {
                        return [
                            'success' => false,
                            'message' => 'このカードIDは既に使用されています'
                        ];
                    }
                }
            }
            
            // 更新処理
            $updateFields = [];
            $updateParams = [];
            
            if (isset($updateData['name'])) {
                $updateFields[] = 'name = ?';
                $updateParams[] = $updateData['name'];
            }
            if (isset($updateData['card_id'])) {
                $updateFields[] = 'card_id = ?';
                $updateParams[] = $updateData['card_id'];
            }
            
            if (empty($updateFields)) {
                return [
                    'success' => false,
                    'message' => '更新するデータがありません'
                ];
            }
            
            $updateParams[] = $studentId;
            
            $sql = "UPDATE students SET " . implode(', ', $updateFields) . " WHERE student_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($updateParams);
            
            return [
                'success' => true,
                'message' => '学生情報が更新されました'
            ];
        } catch (Exception $e) {
            error_log("学生更新エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '学生情報の更新に失敗しました'
            ];
        }
    }
    
    /**
     * 学生の削除
     */
    public function deleteStudent($studentId) {
        try {
            // 学生の存在確認
            $sql = "SELECT * FROM students WHERE student_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$studentId]);
            $student = $stmt->fetch();
            
            if (!$student) {
                return [
                    'success' => false,
                    'message' => '学生が見つかりません'
                ];
            }
            
            // 関連する出欠記録のstudent_idをNULLに設定
            $sql = "UPDATE attendance_records SET student_id = NULL WHERE student_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$studentId]);
            
            // 学生の削除
            $sql = "DELETE FROM students WHERE student_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$studentId]);
            
            return [
                'success' => true,
                'message' => '学生が削除されました'
            ];
        } catch (Exception $e) {
            error_log("学生削除エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '学生の削除に失敗しました'
            ];
        }
    }
    
    /**
     * カードIDで学生を検索
     */
    public function getStudentByCardId($cardId) {
        try {
            $sql = "SELECT * FROM students WHERE card_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$cardId]);
            $student = $stmt->fetch();
            
            if (!$student) {
                return [
                    'success' => false,
                    'message' => 'カードIDに一致する学生が見つかりません'
                ];
            }
            
            return [
                'success' => true,
                'data' => ['student' => $student]
            ];
        } catch (Exception $e) {
            error_log("カードID検索エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '学生の検索に失敗しました'
            ];
        }
    }
}
?>
