import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// APIクライアント（既存のattendanceApi.jsと同じ設定を使用）
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// レスポンスインターセプター
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

        console.error('Organization API Error:', errorResponse.message);
        return Promise.reject(errorResponse);
    }
);

/**
 * 組織管理API
 */
export const organizationApi = {
    /**
     * 組織情報取得
     * @param {number} orgId - 組織ID
     * @returns {Promise} 組織情報
     */
    getOrganization: async (orgId) => {
        return apiClient.get(`/organizations/${orgId}`);
    },

    /**
     * 組織情報更新（管理者のみ）
     * @param {number} orgId - 組織ID
     * @param {Object} data - 更新データ
     * @returns {Promise} 更新結果
     */
    updateOrganization: async (orgId, data) => {
        return apiClient.put(`/organizations/${orgId}`, data);
    },

    /**
     * 組織統計取得
     * @param {number} orgId - 組織ID
     * @returns {Promise} 統計データ
     */
    getOrganizationStats: async (orgId) => {
        return apiClient.get(`/organizations/${orgId}/stats`);
    },

    /**
     * すべての組織取得（管理者のみ）
     * @returns {Promise} 組織一覧
     */
    getAllOrganizations: async () => {
        return apiClient.get('/organizations');
    },

    /**
     * 組織作成（管理者のみ）
     * @param {Object} data - 組織データ
     * @returns {Promise} 作成結果
     */
    createOrganization: async (data) => {
        return apiClient.post('/organizations', data);
    },

    /**
     * 組織削除（管理者のみ）
     * @param {number} orgId - 組織ID
     * @returns {Promise} 削除結果
     */
    deleteOrganization: async (orgId) => {
        return apiClient.delete(`/organizations/${orgId}`);
    }
};

export default organizationApi;
