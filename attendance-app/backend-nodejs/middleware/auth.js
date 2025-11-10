const JWTUtil = require('../utils/jwt');
const AuthService = require('../services/AuthService');
const logger = require('../utils/logger');

/**
 * 認証ミドルウェア
 */
const authenticate = async (req, res, next) => {
  try {
    const token = JWTUtil.getTokenFromHeader(req);

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

    const user = await AuthService.getUserFromToken(token);

    if (!user) {
      logger.warn('認証失敗 - 無効なトークン', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(403).json({
        success: false,
        message: '無効なトークンです'
      });
    }

    // ユーザー情報をリクエストオブジェクトに追加
    req.user = user;
    
    logger.debug('認証成功', {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    next();
  } catch (error) {
    logger.error('認証ミドルウェアエラー:', error.message);
    return res.status(401).json({
      success: false,
      message: '認証に失敗しました'
    });
  }
};

/**
 * 管理者権限チェックミドルウェア
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '認証が必要です'
    });
  }

  if (req.user.role !== 'admin') {
    logger.warn('管理者権限なし', {
      userId: req.user.id,
      role: req.user.role,
      ip: req.ip
    });
    return res.status(403).json({
      success: false,
      message: '管理者権限が必要です'
    });
  }

  next();
};

/**
 * オプショナル認証ミドルウェア（認証されていない場合でも続行）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = JWTUtil.getTokenFromHeader(req);

    if (token) {
      const user = await AuthService.getUserFromToken(token);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // エラーが発生しても続行（認証はオプショナル）
    logger.debug('オプショナル認証エラー:', error.message);
    next();
  }
};

/**
 * レート制限ミドルウェア（認証済みユーザー用）
 */
const authRateLimit = (req, res, next) => {
  // 認証済みユーザーはより高いレート制限を適用
  req.rateLimitKey = `auth_${req.user?.id || req.ip}`;
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  optionalAuth,
  authRateLimit
};
