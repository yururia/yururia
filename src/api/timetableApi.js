import axios from 'axios';

const API_BASE_URL = '/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Excel用のクライアント
const excelClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // Excelインポートは時間がかかる可能性があるため長めに設定
});

const responseInterceptor = (response) => {
    if (response.data && response.data.success) {
        return response.data;
    }
    if (response.status === 200 && response.data) {
        return { success: true, data: response.data };
    }
    return response;
};

const errorInterceptor = (error) => {
    let errorResponse = {
        success: false,
        message: '不明なエラーが発生しました',
        status: null,
        data: null
    };

    if (error.response) {
        errorResponse.status = error.response.status;
        if (error.response.data && error.response.data.message) {
            errorResponse.message = error.response.data.message;
        } else {
            errorResponse.message = `API接続エラー: ${error.response.statusText}`;
        }
        errorResponse.data = error.response.data;
    } else if (error.request) {
        errorResponse.message = 'API接続エラー: サーバーに接続できません';
    } else {
        errorResponse.message = `API接続エラー: ${error.message}`;
    }

    console.error('Timetable API Error:', errorResponse.message);
    return Promise.reject(errorResponse);
};

apiClient.interceptors.response.use(responseInterceptor, errorInterceptor);
excelClient.interceptors.response.use(responseInterceptor, errorInterceptor);

/**
 * 時間割管理API
 */
export const timetableApi = {
    /**
     * 時間割作成
     * @param {Object} data - 時間割データ
     * @returns {Promise} 作成結果
     */
    createTimetable: async (data) => {
        return apiClient.post('/timetables', data);
    },

    /**
     * グループの時間割取得
     * @param {number} groupId - グループID
     * @returns {Promise} 時間割一覧
     */
    getTimetablesByGroup: async (groupId) => {
        return apiClient.get(`/timetables/group/${groupId}`);
    },

    /**
     * 時間割詳細取得
     * @param {number} timetableId - 時間割ID
     * @returns {Promise} 時間割詳細
     */
    getTimetable: async (timetableId) => {
        return apiClient.get(`/timetables/${timetableId}`);
    },

    /**
     * 時間割更新
     * @param {number} timetableId - 時間割ID
     * @param {Object} data - 更新データ
     * @returns {Promise} 更新結果
     */
    updateTimetable: async (timetableId, data) => {
        return apiClient.put(`/timetables/${timetableId}`, data);
    },

    /**
     * 時間割削除
     * @param {number} timetableId - 時間割ID
     * @returns {Promise} 削除結果
     */
    deleteTimetable: async (timetableId) => {
        return apiClient.delete(`/timetables/${timetableId}`);
    },

    /**
     * 授業セッション追加
     * @param {number} timetableId - 時間割ID
     * @param {Object} sessionData - セッションデータ
     * @returns {Promise} 追加結果
     */
    addClassSession: async (timetableId, sessionData) => {
        return apiClient.post(`/timetables/${timetableId}/sessions`, sessionData);
    },

    /**
     * 授業セッション更新
     * @param {number} sessionId - セッションID
     * @param {Object} data - 更新データ
     * @returns {Promise} 更新結果
     */
    updateClassSession: async (sessionId, data) => {
        return apiClient.put(`/timetables/sessions/${sessionId}`, data);
    },

    /**
     * 授業セッション削除
     * @param {number} sessionId - セッションID
     * @returns {Promise} 削除結果
     */
    deleteClassSession: async (sessionId) => {
        return apiClient.delete(`/timetables/sessions/${sessionId}`);
    },

    /**
     * 授業休講設定
     * @param {number} sessionId - セッションID
     * @param {boolean} isCancelled - 休講フラグ
     * @param {string} reason - 理由（オプション）
     * @returns {Promise} 設定結果
     */
    toggleSessionCancellation: async (sessionId, isCancelled, reason = '') => {
        return apiClient.put(`/timetables/sessions/${sessionId}/cancel`, {
            isCancelled,
            reason
        });
    },

    /**
     * カレンダーデータ取得（年/月/週対応）
     * @param {number} groupId - グループID
     * @param {string} periodType - 期間タイプ（'year' | 'month' | 'week'）
     * @param {string} startDate - 開始日（YYYY-MM-DD）
     * @param {string} endDate - 終了日（YYYY-MM-DD）
     * @returns {Promise} カレンダーデータ
     */
    getTimetableByPeriod: async (groupId, periodType, startDate, endDate) => {
        return apiClient.get(`/timetables/calendar/${groupId}`, {
            params: {
                periodType,
                startDate,
                endDate
            }
        });
    },

    /**
     * Excelから時間割インポート
     * @param {File} file - Excelファイル
     * @param {number} groupId - グループID
     * @returns {Promise} インポート結果
     */
    importFromExcel: async (file, groupId) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('groupId', groupId);

        return excelClient.post('/timetables/import', formData);
    },

    /**
     * 時間割テンプレート一覧取得
     * @returns {Promise} テンプレート一覧
     */
    getTemplates: async () => {
        return apiClient.get('/timetables/templates');
    },

    /**
     * 時間割テンプレート作成
     * @param {Object} data - テンプレートデータ
     * @returns {Promise} 作成結果
     */
    createTemplate: async (data) => {
        return apiClient.post('/timetables/templates', data);
    },

    /**
     * テンプレートから時間割作成
     * @param {number} templateId - テンプレートID
     * @param {number} groupId - グループID
     * @param {string} academicYear - 学年
     * @param {string} semester - 学期
     * @returns {Promise} 作成結果
     */
    createFromTemplate: async (templateId, groupId, academicYear, semester) => {
        return apiClient.post(`/timetables/templates/${templateId}/apply`, {
            groupId,
            academicYear,
            semester
        });
    },

    // ========================================
    // 組織設定関連API
    // ========================================

    /**
     * 組織の時間割設定を取得
     * @returns {Promise} 設定情報
     */
    getOrganizationSettings: async () => {
        return apiClient.get('/timetables/settings');
    },

    /**
     * 組織の時間割設定を保存
     * @param {Object} settings - 設定データ
     * @returns {Promise} 保存結果
     */
    saveOrganizationSettings: async (settings) => {
        return apiClient.post('/timetables/settings', settings);
    }
};

export default timetableApi;

