const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');

/**
 * ユーザー管理サービス
 */
class UserService {
  /**
   * 全ユーザー一覧の取得
   */
  static async getAllUsers(organizationId) {
    try {
      let sql = 'SELECT id, name, email, student_id, organization_id, role, created_at FROM users';
      const params = [];

      if (organizationId) {
        sql += ' WHERE organization_id = ?';
        params.push(organizationId);
      }

      sql += ' ORDER BY created_at DESC';

      const users = await query(sql, params);

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
        'SELECT id, name, email, student_id, organization_id, role, created_at, last_role_update FROM users WHERE id = ?',
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
        message: 'ユーザー情報の取得に失敗しました'
      };
    }
  }

  /**
   * ユーザー情報の更新
   */
  static async updateUser(userId, updateData) {
    try {
      const result = await transaction(async (conn) => {
        const allowedFields = ['name', 'email', 'phone'];
        const updateFields = [];
        const updateValues = [];

        if (updateData.email) {
          const existingEmail = await query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [updateData.email, userId]
          );

          if (existingEmail.length > 0) {
            throw new Error('このメールアドレスは既に使用されています');
          }
        }

        for (const field of allowedFields) {
          if (updateData[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateValues.push(updateData[field]);
          }
        }

        if (updateFields.length === 0) {
          return { success: false, message: '更新するデータがありません' };
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(userId);

        await conn.execute(
          `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );

        return { success: true, message: 'ユーザー情報が更新されました' };
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
        const existingUser = await query(
          'SELECT id FROM users WHERE id = ?',
          [userId]
        );

        if (existingUser.length === 0) {
          throw new Error('ユーザーが見つかりません');
        }

        await query('DELETE FROM user_attendance_records WHERE user_id = ?', [userId]);
        await query('DELETE FROM detailed_attendance_records WHERE created_by = ?', [userId]);
        await query('DELETE FROM notifications WHERE user_id = ?', [userId]);
        await query('DELETE FROM audit_logs WHERE user_id = ?', [userId]);
        await query('DELETE FROM users WHERE id = ?', [userId]);

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

  /**
   * ロール変更ステータスの取得
   */
  static async getRoleUpdateStatus(userId) {
    try {
      const [user] = await query('SELECT last_role_update FROM users WHERE id = ?', [userId]);

      if (!user) {
        return { success: false, message: 'ユーザーが見つかりません' };
      }

      const { last_role_update } = user;
      let canUpdate = true;
      let nextUpdateDate = null;
      const today = new Date();

      if (last_role_update) {
        const lastUpdate = new Date(last_role_update);
        const nextDate = new Date(lastUpdate.setDate(lastUpdate.getDate() + 90));

        if (today < nextDate) {
          canUpdate = false;
          nextUpdateDate = nextDate.toISOString().split('T')[0];
        }
      }

      return {
        success: true,
        data: {
          canUpdate,
          lastRoleUpdate: last_role_update,
          nextUpdateDate
        }
      };
    } catch (error) {
      logger.error('ロール変更ステータス取得エラー:', error.message);
      return { success: false, message: 'ステータスの取得に失敗しました' };
    }
  }

  /**
   * ロールの更新
   */
  static async updateRole(userId, newRole, password) {
    try {
      const [user] = await query('SELECT password FROM users WHERE id = ?', [userId]);
      if (!user) {
        return { success: false, message: 'ユーザーが見つかりません' };
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return { success: false, message: 'パスワードが正しくありません' };
      }

      const statusResult = await this.getRoleUpdateStatus(userId);
      if (!statusResult.success || !statusResult.data.canUpdate) {
        return { success: false, message: 'ロール変更は90日に1回のみ可能です' };
      }

      if (newRole !== 'student' && newRole !== 'teacher' && newRole !== 'owner') {
        return { success: false, message: '無効な役割です' };
      }

      const result = await transaction(async (conn) => {
        const today = new Date().toISOString().split('T')[0];

        await conn.execute(
          'UPDATE users SET role = ?, last_role_update = ? WHERE id = ?',
          [newRole, today, userId]
        );

        if (newRole !== 'student') {
          await conn.execute(
            'UPDATE users SET student_id = NULL WHERE id = ?',
            [userId]
          );
        }

        return { success: true, message: '役割が正常に更新されました。' };
      });

      logger.info('ロール更新成功', { userId, newRole });
      return result;

    } catch (error) {
      logger.error('ロール更新エラー:', error.message);
      return { success: false, message: error.message || 'ロールの更新に失敗しました' };
    }
  }
}

module.exports = UserService;