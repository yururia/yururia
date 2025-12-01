const express = require('express');
const router = express.Router();
const AbsenceRequestService = require('../services/AbsenceRequestService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// ファイルアップロード設定
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/absence-attachments/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('画像またはPDFファイルのみアップロード可能です'));
        }
    }
});

/**
 * 欠席申請管理ルート
 */

// すべてのルートで認証が必要
router.use(authenticate);

/**
 * POST /api/absence-requests
 * 新しい申請を作成
 */
router.post('/', upload.single('attachment'), async (req, res) => {
    try {
        const requestData = {
            ...req.body,
            attachmentUrl: req.file ? `/uploads/absence-attachments/${req.file.filename}` : null
        };

        const request = await AbsenceRequestService.createRequest(requestData);

        res.status(201).json({
            success: true,
            message: '申請を作成しました',
            data: request
        });
    } catch (error) {
        console.error('申請作成エラー:', error);
        res.status(400).json({
            success: false,
            message: '申請の作成に失敗しました',
            error: error.message
        });
    }
});

/**
 * GET /api/absence-requests/student/:studentId
 * 学生の申請一覧を取得
 */
router.get('/student/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const options = {
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
        };

        const requests = await AbsenceRequestService.getRequestsByStudent(studentId, options);

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('学生申請一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            message: '申請一覧の取得に失敗しました',
            error: error.message
        });
    }
});

/**
 * GET /api/absence-requests/teacher/:teacherId
 * 教員の承認待ち申請一覧を取得
 */
router.get('/teacher/:teacherId', async (req, res) => {
    try {
        const { teacherId } = req.params;

        // 教員または管理者のみ
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '教員または管理者のみアクセスできます'
            });
        }

        const options = {
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
        };

        const requests = await AbsenceRequestService.getPendingRequestsForTeacher(
            parseInt(teacherId),
            options
        );

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('教員申請一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            message: '申請一覧の取得に失敗しました',
            error: error.message
        });
    }
});

/**
 * GET /api/absence-requests/all
 * すべての申請一覧を取得（管理者のみ）
 */
router.get('/all', async (req, res) => {
    try {
        // 管理者のみ
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '管理者のみアクセスできます'
            });
        }

        const options = {
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            limit: parseInt(req.query.limit) || 100,
            offset: parseInt(req.query.offset) || 0
        };

        const requests = await AbsenceRequestService.getAllRequests(options);

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('全申請一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            message: '申請一覧の取得に失敗しました',
            error: error.message
        });
    }
});

/**
 * GET /api/absence-requests/:id
 * 申請詳細を取得
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const request = await AbsenceRequestService.getRequest(parseInt(id));

        res.json({
            success: true,
            data: request
        });
    } catch (error) {
        console.error('申請詳細取得エラー:', error);
        res.status(404).json({
            success: false,
            message: '申請が見つかりません',
            error: error.message
        });
    }
});

/**
 * DELETE /api/absence-requests/:id
 * 申請を取り消し（学生のみ、pending状態のみ）
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { studentId } = req.body;

        const result = await AbsenceRequestService.cancelRequest(parseInt(id), studentId);

        res.json({
            success: true,
            message: '申請を取り消しました',
            data: result
        });
    } catch (error) {
        console.error('申請取り消しエラー:', error);
        res.status(400).json({
            success: false,
            message: '申請の取り消しに失敗しました',
            error: error.message
        });
    }
});

module.exports = router;
