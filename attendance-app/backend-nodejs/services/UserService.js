const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * ユーザー管理サービス
 */
class UserService {
  /**
   * 全ユーザー一覧の取得
   */
  static async getAllUsers() {
    try {
      const users = await query(
        'SELECT id, name, email, employee_id, department, role, created_at FROM users ORDER BY created_at DESC'
      );

      return {
        success: true,
        data: { users }
      };
    } catch (error) {
      logger.error('ユーザー一覧取得エラー:', error.message);
      return {
        success: false,
        message: 'ユーザー一覧の取得に失敗しました'
      };
    }
  }

  /**
   * 特定ユーザーの取得
   */
  static async getUser(userId) {
    try {
      const users = await query(
        'SELECT id, name, email, employee_id, department, role, created_at FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return {
          success: false,
          message: 'ユーザーが見つかりません'
        };
      }

      return {
        success: true,
        data: { user: users[0] }
      };
    } catch (error) {
      logger.error('ユーザー取得エラー:', error.message);
      return {
        success: false,
        message: 'ユーザーの取得に失敗しました'
      };
    }
  }

  /**
   * ユーザー情報の更新
   */
  static async updateUser(userId, updateData) {
    try {
      const result = await transaction(async (conn) => {
        // ユーザーの存在確認
        const existingUser = await query(
          'SELECT * FROM users WHERE id = ?',
          [userId]
        );

        if (existingUser.length === 0) {
          throw new Error('ユーザーが見つかりません');
        }

        // メールアドレスの重複チェック（メールアドレスが変更される場合）
        if (updateData.email && updateData.email !== existingUser[0].email) {
          const existingEmail = await query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [updateData.email, userId]
          );

          if (existingEmail.length > 0) {
            throw new Error('このメールアドレスは既に使用されています');
          }
        }

        // 更新フィールドの構築
        const updateFields = [];
        const updateParams = [];

        const allowedFields = ['name', 'email', 'department', 'role'];
        
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
        updateParams.push(userId);

        await query(
          `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
          updateParams
        );

        return {
          success: true,
          message: 'ユーザー情報が更新されました'
        };
      });

      logger.info('ユーザー情報更新成功', { userId });
      return result;
    } catch (error) {
      logger.error('ユーザー情報更新エラー:', error.message);
      return {
        success: false,
        message: error.message || 'ユーザー情報の更新に失敗しました'
      };
    }
  }

  /**
   * ユーザーの削除
   */
  static async deleteUser(userId) {
    try {
      const result = await transaction(async (conn) => {
        // ユーザーの存在確認
        const existingUser = await query(
          'SELECT * FROM users WHERE id = ?',
          [userId]
        );

        if (existingUser.length === 0) {
          throw new Error('ユーザーが見つかりません');
        }

        // 関連する出欠記録を削除
        await query(
          'DELETE FROM user_attendance_records WHERE user_id = ?',
          [userId]
        );

        await query(
          'DELETE FROM detailed_attendance_records WHERE created_by = ?',
          [userId]
        );

        await query(
          'DELETE FROM notifications WHERE user_id = ?',
          [userId]
        );

        await query(
          'DELETE FROM audit_logs WHERE user_id = ?',
          [userId]
        );

        // ユーザーを削除
        await query(
          'DELETE FROM users WHERE id = ?',
          [userId]
        );

        return {
          success: true,
          message: 'ユーザーが削除されました'
        };
      });

      logger.info('ユーザー削除成功', { userId });
      return result;
    } catch (error) {
      logger.error('ユーザー削除エラー:', error.message);
      return {
        success: false,
        message: error.message || 'ユーザーの削除に失敗しました'
      };
    }
  }
}

module.exports = UserService;
