const logger = require('../utils/logger');

/**
 * エラーハンドラーミドルウェア
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // ログにエラーを記録
  logger.error(err.message, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // MySQLエラー
  if (err.code === 'ER_DUP_ENTRY') {
    const message = '重複したデータが存在します';
    error = { message, statusCode: 400 };
  }

  // MySQL接続エラー
  if (err.code === 'ECONNREFUSED') {
    const message = 'データベース接続エラー';
    error = { message, statusCode: 500 };
  }

  // JWTエラー
  if (err.name === 'JsonWebTokenError') {
    const message = '無効なトークンです';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'トークンの有効期限が切れています';
    error = { message, statusCode: 401 };
  }

  // バリデーションエラー
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // デフォルトエラー
  const statusCode = error.statusCode || 500;
  const message = error.message || 'サーバーエラーが発生しました';

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  errorHandler
};
