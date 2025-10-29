const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 学生出欠管理サービス
 */
class StudentAttendanceService {
  /**
   * 学生出欠記録の作成
   */
  static async recordAttendance(studentId, timestamp) {
    try {
      const result = await query(
        'INSERT INTO student_attendance_records (student_id, timestamp) VALUES (?, ?)',
        [studentId, timestamp || new Date()]
      );

      logger.info('学生出欠記録作成成功', { studentId, timestamp });
      return {
        success: true,
        message: '学生出欠記録が保存されました',
        data: { recordId: result.insertId }
      };
    } catch (error) {
      logger.error('学生出欠記録作成エラー:', error.message);
      return {
        success: false,
        message: '学生出欠記録の保存に失敗しました'
      };
    }
  }

  /**
   * QRコード読み取りによる詳細出欠記録の作成
   */
  static async recordQRAttendance(studentId, timestamp) {
    try {
      const result = await transaction(async (conn) => {
        // 学生の存在確認
        const students = await query(
          'SELECT * FROM students WHERE student_id = ?',
          [studentId]
        );

        if (students.length === 0) {
          throw new Error('学生が見つかりません');
        }

        // 出欠記録の作成
        const attendanceResult = await query(
          'INSERT INTO student_attendance_records (student_id, timestamp) VALUES (?, ?)',
          [studentId, timestamp || new Date()]
        );

        // 詳細出欠記録も作成（該当する授業がある場合）
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().split(' ')[0];

        // 現在の時間に該当する授業を検索
        const classes = await query(
          `SELECT c.*, s.subject_name 
           FROM classes c
           JOIN subjects s ON c.subject_id = s.id
           WHERE c.schedule_day = ? 
           AND c.start_time <= ? 
           AND c.end_time >= ?
           AND c.is_active = TRUE`,
          [
            this.getDayOfWeek(new Date()),
            currentTime,
            currentTime
          ]
        );

        if (classes.length > 0) {
          const classData = classes[0];
          
          // 学生がその授業に登録されているかチェック
          const enrollment = await query(
            'SELECT * FROM enrollments WHERE student_id = ? AND class_id = ? AND status = "enrolled"',
            [studentId, classData.id]
          );

          if (enrollment.length > 0) {
            // 詳細出欠記録を作成
            await query(
              `INSERT INTO detailed_attendance_records 
               (student_id, class_id, attendance_date, status, check_in_time, notes) 
               VALUES (?, ?, ?, 'present', ?, ?)`,
              [
                studentId,
                classData.id,
                today,
                timestamp || new Date(),
                `QRコードによる自動記録 - ${classData.subject_name}`
              ]
            );
          }
        }

        return {
          success: true,
          message: 'QRコードによる出欠記録が保存されました',
          data: { 
            recordId: attendanceResult.insertId,
            student: students[0],
            classInfo: classes.length > 0 ? classes[0] : null
          }
        };
      });

      return result;
    } catch (error) {
      logger.error('QR出欠記録作成エラー:', error.message);
      return {
        success: false,
        message: error.message || 'QRコードによる出欠記録の保存に失敗しました'
      };
    }
  }

  /**
   * 学生出欠記録の取得
   */
  static async getAttendanceRecords(studentId, startDate, endDate) {
    try {
      let sql = `
        SELECT sar.id, sar.student_id, sar.timestamp, s.name as student_name
        FROM student_attendance_records sar
        JOIN students s ON sar.student_id = s.student_id
        WHERE 1=1
      `;
      const params = [];

      if (studentId) {
        sql += ' AND sar.student_id = ?';
        params.push(studentId);
      }

      if (startDate) {
        sql += ' AND DATE(sar.timestamp) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        sql += ' AND DATE(sar.timestamp) <= ?';
        params.push(endDate);
      }

      sql += ' ORDER BY sar.timestamp DESC';

      const records = await query(sql, params);

      return {
        success: true,
        data: { records }
      };
    } catch (error) {
      logger.error('学生出欠記録取得エラー:', error.message);
      return {
        success: false,
        message: '学生出欠記録の取得に失敗しました'
      };
    }
  }

