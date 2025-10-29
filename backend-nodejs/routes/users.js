const express = require('express');
const { body, query, validationResult } = require('express-validator');
const UserService = require('../services/UserService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 全ユーザー一覧取得（管理者のみ）
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await UserService.getAllUsers();

    res.json(result);
  } catch (error) {
    logger.error('ユーザー一覧取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 特定ユーザーの情報取得
 */
router.get('/:userId', authenticate, [
  query('userId')
    .isInt({ min: 1 })
    .withMessage('有効なユーザーIDを入力してください')
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

    const { userId } = req.params;

    // 自分の情報のみ取得可能（管理者は全員の情報を取得可能）
    if (userId != req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '他のユーザーの情報を取得する権限がありません'
      });
    }

    const result = await UserService.getUser(userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    logger.error('ユーザー情報取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * ユーザー情報の更新
 */
router.put('/:userId', authenticate, [
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
    .withMessage('部署名は100文字以下で入力してください'),
  body('role')
    .optional()
    .isIn(['employee', 'admin'])
    .withMessage('有効なロールを選択してください')
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

    const { userId } = req.params;
    const updateData = req.body;

    // 自分の情報のみ更新可能（管理者は全員の情報を更新可能）
    if (userId != req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'このユーザーの情報を更新する権限がありません'
      });
    }

    // ロールの変更は管理者のみ可能
    if (updateData.role && updateData.role !== req.user.role && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'ロールの変更権限がありません'
      });
    }

    const result = await UserService.updateUser(userId, updateData);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('ユーザー情報更新APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * ユーザーの削除（管理者のみ）
 */
router.delete('/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // 自分自身の削除は禁止
    if (userId == req.user.id) {
      return res.status(400).json({
        success: false,
        message: '自分自身のアカウントは削除できません'
      });
    }

    const result = await UserService.deleteUser(userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('ユーザー削除APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router;
