const JWTUtil = require('../utils/jwt');
const AuthService = require('../services/AuthService');
const RoleService = require('../services/RoleService');
const logger = require('../utils/logger');
const { query } = require('../config/database');

/**
 * [完全版] 認証ミドルウェア
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token;

    // Header or Cookie check
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      logger.warn('認証失敗 - トークンが提供されていません', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({
        success: false,
        message: 'アクセストークンが必要です'
      });
    }

    const decoded = JWTUtil.verifyToken(token);

    if (!decoded) {
      logger.warn('認証失敗 - 無効なトークン構造', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(403).json({
        success: false,
        message: '無効なトークンです'
      });
    }

    // DBから最新のユーザー情報を取得
    const users = await query(
      'SELECT id, name, email, role, student_id, employee_id, department FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      logger.warn('認証失敗 - ユーザーが存在しません', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: decoded.id
      });
      return res.status(403).json({
        success: false,
        message: 'ユーザーが存在しません'
      });
    }

    const user = users[0];
    req.user = user;

    logger.debug('認証成功', {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * [完全版] 役割（ロール）ベースのアクセス制御ミドルウェア
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    if (!req.user || !req.user.role) {
      logger.warn('権限エラー - ユーザー情報がありません', { ip: req.ip });
      return res.status(403).json({
        success: false,
        message: 'アクセス権限がありません'
      });
    }

    if (!requiredRoles.includes(req.user.role)) {
      logger.warn('権限エラー - 役割が不十分です', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles
      });
      return res.status(403).json({
        success: false,
        message: 'この操作を行う権限がありません'
      });
    }

    next();
  };
};

/**
 * 管理者権限チェックミドルウェア (requireRoleを使用)
 */
const requireAdmin = requireRole('admin');

/**
 * クラス担当教員（または管理者）権限チェックミドルウェア
 * パラメータの groupId または id を使用してチェック
 */
const requireClassTeacher = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '認証が必要です' });
    }

    // 管理者は常に許可
    if (req.user.role === 'admin') {
      return next();
    }

    // 教員でない場合は拒否
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: '権限がありません' });
    }

    // グループIDの取得 (params.groupId > params.id > body.groupId > body.class_id)
    const groupId = req.params.groupId || req.params.id || req.body.groupId || req.body.class_id;

    if (!groupId) {
      logger.warn('requireClassTeacher: グループIDが指定されていません', { url: req.originalUrl });
      return res.status(400).json({ success: false, message: 'グループIDが指定されていません' });
    }

    const isTeacher = await RoleService.isClassTeacher(req.user.id, groupId);

    if (!isTeacher) {
      logger.warn('権限エラー - 担当教員ではありません', { userId: req.user.id, groupId });
      return res.status(403).json({ success: false, message: 'このクラスの担当教員ではありません' });
    }

    next();
  } catch (error) {
    logger.error('担当教員チェックエラー:', error);
    res.status(500).json({ success: false, message: 'サーバーエラーが発生しました' });
  }
};


/**
 * オプショナル認証ミドルウェア
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = JWTUtil.verifyToken(token);
        if (decoded) {
          const users = await query(
            'SELECT id, name, email, role, student_id, employee_id, department FROM users WHERE id = ?',
            [decoded.id]
          );
          if (users.length > 0) {
            req.user = users[0];
          }
        }
      } catch (err) {
        // トークンが無効な場合は無視
      }
    }

    next();
  } catch (error) {
    logger.debug('オプショナル認証エラー:', error.message);
    next();
  }
};

/**
 * レート制限ミドルウェア（認証済みユーザー用）
 */
const authRateLimit = (req, res, next) => {
  req.rateLimitKey = `auth_${req.user?.id || req.ip}`;
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  requireClassTeacher,
  optionalAuth,
  authRateLimit,
  requireRole
};