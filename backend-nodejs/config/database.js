const mysql = require('mysql2/promise');
const logger = require('./logger');

/**
 * データベース接続プール
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'server',
  password: process.env.DB_PASS || 'pass',
  database: process.env.DB_NAME || 'sotsuken',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
  timezone: '+09:00',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
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
