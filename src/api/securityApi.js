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

apiClient.interceptors.response.use(
    (response) => {
        if (response.data && response.data.success) {
            return response.data;
        }
        if (response.status === 200 && response.data) {
            return { success: true, data: response.data };
        }
        return response;
    },
    (error) => {
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

        console.error('Security API Error:', errorResponse.message);
        return Promise.reject(errorResponse);
    }
);

/**
 * セキュリティ・QR管理API
 */
export const securityApi = {
    // === IP範囲管理 ===

    /**
     * 許可IP範囲一覧取得
     * @returns {Promise} IP範囲一覧
     */
    getIPRanges: async () => {
        return apiClient.get('/security/ip-ranges');
    },

    /**
     * IP範囲追加（管理者のみ）
     * @param {Object} data - IP範囲データ
     * @returns {Promise} 追加結果
     */
    addIPRange: async (data) => {
        return apiClient.post('/security/ip-ranges', data);
    },

    /**
     * IP範囲更新（管理者のみ）
     * @param {number} id - IP範囲ID
     * @param {Object} data - 更新データ
     * @returns {Promise} 更新結果
     */
    updateIPRange: async (id, data) => {
        return apiClient.put(`/security/ip-ranges/${id}`, data);
    },

    /**
     * IP範囲削除（管理者のみ）
     * @param {number} id - IP範囲ID
     * @returns {Promise} 削除結果
     */
    deleteIPRange: async (id) => {
        return apiClient.delete(`/security/ip-ranges/${id}`);
    },

    /**
     * IPアドレス検証
     * @param {string} ipAddress - 検証するIPアドレス
     * @returns {Promise} 検証結果
     */
    validateIP: async (ipAddress) => {
        return apiClient.post('/security/validate-ip', { ipAddress });
    },

    // === スキャンログ ===

    /**
     * スキャンログ一覧取得（管理者のみ）
     * @param {Object} filters - フィルタ条件
     * @returns {Promise} スキャンログ一覧
     */
    getScanLogs: async (filters = {}) => {
        return apiClient.get('/security/scan-logs', {
            params: filters
        });
    },

    /**
     * セキュリティ統計取得（管理者のみ）
     * @param {string} period - 期間（'day' | 'week' | 'month'）
     * @returns {Promise} 統計データ
     */
    getSecurityStats: async (period = 'week') => {
        return apiClient.get('/security/stats', {
            params: { period }
        });
    },

    // === QRコード管理 ===

    /**
     * 場所ベースQRコード生成（管理者のみ）
     * @param {Object} data - QRコードデータ
     * @returns {Promise} 生成結果（QR画像含む）
     */
    generateLocationQR: async (data) => {
        return apiClient.post('/qr/generate-location', data);
    },

    /**
     * QRコード一覧取得
     * @param {Object} filters - フィルタ条件
     * @returns {Promise} QRコード一覧
     */
    getQRCodes: async (filters = {}) => {
        return apiClient.get('/qr/codes', {
            params: filters
        });
    },

    /**
     * QRコード詳細取得
     * @param {number} id - QRコードID
     * @returns {Promise} QRコード詳細
     */
    getQRCode: async (id) => {
        return apiClient.get(`/qr/codes/${id}`);
    },

    /**
     * QRコード無効化（管理者のみ）
     * @param {number} id - QRコードID
     * @returns {Promise} 無効化結果
     */
    deactivateQRCode: async (id) => {
        return apiClient.put(`/qr/codes/${id}/deactivate`);
    },

    /**
     * QRコード削除（管理者のみ）
     * @param {number} id - QRコードID
     * @returns {Promise} 削除結果
     */
    deleteQRCode: async (id) => {
        return apiClient.delete(`/qr/codes/${id}`);
    },

    /**
     * IP検証付きQRスキャン
     * @param {string} qrCode - QRコード
     * @param {string} studentId - 学生ID
     * @returns {Promise} スキャン結果（出席記録含む）
     */
    scanQRWithValidation: async (qrCode, studentId) => {
        return apiClient.post('/qr/scan-with-validation', {
            qrCode,
            studentId
        });
    }
};

export default securityApi;
