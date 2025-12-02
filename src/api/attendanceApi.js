import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// APIクライアントの設定
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // [追加] Cookie送受信用
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// リクエストインターセプター
apiClient.interceptors.request.use(
  (config) => {
    // Cookieを使用するため、Authorizationヘッダーの設定は不要
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
apiClient.interceptors.response.use(
  (response) => {
    // 成功レスポンス（主に data プロパティを返す）
    // バックエンドが { success: true, data: {...} } 形式で返すことを想定
    if (response.data && response.data.success) {
      return response.data;
    }
    // バックエンドが data プロパティなしで返す場合（例: /auth/me）
    if (response.status === 200 && response.data) {
      return { success: true, data: response.data };
    }
    return response;
  },
  (error) => {
    // [修正] エラーハンドリングを強化
    let errorResponse = {
      success: false,
      message: '不明なエラーが発生しました',
      status: null,
      data: null
    };

    if (error.response) {
      // サーバーからの応答がある場合
      errorResponse.status = error.response.status;

      // Blobレスポンスのエラーハンドリング (JSONパース試行)
      if (error.response.config && error.response.config.responseType === 'blob' && error.response.data instanceof Blob) {
        // BlobをJSONに変換してエラーメッセージを取得する非同期処理が必要だが、
        // インターセプター内ではPromiseを返すことで対応
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorData = JSON.parse(reader.result);
              errorResponse.message = errorData.message || `API接続エラー: ${error.response.statusText}`;
              errorResponse.data = errorData;
              console.error('API Error (Blob):', errorResponse.message);
              reject(errorResponse);
            } catch (e) {
              errorResponse.message = `API接続エラー: ${error.response.statusText}`;
              console.error('API Error (Blob parse failed):', errorResponse.message);
              reject(errorResponse);
            }
          };
          reader.onerror = () => {
            errorResponse.message = `API接続エラー: ${error.response.statusText}`;
            reject(errorResponse);
          };
          reader.readAsText(error.response.data);
        });
      }

      if (error.response.data && error.response.data.message) {
        errorResponse.message = error.response.data.message;
      } else {
        errorResponse.message = `API接続エラー: ${error.response.statusText}`;
      }
      errorResponse.data = error.response.data;
    } else if (error.request) {
      // サーバーに接続できない場合
      errorResponse.message = 'API接続エラー: サーバーに接続できません。サーバーが起動しているか確認してください。';
    } else {
      // その他のエラー
      errorResponse.message = `API接続エラー: ${error.message}`;
    }

    console.error('API Error:', errorResponse.message);
    return Promise.reject(errorResponse); // エラーオブジェクトをrejectする
  }
);

// サーバーヘルスチェック
export const checkServerHealth = async () => {
  try {
    const response = await apiClient.get('/auth/health');
    return response;
  } catch (error) {
    return error; // インターセプターが処理したエラーオブジェクト
  }
};

