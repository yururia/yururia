import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './AbsenceRequestModal.css';

/**
 * 欠席申請モーダル（学生用）
 */
const AbsenceRequestModal = ({ isOpen, onClose, defaultDate, onSubmit }) => {
    const [formData, setFormData] = useState({
        date: '',
        type: 'absent',
        reason: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // ポータル用のコンテナを作成（Hooksは条件分岐の前に配置）
    const [portalContainer] = useState(() => {
        const div = document.createElement('div');
        div.id = `absence-request-modal-portal-${Date.now()}`;
        return div;
    });

    // defaultDateが変わったらフォームの日付を更新
    useEffect(() => {
        if (defaultDate) {
            const dateStr = defaultDate.toISOString().split('T')[0];
            setFormData(prev => ({ ...prev, date: dateStr }));
        }
    }, [defaultDate]);

    // ポータルのマウント/アンマウント
    useEffect(() => {
        if (isOpen) {
            document.body.appendChild(portalContainer);
        }
        return () => {
            if (document.body.contains(portalContainer)) {
                document.body.removeChild(portalContainer);
            }
        };
    }, [portalContainer, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.reason.trim()) {
            setError('理由を入力してください');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onSubmit(formData);
            // 成功したらフォームをリセットして閉じる
            setFormData({ date: '', type: 'absent', reason: '' });
            onClose();
        } catch (err) {
            setError(err.message || '申請の送信に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 早期リターンは全てのHooksの後に配置
    if (!isOpen) return null;

    // 日付をフォーマット
    const formattedDate = defaultDate ? new Date(defaultDate).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    }) : '';

    return ReactDOM.createPortal(
        <div className="absence-modal-overlay" onClick={onClose}>
            <div className="absence-modal" onClick={(e) => e.stopPropagation()}>
                <div className="absence-modal-header">
                    <h2>📝 欠席申請</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="absence-form">
                    {error && (
                        <div className="error-message">{error}</div>
                    )}

                    <div className="form-group">
                        <label>申請日</label>
                        <div className="selected-date-display">
                            {formattedDate}
                        </div>
                        <input
                            type="hidden"
                            name="date"
                            value={formData.date}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="type">種別 *</label>
                        <select
                            id="type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            required
                        >
                            <option value="absent">欠席</option>
                            <option value="late">遅刻</option>
                            <option value="early_departure">早退</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="reason">理由 *</label>
                        <textarea
                            id="reason"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            placeholder="欠席の理由を入力してください"
                            rows="4"
                            required
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? '送信中...' : '申請する'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        portalContainer
    );
};

export default AbsenceRequestModal;
