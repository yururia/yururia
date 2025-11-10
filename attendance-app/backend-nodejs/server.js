const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const studentRoutes = require('./routes/students');
const userRoutes = require('./routes/users');
const subjectRoutes = require('./routes/subjects');
const classRoutes = require('./routes/classes');
const notificationRoutes = require('./routes/notifications');
const settingsRoutes = require('./routes/settings');
const reportRoutes = require('./routes/reports');
const qrRoutes = require('./routes/qr');
const groupRoutes = require('./routes/groups');
const eventRoutes = require('./routes/events');

const logger = require('./utils/logger');
const { testConnection } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// 環境判定
const isProduction = process.env.NODE_ENV === 'production';

// セキュリティミドルウェア（本番環境向けに強化）

app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  } : false,
  crossOriginEmbedderPolicy: isProduction,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(compression());

// CORS設定（本番環境向けに強化）
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : (isProduction ? [] : ['http://localhost:3000']); // 開発環境: フロントエンドは3000、バックエンドは3001
    
    // 本番環境ではオリジンの厳格なチェック
    if (isProduction) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORSポリシーによりブロックされました'));
      }
    } else {
      // 開発環境ではより緩い設定
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: isProduction ? 86400 : 0 // 本番: 24時間キャッシュ、開発: キャッシュなし
};

app.use(cors(corsOptions));

// レート制限（本番環境向けに最適化）
// 一般API用レート制限（本番: 15分間で200リクエスト、開発: 15分間で100リクエスト）
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 1000 || 15 * 60 * 1000, // 15分
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (isProduction ? 200 : 100),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // ヘルスチェックは除外
    return req.path === '/health';
  },
  message: {
    success: false,
    message: 'リクエストが多すぎます。しばらく待ってから再試行してください。'
  }
});

// 認証API用レート制限（本番: 15分間で10リクエスト、開発: 15分間で50リクエスト）
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 1000 || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || (isProduction ? 10 : 50),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功したリクエストはカウントしない（開発環境で便利）
  message: {
    success: false,
    message: '認証リクエストが多すぎます。しばらく待ってから再試行してください。'
  }
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// ボディパーサー
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ログ設定
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'サーバーは正常に動作しています',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0'
  });
});

// API ルート
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/events', eventRoutes);

// 404 ハンドラー
app.use('*', (req, res) => {
  // 404エラーをログに記録
  logger.warn('404エラー - エンドポイントが見つかりません', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    success: false,
    message: 'エンドポイントが見つかりません'
  });
});

// エラーハンドラー
app.use(errorHandler);

// サーバー起動
const server = app.listen(PORT, () => {
  logger.info(`サーバーが起動しました: http://localhost:${PORT}`);
  logger.info(`環境: ${process.env.NODE_ENV || 'development'}`);

  // 起動時にDB接続テストを実行（失敗しても起動は継続）
  testConnection().then((ok) => {
    if (!ok) {
      logger.warn('DB接続に失敗しましたが、サーバーは起動を継続します。');
    }
  });
});

// ポート競合エラーのハンドリング
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`ポート ${PORT} は既に使用されています。既存のプロセスを停止してから再起動してください。`);
    logger.error(`エラー詳細: ${error.message}`);
    process.exit(1);
  } else {
    logger.error('サーバー起動エラー:', error.message);
    process.exit(1);
  }
});

module.exports = app;
