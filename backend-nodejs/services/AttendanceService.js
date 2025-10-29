const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 出欠管理サービス
 */
class AttendanceService {
  /**
   * 出欠記録の作成・更新
   */
  static async recordAttendance(userId, date, type, timestamp, reason, studentId) {
    try {
      const result = await transaction(async (conn) => {
        // 既存の記録をチェック
        const existingRecords = await query(
          'SELECT * FROM user_attendance_records WHERE user_id = ? AND date = ?',
          [userId, date]
        );

        let recordId;
        if (existingRecords.length > 0) {
          // 既存記録の更新
          recordId = existingRecords[0].id;
          await query(
            'UPDATE user_attendance_records SET status = ?, check_in_time = ?, check_out_time = ?, reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [type, timestamp, timestamp, reason, recordId]
          );
        } else {
          // 新規記録の作成
          const insertResult = await query(
            'INSERT INTO user_attendance_records (user_id, date, status, check_in_time, check_out_time, reason) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, date, type, timestamp, timestamp, reason]
          );
          recordId = insertResult.insertId;
        }

        // 学生出欠記録も作成（studentIdが指定されている場合）
        if (studentId) {
          await query(
            'INSERT INTO student_attendance_records (student_id, timestamp) VALUES (?, ?)',
            [studentId, timestamp || new Date()]
          );
        }

        return {
          success: true,
          message: '出欠記録が保存されました',
          data: { recordId }
        };
      });

      logger.info('出欠記録作成成功', { userId, date, type });
      return result;
    } catch (error) {
      logger.error('出欠記録作成エラー:', error.message);
      return {
        success: false,
        message: '出欠記録の保存に失敗しました'
      };
    }
  }

  /**
   * 出欠記録の取得
   */
  static async getAttendanceRecords(userId, startDate, endDate) {
    try {
      let sql = `
        SELECT id, user_id, date, status, check_in_time, check_out_time, reason, created_at, updated_at
        FROM user_attendance_records
        WHERE user_id = ?
      `;
      const params = [userId];

      if (startDate) {
        sql += ' AND date >= ?';
        params.push(startDate);
      }

      if (endDate) {
        sql += ' AND date <= ?';
        params.push(endDate);
      }

      sql += ' ORDER BY date DESC';

      const records = await query(sql, params);

      return {
        success: true,
        data: { records }
      };
    } catch (error) {
      logger.error('出欠記録取得エラー:', error.message);
      return {
        success: false,
        message: '出欠記録の取得に失敗しました'
      };
    }
  }

  /**
   * 月次レポートの取得
   */
  static async getMonthlyReport(userId, year, month) {
    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const records = await query(
        `SELECT date, status, check_in_time, check_out_time, reason
         FROM user_attendance_records
         WHERE user_id = ? AND date >= ? AND date <= ?
         ORDER BY date`,
        [userId, startDate, endDate]
      );

      // 統計計算
      const totalDays = new Date(year, month, 0).getDate();
      const presentDays = records.filter(r => r.status === 'present').length;
      const absentDays = records.filter(r => r.status === 'absent').length;
      const lateDays = records.filter(r => r.status === 'late').length;
      const earlyDepartureDays = records.filter(r => r.status === 'early_departure').length;

      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      return {
        success: true,
        data: {
          year,
          month,
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          earlyDepartureDays,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
          records
        }
      };
    } catch (error) {
      logger.error('月次レポート取得エラー:', error.message);
      return {
        success: false,
        message: '月次レポートの取得に失敗しました'
      };
    }
  }

  /**
   * 統計情報の取得
   */
  static async getAttendanceStats(userId, period) {
    try {
      let dateCondition = '';
      const params = [userId];

      const now = new Date();
      switch (period) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateCondition = 'AND date >= ?';
          params.push(weekAgo.toISOString().split('T')[0]);
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          dateCondition = 'AND date >= ?';
          params.push(monthAgo.toISOString().split('T')[0]);
          break;
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          dateCondition = 'AND date >= ?';
          params.push(yearAgo.toISOString().split('T')[0]);
          break;
      }

      const stats = await query(
        `SELECT 
           COUNT(*) as total_records,
           SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
           SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
           SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
           SUM(CASE WHEN status = 'early_departure' THEN 1 ELSE 0 END) as early_departure_count
         FROM user_attendance_records
         WHERE user_id = ? ${dateCondition}`,
        params
      );

      const result = stats[0];
      const attendanceRate = result.total_records > 0 
        ? (result.present_count / result.total_records) * 100 
        : 0;

      return {
        success: true,
        data: {
          period,
          totalRecords: result.total_records,
          presentCount: result.present_count,
          absentCount: result.absent_count,
          lateCount: result.late_count,
          earlyDepartureCount: result.early_departure_count,
          attendanceRate: Math.round(attendanceRate * 100) / 100
        }
      };
    } catch (error) {
      logger.error('統計情報取得エラー:', error.message);
      return {
        success: false,
        message: '統計情報の取得に失敗しました'
      };
    }
  }

  /**
   * 出欠記録の更新
   */
  static async updateAttendance(recordId, userId, updateData) {
    try {
      // 権限チェック
      const existingRecord = await query(
        'SELECT * FROM user_attendance_records WHERE id = ? AND user_id = ?',
        [recordId, userId]
      );

      if (existingRecord.length === 0) {
        return {
          success: false,
          message: '記録が見つからないか、更新権限がありません'
        };
      }

      const updateFields = [];
      const updateParams = [];

      if (updateData.type) {
        updateFields.push('status = ?');
        updateParams.push(updateData.type);
      }

      if (updateData.timestamp) {
        updateFields.push('check_in_time = ?');
        updateFields.push('check_out_time = ?');
        updateParams.push(updateData.timestamp);
        updateParams.push(updateData.timestamp);
      }

      if (updateData.reason !== undefined) {
        updateFields.push('reason = ?');
        updateParams.push(updateData.reason);
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          message: '更新するデータがありません'
        };
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateParams.push(recordId);

      await query(
        `UPDATE user_attendance_records SET ${updateFields.join(', ')} WHERE id = ?`,
        updateParams
      );

      logger.info('出欠記録更新成功', { recordId, userId });
      return {
        success: true,
        message: '出欠記録が更新されました'
      };
    } catch (error) {
      logger.error('出欠記録更新エラー:', error.message);
      return {
        success: false,
        message: '出欠記録の更新に失敗しました'
      };
    }
  }

  /**
   * 出欠記録の削除
   */
  static async deleteAttendance(recordId, userId) {
    try {
      // 権限チェック
      const existingRecord = await query(
        'SELECT * FROM user_attendance_records WHERE id = ? AND user_id = ?',
        [recordId, userId]
      );

      if (existingRecord.length === 0) {
        return {
          success: false,
          message: '記録が見つからないか、削除権限がありません'
        };
      }

      await query(
        'DELETE FROM user_attendance_records WHERE id = ?',
        [recordId]
      );

      logger.info('出欠記録削除成功', { recordId, userId });
      return {
        success: true,
        message: '出欠記録が削除されました'
      };
    } catch (error) {
      logger.error('出欠記録削除エラー:', error.message);
      return {
        success: false,
        message: '出欠記録の削除に失敗しました'
      };
    }
  }
}

module.exports = AttendanceService;