// attendanceApi オブジェクト
export const attendanceApi = {
  // --- 認証 ---
  login: async (email, password) => {
    return apiClient.post('/auth/login', { email, password });
  },

  register: async (userData) => {
    return apiClient.post('/auth/register', userData);
  },

  logout: async () => {
    return apiClient.post('/auth/logout');
  },

  // パスワードリセット
  forgotPassword: async (email) => {
    return apiClient.post('/auth/forgot-password', { email });
  },
  resetPassword: async (token, newPassword) => {
    return apiClient.post('/auth/reset-password', { token, newPassword });
  },

  getAuthUser: async () => {
    return apiClient.get('/auth/me');
  },

  getUserProfile: async () => {
    return apiClient.get('/auth/me');
  },

  // ユーザー役割管理
  getUsersByRole: async (role) => {
    return apiClient.get(`/users/role/${role}`);
  },

  // エクスポート機能
  exportAttendanceRecords: async (startDate, endDate, userId = null) => {
    const params = new URLSearchParams({ startDate, endDate });
    if (userId) params.append('userId', userId);

    const response = await apiClient.get(`/export/attendance?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  exportAllAttendanceRecords: async (startDate, endDate) => {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await apiClient.get(`/export/attendance/all?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  exportEventParticipants: async (eventId) => {
    const response = await apiClient.get(`/export/event/${eventId}/participants`, {
      responseType: 'blob'
    });
    return response.data;
  },

  getUserById: async (userId) => {
    return apiClient.get(`/users/${userId}`);
  },

  updateUserProfile: async (userId, data) => {
    return apiClient.put(`/users/${userId}`, data);
  },

  // --- 出欠 (教員/管理者用) ---
  recordAttendance: async (userId, action, recordId) => {
    const date = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    return apiClient.post('/attendance', {
      userId,
      date: date,
      type: action, // 'checkin' または 'checkout'
      timestamp: timestamp,
      recordId: recordId
    });
  },

  getAttendanceRecords: async (userId, filters) => {
    return apiClient.get('/attendance', {
      params: { userId, ...filters },
    });
  },

  getAttendanceStats: async (userId, period) => {
    return apiClient.get('/attendance/stats', {
      params: { userId, period },
    });
  },

  getMonthlyReport: async (userId, year, month) => {
    return apiClient.get('/attendance/report', {
      params: { userId, year, month },
    });
  },

  // --- 学生管理 (管理者用) ---
  getStudents: async (searchTerm) => {
    return apiClient.get('/students', {
      params: { search: searchTerm }
    });
  },
  createStudent: async (studentData) => {
    return apiClient.post('/students', studentData);
  },
  updateStudent: async (studentId, studentData) => {
    return apiClient.put(`/students/${studentId}`, studentData);
  },
  deleteStudent: async (studentId) => {
    return apiClient.delete(`/students/${studentId}`);
  },

  // --- 学生出欠 (教員用) ---
  getStudentAttendance: async (filters) => {
    return apiClient.get('/student-attendance', {
      params: filters
    });
  },
  recordStudentAttendance: async (studentId, timestamp) => {
    return apiClient.post('/student-attendance', { studentId, timestamp });
  },
  deleteStudentAttendance: async (recordId) => {
    return apiClient.delete(`/student-attendance/${recordId}`);
  },

  recordQRAttendance: async (studentId, timestamp) => {
    return apiClient.post('/student-attendance/qr', { studentId, timestamp });
  },

  // --- 学生ダッシュボード (学生用) ---
  getStudentGroups: async (studentId) => {
    return apiClient.get(`/students/${studentId}/groups`);
  },
  respondToInvitation: async (studentId, groupId, action) => {
    return apiClient.post(`/students/${studentId}/groups/${groupId}/respond`, { action });
  },
  scanQRCode: async (studentId, qrData) => {
    return apiClient.post('/qr/scan', { studentId, qrData });
  },
  confirmScan: async (studentId, classId, scanToken) => {
    return apiClient.post('/qr/scan/confirm', { studentId, classId, scanToken });
  },

  // --- グループ管理 (教員用) ---
  getGroups: async () => {
    return apiClient.get('/groups');
  },
  createGroup: async (groupData) => {
    return apiClient.post('/groups', groupData);
  },
  deleteGroup: async (groupId) => {
    return apiClient.delete(`/groups/${groupId}`);
  },

  // --- イベント管理 ---
  getEvents: async (filters) => {
    return apiClient.get('/events', { params: filters });
  },
  createEvent: async (eventData) => {
    return apiClient.post('/events', eventData);
  },
  updateEvent: async (eventId, eventData) => {
    return apiClient.put(`/events/${eventId}`, eventData);
  },
  deleteEvent: async (eventId) => {
    return apiClient.delete(`/events/${eventId}`);
  },
  respondToEvent: async (eventId, status) => {
    return apiClient.post(`/events/${eventId}/respond`, { status });
  },

  // --- [新規] ロール変更用 ---
  getRoleUpdateStatus: async () => {
    return apiClient.get('/users/me/role-status');
  },
  updateRole: async (newRole, password) => {
    return apiClient.post('/users/me/role', { newRole, password });
  },

  // --- カレンダー統計 ---
  getDailyStats: async (year, month) => {
    return apiClient.get('/attendance/daily-stats', {
      params: { year, month }
    });
  },

  getAbsenceDetails: async (date) => {
    return apiClient.get(`/attendance/absence-details/${date}`);
  },

  // --- 欠席申請 ---
  submitAbsenceRequest: async (requestData) => {
    const formData = new FormData();
    Object.keys(requestData).forEach(key => {
      if (requestData[key] !== null && requestData[key] !== undefined) {
        formData.append(key, requestData[key]);
      }
    });
    return apiClient.post('/absence-requests', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};