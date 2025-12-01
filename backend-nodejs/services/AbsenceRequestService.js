const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 欠席申請管理サービス
 */
class AbsenceRequestService {
    /**
     * 新しい申請を作成
     * @param {Object} requestData - 申請データ
     * @returns {Promise<Object>} 作成された申請
     */
    static async createRequest(requestData) {
        try {
            const {
                studentId,
                classSessionId,
                requestType,
                requestDate,
                reason,
                attachmentUrl
            } = requestData;

            if (!studentId || !requestType || !requestDate || !reason) {
                throw new Error('必須フィールドが不足しています');
            }

            const sql = `
        INSERT INTO absence_requests 
        (student_id, class_session_id, request_type, request_date, reason, attachment_url, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `;

            const result = await query(sql, [
                studentId,
                classSessionId || null,
                requestType,
                requestDate,
                reason,
                attachmentUrl || null
            ]);

            return await this.getRequest(result.insertId);
        } catch (error) {
            logger.error('申請作成エラー:', error);
            throw error;
        }
    }

    /**
     * 申請詳細を取得
     * @param {number} requestId - 申請ID
     * @returns {Promise<Object>} 申請詳細
     */
    static async getRequest(requestId) {
        try {
            const sql = `
        SELECT 
          ar.id, ar.student_id, ar.class_session_id, ar.request_type,
          ar.request_date, ar.reason, ar.attachment_url, ar.status,
          ar.submitted_at, ar.updated_at,
          s.name as student_name, s.email as student_email,
          cs.class_date, cs.period_number,
          subj.subject_name
        FROM absence_requests ar
        JOIN students s ON ar.student_id = s.student_id
        LEFT JOIN class_sessions cs ON ar.class_session_id = cs.id
        LEFT JOIN subjects subj ON cs.subject_id = subj.id
        WHERE ar.id = ?
      `;

            const results = await query(sql, [requestId]);

            if (results.length === 0) {
                throw new Error('申請が見つかりません');
            }

            return results[0];
        } catch (error) {
            logger.error('申請詳細取得エラー:', error);
            throw error;
        }
    }

    /**
     * 学生の申請一覧を取得
     * @param {string} studentId - 学生ID
     * @param {Object} options - 検索オプション
     * @returns {Promise<Array>} 申請一覧
     */
    static async getRequestsByStudent(studentId, options = {}) {
        try {
            const { status, startDate, endDate, limit = 50, offset = 0 } = options;

            let sql = `
        SELECT 
          ar.id, ar.student_id, ar.class_session_id, ar.request_type,
          ar.request_date, ar.reason, ar.attachment_url, ar.status,
          ar.submitted_at, ar.updated_at,
          cs.class_date, cs.period_number,
          subj.subject_name
        FROM absence_requests ar
        LEFT JOIN class_sessions cs ON ar.class_session_id = cs.id
        LEFT JOIN subjects subj ON cs.subject_id = subj.id
        WHERE ar.student_id = ?
      `;

            const params = [studentId];

            if (status) {
                sql += ' AND ar.status = ?';
                params.push(status);
            }

            if (startDate) {
                sql += ' AND ar.request_date >= ?';
                params.push(startDate);
            }

            if (endDate) {
                sql += ' AND ar.request_date <= ?';
                params.push(endDate);
            }

            sql += ' ORDER BY ar.submitted_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            return await query(sql, params);
        } catch (error) {
            logger.error('学生申請一覧取得エラー:', error);
            throw error;
        }
    }

    /**
     * 教員の承認待ち申請一覧を取得
     * @param {number} teacherId - 教員ID
     * @param {Object} options - 検索オプション
     * @returns {Promise<Array>} 申請一覧
     */
    static async getPendingRequestsForTeacher(teacherId, options = {}) {
        try {
            // 教員が担当するグループの学生の申請を取得
            const { limit = 50, offset = 0 } = options;

            const sql = `
        SELECT DISTINCT
          ar.id, ar.student_id, ar.class_session_id, ar.request_type,
          ar.request_date, ar.reason, ar.attachment_url, ar.status,
          ar.submitted_at, ar.updated_at,
          s.name as student_name, s.email as student_email,
          g.name as group_name,
          cs.class_date, cs.period_number,
          subj.subject_name
        FROM absence_requests ar
        JOIN students s ON ar.student_id = s.student_id
        JOIN group_members gm ON s.student_id = gm.student_id
        JOIN groups g ON gm.group_id = g.id
        JOIN group_teachers gt ON g.id = gt.group_id
        LEFT JOIN class_sessions cs ON ar.class_session_id = cs.id
        LEFT JOIN subjects subj ON cs.subject_id = subj.id
        WHERE gt.user_id = ? AND ar.status = 'pending'
        ORDER BY ar.submitted_at ASC
        LIMIT ? OFFSET ?
      `;

            return await query(sql, [teacherId, limit, offset]);
        } catch (error) {
            logger.error('教員承認待ち申請取得エラー:', error);
            throw error;
        }
    }

    /**
     * すべての申請一覧を取得（管理者用）
     * @param {Object} options - 検索オプション
     * @returns {Promise<Array>} 申請一覧
     */
    static async getAllRequests(options = {}) {
        try {
            const { status, startDate, endDate, limit = 100, offset = 0 } = options;

            let sql = `
        SELECT 
          ar.id, ar.student_id, ar.class_session_id, ar.request_type,
          ar.request_date, ar.reason, ar.attachment_url, ar.status,
          ar.submitted_at, ar.updated_at,
          s.name as student_name, s.email as student_email,
          cs.class_date, cs.period_number,
          subj.subject_name
        FROM absence_requests ar
        JOIN students s ON ar.student_id = s.student_id
        LEFT JOIN class_sessions cs ON ar.class_session_id = cs.id
        LEFT JOIN subjects subj ON cs.subject_id = subj.id
        WHERE 1=1
      `;

            const params = [];

            if (status) {
                sql += ' AND ar.status = ?';
                params.push(status);
            }

            if (startDate) {
                sql += ' AND ar.request_date >= ?';
                params.push(startDate);
            }

            if (endDate) {
                sql += ' AND ar.request_date <= ?';
                params.push(endDate);
            }

            sql += ' ORDER BY ar.submitted_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            return await query(sql, params);
        } catch (error) {
            logger.error('全申請一覧取得エラー:', error);
            throw error;
        }
    }

    /**
     * 申請を取り消し（学生のみ、pending状態のみ）
     * @param {number} requestId - 申請ID
     * @param {string} studentId - 学生ID
     * @returns {Promise<Object>} 取り消し結果
     */
    static async cancelRequest(requestId, studentId) {
        try {
            // 自分の申請で、まだpending状態のもののみ削除可能
            const sql = `
        DELETE FROM absence_requests
        WHERE id = ? AND student_id = ? AND status = 'pending'
      `;

            const result = await query(sql, [requestId, studentId]);

            if (result.affectedRows === 0) {
                throw new Error('申請の取り消しに失敗しました。既に処理されているか、権限がありません。');
            }

            return { success: true, requestId };
        } catch (error) {
            logger.error('申請取り消しエラー:', error);
            throw error;
        }
    }
}

module.exports = AbsenceRequestService;
