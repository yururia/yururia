const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const JWTUtil = require('../utils/jwt');
const logger = require('../utils/logger');

/**
 * 認証サービス
 */
class AuthService {
  /**
   * ユーザーログイン
   */
  static async login(email, password) {
    try {
      logger.info('ログイン試行', { email });

      // ユーザー情報を取得
      const users = await query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        logger.warn('ログイン失敗 - ユーザーが見つかりません', { email });
        return {
          success: false,
          message: 'メールアドレスまたはパスワードが正しくありません'
        };
      }

      const user = users[0];

      // パスワード検証
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        logger.warn('ログイン失敗 - パスワードが一致しません', { email });
        return {
          success: false,
          message: 'メールアドレスまたはパスワードが正しくありません'
        };
      }

      // JWTトークン生成
      const token = JWTUtil.generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      logger.info('ログイン成功', {
        userId: user.id,
        email: user.email,
        role: user.role
      });

      return {
        success: true,
        message: 'ログインに成功しました',
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            employeeId: user.employee_id,
            department: user.department,
            role: user.role
          }
        }
      };
    } catch (error) {
      logger.error('ログインエラー:', error.message);
      return {
        success: false,
        message: 'サーバーエラーが発生しました'
      };
    }
  }

  /**
   * ユーザー新規登録
   */
  static async register(userData) {
    try {
      logger.info('新規登録試行', { email: userData.email });

      // メールアドレスの重複チェック
      const existingEmail = await query(
        'SELECT id FROM users WHERE email = ?',
        [userData.email]
      );

      if (existingEmail.length > 0) {
        return {
          success: false,
          message: 'このメールアドレスは既に使用されています'
        };
      }

      // 社員IDの重複チェック
      const existingEmployeeId = await query(
        'SELECT id FROM users WHERE employee_id = ?',
        [userData.employeeId]
      );

      if (existingEmployeeId.length > 0) {
        return {
          success: false,
          message: 'この社員IDは既に使用されています'
        };
      }

      // パスワードのハッシュ化
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // ユーザーの作成
      const result = await query(
        'INSERT INTO users (name, email, password, employee_id, department) VALUES (?, ?, ?, ?, ?)',
        [
          userData.name,
          userData.email,
          hashedPassword,
          userData.employeeId,
          userData.department
        ]
      );

      const userId = result.insertId;

      // JWTトークン生成
      const token = JWTUtil.generateToken({
        id: userId,
        email: userData.email,
        role: 'employee'
      });

      logger.info('新規登録成功', {
        userId,
        email: userData.email
      });

      return {
        success: true,
        message: 'アカウントが作成されました',
        data: {
          token,
          user: {
            id: userId,
            name: userData.name,
            email: userData.email,
            employeeId: userData.employeeId,
            department: userData.department,
            role: 'employee'
          }
        }
      };
    } catch (error) {
      logger.error('新規登録エラー:', error.message);
      return {
        success: false,
        message: 'サーバーエラーが発生しました'
      };
    }
  }

  /**
   * トークンからユーザー情報を取得
   */
  static async getUserFromToken(token) {
    try {
      const payload = JWTUtil.verifyToken(token);

      const users = await query(
        'SELECT id, name, email, employee_id, department, role FROM users WHERE id = ?',
        [payload.id]
      );

      if (users.length === 0) {
        logger.warn('トークンからユーザーが見つかりません', { userId: payload.id });
        return null;
      }

      const user = users[0];
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeId: user.employee_id,
        department: user.department,
        role: user.role
      };
    } catch (error) {
      logger.error('トークン検証エラー:', error.message);
      return null;
    }
  }

  /**
   * パスワード変更
   */
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      // 現在のパスワードを取得
      const users = await query(
        'SELECT password FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return {
          success: false,
          message: 'ユーザーが見つかりません'
        };
      }

      const user = users[0];

      // 現在のパスワード検証
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: '現在のパスワードが正しくありません'
        };
      }

      // 新しいパスワードのハッシュ化
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // パスワード更新
      await query(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedNewPassword, userId]
      );

      logger.info('パスワード変更成功', { userId });

      return {
        success: true,
        message: 'パスワードが変更されました'
      };
    } catch (error) {
      logger.error('パスワード変更エラー:', error.message);
      return {
        success: false,
        message: 'サーバーエラーが発生しました'
      };
    }
  }

  /**
   * ユーザー情報更新
   */
  static async updateProfile(userId, updateData) {
    try {
      const allowedFields = ['name', 'email', 'department'];
      const updateFields = [];
      const updateValues = [];

      // 更新可能なフィールドのみを処理
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(updateData[field]);
        }
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          message: '更新するデータがありません'
        };
      }

      // メールアドレスの重複チェック（メールアドレスが更新される場合）
      if (updateData.email) {
        const existingEmail = await query(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [updateData.email, userId]
        );

        if (existingEmail.length > 0) {
          return {
            success: false,
            message: 'このメールアドレスは既に使用されています'
          };
        }
      }

      updateValues.push(userId);

      await query(
        `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        updateValues
      );

      logger.info('プロフィール更新成功', { userId });

      return {
        success: true,
        message: 'プロフィールが更新されました'
      };
    } catch (error) {
      logger.error('プロフィール更新エラー:', error.message);
      return {
        success: false,
        message: 'サーバーエラーが発生しました'
      };
    }
  }
}

module.exports = AuthService;
