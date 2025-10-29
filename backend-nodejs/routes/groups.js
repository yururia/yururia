const express = require('express');
const { body, query, validationResult } = require('express-validator');
const GroupService = require('../services/GroupService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * グループの作成
 */
router.post('/', authenticate, requireAdmin, [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('グループ名は1文字以上255文字以下で入力してください'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('説明は1000文字以下で入力してください'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('アクティブフラグは真偽値で入力してください')
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

    const groupData = req.body;
    const result = await GroupService.createGroup(groupData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('グループ作成APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * グループ一覧の取得
 */
router.get('/', authenticate, [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('検索キーワードは255文字以下で入力してください'),
  query('is_active')
    .optional()
    .isBoolean()
    .withMessage('アクティブフラグは真偽値で入力してください'),
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

    const { search, is_active, limit, offset = 0 } = req.query;
    const result = await GroupService.getGroups({
      search,
      is_active,
      limit,
      offset
    });

    res.json(result);
  } catch (error) {
    logger.error('グループ一覧取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 特定グループの取得
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await GroupService.getGroup(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    logger.error('グループ取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * グループ情報の更新
 */
router.put('/:id', authenticate, requireAdmin, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('グループ名は1文字以上255文字以下で入力してください'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('説明は1000文字以下で入力してください'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('アクティブフラグは真偽値で入力してください')
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

    const { id } = req.params;
    const updateData = req.body;

    const result = await GroupService.updateGroup(id, updateData);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('グループ情報更新APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * グループメンバーの追加
 */
router.post('/:id/members', authenticate, requireAdmin, [
  body('student_id')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください'),
  body('role')
    .optional()
    .isIn(['member', 'leader', 'assistant'])
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

    const { id } = req.params;
    const { student_id, role = 'member' } = req.body;

    const result = await GroupService.addMember(id, student_id, role);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('グループメンバー追加APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * グループメンバーの取得
 */
router.get('/:id/members', authenticate, [
  query('role')
    .optional()
    .isIn(['member', 'leader', 'assistant'])
    .withMessage('有効なロールを選択してください'),
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

    const { id } = req.params;
    const { role, limit, offset = 0 } = req.query;

    const result = await GroupService.getMembers(id, { role, limit, offset });

    res.json(result);
  } catch (error) {
    logger.error('グループメンバー取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * グループメンバーの削除
 */
router.delete('/:id/members/:studentId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id, studentId } = req.params;

    const result = await GroupService.removeMember(id, studentId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('グループメンバー削除APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * グループの削除
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await GroupService.deleteGroup(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('グループ削除APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router;
