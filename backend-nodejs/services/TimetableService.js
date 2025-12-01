const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const XLSX = require('xlsx');
const fs = require('fs');

/**
 * 時間割管理サービス
 */
class TimetableService {
    /**
     * 時間割を作成
     * @param {Object} timetableData - 時間割データ
     * @returns {Promise<Object>} 作成された時間割
     */
    static async createTimetable(timetableData) {
        try {
            const { groupId, academicYear, semester, startDate, endDate } = timetableData;

            if (!groupId || !academicYear || !startDate || !endDate) {
                throw new Error('必須フィールドが不足しています');
            }

            const sql = `
        INSERT INTO timetables (group_id, academic_year, semester, start_date, end_date, is_active)
        VALUES (?, ?, ?, ?, ?, TRUE)
      `;

            const result = await query(sql, [groupId, academicYear, semester, startDate, endDate]);

            return await this.getTimetable(result.insertId);
        } catch (error) {
            logger.error('時間割作成エラー:', error);
            throw error;
        }
    }

    /**
     * 時間割詳細を取得
     * @param {number} timetableId - 時間割ID
     * @returns {Promise<Object>} 時間割詳細
     */
    static async getTimetable(timetableId) {
        try {
            const sql = `
        SELECT 
          t.id, t.group_id, t.academic_year, t.semester,
          t.start_date, t.end_date, t.is_active, t.created_at, t.updated_at,
          g.name as group_name, g.grade
        FROM timetables t
        JOIN groups g ON t.group_id = g.id
        WHERE t.id = ?
      `;

            const results = await query(sql, [timetableId]);

            if (results.length === 0) {
                throw new Error('時間割が見つかりません');
            }

            return results[0];
        } catch (error) {
            logger.error('時間割詳細取得エラー:', error);
            throw error;
        }
    }

    /**
     * グループの時間割一覧を取得
     * @param {number} groupId - グループID
     * @returns {Promise<Array>} 時間割一覧
     */
    static async getTimetablesByGroup(groupId) {
        try {
            const sql = `
        SELECT 
          id, group_id, academic_year, semester,
          start_date, end_date, is_active, created_at, updated_at
        FROM timetables
        WHERE group_id = ?
        ORDER BY academic_year DESC, start_date DESC
      `;

            return await query(sql, [groupId]);
        } catch (error) {
            logger.error('グループ時間割一覧取得エラー:', error);
            throw error;
        }
    }

