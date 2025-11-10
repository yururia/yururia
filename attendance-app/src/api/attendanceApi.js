// 出欠管理システムのAPI通信を管理するファイル
import axios from 'axios';

// APIのベースURL（環境に応じて変更）
// Node.jsバックエンドを使用
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'http://192.168.12.200:3001/api'
    : 'http://localhost:3001/api');

// axiosインスタンスの作成
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター（認証トークンの自動付与）
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（エラーハンドリング）
apiClient.interceptors.response.use(
  (response) => {
    // 開発環境でのみログ出力
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      timestamp: new Date().toISOString()
    });
    }
    return response;
  },
  (error) => {
    const errorDetails = {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    };

    // 開発環境でのみエラーログ出力
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
    console.error('API Error:', errorDetails);
    }

    if (error.response?.status === 401) {
      // 認証エラーの場合、ローカルストレージをクリアしてログインページにリダイレクト
      localStorage.removeItem('authToken');
      // サブフォルダ対応のリダイレクト
      const basename = '/linkup';
      window.location.href = `${basename}/login`;
    } else if (!error.response) {
      // ネットワークエラーの場合、より詳細な情報を提供
      let errorMessage = 'サーバーに接続できません。';
      let additionalInfo = '';

      // エラーの種類に応じたメッセージ
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'サーバーへの接続がタイムアウトしました。';
        additionalInfo = 'サーバーが応答していないか、ネットワークが遅い可能性があります。';
      } else if (error.code === 'ERR_NETWORK' || error.code === 'NETWORK_ERROR') {
        errorMessage = 'サーバーに接続できません。';
        additionalInfo = 'サーバーが起動しているか確認してください。';
      } else if (error.code === 'ERR_CONNECTION_REFUSED') {
        errorMessage = 'サーバーへの接続が拒否されました。';
        additionalInfo = `サーバーが起動していない可能性があります。接続先: ${API_BASE_URL}`;
      } else if (error.code === 'ERR_CORS') {
        errorMessage = 'CORSエラーが発生しました。';
        additionalInfo = 'サーバーのCORS設定を確認してください。';
      } else {
        additionalInfo = `エラーコード: ${error.code || '不明'}`;
      }

      // 開発環境ではより詳細な情報を提供
      if (process.env.NODE_ENV === 'development') {
        const serverCheckInfo = `
サーバー接続確認方法:
1. バックエンドサーバーが起動しているか確認
   - コマンド: cd backend-nodejs && npm start
   - 確認URL: ${API_BASE_URL.replace('/api', '/health')}
2. ポート3001が使用可能か確認
3. ファイアウォール設定を確認
        `.trim();
        error.message = `${errorMessage}\n${additionalInfo}\n\n${serverCheckInfo}`;
        // eslint-disable-next-line no-console
      console.error('ネットワークエラー詳細:', {
        message: error.message,
        code: error.code,
        baseURL: API_BASE_URL,
        ...errorDetails
      });
      } else {
        error.message = `${errorMessage} ${additionalInfo}`;
      }
    }
    return Promise.reject(error);
  }
);

// サーバー接続状態チェック機能
export const checkServerHealth = async () => {
  try {
    const healthUrl = API_BASE_URL.replace('/api', '/health');
    const response = await axios.get(healthUrl, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return {
      success: true,
      status: response.status,
      data: response.data,
      message: 'サーバーは正常に動作しています'
    };
  } catch (error) {
    let errorMessage = 'サーバーに接続できません。';
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage = 'サーバーへの接続がタイムアウトしました。';
    } else if (error.code === 'ERR_CONNECTION_REFUSED') {
      errorMessage = 'サーバーへの接続が拒否されました。サーバーが起動していない可能性があります。';
    } else if (error.code === 'ERR_NETWORK') {
      errorMessage = 'ネットワークエラーが発生しました。';
    }

    return {
      success: false,
      message: errorMessage,
      error: {
        code: error.code,
        message: error.message,
        url: error.config?.url
      }
    };
  }
};

