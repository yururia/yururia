const express = require('express');
const { body, query, validationResult } = require('express-validator');
const QRService = require('../services/QRService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * QRコードの生成
 */
router.post('/generate', authenticate, [
  body('student_id')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください'),
  body('type')
    .isIn(['attendance', 'student_info', 'class'])
    .withMessage('有効なQRタイプを選択してください'),
  body('class_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効な授業IDを入力してください'),
  body('expires_in')
    .optional()
    .isInt({ min: 300, max: 86400 })
    .withMessage('有効期限は300秒-86400秒の範囲で入力してください')
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

    const { student_id, type, class_id, expires_in } = req.body;

    const result = await QRService.generateQRCode({
      student_id,
      type,
      class_id,
      expires_in,
      created_by: req.user.id
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('QRコード生成APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * QRコードの検証
 */
router.post('/verify', authenticate, [
  body('qr_data')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('QRデータは1文字以上1000文字以下で入力してください')
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

    const { qr_data } = req.body;

    const result = await QRService.verifyQRCode(qr_data);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('QRコード検証APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * QRコードスキャンによる出欠記録
 */
router.post('/scan', authenticate, [
  body('qr_data')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('QRデータは1文字以上1000文字以下で入力してください'),
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('有効なタイムスタンプを入力してください')
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

    const { qr_data, timestamp } = req.body;

    const result = await QRService.scanQRCode({
      qr_data,
      timestamp,
      scanned_by: req.user.id
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('QRコードスキャンAPIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * QRコード履歴の取得
 */
router.get('/history', authenticate, [
  query('student_id')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください'),
  query('type')
    .optional()
    .isIn(['attendance', 'student_info', 'class'])
    .withMessage('有効なQRタイプを選択してください'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('有効な開始日を入力してください'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('有効な終了日を入力してください'),
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

    const { student_id, type, start_date, end_date, limit, offset = 0 } = req.query;

    const result = await QRService.getQRHistory({
      student_id,
      type,
      start_date,
      end_date,
      limit,
      offset,
      user_id: req.user.id,
      user_role: req.user.role
    });

    res.json(result);
  } catch (error) {
    logger.error('QRコード履歴取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * QRコードの削除
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await QRService.deleteQRCode(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('QRコード削除APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router;