  /**
   * 月次レポートの取得
   */
  static async getMonthlyReport(studentId, year, month) {
    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const records = await query(
        `SELECT DATE(timestamp) as date, COUNT(*) as count
         FROM student_attendance_records
         WHERE student_id = ? AND DATE(timestamp) >= ? AND DATE(timestamp) <= ?
         GROUP BY DATE(timestamp)
         ORDER BY date`,
        [studentId, startDate, endDate]
      );

      const totalDays = new Date(year, month, 0).getDate();
      const attendanceDays = records.length;
      const attendanceRate = totalDays > 0 ? (attendanceDays / totalDays) * 100 : 0;

      return {
        success: true,
        data: {
          year,
          month,
          totalDays,
          attendanceDays,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
          records
        }
      };
    } catch (error) {
      logger.error('学生月次レポート取得エラー:', error.message);
      return {
        success: false,
        message: '学生月次レポートの取得に失敗しました'
      };
    }
  }

  /**
   * 統計情報の取得
   */
  static async getAttendanceStats(studentId, period) {
    try {
      let dateCondition = '';
      const params = [studentId];

      const now = new Date();
      switch (period) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateCondition = 'AND DATE(timestamp) >= ?';
          params.push(weekAgo.toISOString().split('T')[0]);
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          dateCondition = 'AND DATE(timestamp) >= ?';
          params.push(monthAgo.toISOString().split('T')[0]);
          break;
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          dateCondition = 'AND DATE(timestamp) >= ?';
          params.push(yearAgo.toISOString().split('T')[0]);
          break;
      }

      const stats = await query(
        `SELECT 
           COUNT(*) as total_records,
           COUNT(DISTINCT DATE(timestamp)) as attendance_days
         FROM student_attendance_records
         WHERE student_id = ? ${dateCondition}`,
        params
      );

      const result = stats[0];

      return {
        success: true,
        data: {
          period,
          totalRecords: result.total_records,
          attendanceDays: result.attendance_days
        }
      };
    } catch (error) {
      logger.error('学生統計情報取得エラー:', error.message);
      return {
        success: false,
        message: '学生統計情報の取得に失敗しました'
      };
    }
  }

  /**
   * 詳細出欠記録の取得
   */
  static async getDetailedAttendanceRecords(studentId, classId, startDate, endDate) {
    try {
      let sql = `
        SELECT dar.*, s.subject_name, c.class_code, c.teacher_name, c.room
        FROM detailed_attendance_records dar
        JOIN classes c ON dar.class_id = c.id
        JOIN subjects s ON c.subject_id = s.id
        WHERE 1=1
      `;
      const params = [];

      if (studentId) {
        sql += ' AND dar.student_id = ?';
        params.push(studentId);
      }

      if (classId) {
        sql += ' AND dar.class_id = ?';
        params.push(classId);
      }

      if (startDate) {
        sql += ' AND dar.attendance_date >= ?';
        params.push(startDate);
      }

      if (endDate) {
        sql += ' AND dar.attendance_date <= ?';
        params.push(endDate);
      }

      sql += ' ORDER BY dar.attendance_date DESC, dar.check_in_time DESC';

      const records = await query(sql, params);

      return {
        success: true,
        data: { records }
      };
    } catch (error) {
      logger.error('詳細出欠記録取得エラー:', error.message);
      return {
        success: false,
        message: '詳細出欠記録の取得に失敗しました'
      };
    }
  }

  /**
   * 欠課学生の記録
   */
  static async markAbsentStudents(classId, attendanceDate) {
    try {
      const result = await transaction(async (conn) => {
        // 授業の存在確認
        const classes = await query(
          'SELECT * FROM classes WHERE id = ? AND is_active = TRUE',
          [classId]
        );

        if (classes.length === 0) {
          throw new Error('授業が見つかりません');
        }

        // 登録されている学生を取得
        const enrolledStudents = await query(
          `SELECT e.student_id, s.name as student_name
           FROM enrollments e
           JOIN students s ON e.student_id = s.student_id
           WHERE e.class_id = ? AND e.status = 'enrolled'`,
          [classId]
        );

        // 既に出席記録がある学生を除外
        const presentStudents = await query(
          'SELECT student_id FROM detailed_attendance_records WHERE class_id = ? AND attendance_date = ?',
          [classId, attendanceDate]
        );

        const presentStudentIds = presentStudents.map(s => s.student_id);
        const absentStudents = enrolledStudents.filter(s => !presentStudentIds.includes(s.student_id));

        // 欠課学生の記録を作成
        const absentRecords = [];
        for (const student of absentStudents) {
          await query(
            `INSERT INTO detailed_attendance_records 
             (student_id, class_id, attendance_date, status, notes) 
             VALUES (?, ?, ?, 'absent', '欠課として記録')`,
            [student.student_id, classId, attendanceDate]
          );
          absentRecords.push(student);
        }

        return {
          success: true,
          message: `${absentRecords.length}名の学生を欠課として記録しました`,
          data: {
            absentCount: absentRecords.length,
            absentStudents: absentRecords
          }
        };
      });

      return result;
    } catch (error) {
      logger.error('欠課学生記録エラー:', error.message);
      return {
        success: false,
        message: error.message || '欠課学生の記録に失敗しました'
      };
    }
  }

  /**
   * 学生出欠記録の削除
   */
  static async deleteAttendance(recordId) {
    try {
      const result = await query(
        'DELETE FROM student_attendance_records WHERE id = ?',
        [recordId]
      );

      if (result.affectedRows === 0) {
        return {
          success: false,
          message: '記録が見つかりません'
        };
      }

      logger.info('学生出欠記録削除成功', { recordId });
      return {
        success: true,
        message: '学生出欠記録が削除されました'
      };
    } catch (error) {
      logger.error('学生出欠記録削除エラー:', error.message);
      return {
        success: false,
        message: '学生出欠記録の削除に失敗しました'
      };
    }
  }

  /**
   * 曜日を取得するヘルパー関数
   */
  static getDayOfWeek(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }
}

module.exports = StudentAttendanceService;
