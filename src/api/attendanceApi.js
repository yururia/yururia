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
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });

    if (error.response?.status === 401) {
      // 認証エラーの場合、ローカルストレージをクリアしてログインページにリダイレクト
      console.log('認証エラー - トークンを削除してログインページにリダイレクト');
      localStorage.removeItem('authToken');
      // サブフォルダ対応のリダイレクト
      const basename = '/link-up';
      window.location.href = `${basename}/login`;
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      console.error('ネットワークエラー - サーバーに接続できません');
      // ネットワークエラーの場合、より詳細な情報を提供
      error.message = 'サーバーに接続できません。サーバーが起動しているか確認してください。';
    }
    return Promise.reject(error);
  }
);

// 出欠管理関連のAPI関数
export const attendanceApi = {
  // ユーザー認証
  login: async (credentials) => {
    const response = await apiClient.post('/auth.php?action=login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await apiClient.post('/auth.php?action=register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth.php?action=logout');
    return response.data;
  },

  // 出欠記録
  // attendanceData は { date, type, timestamp, reason(optional) } を含む想定
  // type: 'checkin', 'checkout', 'late', 'absent', 'early_departure'
  recordAttendance: async (data) => {
    const response = await apiClient.post('/attendance.php', data);
    return response.data;
  },

  getAttendanceRecords: async (userId, dateRange) => {
    const response = await apiClient.get('/attendance.php', {
      params: { userId, ...dateRange },
    });
    return response.data;
  },

  updateAttendance: async (attendanceId, updateData) => {
    const response = await apiClient.put(`/attendance.php?id=${attendanceId}`, updateData);
    return response.data;
  },

  deleteAttendance: async (attendanceId) => {
    const response = await apiClient.delete(`/attendance.php?id=${attendanceId}`);
    return response.data;
  },

  // ユーザー管理
  getUsers: async () => {
    const response = await apiClient.get('/users.php');
    return response.data;
  },

  getUserProfile: async () => {
    const response = await apiClient.get('/auth.php?action=me');
    return response.data;
  },

  getUserById: async (userId) => {
    const response = await apiClient.get(`/users.php?userId=${userId}`);
    return response.data;
  },

  updateUserProfile: async (userId, userData) => {
    const response = await apiClient.put(`/users.php?userId=${userId}`, userData);
    return response.data;
  },

  // 統計・レポート
  getAttendanceStats: async (userId, period) => {
    const response = await apiClient.get('/attendance.php', {
      params: { action: 'stats', userId, period },
    });
    return response.data;
  },

  getMonthlyReport: async (userId, year, month) => {
    const response = await apiClient.get('/attendance.php', {
      params: { action: 'report', userId, year, month },
    });
    return response.data;
  },

  // 学生管理
  getStudents: async (search = null, limit = null, offset = 0) => {
    const response = await apiClient.get('/students.php', {
      params: { search, limit, offset },
    });
    return response.data;
  },

  getStudent: async (studentId) => {
    const response = await apiClient.get(`/students.php?studentId=${studentId}`);
    return response.data;
  },

  getStudentByCardId: async (cardId) => {
    const response = await apiClient.get(`/students.php?cardId=${cardId}`);
    return response.data;
  },

  createStudent: async (studentData) => {
    const response = await apiClient.post('/students.php', studentData);
    return response.data;
  },

  updateStudent: async (studentId, studentData) => {
    const response = await apiClient.put(`/students.php?studentId=${studentId}`, studentData);
    return response.data;
  },

  deleteStudent: async (studentId) => {
    const response = await apiClient.delete(`/students.php?studentId=${studentId}`);
    return response.data;
  },

  // 学生出欠記録（シンプル版）
  recordStudentAttendance: async (studentId, timestamp = null) => {
    const response = await apiClient.post('/student-attendance.php', {
      studentId,
      timestamp
    });
    return response.data;
  },

  // QRコード読み取りによる出欠記録
  recordQRAttendance: async (studentId, timestamp = null) => {
    const response = await apiClient.post('/student-attendance.php', {
      studentId,
      timestamp,
      qrScan: true
    });
    return response.data;
  },

  getStudentAttendanceRecords: async (studentId = null, startDate = null, endDate = null) => {
    const response = await apiClient.get('/student-attendance.php', {
      params: { studentId, startDate, endDate },
    });
    return response.data;
  },

  // 詳細出欠記録の取得
  getDetailedAttendanceRecords: async (studentId = null, classId = null, startDate = null, endDate = null) => {
    const response = await apiClient.get('/student-attendance.php', {
      params: { 
        action: 'detailed',
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
    const response = await apiClient.get('/student-attendance.php', {
      params: { 
        action: 'mark-absent',
        classId, 
        attendanceDate 
      },
    });
    return response.data;
  },

  getStudentMonthlyReport: async (studentId = null, year, month) => {
    const response = await apiClient.get('/student-attendance.php', {
      params: { action: 'report', studentId, year, month },
    });
    return response.data;
  },

  getStudentAttendanceStats: async (studentId = null, period = 'month') => {
    const response = await apiClient.get('/student-attendance.php', {
      params: { action: 'stats', studentId, period },
    });
    return response.data;
  },

  deleteStudentAttendance: async (recordId) => {
    const response = await apiClient.delete(`/student-attendance.php?id=${recordId}`);
    return response.data;
  },

  // 科目管理
  getSubjects: async (search = null, isActive = null) => {
    const response = await apiClient.get('/subjects.php', {
      params: { search, isActive },
    });
    return response.data;
  },

  createSubject: async (subjectData) => {
    const response = await apiClient.post('/subjects.php', subjectData);
    return response.data;
  },

  updateSubject: async (subjectId, subjectData) => {
    const response = await apiClient.put(`/subjects.php?subjectId=${subjectId}`, subjectData);
    return response.data;
  },

  deleteSubject: async (subjectId) => {
    const response = await apiClient.delete(`/subjects.php?subjectId=${subjectId}`);
    return response.data;
  },

  // 授業管理
  getClasses: async (search = null, subjectId = null, isActive = null) => {
    const response = await apiClient.get('/classes.php', {
      params: { search, subjectId, isActive },
    });
    return response.data;
  },

  createClass: async (classData) => {
    const response = await apiClient.post('/classes.php', classData);
    return response.data;
  },

  updateClass: async (classId, classData) => {
    const response = await apiClient.put(`/classes.php?classId=${classId}`, classData);
    return response.data;
  },

  deleteClass: async (classId) => {
    const response = await apiClient.delete(`/classes.php?classId=${classId}`);
    return response.data;
  },

  // 通知管理
  getNotifications: async (isRead = null, type = null) => {
    const response = await apiClient.get('/notifications.php', {
      params: { action: 'user', isRead, type },
    });
    return response.data;
  },

  getStudentNotifications: async (studentId, isRead = null, type = null) => {
    const response = await apiClient.get('/notifications.php', {
      params: { action: 'student', studentId, isRead, type },
    });
    return response.data;
  },

  getUnreadNotificationCount: async () => {
    const response = await apiClient.get('/notifications.php', {
      params: { action: 'unread-count' },
    });
    return response.data;
  },

  markNotificationAsRead: async (notificationId) => {
    const response = await apiClient.put(`/notifications.php?notificationId=${notificationId}`);
    return response.data;
  },

  deleteNotification: async (notificationId) => {
    const response = await apiClient.delete(`/notifications.php?notificationId=${notificationId}`);
    return response.data;
  },

  // システム設定
  getSetting: async (key) => {
    const response = await apiClient.get('/settings.php', {
      params: { action: 'get', key },
    });
    return response.data;
  },

  getAllSettings: async (publicOnly = false) => {
    const response = await apiClient.get('/settings.php', {
      params: { action: 'all', publicOnly },
    });
    return response.data;
  },

  setSetting: async (key, value, type = 'string', description = null, isPublic = false) => {
    const response = await apiClient.post('/settings.php', {
      key,
      value,
      type,
      description,
      isPublic,
    });
    return response.data;
  },

  deleteSetting: async (key) => {
    const response = await apiClient.delete(`/settings.php?key=${key}`);
    return response.data;
  },

  // 監査ログ（管理者のみ）
  getAuditLogs: async (userId = null, tableName = null, actionType = null, startDate = null, endDate = null, limit = 100, offset = 0) => {
    const response = await apiClient.get('/audit-logs.php', {
      params: { 
        action: 'list', 
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
    const response = await apiClient.post('/groups.php', {
      groupName,
      description
    });
    return response.data;
  },

  getGroups: async () => {
    const response = await apiClient.get('/groups.php');
    return response.data;
  },

  getGroupById: async (groupId) => {
    const response = await apiClient.get(`/groups.php?id=${groupId}`);
    return response.data;
  },

  updateGroup: async (groupId, groupName, description = null) => {
    const response = await apiClient.put(`/groups.php?id=${groupId}&action=update`, {
      groupName,
      description
    });
    return response.data;
  },

  deleteGroup: async (groupId) => {
    const response = await apiClient.delete(`/groups.php?id=${groupId}&action=group`);
    return response.data;
  },

  getGroupMembers: async (groupId, status = null) => {
    const response = await apiClient.get(`/groups.php?id=${groupId}&action=members`, {
      params: { status }
    });
    return response.data;
  },

  inviteStudent: async (groupId, studentId) => {
    const response = await apiClient.get(`/groups.php?id=${groupId}&action=invite&studentId=${studentId}`);
    return response.data;
  },

  acceptInvitation: async (membershipId, studentId) => {
    const response = await apiClient.put(`/groups.php?action=accept&membershipId=${membershipId}&studentId=${studentId}`);
    return response.data;
  },

  removeMembership: async (membershipId) => {
    const response = await apiClient.delete(`/groups.php?action=membership&membershipId=${membershipId}`);
    return response.data;
  },

  getStudentGroups: async (studentId) => {
    const response = await apiClient.get(`/groups.php?studentId=${studentId}`);
    return response.data;
  },

  // QRコード生成
  generateQRCode: async (groupId, format = 'json') => {
    const response = await apiClient.get(`/qr.php?groupId=${groupId}&format=${format}`);
    return response.data;
  },

  // 出欠記録スキャン
  recordScan: async (qrData, timestamp = null) => {
    const response = await apiClient.post('/record-scan.php', {
      qrData,
      timestamp
    });
    return response.data;
  },

  // 出欠閲覧
  getDailyAttendance: async (groupId, date) => {
    const response = await apiClient.get('/attendance-reports.php', {
      params: { groupId, date, action: 'daily' }
    });
    return response.data;
  },

  getWeeklyAttendance: async (groupId, startDate, endDate) => {
    const response = await apiClient.get('/attendance-reports.php', {
      params: { groupId, startDate, endDate, action: 'weekly' }
    });
    return response.data;
  },

  getStudentAttendance: async (groupId, studentId, startDate, endDate) => {
    const response = await apiClient.get('/attendance-reports.php', {
      params: { groupId, studentId, startDate, endDate, action: 'student' }
    });
    return response.data;
  },

  exportAttendance: async (groupId, startDate, endDate) => {
    const response = await apiClient.get('/attendance-reports.php', {
      params: { groupId, startDate, endDate, action: 'export' },
      responseType: 'blob'
    });
    return response.data;
  },

  getRecordAuditLog: async (tableName, recordId) => {
    const response = await apiClient.get('/audit-logs.php', {
      params: { action: 'record', tableName, recordId },
    });
    return response.data;
  },

  getAuditStats: async (startDate = null, endDate = null) => {
    const response = await apiClient.get('/audit-logs.php', {
      params: { action: 'stats', startDate, endDate },
    });
    return response.data;
  },

  cleanupAuditLogs: async (daysToKeep = 365) => {
    const response = await apiClient.delete(`/audit-logs.php?daysToKeep=${daysToKeep}`);
    return response.data;
  },
};

export default apiClient;
