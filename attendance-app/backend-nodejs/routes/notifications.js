const express = require('express');
const { body, query, validationResult } = require('express-validator');
const NotificationService = require('../services/NotificationService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 通知の作成
 */
router.post('/', authenticate, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('タイトルは1文字以上255文字以下で入力してください'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('メッセージは1文字以上1000文字以下で入力してください'),
  body('type')
    .isIn(['attendance', 'grade', 'general', 'alert'])
    .withMessage('有効な通知タイプを選択してください'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('有効な優先度を選択してください'),
  body('user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効なユーザーIDを入力してください'),
  body('student_id')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください')
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

    const notificationData = req.body;
    const result = await NotificationService.createNotification(notificationData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('通知作成APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 通知一覧の取得
 */
router.get('/', authenticate, [
  query('user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効なユーザーIDを入力してください'),
  query('student_id')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください'),
  query('type')
    .optional()
    .isIn(['attendance', 'grade', 'general', 'alert'])
    .withMessage('有効な通知タイプを選択してください'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('有効な優先度を選択してください'),
  query('is_read')
    .optional()
    .isBoolean()
    .withMessage('既読フラグは真偽値で入力してください'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('制限数は1-100の範囲で入力してください'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('オフセットは0以上の整数で入力してください')
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

    const { user_id, student_id, type, priority, is_read, limit, offset = 0 } = req.query;
    
    // 自分の通知のみ取得可能（管理者は全員の通知を取得可能）
    const targetUserId = user_id || req.user.id;
    if (targetUserId != req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '他のユーザーの通知を取得する権限がありません'
      });
    }

    const result = await NotificationService.getNotifications({
      user_id: targetUserId,
      student_id,
      type,
      priority,
      is_read,
      limit,
      offset
    });

    res.json(result);
  } catch (error) {
    logger.error('通知一覧取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 特定通知の取得
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await NotificationService.getNotification(id, req.user.id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    logger.error('通知取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 通知を既読にする
 */
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await NotificationService.markAsRead(id, req.user.id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('通知既読APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 全通知を既読にする
 */
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const result = await NotificationService.markAllAsRead(req.user.id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('全通知既読APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 通知の削除
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await NotificationService.deleteNotification(id, req.user.id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('通知削除APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router;