// 出欠管理関連のAPI関数
export const attendanceApi = {
  // サーバー接続状態チェック
  checkServerHealth,

  // ユーザー認証
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  // 出欠記録
  // attendanceData は { date, type, timestamp, reason(optional) } を含む想定
  // type: 'checkin', 'checkout', 'late', 'absent', 'early_departure'
  recordAttendance: async (data) => {
    const response = await apiClient.post('/attendance', data);
    return response.data;
  },

  getAttendanceRecords: async (userId, dateRange) => {
    if (!userId) {
      throw new Error('ユーザーIDが必要です');
    }
    const response = await apiClient.get('/attendance', {
      params: { userId, ...dateRange },
    });
    return response.data;
  },

  updateAttendance: async (attendanceId, updateData) => {
    const response = await apiClient.put(`/attendance/${attendanceId}`, updateData);
    return response.data;
  },

  deleteAttendance: async (attendanceId) => {
    const response = await apiClient.delete(`/attendance/${attendanceId}`);
    return response.data;
  },

  // ユーザー管理
  getUsers: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  getUserProfile: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  getUserById: async (userId) => {
    if (!userId) {
      throw new Error('ユーザーIDが必要です');
    }
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  updateUserProfile: async (userId, userData) => {
    if (!userId) {
      throw new Error('ユーザーIDが必要です');
    }
    const response = await apiClient.put(`/users/${userId}`, userData);
    return response.data;
  },

  // 統計・レポート
  getAttendanceStats: async (userId, period) => {
    if (!userId) {
      throw new Error('ユーザーIDが必要です');
    }
    const response = await apiClient.get('/attendance/stats', {
      params: { userId, period },
    });
    return response.data;
  },

  getMonthlyReport: async (userId, year, month) => {
    if (!userId) {
      throw new Error('ユーザーIDが必要です');
    }
    const response = await apiClient.get('/attendance/report', {
      params: { userId, year, month },
    });
    return response.data;
  },

  // 学生管理
  getStudents: async (search = null, limit = null, offset = 0) => {
    const response = await apiClient.get('/students', {
      params: { search, limit, offset },
    });
    return response.data;
  },

  getStudent: async (studentId) => {
    const response = await apiClient.get(`/students/${studentId}`);
    return response.data;
  },

  getStudentByCardId: async (cardId) => {
    const response = await apiClient.get(`/students/card/${cardId}`);
    return response.data;
  },

  createStudent: async (studentData) => {
    const response = await apiClient.post('/students', studentData);
    return response.data;
  },

  updateStudent: async (studentId, studentData) => {
    const response = await apiClient.put(`/students/${studentId}`, studentData);
    return response.data;
  },

  deleteStudent: async (studentId) => {
    const response = await apiClient.delete(`/students/${studentId}`);
    return response.data;
  },

  // 学生出欠記録（シンプル版）
  recordStudentAttendance: async (studentId, timestamp = null) => {
    const response = await apiClient.post('/student-attendance', {
      studentId,
      timestamp
    });
    return response.data;
  },

  // QRコード読み取りによる出欠記録
  recordQRAttendance: async (studentId, timestamp = null) => {
    const response = await apiClient.post('/student-attendance', {
      studentId,
      timestamp,
      qrScan: true
    });
    return response.data;
  },

  getStudentAttendanceRecords: async (studentId = null, startDate = null, endDate = null) => {
    const response = await apiClient.get('/student-attendance', {
      params: { studentId, startDate, endDate },
    });
    return response.data;
  },

  // 詳細出欠記録の取得
  getDetailedAttendanceRecords: async (studentId = null, classId = null, startDate = null, endDate = null) => {
    const response = await apiClient.get('/student-attendance/detailed', {
      params: { 
        studentId, 
        classId, 
        startDate, 
        endDate 
      },
    });
    return response.data;
  },

  // 欠課学生の記録
  markAbsentStudents: async (classId, attendanceDate) => {
    const response = await apiClient.get('/student-attendance/mark-absent', {
      params: { 
        classId, 
        attendanceDate 
      },
    });
    return response.data;
  },

  getStudentMonthlyReport: async (studentId = null, year, month) => {
    const response = await apiClient.get('/student-attendance/report', {
      params: { studentId, year, month },
    });
    return response.data;
  },

  getStudentAttendanceStats: async (studentId = null, period = 'month') => {
    const response = await apiClient.get('/student-attendance/stats', {
      params: { studentId, period },
    });
    return response.data;
  },

  deleteStudentAttendance: async (recordId) => {
    const response = await apiClient.delete(`/student-attendance/${recordId}`);
    return response.data;
  },

  // 科目管理
  getSubjects: async (search = null, isActive = null) => {
    const response = await apiClient.get('/subjects', {
      params: { search, isActive },
    });
    return response.data;
  },

  createSubject: async (subjectData) => {
    const response = await apiClient.post('/subjects', subjectData);
    return response.data;
  },

  updateSubject: async (subjectId, subjectData) => {
    const response = await apiClient.put(`/subjects/${subjectId}`, subjectData);
    return response.data;
  },

  deleteSubject: async (subjectId) => {
    const response = await apiClient.delete(`/subjects/${subjectId}`);
    return response.data;
  },

  // 授業管理
  getClasses: async (search = null, subjectId = null, isActive = null) => {
    const response = await apiClient.get('/classes', {
      params: { search, subjectId, isActive },
    });
    return response.data;
  },

  createClass: async (classData) => {
    const response = await apiClient.post('/classes', classData);
    return response.data;
  },

  updateClass: async (classId, classData) => {
    const response = await apiClient.put(`/classes/${classId}`, classData);
    return response.data;
  },

  deleteClass: async (classId) => {
    const response = await apiClient.delete(`/classes/${classId}`);
    return response.data;
  },

  // 通知管理
  getNotifications: async (isRead = null, type = null) => {
    const response = await apiClient.get('/notifications', {
      params: { isRead, type },
    });
    return response.data;
  },

  getStudentNotifications: async (studentId, isRead = null, type = null) => {
    const response = await apiClient.get(`/notifications/student/${studentId}`, {
      params: { isRead, type },
    });
    return response.data;
  },

  getUnreadNotificationCount: async () => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  markNotificationAsRead: async (notificationId) => {
    const response = await apiClient.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  deleteNotification: async (notificationId) => {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  // システム設定
  getSetting: async (key) => {
    const response = await apiClient.get(`/settings/${key}`);
    return response.data;
  },

  getAllSettings: async (publicOnly = false) => {
    const response = await apiClient.get('/settings', {
      params: { publicOnly },
    });
    return response.data;
  },

  setSetting: async (key, value, type = 'string', description = null, isPublic = false) => {
    const response = await apiClient.post('/settings', {
      key,
      value,
      type,
      description,
      isPublic,
    });
    return response.data;
  },

  deleteSetting: async (key) => {
    const response = await apiClient.delete(`/settings/${key}`);
    return response.data;
  },

  // 監査ログ（管理者のみ）
  getAuditLogs: async (userId = null, tableName = null, actionType = null, startDate = null, endDate = null, limit = 100, offset = 0) => {
    const response = await apiClient.get('/audit-logs', {
      params: { 
        userId, 
        tableName, 
        actionType, 
        startDate, 
        endDate, 
        limit, 
        offset 
      },
    });
    return response.data;
  },

  // グループ管理
  createGroup: async (groupName, description = null) => {
    const response = await apiClient.post('/groups', {
      groupName,
      description
    });
    return response.data;
  },

  getGroups: async () => {
    const response = await apiClient.get('/groups');
    return response.data;
  },

  getGroupById: async (groupId) => {
    const response = await apiClient.get(`/groups/${groupId}`);
    return response.data;
  },

  updateGroup: async (groupId, groupName, description = null) => {
    const response = await apiClient.put(`/groups/${groupId}`, {
      groupName,
      description
    });
    return response.data;
  },

  deleteGroup: async (groupId) => {
    const response = await apiClient.delete(`/groups/${groupId}`);
    return response.data;
  },

  getGroupMembers: async (groupId, status = null) => {
    const response = await apiClient.get(`/groups/${groupId}/members`, {
      params: { status }
    });
    return response.data;
  },

  inviteStudent: async (groupId, studentId) => {
    const response = await apiClient.post(`/groups/${groupId}/invite`, {
      studentId
    });
    return response.data;
  },

  acceptInvitation: async (membershipId, studentId) => {
    const response = await apiClient.put(`/groups/memberships/${membershipId}/accept`, {
      studentId
    });
    return response.data;
  },

  removeMembership: async (membershipId) => {
    const response = await apiClient.delete(`/groups/memberships/${membershipId}`);
    return response.data;
  },

  getStudentGroups: async (studentId) => {
    const response = await apiClient.get(`/groups/student/${studentId}`);
    return response.data;
  },

  // QRコード生成
  generateQRCode: async (groupId, format = 'json') => {
    const response = await apiClient.get(`/qr/${groupId}`, {
      params: { format }
    });
    return response.data;
  },

  // 出欠記録スキャン
  recordScan: async (qrData, timestamp = null) => {
    const response = await apiClient.post('/qr/scan', {
      qr_data: qrData,
      timestamp
    });
    return response.data;
  },

  // 授業選択後の出席記録
  confirmClassAttendance: async (classId, timestamp = null) => {
    const response = await apiClient.post('/qr/scan/confirm', {
      class_id: classId,
      timestamp
    });
    return response.data;
  },

  // 出欠閲覧
  getDailyAttendance: async (groupId, date) => {
    const response = await apiClient.get('/reports/daily', {
      params: { groupId, date }
    });
    return response.data;
  },

  getWeeklyAttendance: async (groupId, startDate, endDate) => {
    const response = await apiClient.get('/reports/weekly', {
      params: { groupId, startDate, endDate }
    });
    return response.data;
  },

  getStudentAttendance: async (groupId, studentId, startDate, endDate) => {
    const response = await apiClient.get('/reports/student', {
      params: { groupId, studentId, startDate, endDate }
    });
    return response.data;
  },

  exportAttendance: async (groupId, startDate, endDate) => {
    const response = await apiClient.get('/reports/export', {
      params: { groupId, startDate, endDate },
      responseType: 'blob'
    });
    return response.data;
  },

  getRecordAuditLog: async (tableName, recordId) => {
    const response = await apiClient.get('/audit-logs/record', {
      params: { tableName, recordId },
    });
    return response.data;
  },

  getAuditStats: async (startDate = null, endDate = null) => {
    const response = await apiClient.get('/audit-logs/stats', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  cleanupAuditLogs: async (daysToKeep = 365) => {
    const response = await apiClient.delete(`/audit-logs/cleanup`, {
      params: { daysToKeep }
    });
    return response.data;
  },

  // イベント管理
  getEvents: async (startDate = null, endDate = null, isPublic = null, limit = null, offset = 0) => {
    const response = await apiClient.get('/events', {
      params: { startDate, endDate, isPublic, limit, offset },
    });
    return response.data;
  },

  getEvent: async (eventId) => {
    const response = await apiClient.get(`/events/${eventId}`);
    return response.data;
  },

  createEvent: async (eventData) => {
    const response = await apiClient.post('/events', eventData);
    return response.data;
  },

  updateEvent: async (eventId, updateData) => {
    const response = await apiClient.put(`/events/${eventId}`, updateData);
    return response.data;
  },

  deleteEvent: async (eventId) => {
    const response = await apiClient.delete(`/events/${eventId}`);
    return response.data;
  },

  participateEvent: async (eventId, status) => {
    const response = await apiClient.post(`/events/${eventId}/participate`, { status });
    return response.data;
  },

  removeParticipant: async (eventId, participantId) => {
    const response = await apiClient.delete(`/events/${eventId}/participants/${participantId}`);
    return response.data;
  },
};

export default apiClient;
