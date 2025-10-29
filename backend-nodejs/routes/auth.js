const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/AuthService');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * ログイン
 */
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('パスワードは6文字以上で入力してください')
], async (req, res) => {
  try {
    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    const result = await AuthService.login(email, password);

    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    logger.error('ログインAPIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 新規登録
 */
router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('名前は1文字以上255文字以下で入力してください'),
  body('email')
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('パスワードは6文字以上で入力してください'),
  body('employeeId')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('社員IDは1文字以上50文字以下で入力してください'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('部署名は100文字以下で入力してください')
], async (req, res) => {
  try {
    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    const userData = req.body;
    const result = await AuthService.register(userData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('新規登録APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * ユーザー情報取得
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    logger.error('ユーザー情報取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * パスワード変更
 */
router.put('/change-password', authenticate, [
  body('currentPassword')
    .isLength({ min: 6 })
    .withMessage('現在のパスワードは6文字以上で入力してください'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新しいパスワードは6文字以上で入力してください')
], async (req, res) => {
  try {
    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const result = await AuthService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('パスワード変更APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * プロフィール更新
 */
router.put('/profile', authenticate, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('名前は1文字以上255文字以下で入力してください'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('部署名は100文字以下で入力してください')
], async (req, res) => {
  try {
    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    const updateData = req.body;
    const result = await AuthService.updateProfile(req.user.id, updateData);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('プロフィール更新APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * ログアウト（クライアント側でトークンを削除）
 */
router.post('/logout', authenticate, (req, res) => {
  logger.info('ログアウト', { userId: req.user.id });
  res.json({
    success: true,
    message: 'ログアウトしました'
  });
});

module.exports = router;
