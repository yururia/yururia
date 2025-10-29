const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 学生管理サービス
 */
class StudentService {
  /**
   * 学生の作成
   */
  static async createStudent(studentData) {
    try {
      const result = await transaction(async (conn) => {
        // 学生IDの重複チェック
        const existingStudent = await query(
          'SELECT student_id FROM students WHERE student_id = ?',
          [studentData.student_id]
        );

        if (existingStudent.length > 0) {
          throw new Error('この学生IDは既に使用されています');
        }

        // カードIDの重複チェック（カードIDが指定されている場合）
        if (studentData.card_id) {
          const existingCard = await query(
            'SELECT card_id FROM students WHERE card_id = ?',
            [studentData.card_id]
          );

          if (existingCard.length > 0) {
            throw new Error('このカードIDは既に使用されています');
          }
        }

        // 学生の作成
        const insertResult = await query(
          `INSERT INTO students (student_id, name, card_id, email, phone, grade, class_name, enrollment_date, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            studentData.student_id,
            studentData.name,
            studentData.card_id || null,
            studentData.email || null,
            studentData.phone || null,
            studentData.grade || null,
            studentData.class_name || null,
            studentData.enrollment_date || null,
            studentData.status || 'active'
          ]
        );

        return {
          success: true,
          message: '学生が作成されました',
          data: { studentId: studentData.student_id }
        };
      });

      logger.info('学生作成成功', { studentId: studentData.student_id });
      return result;
    } catch (error) {
      logger.error('学生作成エラー:', error.message);
      return {
        success: false,
        message: error.message || '学生の作成に失敗しました'
      };
    }
  }

  /**
   * 学生一覧の取得
   */
  static async getStudents(search, limit, offset) {
    try {
      let sql = `
        SELECT student_id, name, card_id, email, phone, grade, class_name, enrollment_date, status, created_at, updated_at
        FROM students
        WHERE 1=1
      `;
      const params = [];

      if (search) {
        sql += ' AND (name LIKE ? OR student_id LIKE ? OR email LIKE ? OR card_id LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      sql += ' ORDER BY created_at DESC';

      if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));
      }

      if (offset) {
        sql += ' OFFSET ?';
        params.push(parseInt(offset));
      }

      const students = await query(sql, params);

      // 総数を取得
      let countSql = 'SELECT COUNT(*) as total FROM students WHERE 1=1';
      const countParams = [];

      if (search) {
        countSql += ' AND (name LIKE ? OR student_id LIKE ? OR email LIKE ? OR card_id LIKE ?)';
        const searchTerm = `%${search}%`;
        countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const countResult = await query(countSql, countParams);
      const total = countResult[0].total;

      return {
        success: true,
        data: {
          students,
          total,
          limit: limit ? parseInt(limit) : null,
          offset: offset ? parseInt(offset) : 0
        }
      };
    } catch (error) {
      logger.error('学生一覧取得エラー:', error.message);
      return {
        success: false,
        message: '学生一覧の取得に失敗しました'
      };
    }
  }

  /**
   * 特定学生の取得
   */
  static async getStudent(studentId) {
    try {
      const students = await query(
        'SELECT * FROM students WHERE student_id = ?',
        [studentId]
      );

      if (students.length === 0) {
        return {
          success: false,
          message: '学生が見つかりません'
        };
      }

      return {
        success: true,
        data: { student: students[0] }
      };
    } catch (error) {
      logger.error('学生取得エラー:', error.message);
      return {
        success: false,
        message: '学生の取得に失敗しました'
      };
    }
  }

  /**
   * カードIDで学生を検索
   */
  static async getStudentByCardId(cardId) {
    try {
      const students = await query(
        'SELECT * FROM students WHERE card_id = ?',
        [cardId]
      );

      if (students.length === 0) {
        return {
          success: false,
          message: 'カードIDに該当する学生が見つかりません'
        };
      }

      return {
        success: true,
        data: { student: students[0] }
      };
    } catch (error) {
      logger.error('カードID検索エラー:', error.message);
      return {
        success: false,
        message: '学生の検索に失敗しました'
      };
    }
  }

  /**
   * 学生情報の更新
   */
  static async updateStudent(studentId, updateData) {
    try {
      const result = await transaction(async (conn) => {
        // 学生の存在確認
        const existingStudent = await query(
          'SELECT * FROM students WHERE student_id = ?',
          [studentId]
        );

        if (existingStudent.length === 0) {
          throw new Error('学生が見つかりません');
        }

        // カードIDの重複チェック（カードIDが変更される場合）
        if (updateData.card_id && updateData.card_id !== existingStudent[0].card_id) {
          const existingCard = await query(
            'SELECT card_id FROM students WHERE card_id = ? AND student_id != ?',
            [updateData.card_id, studentId]
          );

          if (existingCard.length > 0) {
            throw new Error('このカードIDは既に使用されています');
          }
        }

        // 更新フィールドの構築
        const updateFields = [];
        const updateParams = [];

        const allowedFields = ['name', 'card_id', 'email', 'phone', 'grade', 'class_name', 'enrollment_date', 'status'];
        
        for (const field of allowedFields) {
          if (updateData[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateParams.push(updateData[field]);
          }
        }

        if (updateFields.length === 0) {
          throw new Error('更新するデータがありません');
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateParams.push(studentId);

        await query(
          `UPDATE students SET ${updateFields.join(', ')} WHERE student_id = ?`,
          updateParams
        );

        return {
          success: true,
          message: '学生情報が更新されました'
        };
      });

      logger.info('学生情報更新成功', { studentId });
      return result;
    } catch (error) {
      logger.error('学生情報更新エラー:', error.message);
      return {
        success: false,
        message: error.message || '学生情報の更新に失敗しました'
      };
    }
  }

  /**
   * 学生の削除
   */
  static async deleteStudent(studentId) {
    try {
      const result = await transaction(async (conn) => {
        // 学生の存在確認
        const existingStudent = await query(
          'SELECT * FROM students WHERE student_id = ?',
          [studentId]
        );

        if (existingStudent.length === 0) {
          throw new Error('学生が見つかりません');
        }

        // 関連する出欠記録を削除
        await query(
          'DELETE FROM student_attendance_records WHERE student_id = ?',
          [studentId]
        );

        await query(
          'DELETE FROM detailed_attendance_records WHERE student_id = ?',
          [studentId]
        );

        await query(
          'DELETE FROM enrollments WHERE student_id = ?',
          [studentId]
        );

        await query(
          'DELETE FROM notifications WHERE student_id = ?',
          [studentId]
        );

        // 学生を削除
        await query(
          'DELETE FROM students WHERE student_id = ?',
          [studentId]
        );

        return {
          success: true,
          message: '学生が削除されました'
        };
      });

      logger.info('学生削除成功', { studentId });
      return result;
    } catch (error) {
      logger.error('学生削除エラー:', error.message);
      return {
        success: false,
        message: error.message || '学生の削除に失敗しました'
      };
    }
  }
}

module.exports = StudentService;
