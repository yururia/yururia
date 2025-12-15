const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const NotificationService = require('./NotificationService');

/**
 * 承認フロー管理サービス
 */
class ApprovalService {
    /**
     * 申請を承認
     * @param {number} requestId - 申請ID
     * @param {number} approverId - 承認者ID
     * @param {string} comment - コメント（オプション）
     * @returns {Promise<Object>} 承認結果
     */
    static async approveRequest(requestId, approverId, comment = null) {
        try {
            return await transaction(async (conn) => {
                // 承認記録を追加
                const approvalSql = `
          INSERT INTO request_approvals (request_id, approver_id, action, comment)
          VALUES (?, ?, 'approve', ?)
        `;
                await conn.query(approvalSql, [requestId, approverId, comment]);

                // 申請のステータスを更新
                const updateSql = `
          UPDATE absence_requests
          SET status = 'approved'
          WHERE id = ?
        `;
                await conn.query(updateSql, [requestId]);

                // 申請情報を取得
                const requestSql = `
          SELECT ar.*, s.name as student_name
          FROM absence_requests ar
          JOIN students s ON ar.student_id = s.student_id
          WHERE ar.id = ?
        `;
                const [requestData] = await conn.query(requestSql, [requestId]);

                // 出欠ステータスを上書き
                if (requestData.class_session_id) {
                    await this._updateAttendanceStatus(conn, requestData);
                }

                // 通知を送信（非同期）
                const studentId = requestData[0]?.student_id;
                const requestType = requestData[0]?.request_type;
                const requestDate = requestData[0]?.request_date;
                const formattedDate = requestDate ? new Date(requestDate).toLocaleDateString('ja-JP') : '';

                logger.info('承認通知送信準備', { studentId, requestType, requestDate });

                if (studentId) {
                    NotificationService.createNotification({
                        student_id: studentId,
                        type: 'approval',
                        title: '✅ 申請が承認されました',
                        message: `あなたの${formattedDate ? formattedDate + 'の' : ''}申請（${ApprovalService._getRequestTypeLabel(requestType)}）が承認されました。\nカレンダーで確認してください。`,
                        priority: 'medium'
                    }).then(() => {
                        logger.info('承認通知送信成功', { studentId });
                    }).catch(err => logger.error('通知送信エラー:', err));
                }

                return {
                    success: true,
                    requestId,
                    newStatus: 'approved'
                };
            });
        } catch (error) {
            logger.error('承認処理エラー:', error);
            throw error;
        }
    }

    /**
     * 申請を却下
     * @param {number} requestId - 申請ID
     * @param {number} approverId - 承認者ID
     * @param {string} comment - コメント（オプション）
     * @returns {Promise<Object>} 却下結果
     */
    static async rejectRequest(requestId, approverId, comment = null) {
        try {
            return await transaction(async (conn) => {
                // 却下記録を追加
                const approvalSql = `
          INSERT INTO request_approvals (request_id, approver_id, action, comment)
          VALUES (?, ?, 'reject', ?)
        `;
                await conn.query(approvalSql, [requestId, approverId, comment]);

                // 申請のステータスを更新
                const updateSql = `
          UPDATE absence_requests
          SET status = 'rejected'
          WHERE id = ?
        `;
                await conn.query(updateSql, [requestId]);

                // 申請情報を取得
                const requestSql = `
          SELECT ar.*, s.name as student_name
          FROM absence_requests ar
          JOIN students s ON ar.student_id = s.student_id
          WHERE ar.id = ?
        `;
                const [requestData] = await conn.query(requestSql, [requestId]);

                // 通知を送信（非同期）
                const studentId = requestData[0]?.student_id;
                const requestType = requestData[0]?.request_type;
                const requestDate = requestData[0]?.request_date;
                const formattedDate = requestDate ? new Date(requestDate).toLocaleDateString('ja-JP') : '';

                logger.info('却下通知送信準備', { studentId, requestType, requestDate });

                if (studentId) {
                    NotificationService.createNotification({
                        student_id: studentId,
                        type: 'rejection',
                        title: '❌ 申請が却下されました',
                        message: `あなたの${formattedDate ? formattedDate + 'の' : ''}申請（${ApprovalService._getRequestTypeLabel(requestType)}）が却下されました。${comment ? `\n理由: ${comment}` : ''}\nカレンダーで確認してください。`,
                        priority: 'high'
                    }).then(() => {
                        logger.info('却下通知送信成功', { studentId });
                    }).catch(err => logger.error('通知送信エラー:', err));
                }

                return {
                    success: true,
                    requestId,
                    newStatus: 'rejected'
                };
            });
        } catch (error) {
            logger.error('却下処理エラー:', error);
            throw error;
        }
    }

    /**
     * 出欠ステータスを上書き（内部メソッド）
     * @param {Object} conn - データベース接続
     * @param {Object} requestData - 申請データ
     * @returns {Promise<void>}
     */
    static async _updateAttendanceStatus(conn, requestData) {
        try {
            const { student_id, class_session_id, request_type, request_date } = requestData;

            // request_typeに応じた出欠ステータスを決定
            let newStatus;
            switch (request_type) {
                case 'official_absence':
                    newStatus = 'excused'; // 公欠
                    break;
                case 'official_late':
                    newStatus = 'late'; // 公認遅刻（通常の遅刻として記録）
                    break;
                case 'early_departure':
                    newStatus = 'early_departure'; // 早退
                    break;
                case 'absence':
                    newStatus = 'absent'; // 欠席（変更なし）
                    break;
                default:
                    newStatus = 'excused';
            }

            // 既存の出欠記録を更新、なければ作成
            const upsertSql = `
        INSERT INTO detailed_attendance_records 
        (student_id, class_id, attendance_date, status, notes)
        VALUES (?, ?, ?, ?, '承認済み申請による自動更新')
        ON DUPLICATE KEY UPDATE 
          status = ?,
          notes = CONCAT(IFNULL(notes, ''), ' | 承認済み申請による更新')
      `;

            await conn.query(upsertSql, [
                student_id,
                class_session_id,
                request_date,
                newStatus,
                newStatus
            ]);

            logger.info(`出欠ステータス更新: student=${student_id}, session=${class_session_id}, status=${newStatus}`);
        } catch (error) {
            logger.error('出欠ステータス更新エラー:', error);
            // エラーをスローせず、ログのみ記録（承認処理自体は成功とする）
        }
    }

    /**
     * 申請の承認履歴を取得
     * @param {number} requestId - 申請ID
     * @returns {Promise<Array>} 承認履歴
     */
    static async getApprovalHistory(requestId) {
        try {
            const sql = `
        SELECT 
          ra.id, ra.request_id, ra.approver_id, ra.action, ra.comment, ra.approved_at,
          u.name as approver_name, u.email as approver_email
        FROM request_approvals ra
        JOIN users u ON ra.approver_id = u.id
        WHERE ra.request_id = ?
        ORDER BY ra.approved_at DESC
      `;

            return await query(sql, [requestId]);
        } catch (error) {
            logger.error('承認履歴取得エラー:', error);
            throw error;
        }
    }

    /**
     * リクエストタイプのラベルを取得
     * @param {string} type - リクエストタイプ
     * @returns {string} ラベル
     */
    static _getRequestTypeLabel(type) {
        const labels = {
            'absence': '欠席届',
            'official_absence': '公欠届',
            'official_late': '公遅刻届',
            'early_departure': '早退届',
            'absent': '欠席届'
        };
        return labels[type] || type || '申請';
    }
}

module.exports = ApprovalService;
