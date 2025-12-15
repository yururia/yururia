import React, { useState, useEffect } from 'react';
import { absenceRequestApi } from '../api';
import useAuthStore from '../stores/authStore';
import './ApprovalManagementPage.css';

const ApprovalManagementPage = () => {
    const user = useAuthStore(state => state.user);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [comment, setComment] = useState('');
    const [filter, setFilter] = useState('pending'); // 'all' | 'pending' | 'approved' | 'rejected'

    useEffect(() => {
        fetchRequests();
    }, [user, filter]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            let response;
            if (user?.role === 'admin' || user?.role === 'owner') {
                response = await absenceRequestApi.getAllRequests({ status: filter === 'all' ? null : filter });
            } else if (user?.role === 'teacher') {
                response = await absenceRequestApi.getPendingRequestsForTeacher(user.id, { status: filter === 'all' ? null : filter });
            }

            if (response && response.success) {
                setRequests(response.data);
            }
        } catch (err) {
            setError(err.message || 'データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId) => {
        try {
            const response = await absenceRequestApi.approveRequest(requestId, comment);
            if (response.success) {
                setSuccess('申請を承認しました');
                setSelectedRequest(null);
                setComment('');
                fetchRequests();
            } else {
                setError(response.message || '承認に失敗しました');
            }
        } catch (err) {
            setError(err.message || '承認に失敗しました');
        }
    };

    const handleReject = async (requestId) => {
        if (!comment) {
            setError('却下の理由を入力してください');
            return;
        }

        try {
            const response = await absenceRequestApi.rejectRequest(requestId, comment);
            if (response.success) {
                setSuccess('申請を却下しました');
                setSelectedRequest(null);
                setComment('');
                fetchRequests();
            } else {
                setError(response.message || '却下に失敗しました');
            }
        } catch (err) {
            setError(err.message || '却下に失敗しました');
        }
    };

    // 通知を3秒後に自動消去
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const getRequestTypeLabel = (type) => {
        const labels = {
            'absence': '欠席届',
            'official_absence': '公欠届',
            'official_late': '公遅刻届',
            'early_departure': '早退届'
        };
        return labels[type] || type;
    };

    return (
        <div className="approval-page">
            {/* トースト通知 */}
            <div className="toast-container">
                {success && (
                    <div className="toast toast--success">
                        <span className="toast-icon">✓</span>
                        <span className="toast-message">{success}</span>
                        <button className="toast-close" onClick={() => setSuccess(null)}>×</button>
                    </div>
                )}
                {error && (
                    <div className="toast toast--error">
                        <span className="toast-icon">⚠️</span>
                        <span className="toast-message">{error}</span>
                        <button className="toast-close" onClick={() => setError(null)}>×</button>
                    </div>
                )}
            </div>

            <div className="approval-container">
                <div className="page-header">
                    <h1>承認管理</h1>
                    <p className="page-subtitle">学生からの申請を承認・却下します</p>
                </div>

                <div className="filter-bar">
                    <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>承認待ち</button>
                    <button className={`filter-btn ${filter === 'approved' ? 'active' : ''}`} onClick={() => setFilter('approved')}>承認済み</button>
                    <button className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>却下</button>
                    <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>すべて</button>
                </div>

                {loading ? (
                    <div className="loading-state">読み込み中...</div>
                ) : requests.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon">📭</div><p>申請がありません</p></div>
                ) : (
                    <div className="request-grid">
                        {requests.map(request => (
                            <div key={request.id} className="approval-card">
                                <div className="approval-card-header">
                                    <div>
                                        <h3>{request.student_name || request.student_id}</h3>
                                        <span className="request-type-badge">{getRequestTypeLabel(request.request_type)}</span>
                                    </div>
                                    <span className="request-date">{new Date(request.request_date).toLocaleDateString('ja-JP')}</span>
                                </div>
                                <div className="approval-card-body">
                                    <p className="request-reason">{request.reason}</p>
                                    {request.attachment_path && <div className="attachment-badge">📎 添付ファイルあり</div>}
                                </div>
                                {request.status === 'pending' ? (
                                    <div className="approval-card-actions">
                                        <button className="btn btn--success" onClick={() => setSelectedRequest(request)}>承認/却下</button>
                                    </div>
                                ) : (
                                    <div className="approval-card-footer">
                                        <span className={`status-badge status-${request.status}`}>{request.status === 'approved' ? '承認済み' : '却下'}</span>
                                        {request.approval_comment && <p className="approval-comment">コメント: {request.approval_comment}</p>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedRequest && (
                <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>申請の承認/却下</h2>
                            <button className="modal-close" onClick={() => setSelectedRequest(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="request-detail">
                                <p><strong>学生:</strong> {selectedRequest.student_name || selectedRequest.student_id}</p>
                                <p><strong>種別:</strong> {getRequestTypeLabel(selectedRequest.request_type)}</p>
                                <p><strong>日付:</strong> {new Date(selectedRequest.request_date).toLocaleDateString('ja-JP')}</p>
                                <p><strong>理由:</strong> {selectedRequest.reason}</p>
                            </div>
                            <div className="form-group">
                                <label>コメント（承認時は任意、却下時は必須）</label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    rows="4"
                                    className="form-textarea"
                                    placeholder="コメントを入力..."
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn--secondary" onClick={() => setSelectedRequest(null)}>キャンセル</button>
                            <button className="btn btn--danger" onClick={() => handleReject(selectedRequest.id)}>却下</button>
                            <button className="btn btn--success" onClick={() => handleApprove(selectedRequest.id)}>承認</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApprovalManagementPage;
