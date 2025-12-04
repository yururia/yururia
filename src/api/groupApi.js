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

        console.error('Group API Error:', errorResponse.message);
        return Promise.reject(errorResponse);
    }
);

/**
 * グループ（クラス）管理API
 */
export const groupApi = {
    /**
     * グループ一覧取得（権限に応じてフィルタリング）
     * @param {Object} filters - フィルタ条件
     * @returns {Promise} グループ一覧
     */
    getGroups: async (filters = {}) => {
        return apiClient.get('/groups', { params: filters });
    },

    /**
     * グループ詳細取得
     * @param {number} groupId - グループID
     * @returns {Promise} グループ詳細
     */
    getGroup: async (groupId) => {
        return apiClient.get(`/groups/${groupId}`);
    },

    /**
     * グループ作成（管理者のみ）
     * @param {Object} data - グループデータ
     * @returns {Promise} 作成結果
     */
    createGroup: async (data) => {
        return apiClient.post('/groups', data);
    },

    /**
     * グループ更新
     * @param {number} groupId - グループID
     * @param {Object} data - 更新データ
     * @returns {Promise} 更新結果
     */
    updateGroup: async (groupId, data) => {
        return apiClient.put(`/groups/${groupId}`, data);
    },

    /**
     * グループ削除（管理者のみ）
     * @param {number} groupId - グループID
     * @returns {Promise} 削除結果
     */
    deleteGroup: async (groupId) => {
        return apiClient.delete(`/groups/${groupId}`);
    },

    /**
     * グループメンバー一覧取得
     * @param {number} groupId - グループID
     * @returns {Promise} メンバー一覧
     */
    getGroupMembers: async (groupId) => {
        return apiClient.get(`/groups/${groupId}/members`);
    },

    /**
     * グループにメンバー追加
     * @param {number} groupId - グループID
     * @param {string} studentId - 学生ID
     * @param {Date} joinedAt - 参加日
     * @returns {Promise} 追加結果
     */
    addMember: async (groupId, studentId, joinedAt = new Date()) => {
        return apiClient.post(`/groups/${groupId}/members`, {
            studentId: studentId,
            joinedAt: joinedAt.toISOString().split('T')[0]
        });
    },

    /**
     * グループからメンバー削除
     * @param {number} groupId - グループID
     * @param {string} studentId - 学生ID
     * @returns {Promise} 削除結果
     */
    removeMember: async (groupId, studentId) => {
        return apiClient.delete(`/groups/${groupId}/members/${studentId}`);
    },

    /**
     * グループ担当教員一覧取得
     * @param {number} groupId - グループID
     * @returns {Promise} 担当教員一覧
     */
    getGroupTeachers: async (groupId) => {
        return apiClient.get(`/groups/${groupId}/teachers`);
    },

    /**
     * グループに教員割り当て
     * @param {number} groupId - グループID
     * @param {number} userId - 教員ユーザーID
     * @param {string} role - 役割（'main' | 'assistant'）
     * @param {Date} assignedAt - 割り当て日
     * @returns {Promise} 割り当て結果
     */
    assignTeacher: async (groupId, userId, role = 'main', assignedAt = new Date()) => {
        return apiClient.post(`/groups/${groupId}/teachers`, {
            userId,
            role,
            assignedAt: assignedAt.toISOString().split('T')[0]
        });
    },

    /**
     * グループから教員削除
     * @param {number} groupId - グループID
     * @param {number} userId - 教員ユーザーID
     * @returns {Promise} 削除結果
     */
    removeTeacher: async (groupId, userId) => {
        return apiClient.delete(`/groups/${groupId}/teachers/${userId}`);
    },

    /**
     * グループ統計取得
     * @param {number} groupId - グループID
     * @returns {Promise} 統計データ
     */
    getGroupStats: async (groupId) => {
        return apiClient.get(`/groups/${groupId}/stats`);
    }
};

export default groupApi;
