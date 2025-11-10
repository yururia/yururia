const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

/**
 * データベース接続プール
 * 本番環境向けに最適化された設定
 */
const isProduction = process.env.NODE_ENV === 'production';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'server',
  password: process.env.DB_PASS || 'pass',
  database: process.env.DB_NAME || 'sotsuken',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
  timezone: '+09:00',
  
    // 接続プール設定
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || (isProduction ? 50 : 10),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || (isProduction ? 100 : 0),
  
  // タイムアウト設定
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10 * 1000, // 10秒
  
  // その他設定
  dateStrings: true,
  multipleStatements: false, // SQLインジェクション対策
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

/**
 * データベース接続テスト
 */
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('データベース接続に成功しました');
    connection.release();
    return true;
  } catch (error) {
    logger.error('データベース接続エラー:', error.message);
    return false;
  }
};

/**
 * クエリ実行（プリペアドステートメント）
 */
const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    logger.error('クエリ実行エラー:', {
      sql: sql.substring(0, 100) + '...',
      params: params,
      error: error.message
    });
    throw error;
  }
};

/**
 * トランザクション実行
 */
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 接続プールの終了
 */
const closePool = async () => {
  try {
    await pool.end();
    logger.info('データベース接続プールを終了しました');
  } catch (error) {
    logger.error('接続プール終了エラー:', error.message);
  }
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  closePool
};
