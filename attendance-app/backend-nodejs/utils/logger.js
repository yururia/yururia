const winston = require('winston');
const path = require('path');

// ログフォーマット
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// コンソールフォーマット
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ' ' + JSON.stringify(meta);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// ロガー設定（本番環境向けに最適化）
const isProduction = process.env.NODE_ENV === 'production';

// ログレベル設定（環境変数で上書き可能）
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// ログファイルの最大サイズ（環境変数で上書き可能）
const maxSize = parseInt(process.env.LOG_MAX_SIZE) || (isProduction ? 10485760 : 5242880); // 本番: 10MB, 開発: 5MB
const maxFiles = parseInt(process.env.LOG_MAX_FILES) || (isProduction ? 10 : 5); // 本番: 10ファイル, 開発: 5ファイル

const transports = [];

// コンソール出力（開発環境のみ、本番では省略可能）
if (!isProduction || process.env.LOG_CONSOLE === 'true') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: logLevel
    })
  );
}
    
// エラーログファイル（エラーレベルのみ）
transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'error.log'),
      level: 'error',
    maxsize: maxSize,
    maxFiles: maxFiles,
    format: logFormat
  })
);
    
    // 全ログファイル
transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'combined.log'),
    maxsize: maxSize,
    maxFiles: maxFiles,
    format: logFormat
  })
);

// 本番環境では情報レベル以上のログを別ファイルに保存
if (isProduction) {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'info.log'),
      level: 'info',
      maxsize: maxSize,
      maxFiles: maxFiles,
      format: logFormat
    })
  );
}

const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { 
    service: 'attendance-app-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: transports,
  
  // 例外とリジェクトのキャッチ
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'exceptions.log'),
      maxsize: maxSize,
      maxFiles: maxFiles,
      format: logFormat
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'rejections.log'),
      maxsize: maxSize,
      maxFiles: maxFiles,
      format: logFormat
    })
  ],
  
  // 本番環境では未処理の例外でもプロセスを終了させない
  exitOnError: !isProduction
});

module.exports = logger;
