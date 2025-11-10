const { query } = require('../config/database');
const logger = require('../utils/logger');
const StudentAttendanceService = require('./StudentAttendanceService');

class QRService {
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
  static async getQRHistory(options) {
    logger.warn('ダミーのQRService.getQRHistoryが呼び出されました');
    return { success: true, data: { history: [], total: 0 } };
  }
  static async deleteQRCode(id) {
    logger.warn('ダミーのQRService.deleteQRCodeが呼び出されました');
    return { success: true };
  }
}

module.exports = QRService;
