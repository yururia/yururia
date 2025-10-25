<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

/**
 * 科目管理クラス
 */
class Subject {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * 科目の作成
     */
    public function createSubject($subjectData) {
        try {
            // 科目コードの重複チェック
            $sql = "SELECT id FROM subjects WHERE subject_code = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$subjectData['subject_code']]);
            if ($stmt->fetch()) {
                return [
                    'success' => false,
                    'message' => 'この科目コードは既に使用されています'
                ];
            }
            
            // 科目の作成
            $sql = "INSERT INTO subjects (subject_code, subject_name, description, credits) VALUES (?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $subjectData['subject_code'],
                $subjectData['subject_name'],
                $subjectData['description'] ?? null,
                $subjectData['credits'] ?? 1
            ]);
            
            return [
                'success' => true,
                'message' => '科目が作成されました',
                'data' => ['id' => $this->db->lastInsertId()]
            ];
        } catch (Exception $e) {
            error_log("科目作成エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '科目の作成に失敗しました'
            ];
        }
    }
    
    /**
     * 科目一覧の取得
     */
    public function getSubjects($search = null, $isActive = null) {
        try {
            $sql = "SELECT * FROM subjects";
            $params = [];
            $conditions = [];
            
            if ($search) {
                $conditions[] = "(subject_name LIKE ? OR subject_code LIKE ?)";
                $searchTerm = "%{$search}%";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
            
            if ($isActive !== null) {
                $conditions[] = "is_active = ?";
                $params[] = $isActive;
            }
            
            if (!empty($conditions)) {
                $sql .= " WHERE " . implode(" AND ", $conditions);
            }
            
            $sql .= " ORDER BY subject_code";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $subjects = $stmt->fetchAll();
            
            return [
                'success' => true,
                'data' => ['subjects' => $subjects]
            ];
        } catch (Exception $e) {
            error_log("科目一覧取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '科目一覧の取得に失敗しました'
            ];
        }
    }
    
    /**
     * 特定科目の取得
     */
    public function getSubject($subjectId) {
        try {
            $sql = "SELECT * FROM subjects WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$subjectId]);
            $subject = $stmt->fetch();
            
            if (!$subject) {
                return [
                    'success' => false,
                    'message' => '科目が見つかりません'
                ];
            }
            
            return [
                'success' => true,
                'data' => ['subject' => $subject]
            ];
        } catch (Exception $e) {
            error_log("科目取得エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '科目情報の取得に失敗しました'
            ];
        }
    }
    
    /**
     * 科目情報の更新
     */
    public function updateSubject($subjectId, $updateData) {
        try {
            // 科目の存在確認
            $sql = "SELECT * FROM subjects WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$subjectId]);
            $existingSubject = $stmt->fetch();
            
            if (!$existingSubject) {
                return [
                    'success' => false,
                    'message' => '科目が見つかりません'
                ];
            }
            
            // 科目コードの重複チェック（変更する場合）
            if (isset($updateData['subject_code']) && $updateData['subject_code'] !== $existingSubject['subject_code']) {
                $sql = "SELECT id FROM subjects WHERE subject_code = ? AND id != ?";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$updateData['subject_code'], $subjectId]);
                if ($stmt->fetch()) {
                    return [
                        'success' => false,
                        'message' => 'この科目コードは既に使用されています'
                    ];
                }
            }
            
            // 更新処理
            $updateFields = [];
            $updateParams = [];
            
            if (isset($updateData['subject_code'])) {
                $updateFields[] = 'subject_code = ?';
                $updateParams[] = $updateData['subject_code'];
            }
            if (isset($updateData['subject_name'])) {
                $updateFields[] = 'subject_name = ?';
                $updateParams[] = $updateData['subject_name'];
            }
            if (isset($updateData['description'])) {
                $updateFields[] = 'description = ?';
                $updateParams[] = $updateData['description'];
            }
            if (isset($updateData['credits'])) {
                $updateFields[] = 'credits = ?';
                $updateParams[] = $updateData['credits'];
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
            $updateParams[] = $subjectId;
            
            $sql = "UPDATE subjects SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($updateParams);
            
            return [
                'success' => true,
                'message' => '科目情報が更新されました'
            ];
        } catch (Exception $e) {
            error_log("科目更新エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '科目情報の更新に失敗しました'
            ];
        }
    }
    
    /**
     * 科目の削除
     */
    public function deleteSubject($subjectId) {
        try {
            // 科目の存在確認
            $sql = "SELECT * FROM subjects WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$subjectId]);
            $subject = $stmt->fetch();
            
            if (!$subject) {
                return [
                    'success' => false,
                    'message' => '科目が見つかりません'
                ];
            }
            
            // 関連する授業があるかチェック
            $sql = "SELECT COUNT(*) as count FROM classes WHERE subject_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$subjectId]);
            $result = $stmt->fetch();
            
            if ($result['count'] > 0) {
                return [
                    'success' => false,
                    'message' => 'この科目に関連する授業が存在するため削除できません'
                ];
            }
            
            // 科目の削除
            $sql = "DELETE FROM subjects WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$subjectId]);
            
            return [
                'success' => true,
                'message' => '科目が削除されました'
            ];
        } catch (Exception $e) {
            error_log("科目削除エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '科目の削除に失敗しました'
            ];
        }
    }
}
?>
