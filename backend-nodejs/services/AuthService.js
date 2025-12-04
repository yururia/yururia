const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query, transaction } = require('../config/database');
const JWTUtil = require('../utils/jwt');
const logger = require('../utils/logger');

/**
 * 認証サービス（マルチテナント対応版）
 */
class AuthService {
  /**
   * ユーザーログイン
   */
  static async login(email, password) {
    try {
      logger.info('ログイン試行', { email });

      const users = await query(
        'SELECT id, name, email, password, student_id, organization_id, role FROM users WHERE email = ?',
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

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        logger.warn('ログイン失敗 - パスワードが一致しません', { email });
        return {
          success: false,
          message: 'メールアドレスまたはパスワードが正しくありません'
        };
      }

      let studentId = user.student_id;
      let tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      if (user.role === 'student' && studentId) {
        tokenPayload.student_id = studentId;
      }

      const token = JWTUtil.generateToken(tokenPayload);
      logger.info('Token generated:', { tokenLength: token.length });

      logger.info('ログイン成功', {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id
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
            studentId: studentId,
            organizationId: user.organization_id,
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
   * ユーザー新規登録（SaaS型サインアップ対応）
   */
  static async register(userData) {
    let connection;
    try {
      const { name, email, password, role, organizationName, joinCode } = userData;

      // 1. メールアドレスの重複チェック
      const existingUsers = await query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return {
          success: false,
          message: 'このメールアドレスは既に使用されています'
        };
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      connection = await transaction.begin();

      let organizationId;
      let studentId = userData.studentId || null;

      // 2. ロールごとの処理
      if (role === 'owner') {
        // --- オーナー登録（新規組織作成） ---
        if (!organizationName) {
          await transaction.rollback(connection);
          return { success: false, message: '組織名は必須です' };
        }

        // 組織作成
        const [orgResult] = await connection.query(
          'INSERT INTO organizations (name, type, is_active, created_at) VALUES (?, ?, 1, NOW())',
          [organizationName, 'school'] // typeはデフォルトでschool
        );
        organizationId = orgResult.insertId;

        // 生徒用参加コードの生成（簡易的）
        const newJoinCode = `SCHOOL-${organizationId}-${Math.floor(1000 + Math.random() * 9000)}`;
        await connection.query(
          'UPDATE organizations SET student_join_code = ? WHERE id = ?',
          [newJoinCode, organizationId]
        );

      } else if (role === 'student') {
        // --- 生徒登録（既存組織に参加） ---
        if (!joinCode) {
          await transaction.rollback(connection);
          return { success: false, message: '参加コードは必須です' };
        }

        // 参加コードから組織を特定
        const [orgs] = await connection.query(
          'SELECT id FROM organizations WHERE student_join_code = ? AND is_active = 1',
          [joinCode]
        );

        if (orgs.length === 0) {
          await transaction.rollback(connection);
          return { success: false, message: '無効な参加コードです' };
        }
        organizationId = orgs[0].id;

      } else {
        // --- 教師などは招待のみ ---
        await transaction.rollback(connection);
        return {
          success: false,
          message: '教師アカウントは管理者からの招待でのみ作成可能です'
        };
      }

      // 3. ユーザー作成
      const [userResult] = await connection.query(
        'INSERT INTO users (name, email, password, role, organization_id, student_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [name, email, hashedPassword, role, organizationId, studentId]
      );
      const userId = userResult.insertId;

      // オーナーの場合、組織のowner_idを更新
      if (role === 'owner') {
        await connection.query(
          'UPDATE organizations SET owner_id = ? WHERE id = ?',
          [userId, organizationId]
        );
      }

      await transaction.commit(connection);

      // 4. トークン生成
      const tokenPayload = {
        id: userId,
        email: email,
        role: role
      };
      if (role === 'student' && studentId) {
        tokenPayload.student_id = studentId;
      }

      const token = JWTUtil.generateToken(tokenPayload);
      logger.info('新規登録成功', { userId, role, organizationId });

      return {
        success: true,
        message: 'アカウントが作成されました',
        data: {
          token,
          user: {
            id: userId,
            name,
            email,
            role,
            organizationId,
            studentId
          }
        }
      };

    } catch (error) {
      if (connection) await transaction.rollback(connection);
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
        'SELECT id, name, email, student_id, organization_id, role FROM users WHERE id = ?',
        [payload.id]
      );

      if (users.length === 0) {
        logger.warn('トークンからユーザーが見つかりません', { userId: payload.id });
        return null;
      }

      const user = users[0];

      if (user.role !== payload.role) {
        logger.warn('トークンのロールとDBのロールが不一致です', { userId: payload.id });
        return null;
      }

      let studentId = user.student_id;
      if (user.role === 'student') {
        if (payload.student_id && payload.student_id !== user.student_id) {
          logger.warn('トークンの学生IDとDBの学生IDが不一致です', { userId: payload.id });
          return null;
        }
        studentId = payload.student_id || user.student_id;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        studentId: studentId,
        organizationId: user.organization_id,
        role: user.role
      };
    } catch (error) {
      logger.warn('トークン検証エラー:', error.message);
      return null;
    }
  }

  /**
   * パスワード変更
   */
  static async changePassword(userId, currentPassword, newPassword) {
    try {
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

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: '現在のパスワードが正しくありません'
        };
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

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
      const allowedFields = ['name', 'email'];
      const updateFields = [];
      const updateValues = [];

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