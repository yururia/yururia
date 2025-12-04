const { query } = require('../config/database');
const logger = require('../utils/logger');
const StudentAttendanceService = require('./StudentAttendanceService');
const SecurityService = require('./SecurityService');
const uuid = require('uuid');

class QRService {
  /**
   * 場所ベースのQRコードを生成（管理者のみ）
   * @param {Object} data - QRコードデータ
   * @param {number} createdBy - 作成者ID（管理者）
   * @returns {Promise<Object>} 生成結果
   */
  static async generateLocationQRCode(data, createdBy) {
    try {
      const QRCode = require('qrcode');
      const { locationName, locationDescription, expiresAt } = data;

      if (!locationName) {
        return {
          success: false,
          message: '場所名は必須です'
        };
      }

      // ユニークなQRコードを生成
      const code = `LOC_${uuid.v4()}`;

      // データベースに保存
      const sql = `
        INSERT INTO qr_codes (code, location_name, location_description, created_by, expires_at, is_active)
        VALUES (?, ?, ?, ?, ?, TRUE)
      `;

      const result = await query(sql, [
        code,
        locationName,
        locationDescription || null,
        createdBy,
        expiresAt || null
      ]);

      // QRコード画像を生成
      const qrImage = await QRCode.toDataURL(code, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 400,
        margin: 2
      });

      logger.info('場所ベースQRコードを生成しました', { locationName, code });

      return {
        success: true,
        message: 'QRコードを生成しました',
        data: {
          id: result.insertId,
          code: code,
          qrImage: qrImage,
          locationName: locationName,
          locationDescription: locationDescription
        }
      };
    } catch (error) {
      logger.error('QRコード生成エラー:', error);
      return {
        success: false,
        message: 'QRコードの生成に失敗しました',
        error: error.message
      };
    }
  }

  /**
   * 既存の generateQRCode (グループID用、後方互換性のため残す)
   */
  static async generateQRCode(data) {
    try {
      const QRCode = require('qrcode');
      const { groupId, format = 'json' } = data;

      if (!groupId) {
        return {
          success: false,
          message: 'グループIDが必要です'
        };
      }

      // QRコードデータの生成
      const qrData = {
        type: 'attendance',
        groupId: groupId,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      let qrString;
      if (format === 'json') {
        qrString = JSON.stringify(qrData);
      } else {
        qrString = `ATTENDANCE_GROUP_${groupId}_${Date.now()}`;
      }

      // QRコード画像を生成
      const qrImage = await QRCode.toDataURL(qrString, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300
      });

      logger.info('QRコードを生成しました', { groupId });

      return {
        success: true,
        data: {
          qrData: qrString,
          qrImage: qrImage,
          groupId: groupId
        }
      };
    } catch (error) {
      logger.error('QRコード生成エラー:', error.message);
      return {
        success: false,
        message: 'QRコードの生成に失敗しました'
      };
    }
  }

  static async verifyQRCode(qrData) {
    try {
      if (!qrData) {
        return {
          success: false,
          message: 'QRコードデータが提供されていません'
        };
      }

      // QRコードデータの検証
      let parsedData;
      try {
        parsedData = JSON.parse(qrData);
      } catch (e) {
        // JSONでない場合は文字列として扱う
        if (qrData.startsWith('SCHOOL_ATTENDANCE')) {
          return {
            success: true,
            data: {
              valid: true,
              type: 'school_attendance'
            }
          };
        }
        return {
          success: false,
          message: '無効なQRコード形式です'
        };
      }

      // QRコードデータの検証
      if (parsedData.type === 'attendance' && parsedData.groupId) {
        return {
          success: true,
          data: {
            valid: true,
            type: 'attendance',
            groupId: parsedData.groupId
          }
        };
      }

      return {
        success: false,
        message: '無効なQRコードです'
      };
    } catch (error) {
      logger.error('QRコード検証エラー:', error.message);
      return {
        success: false,
        message: 'QRコードの検証に失敗しました'
      };
    }
  }
  /**
   * QRコードスキャン（IP検証付き、新システム用）
   * @param {Object} data - スキャンデータ
   * @param {string} ipAddress - スキャン元IPアドレス
   * @param {string} userAgent - ユーザーエージェント
   * @returns {Promise<Object>} スキャン結果
   */
  static async scanQRCodeWithIPValidation(data, ipAddress, userAgent) {
    try {
      const { qrCode, studentId } = data;
      const scanTime = new Date();

      // 1. IPアドレス検証
      const ipCheck = await SecurityService.isIPAllowed(ipAddress);

      if (!ipCheck.allowed) {
        // IPが許可されていない場合、ログに記録して拒否
        await SecurityService.logScan({
          qrCodeId: null,
          studentId,
          ipAddress,
          isAllowed: false,
          userAgent,
          result: 'ip_denied',
          errorMessage: '許可されていないネットワークからのアクセスです'
        });

        return {
          success: false,
          message: '指定のWi-Fiネットワークに接続してください',
          error: 'IP_NOT_ALLOWED'
        };
      }

      // 2. QRコードの検証
      const qrCodeData = await query(
        'SELECT * FROM qr_codes WHERE code = ? AND is_active = TRUE',
        [qrCode]
      );

      if (qrCodeData.length === 0) {
        await SecurityService.logScan({
          qrCodeId: null,
          studentId,
          ipAddress,
          isAllowed: true,
          userAgent,
          result: 'invalid_qr',
          errorMessage: '無効なQRコードです'
        });

        return {
          success: false,
          message: '無効なQRコードです'
        };
      }

      const qrCodeInfo = qrCodeData[0];

      // 有効期限チェック
      if (qrCodeInfo.expires_at && new Date(qrCodeInfo.expires_at) < scanTime) {
        await SecurityService.logScan({
          qrCodeId: qrCodeInfo.id,
          studentId,
          ipAddress,
          isAllowed: true,
          userAgent,
          result: 'error',
          errorMessage: 'QRコードの有効期限が切れています'
        });

        return {
          success: false,
          message: 'QRコードの有効期限が切れています'
        };
      }

      // 3. 学生の現在の授業セッションを検索（新しいclass_sessionsテーブルを使用）
      const currentDate = scanTime.toISOString().split('T')[0];
      const currentTime = scanTime.toTimeString().split(' ')[0];

      const sessionSql = `
        SELECT 
          cs.id, cs.subject_id, cs.class_date, cs.start_time, cs.end_time,
          s.subject_name, cs.teacher_name, cs.room,
          t.group_id
        FROM class_sessions cs
        JOIN subjects s ON cs.subject_id = s.id
        JOIN timetables t ON cs.timetable_id = t.id
        JOIN group_members gm ON t.group_id = gm.group_id
        WHERE gm.student_id = ?
          AND cs.class_date = ?
          AND cs.start_time <= ?
          AND cs.end_time >= ?
          AND cs.is_cancelled = FALSE
          AND gm.status = 'active'
        ORDER BY cs.start_time ASC
        LIMIT 1
      `;

      const sessions = await query(sessionSql, [studentId, currentDate, currentTime, currentTime]);

      if (sessions.length === 0) {
        await SecurityService.logScan({
          qrCodeId: qrCodeInfo.id,
          studentId,
          ipAddress,
          isAllowed: true,
          userAgent,
          result: 'error',
          errorMessage: '現在時刻に該当する授業が見つかりません'
        });

        return {
          success: false,
          message: '現在時刻に該当する授業が見つかりません'
        };
      }

      const session = sessions[0];

      // 4. 出欠ステータスを判定（時刻ベース）
      const AttendanceService = require('./AttendanceService');
      const status = await AttendanceService.determineAttendanceStatus(
        scanTime,
        session.start_time,
        session.class_date
      );

      // 5. 出欠記録を作成/更新
      const recordSql = `
        INSERT INTO detailed_attendance_records 
        (student_id, class_id, attendance_date, status, check_in_time)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          status = VALUES(status),
          check_in_time = VALUES(check_in_time)
      `;

      await query(recordSql, [
        studentId,
        session.id,
        currentDate,
        status,
        scanTime
      ]);

      // 6. スキャンログに記録
      await SecurityService.logScan({
        qrCodeId: qrCodeInfo.id,
        studentId,
        ipAddress,
        isAllowed: true,
        userAgent,
        result: 'success',
        errorMessage: null
      });

      logger.info('QRスキャン成功', { studentId, sessionId: session.id, status });

      return {
        success: true,
        message: `出席を記録しました（${status === 'present' ? '出席' : status === 'late' ? '遅刻' : status}）`,
        data: {
          status,
          sessionInfo: {
            subjectName: session.subject_name,
            teacherName: session.teacher_name,
            room: session.room,
            startTime: session.start_time
          },
          location: qrCodeInfo.location_name
        }
      };
    } catch (error) {
      logger.error('QRスキャンエラー:', error);
      return {
        success: false,
        message: 'QRコードスキャンの処理に失敗しました',
        error: error.message
      };
    }
  }

  /**
   * 既存の scanQRCode (後方互換性のため残す)
   */
  static async scanQRCode(data) {
    try {
      const { qr_data, timestamp, scanned_by } = data;

      // 1. QRコードが学校固有のものか検証
      if (!qr_data || !qr_data.startsWith('SCHOOL_ATTENDANCE')) {
        return {
          success: false,
          message: '無効なQRコードです。学校固有のQRコードをスキャンしてください。'
        };
      }

      // 2. スキャンしたユーザー（学生）の情報を取得
      const user = await query('SELECT * FROM users WHERE id = ?', [scanned_by]);
      if (!user[0] || user[0].role !== 'student') {
        return {
          success: false,
          message: '学生としてログインしてください'
        };
      }

      const studentId = user[0].student_id;
      if (!studentId) {
        return {
          success: false,
          message: '学生IDが見つかりません'
        };
      }

      // 3. 現在時刻と曜日から該当する授業を検索
      const scanTime = timestamp ? new Date(timestamp) : new Date();
      const currentTime = scanTime.toTimeString().split(' ')[0];
      const dayOfWeek = StudentAttendanceService.getDayOfWeek(scanTime);

      const classes = await query(
        `SELECT c.*, s.subject_name, e.id as enrollment_id
         FROM classes c
         JOIN subjects s ON c.subject_id = s.id
         JOIN enrollments e ON c.id = e.class_id
         WHERE e.student_id = ? 
         AND c.schedule_day = ? 
         AND c.start_time <= ? 
         AND c.end_time >= ?
         AND c.is_active = TRUE
         AND e.status = 'enrolled'
         ORDER BY c.start_time ASC`,
        [studentId, dayOfWeek, currentTime, currentTime]
      );

      // 4. 該当授業が複数ある場合は選択肢を返す
      if (classes.length > 1) {
        return {
          success: true,
          requiresSelection: true,
          message: '複数の授業が見つかりました。選択してください。',
          data: { classes }
        };
      }

      // 5. 該当授業が1つの場合は自動記録
      if (classes.length === 1) {
        const result = await StudentAttendanceService.recordQRAttendance(
          studentId,
          timestamp,
          classes[0].id
        );
        return result;
      }

      // 6. 該当授業がない場合
      return {
        success: false,
        message: '現在時刻に該当する授業が見つかりません'
      };
    } catch (error) {
      logger.error('QRコードスキャンエラー:', error.message);
      return {
        success: false,
        message: error.message || 'QRコードスキャンの処理に失敗しました'
      };
    }
  }
  /**
   * QRコード一覧を取得
   * @param {Object} options - 検索オプション
   * @returns {Promise<Object>} QRコード一覧
   */
  static async getQRCodes(options = {}) {
    try {
      const { activeOnly = true, limit = 50, offset = 0 } = options;

      let sql = `
        SELECT 
          qr.id, qr.code, qr.location_name, qr.location_description,
          qr.is_active, qr.created_at, qr.expires_at,
          u.name as created_by_name
        FROM qr_codes qr
        LEFT JOIN users u ON qr.created_by = u.id
        WHERE 1=1
      `;

      const params = [];

      if (activeOnly) {
        sql += ' AND qr.is_active = TRUE';
      }

      sql += ' ORDER BY qr.created_at DESC';

      // Add pagination
      if (limit) {
        sql += ' LIMIT ?';
        params.push(Number(limit));
      }
      if (offset) {
        sql += ' OFFSET ?';
        params.push(Number(offset));
      }

      const results = await query(sql, params);

      return {
        success: true,
        data: results
      };
    } catch (error) {
      logger.error('QRコード一覧取得エラー:', error);
      return {
        success: false,
        message: 'QRコード一覧の取得に失敗しました',
        error: error.message
      };
    }
  }

  /**
   * QRコードを無効化
   * @param {number} id - QRコードID
   * @returns {Promise<Object>} 無効化結果
   */
  static async deactivateQRCode(id) {
    try {
      const sql = 'UPDATE qr_codes SET is_active = FALSE WHERE id = ?';
      await query(sql, [id]);

      logger.info('QRコードを無効化しました', { id });

      return {
        success: true,
        message: 'QRコードを無効化しました'
      };
    } catch (error) {
      logger.error('QRコード無効化エラー:', error);
      return {
        success: false,
        message: 'QRコードの無効化に失敗しました',
        error: error.message
      };
    }
  }

  /**
   * QRコードを削除
   * @param {number} id - QRコードID
   * @returns {Promise<Object>} 削除結果
   */
  static async deleteQRCode(id) {
    try {
      const sql = 'DELETE FROM qr_codes WHERE id = ?';
      await query(sql, [id]);

      logger.info('QRコードを削除しました', { id });

      return {
        success: true,
        message: 'QRコードを削除しました'
      };
    } catch (error) {
      logger.error('QRコード削除エラー:', error);
      return {
        success: false,
        message: 'QRコードの削除に失敗しました',
        error: error.message
      };
    }
  }

  /**
   * QRコード履歴を取得（後方互換性）
   */
  static async getQRHistory(options) {
    logger.warn('getQRHistory は非推奨です。getQRCodes を使用してください。');
    return await this.getQRCodes(options);
  }
}

module.exports = QRService;
