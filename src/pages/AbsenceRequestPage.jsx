import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { absenceRequestApi } from '../api';
import useAuthStore from '../stores/authStore';
import './AbsenceRequestPage.css';

/**
 * 欠席申請ページ（学生用）
 * URLパラメータ対応: ?type=late&classId=xxx&date=YYYY-MM-DD
 */
const AbsenceRequestPage = () => {
    const user = useAuthStore(state => state.user);
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [myRequests, setMyRequests] = useState([]);
    const [showForm, setShowForm] = useState(false);

    // URLパラメータから初期値を取得
    const urlType = searchParams.get('type');
    const urlDate = searchParams.get('date');
    const urlClassId = searchParams.get('classId');

    // フォームデータ
    const [formData, setFormData] = useState({
        requestType: 'absence',
        requestDate: '',
        reason: '',
        attachment: null,
        classId: ''
    });

    // URLパラメータがある場合、フォームを自動で開いて初期値を設定
    useEffect(() => {
        if (urlType || urlDate) {
            // 遅刻（late）の場合は official_late に変換
            let requestType = 'absence';
            if (urlType === 'late') {
                requestType = 'official_late';
            } else if (urlType === 'absence' || urlType === 'official_absence' || urlType === 'early_departure') {
                requestType = urlType;
            }

            setFormData(prev => ({
                ...prev,
                requestType,
                requestDate: urlDate || '',
                classId: urlClassId || ''
            }));
            setShowForm(true);
        }
    }, [urlType, urlDate, urlClassId]);

    useEffect(() => {
        if (user?.student_id) {
            fetchMyRequests();
        }
    }, [user]);

    const fetchMyRequests = async () => {
        try {
            const response = await absenceRequestApi.getRequestsByStudent(user.student_id);
            if (response.success) {
                setMyRequests(response.data);
            }
        } catch (err) {
            console.error('申請履歴取得エラー:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // ファイルサイズチェック（5MB）
            if (file.size > 5 * 1024 * 1024) {
                setError('ファイルサイズは5MB以下にしてください');
                e.target.value = '';
                return;
            }
            setFormData(prev => ({ ...prev, attachment: file }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.requestDate || !formData.reason) {
            setError('日付と理由は必須です');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await absenceRequestApi.createRequest(
                {
                    studentId: user.student_id,
                    requestType: formData.requestType,
                    requestDate: formData.requestDate,
                    reason: formData.reason
                },
                formData.attachment
            );

            if (response.success) {
                setSuccess('申請が送信されました');
                setShowForm(false);
                setFormData({
                    requestType: 'absence',
                    requestDate: '',
                    reason: '',
                    attachment: null
                });
                fetchMyRequests();
            } else {
                setError(response.message || '申請に失敗しました');
            }
        } catch (err) {
            setError(err.message || '申請に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRequest = async (requestId) => {
        if (!window.confirm('この申請をキャンセルしますか？')) {
            return;
        }

        try {
            const response = await absenceRequestApi.cancelRequest(requestId);
            if (response.success) {
                setSuccess('申請をキャンセルしました');
                fetchMyRequests();
            } else {
                setError(response.message || 'キャンセルに失敗しました');
            }
        } catch (err) {
            setError(err.message || 'キャンセルに失敗しました');
        }
    };

    const getRequestTypeLabel = (type) => {
        const labels = {
            'absence': '欠席届',
            'official_absence': '公欠届',
            'official_late': '公遅刻届',
            'early_departure': '早退届'
        };
        return labels[type] || type;
    };

    const getStatusLabel = (status) => {
        const labels = {
            'pending': '承認待ち',
            'approved': '承認済み',
            'rejected': '却下'
        };
        return labels[status] || status;
    };

    return (
        <div className="absence-request-page">
            <div className="absence-request-container">
                <div className="page-header">
                    <h1>欠席申請</h1>
                    <p className="page-subtitle">欠席・遅刻・早退の届出を行います</p>
                </div>

                {error && (
                    <div className="alert alert--error">
                        <span>⚠️ {error}</span>
                        <button onClick={() => setError(null)}>×</button>
                    </div>
                )}

                {success && (
                    <div className="alert alert--success">
                        <span>✓ {success}</span>
                        <button onClick={() => setSuccess(null)}>×</button>
                    </div>
                )}

                <div className="request-content">
                    {/* 新規申請ボタン */}
                    <div className="request-actions">
                        <button
                            className="btn btn--primary btn--large"
                            onClick={() => setShowForm(!showForm)}
                        >
                            {showForm ? '申請フォームを閉じる' : '+ 新規申請'}
                        </button>
                    </div>

                    {/* 申請フォーム */}
                    {showForm && (
                        <div className="request-form-section">
                            <h2>新規申請</h2>
                            <form onSubmit={handleSubmit} className="request-form">
                                <div className="form-group">
                                    <label htmlFor="requestType">申請種別 *</label>
                                    <select
                                        id="requestType"
                                        name="requestType"
                                        value={formData.requestType}
                                        onChange={handleInputChange}
                                        className="form-select"
                                        required
                                    >
                                        <option value="absence">欠席届</option>
                                        <option value="official_absence">公欠届</option>
                                        <option value="official_late">公遅刻届</option>
                                        <option value="early_departure">早退届</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="requestDate">日付 *</label>
                                    <input
                                        type="date"
                                        id="requestDate"
                                        name="requestDate"
                                        value={formData.requestDate}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="reason">理由 *</label>
                                    <textarea
                                        id="reason"
                                        name="reason"
                                        value={formData.reason}
                                        onChange={handleInputChange}
                                        placeholder="欠席・遅刻・早退の理由を詳しく記入してください"
                                        rows="5"
                                        className="form-textarea"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="attachment">添付ファイル（任意）</label>
                                    <input
                                        type="file"
                                        id="attachment"
                                        name="attachment"
                                        onChange={handleFileChange}
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        className="form-file"
                                    />
                                    <small className="form-hint">
                                        JPG, PNG, PDF形式、最大5MBまで
                                    </small>
                                    {formData.attachment && (
                                        <div className="file-preview">
                                            📎 {formData.attachment.name}
                                        </div>
                                    )}
                                </div>

                                <div className="form-buttons">
                                    <button
                                        type="button"
                                        className="btn btn--secondary"
                                        onClick={() => setShowForm(false)}
                                        disabled={loading}
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn--primary"
                                        disabled={loading}
                                    >
                                        {loading ? '送信中...' : '申請を送信'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* 申請履歴 */}
                    <div className="request-history-section">
                        <h2>申請履歴</h2>
                        {myRequests.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📝</div>
                                <p>申請履歴がありません</p>
                            </div>
                        ) : (
                            <div className="request-list">
                                {myRequests.map(request => (
                                    <div key={request.id} className="request-card">
                                        <div className="request-card-header">
                                            <div>
                                                <span className="request-type-badge">
                                                    {getRequestTypeLabel(request.request_type)}
                                                </span>
                                                <span className={`status-badge status-${request.status}`}>
                                                    {getStatusLabel(request.status)}
                                                </span>
                                            </div>
                                            <span className="request-date">
                                                {new Date(request.request_date).toLocaleDateString('ja-JP')}
                                            </span>
                                        </div>

                                        <div className="request-card-body">
                                            <p className="request-reason">{request.reason}</p>
                                            {request.attachment_path && (
                                                <div className="request-attachment">
                                                    📎 添付ファイルあり
                                                </div>
                                            )}
                                        </div>

                                        <div className="request-card-footer">
                                            <div className="request-meta">
                                                <span>申請日: {new Date(request.created_at).toLocaleDateString('ja-JP')}</span>
                                                {request.approved_at && (
                                                    <span>承認日: {new Date(request.approved_at).toLocaleDateString('ja-JP')}</span>
                                                )}
                                            </div>
                                            {request.status === 'pending' && (
                                                <button
                                                    className="btn btn--sm btn--danger"
                                                    onClick={() => handleCancelRequest(request.id)}
                                                >
                                                    キャンセル
                                                </button>
                                            )}
                                        </div>

                                        {request.approval_comment && (
                                            <div className="request-comment">
                                                <strong>担当者コメント:</strong>
                                                <p>{request.approval_comment}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AbsenceRequestPage;
