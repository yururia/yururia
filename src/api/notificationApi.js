import axios from 'axios';

const API_BASE_URL = '/api';

// APIクライアントの設定
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
        return response.data;
    },
    (error) => {
        console.error('Notification API Error:', error.response?.data?.message || error.message);
        return Promise.reject(error.response?.data || error);
    }
);

/**
 * 通知 API
 */
export const notificationApi = {
    /**
     * 通知一覧を取得
     * @param {Object} options - 取得オプション
     * @returns {Promise<Object>} 通知一覧
     */
    async getNotifications(options = {}) {
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit);
        if (options.unreadOnly) params.append('is_read', '0');

        const response = await apiClient.get(`/notifications?${params.toString()}`);
        return response;
    },

    /**
     * 未読通知数を取得
     * @returns {Promise<Object>} 未読数
     */
    async getUnreadCount() {
        const response = await apiClient.get('/notifications/unread-count');
        return response;
    },

    /**
     * 通知を既読にする
     * @param {number} notificationId - 通知ID
     * @returns {Promise<Object>} 結果
     */
    async markAsRead(notificationId) {
        const response = await apiClient.put(`/notifications/${notificationId}/read`);
        return response;
    },

    /**
     * 全通知を既読にする
     * @returns {Promise<Object>} 結果
     */
    async markAllAsRead() {
        const response = await apiClient.put('/notifications/read-all');
        return response;
    },

    /**
     * 通知を削除する
     * @param {number} notificationId - 通知ID
     * @returns {Promise<Object>} 結果
     */
    async deleteNotification(notificationId) {
        const response = await apiClient.delete(`/notifications/${notificationId}`);
        return response;
    }
};

export default notificationApi;
