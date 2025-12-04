import axios from 'axios';

const API_BASE_URL = '/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 10000,
});

// マルチパートフォームデータ用のクライアント
const formDataClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'multipart/form-data',
    },
    timeout: 30000, // ファイルアップロードのため長めに設定
});

// レスポンスインターセプター
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

    console.error('Absence Request API Error:', errorResponse.message);
    return Promise.reject(errorResponse);
};

apiClient.interceptors.response.use(responseInterceptor, errorInterceptor);
formDataClient.interceptors.response.use(responseInterceptor, errorInterceptor);

/**
 * 欠席申請・承認API
 */
export const absenceRequestApi = {
    /**
     * 欠席申請作成（学生用）
     * @param {Object} data - 申請データ
     * @param {File} file - 添付ファイル（オプション）
     * @returns {Promise} 作成結果
     */
    createRequest: async (data, file = null) => {
        if (file) {
            const formData = new FormData();
            formData.append('studentId', data.studentId);
            formData.append('requestType', data.requestType);
            formData.append('requestDate', data.requestDate);
            formData.append('reason', data.reason);
            formData.append('attachment', file);

            return formDataClient.post('/absence-requests', formData);
        } else {
            return apiClient.post('/absence-requests', data);
        }
    },

    /**
     * 学生の申請一覧取得
     * @param {string} studentId - 学生ID
     * @param {Object} filters - フィルタ条件
     * @returns {Promise} 申請一覧
     */
    getRequestsByStudent: async (studentId, filters = {}) => {
        return apiClient.get(`/absence-requests/student/${studentId}`, {
            params: filters
        });
    },

    /**
     * 教員の承認待ち申請一覧取得
     * @param {number} teacherId - 教員ID
     * @param {Object} filters - フィルタ条件
     * @returns {Promise} 申請一覧
     */
    getPendingRequestsForTeacher: async (teacherId, filters = {}) => {
        return apiClient.get(`/absence-requests/teacher/${teacherId}`, {
            params: filters
        });
    },

    /**
     * 全申請一覧取得（管理者用）
     * @param {Object} filters - フィルタ条件
     * @returns {Promise} 申請一覧
     */
    getAllRequests: async (filters = {}) => {
        return apiClient.get('/absence-requests/all', {
            params: filters
        });
    },

    /**
     * 申請詳細取得
     * @param {number} requestId - 申請ID
     * @returns {Promise} 申請詳細
     */
    getRequest: async (requestId) => {
        return apiClient.get(`/absence-requests/${requestId}`);
    },

    /**
     * 申請キャンセル（学生用）
     * @param {number} requestId - 申請ID
     * @returns {Promise} キャンセル結果
     */
    cancelRequest: async (requestId) => {
        return apiClient.delete(`/absence-requests/${requestId}`);
    },

    /**
     * 申請承認（教員/管理者用）
     * @param {number} requestId - 申請ID
     * @param {string} comment - コメント（オプション）
     * @returns {Promise} 承認結果
     */
    approveRequest: async (requestId, comment = '') => {
        return apiClient.post(`/approvals/${requestId}/approve`, { comment });
    },

    /**
     * 申請却下（教員/管理者用）
     * @param {number} requestId - 申請ID
     * @param {string} comment - コメント（必須）
     * @returns {Promise} 却下結果
     */
    rejectRequest: async (requestId, comment) => {
        return apiClient.post(`/approvals/${requestId}/reject`, { comment });
    },

    /**
     * 承認履歴取得
     * @param {number} requestId - 申請ID
     * @returns {Promise} 承認履歴
     */
    getApprovalHistory: async (requestId) => {
        return apiClient.get(`/approvals/${requestId}/history`);
    }
};

export default absenceRequestApi;