    /**
     * 授業セッションを追加
     * @param {Object} sessionData - 授業セッションデータ
     * @returns {Promise<Object>} 作成された授業セッション
     */
    static async addClassSession(sessionData) {
        try {
            const {
                timetableId,
                subjectId,
                classDate,
                periodNumber,
                startTime,
                endTime,
                room,
                teacherName,
                notes
            } = sessionData;

            if (!timetableId || !subjectId || !classDate || !periodNumber || !startTime || !endTime) {
                throw new Error('必須フィールドが不足しています');
            }

            const sql = `
        INSERT INTO class_sessions 
        (timetable_id, subject_id, class_date, period_number, start_time, end_time, room, teacher_name, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

            const result = await query(sql, [
                timetableId,
                subjectId,
                classDate,
                periodNumber,
                startTime,
                endTime,
                room || null,
                teacherName || null,
                notes || null
            ]);

            return await this.getClassSession(result.insertId);
        } catch (error) {
            logger.error('授業セッション追加エラー:', error);
            throw error;
        }
    }

    /**
     * 授業セッション詳細を取得
     * @param {number} sessionId - 授業セッションID
     * @returns {Promise<Object>} 授業セッション詳細
     */
    static async getClassSession(sessionId) {
        try {
            const sql = `
        SELECT 
          cs.id, cs.timetable_id, cs.subject_id, cs.class_date,
          cs.period_number, cs.start_time, cs.end_time, cs.room,
          cs.teacher_name, cs.is_cancelled, cs.cancellation_reason, cs.notes,
          s.subject_name, s.subject_code
        FROM class_sessions cs
        JOIN subjects s ON cs.subject_id = s.id
        WHERE cs.id = ?
      `;

            const results = await query(sql, [sessionId]);

            if (results.length === 0) {
                throw new Error('授業セッションが見つかりません');
            }

            return results[0];
        } catch (error) {
            logger.error('授業セッション詳細取得エラー:', error);
            throw error;
        }
    }

    /**
     * 時間割の授業セッション一覧を取得
     * @param {number} timetableId - 時間割ID
     * @param {Object} options - 検索オプション
     * @returns {Promise<Array>} 授業セッション一覧
     */
    static async getClassSessions(timetableId, options = {}) {
        try {
            const { startDate, endDate } = options;

            let sql = `
        SELECT 
          cs.id, cs.timetable_id, cs.subject_id, cs.class_date,
          cs.period_number, cs.start_time, cs.end_time, cs.room,
          cs.teacher_name, cs.is_cancelled, cs.notes,
          s.subject_name, s.subject_code
        FROM class_sessions cs
        JOIN subjects s ON cs.subject_id = s.id
        WHERE cs.timetable_id = ?
      `;

            const params = [timetableId];

            if (startDate) {
                sql += ' AND cs.class_date >= ?';
                params.push(startDate);
            }

            if (endDate) {
                sql += ' AND cs.class_date <= ?';
                params.push(endDate);
            }

            sql += ' ORDER BY cs.class_date, cs.period_number';

            return await query(sql, params);
        } catch (error) {
            logger.error('授業セッション一覧取得エラー:', error);
            throw error;
        }
    }

    /**
     * 期間指定で授業セッションを取得（カレンダー表示用）
     * @param {number} groupId - グループID
     * @param {string} periodType - 期間タイプ (year/month/week)
     * @param {string} startDate - 開始日
     * @param {string} endDate - 終了日
     * @returns {Promise<Array>} 授業セッション一覧
     */
    static async getTimetableByPeriod(groupId, periodType, startDate, endDate) {
        try {
            const sql = `
        SELECT 
          cs.id, cs.timetable_id, cs.subject_id, cs.class_date,
          cs.period_number, cs.start_time, cs.end_time, cs.room,
          cs.teacher_name, cs.is_cancelled, cs.notes,
          s.subject_name, s.subject_code,
          t.academic_year, t.semester
        FROM class_sessions cs
        JOIN timetables t ON cs.timetable_id = t.id
        JOIN subjects s ON cs.subject_id = s.id
        WHERE t.group_id = ? AND cs.class_date BETWEEN ? AND ?
        ORDER BY cs.class_date, cs.period_number
      `;

            return await query(sql, [groupId, startDate, endDate]);
        } catch (error) {
            logger.error('期間別時間割取得エラー:', error);
            throw error;
        }
    }

    /**
     * Excelファイルから時間割をインポート
     * @param {string} filePath - Excelファイルパス
     * @param {number} groupId - グループID
     * @param {number} timetableId - 時間割ID（オプション、なければ新規作成）
     * @returns {Promise<Object>} インポート結果
     */
    static async importFromExcel(filePath, groupId, timetableId = null) {
        try {
            // Excelファイルを読み込み
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // JSONに変換
            const data = XLSX.utils.sheet_to_json(worksheet);

            if (data.length === 0) {
                throw new Error('Excelファイルにデータがありません');
            }

            let currentTimetableId = timetableId;
            let importedCount = 0;
            let errors = [];

            await transaction(async (conn) => {
                // 時間割IDが指定されていない場合は新規作成
                if (!currentTimetableId) {
                    const year = new Date().getFullYear().toString();
                    const createSql = `
            INSERT INTO timetables (group_id, academic_year, semester, start_date, end_date, is_active)
            VALUES (?, ?, 'インポート', ?, ?, TRUE)
          `;
                    const result = await conn.query(createSql, [
                        groupId,
                        year,
                        data[0]['日付'] || new Date().toISOString().split('T')[0],
                        data[data.length - 1]['日付'] || new Date().toISOString().split('T')[0]
                    ]);
                    currentTimetableId = result.insertId;
                }

                // 各行をインポート
                for (const row of data) {
                    try {
                        // 必須フィールドのチェック
                        if (!row['日付'] || !row['科目名'] || !row['開始時刻'] || !row['終了時刻']) {
                            errors.push({ row, reason: '必須フィールドが不足' });
                            continue;
                        }

                        // 科目を検索または作成
                        let subjectId = await this._findOrCreateSubject(conn, row['科目名'], row['科目コード']);

                        // 授業セッションを作成
                        const insertSql = `
              INSERT INTO class_sessions 
              (timetable_id, subject_id, class_date, period_number, start_time, end_time, room, teacher_name)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

                        await conn.query(insertSql, [
                            currentTimetableId,
                            subjectId,
                            row['日付'],
                            row['時限'] || 1,
                            row['開始時刻'],
                            row['終了時刻'],
                            row['教室'] || null,
                            row['担当者'] || null
                        ]);

                        importedCount++;
                    } catch (rowError) {
                        logger.error('行のインポートエラー:', rowError);
                        errors.push({ row, reason: rowError.message });
                    }
                }
            });

            // 一時ファイルを削除
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            return {
                success: true,
                timetableId: currentTimetableId,
                importedCount,
                totalRows: data.length,
                errors: errors.length > 0 ? errors : null
            };
        } catch (error) {
            logger.error('Excelインポートエラー:', error);
            throw error;
        }
    }

    /**
     * 科目を検索または作成（内部メソッド）
     * @param {Object} conn - データベース接続
     * @param {string} subjectName - 科目名
     * @param {string} subjectCode - 科目コード
     * @returns {Promise<number>} 科目ID
     */
    static async _findOrCreateSubject(conn, subjectName, subjectCode = null) {
        try {
            // 既存科目を検索
            const searchSql = `
        SELECT id FROM subjects
        WHERE subject_name = ? OR (subject_code = ? AND subject_code IS NOT NULL)
        LIMIT 1
      `;

            const existing = await conn.query(searchSql, [subjectName, subjectCode]);

            if (existing.length > 0) {
                return existing[0].id;
            }

            // 新規作成
            const code = subjectCode || `AUTO_${Date.now()}`;
            const insertSql = `
        INSERT INTO subjects (subject_code, subject_name, is_active)
        VALUES (?, ?, TRUE)
      `;

            const result = await conn.query(insertSql, [code, subjectName]);
            return result.insertId;
        } catch (error) {
            logger.error('科目検索/作成エラー:', error);
            throw error;
        }
    }

    /**
     * 授業のキャンセル/復活
     * @param {number} sessionId - 授業セッションID
     * @param {boolean} isCancelled - キャンセルフラグ
     * @param {string} reason - キャンセル理由
     * @returns {Promise<Object>} 更新結果
     */
    static async toggleSessionCancellation(sessionId, isCancelled, reason = null) {
        try {
            const sql = `
        UPDATE class_sessions
        SET is_cancelled = ?, cancellation_reason = ?
        WHERE id = ?
      `;

            await query(sql, [isCancelled, reason, sessionId]);

            return await this.getClassSession(sessionId);
        } catch (error) {
            logger.error('授業キャンセル更新エラー:', error);
            throw error;
        }
    }
}

module.exports = TimetableService;
