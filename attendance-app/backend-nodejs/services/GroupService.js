const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * グループ管理サービス
 */
class GroupService {
  /**
   * グループの作成
   */
  static async createGroup(data) {
    try {
      const result = await transaction(async (conn) => {
        // グループ名の重複チェック
        const existingGroups = await query(
          'SELECT id FROM `groups` WHERE name = ?',
          [data.name]
        );

        if (existingGroups.length > 0) {
          throw new Error('このグループ名は既に使用されています');
        }

        // グループの作成
        const insertResult = await query(
          'INSERT INTO `groups` (name, description, is_active) VALUES (?, ?, ?)',
          [
            data.name,
            data.description || null,
            data.is_active !== undefined ? data.is_active : true
          ]
        );

        return {
          success: true,
          message: 'グループが作成されました',
          data: { id: insertResult.insertId }
        };
      });

      logger.info('グループ作成成功', { groupId: result.data.id, name: data.name });
      return result;
    } catch (error) {
      logger.error('グループ作成エラー:', error.message);
      return {
        success: false,
        message: error.message || 'グループの作成に失敗しました'
      };
    }
  }

  /**
   * グループ一覧の取得
   */
  static async getGroups(options = {}) {
    try {
      const { search, isActive, limit, offset = 0 } = options;

      let sql = `
        SELECT id, name, description, is_active, created_at, updated_at
        FROM \`groups\`
        WHERE 1=1
      `;
      const params = [];

      if (search) {
        sql += ' AND (name LIKE ? OR description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (isActive !== undefined) {
        sql += ' AND is_active = ?';
        params.push(isActive);
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

      const groups = await query(sql, params);

      // 総数を取得
      let countSql = 'SELECT COUNT(*) as total FROM `groups` WHERE 1=1';
      const countParams = [];

      if (search) {
        countSql += ' AND (name LIKE ? OR description LIKE ?)';
        const searchTerm = `%${search}%`;
        countParams.push(searchTerm, searchTerm);
      }

      if (isActive !== undefined) {
        countSql += ' AND is_active = ?';
        countParams.push(isActive);
      }

      const countResult = await query(countSql, countParams);
      const total = countResult[0].total;

      return {
        success: true,
        data: {
          groups,
          total,
          limit: limit ? parseInt(limit) : null,
          offset: parseInt(offset)
        }
      };
    } catch (error) {
      logger.error('グループ一覧取得エラー:', error.message);
      return {
        success: false,
        message: 'グループ一覧の取得に失敗しました'
      };
  }
  }

  /**
   * 特定グループの取得
   */
  static async getGroup(id) {
    try {
      const groups = await query(
        'SELECT id, name, description, is_active, created_at, updated_at FROM `groups` WHERE id = ?',
        [id]
      );

      if (groups.length === 0) {
        return {
          success: false,
          message: 'グループが見つかりません'
        };
      }

      // メンバー数も取得
      const memberCountResult = await query(
        'SELECT COUNT(*) as count FROM group_members WHERE group_id = ?',
        [id]
      );

      const group = {
        ...groups[0],
        member_count: memberCountResult[0].count
      };

      return {
        success: true,
        data: { group }
      };
    } catch (error) {
      logger.error('グループ取得エラー:', error.message);
      return {
        success: false,
        message: 'グループの取得に失敗しました'
      };
  }
  }

  /**
   * グループ情報の更新
   */
  static async updateGroup(id, data) {
    try {
      const result = await transaction(async (conn) => {
        // グループの存在確認
        const existingGroups = await query(
          'SELECT * FROM `groups` WHERE id = ?',
          [id]
        );

        if (existingGroups.length === 0) {
          throw new Error('グループが見つかりません');
        }

        // グループ名の重複チェック（名前が変更される場合）
        if (data.name && data.name !== existingGroups[0].name) {
          const duplicateGroups = await query(
            'SELECT id FROM `groups` WHERE name = ? AND id != ?',
            [data.name, id]
          );

          if (duplicateGroups.length > 0) {
            throw new Error('このグループ名は既に使用されています');
          }
        }

        // 更新フィールドの構築
        const updateFields = [];
        const updateParams = [];

        if (data.name !== undefined) {
          updateFields.push('name = ?');
          updateParams.push(data.name);
        }

        if (data.description !== undefined) {
          updateFields.push('description = ?');
          updateParams.push(data.description);
        }

        if (data.is_active !== undefined) {
          updateFields.push('is_active = ?');
          updateParams.push(data.is_active);
        }

        if (updateFields.length === 0) {
          throw new Error('更新するデータがありません');
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateParams.push(id);

        await query(
          `UPDATE \`groups\` SET ${updateFields.join(', ')} WHERE id = ?`,
          updateParams
        );

        return {
          success: true,
          message: 'グループ情報が更新されました'
        };
      });

      logger.info('グループ情報更新成功', { groupId: id });
      return result;
    } catch (error) {
      logger.error('グループ情報更新エラー:', error.message);
      return {
        success: false,
        message: error.message || 'グループ情報の更新に失敗しました'
      };
  }
  }

  /**
   * グループへのメンバー追加
   */
  static async addMember(id, studentId, role = 'member') {
    try {
      const result = await transaction(async (conn) => {
        // グループの存在確認
        const groups = await query(
          'SELECT * FROM `groups` WHERE id = ? AND is_active = TRUE',
          [id]
        );

        if (groups.length === 0) {
          throw new Error('グループが見つかりません');
        }

        // 学生の存在確認
        const students = await query(
          'SELECT * FROM students WHERE student_id = ?',
          [studentId]
        );

        if (students.length === 0) {
          throw new Error('学生が見つかりません');
        }

        // 既にメンバーかチェック
        const existingMembers = await query(
          'SELECT * FROM group_members WHERE group_id = ? AND student_id = ?',
          [id, studentId]
        );

        if (existingMembers.length > 0) {
          throw new Error('この学生は既にグループのメンバーです');
        }

        // メンバーを追加
        await query(
          'INSERT INTO group_members (group_id, student_id, role) VALUES (?, ?, ?)',
          [id, studentId, role]
        );

        return {
          success: true,
          message: 'メンバーが追加されました'
        };
      });

      logger.info('グループメンバー追加成功', { groupId: id, studentId, role });
      return result;
    } catch (error) {
      logger.error('グループメンバー追加エラー:', error.message);
      return {
        success: false,
        message: error.message || 'メンバーの追加に失敗しました'
      };
  }
  }

  /**
   * グループメンバー一覧の取得
   */
  static async getMembers(id, options = {}) {
    try {
      const { limit, offset = 0 } = options;

      // グループの存在確認
      const groups = await query(
        'SELECT * FROM groups WHERE id = ?',
        [id]
      );

      if (groups.length === 0) {
        return {
          success: false,
          message: 'グループが見つかりません'
        };
      }

      let sql = `
        SELECT 
          gm.id,
          gm.group_id,
          gm.student_id,
          gm.role,
          gm.joined_at,
          s.name as student_name,
          s.email as student_email,
          s.grade,
          s.class_name,
          s.status as student_status
        FROM group_members gm
        JOIN students s ON gm.student_id = s.student_id
        WHERE gm.group_id = ?
        ORDER BY gm.joined_at DESC
      `;
      const params = [id];

      if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));
      }

      if (offset) {
        sql += ' OFFSET ?';
        params.push(parseInt(offset));
      }

      const members = await query(sql, params);

      // 総数を取得
      const countResult = await query(
        'SELECT COUNT(*) as total FROM group_members WHERE group_id = ?',
        [id]
      );
      const total = countResult[0].total;

      return {
        success: true,
        data: {
          members,
          total,
          limit: limit ? parseInt(limit) : null,
          offset: parseInt(offset)
        }
      };
    } catch (error) {
      logger.error('グループメンバー一覧取得エラー:', error.message);
      return {
        success: false,
        message: 'メンバー一覧の取得に失敗しました'
      };
  }
  }

  /**
   * グループからのメンバー削除
   */
  static async removeMember(id, studentId) {
    try {
      const result = await transaction(async (conn) => {
        // グループの存在確認
        const groups = await query(
          'SELECT * FROM `groups` WHERE id = ?',
          [id]
        );

        if (groups.length === 0) {
          throw new Error('グループが見つかりません');
        }

        // メンバーの存在確認
        const members = await query(
          'SELECT * FROM group_members WHERE group_id = ? AND student_id = ?',
          [id, studentId]
        );

        if (members.length === 0) {
          throw new Error('メンバーが見つかりません');
        }

        // メンバーを削除
        await query(
          'DELETE FROM group_members WHERE group_id = ? AND student_id = ?',
          [id, studentId]
        );

        return {
          success: true,
          message: 'メンバーが削除されました'
        };
      });

      logger.info('グループメンバー削除成功', { groupId: id, studentId });
      return result;
    } catch (error) {
      logger.error('グループメンバー削除エラー:', error.message);
      return {
        success: false,
        message: error.message || 'メンバーの削除に失敗しました'
      };
  }
  }

  /**
   * グループの削除
   */
  static async deleteGroup(id) {
    try {
      const result = await transaction(async (conn) => {
        // グループの存在確認
        const groups = await query(
          'SELECT * FROM `groups` WHERE id = ?',
          [id]
        );

        if (groups.length === 0) {
          throw new Error('グループが見つかりません');
        }

        // メンバーを削除（CASCADEで自動削除されるが、明示的に削除）
        await query(
          'DELETE FROM group_members WHERE group_id = ?',
          [id]
        );

        // グループを削除
        await query(
          'DELETE FROM `groups` WHERE id = ?',
          [id]
        );

        return {
          success: true,
          message: 'グループが削除されました'
        };
      });

      logger.info('グループ削除成功', { groupId: id });
      return result;
    } catch (error) {
      logger.error('グループ削除エラー:', error.message);
      return {
        success: false,
        message: error.message || 'グループの削除に失敗しました'
      };
    }
  }
}

module.exports = GroupService;

