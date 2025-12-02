require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { testConnection } = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// ルートのインポート
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');
const studentRoutes = require('./routes/students');
const studentAttendanceRoutes = require('./routes/student-attendance');
const classRoutes = require('./routes/classes');
const subjectRoutes = require('./routes/subjects');
const groupRoutes = require('./routes/groups');
const qrRoutes = require('./routes/qr');
const eventRoutes = require('./routes/events');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const settingsRoutes = require('./routes/settings');
const exportRoutes = require('./routes/export');
// 新規追加: 統合型システム用のルート
const organizationRoutes = require('./routes/organizations');
const securityRoutes = require('./routes/security');
const absenceRequestRoutes = require('./routes/absence-requests');
const approvalRoutes = require('./routes/approvals');
const timetableRoutes = require('./routes/timetables');
const attendanceStatsRoutes = require('./routes/attendance-stats');


// Swaggerのセットアップ
const { swaggerUi, specs } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3001;

// --- セキュリティとミドルウェア ---
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 基本的なレート制限
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 1000, // 1IPあたり1000リクエストに緩和
  message: { success: false, message: 'リクエストが多すぎます。15分後に再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// --- Swagger UI ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// --- ルーティング ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceStatsRoutes); // 統計エンドポイント
app.use('/api/attendance', attendanceRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/student-attendance', studentAttendanceRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/export', exportRoutes);
// 新規追加: 統合型システム用のエンドポイント
app.use('/api/organizations', organizationRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/absence-requests', absenceRequestRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/timetables', timetableRoutes);


// --- 404ハンドラ ---
app.use((req, res, next) => {
  logger.warn('404エラー - エンドポイントが見つかりません', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  res.status(404).json({ success: false, message: 'エンドポイントが見つかりません' });
});

// --- グローバルエラーハンドラ ---
app.use(errorHandler);

// --- サーバー起動 ---
const startServer = async () => {
  try {
    // データベース接続テスト
    await testConnection();

    app.listen(PORT, () => {
      logger.info(`サーバーが起動しました: http://localhost:${PORT}`, {
        service: "attendance-app-backend",
        environment: process.env.NODE_ENV || 'development'
      });
      logger.info(`環境: ${process.env.NODE_ENV || 'development'}`, {
        service: "attendance-app-backend",
        environment: process.env.NODE_ENV || 'development'
      });
    });
  } catch (error) {
    logger.error('サーバー起動に失敗しました:', error.message);
    process.exit(1);
  }
};

startServer();
