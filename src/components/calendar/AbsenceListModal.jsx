import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AbsenceListModal.css';

/**
 * 欠席者リストモーダル（教員用）
 */
const AbsenceListModal = ({ isOpen, onClose, date, absenceData }) => {
    const [activeTab, setActiveTab] = useState('absent');
    const navigate = useNavigate();

    if (!isOpen || !absenceData) return null;

    const formattedDate = date ? new Date(date).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    }) : '';

    const handleStudentClick = (studentId) => {
        navigate(`/student-attendance/${studentId}`);
        onClose();
    };

    const tabs = [
        { key: 'absent', label: '欠席', icon: '🔴', data: absenceData.absent || [] },
        { key: 'late', label: '遅刻', icon: '🟡', data: absenceData.late || [] },
        { key: 'early_departure', label: '早退', icon: '🟠', data: absenceData.early_departure || [] }
    ];

    const activeTabData = tabs.find(t => t.key === activeTab);

    return (
        <div className="absence-list-overlay" onClick={onClose}>
            <div className="absence-list-modal" onClick={(e) => e.stopPropagation()}>
                <div className="absence-list-header">
                    <div>
                        <h2>📋 出欠詳細</h2>
                        <p className="date-display">{formattedDate}</p>
                    </div>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <span className="tab-icon">{tab.icon}</span>
                            <span className="tab-label">{tab.label}</span>
                            <span className="tab-count">{tab.data.length}</span>
                        </button>
                    ))}
                </div>

                <div className="student-list">
                    {activeTabData.data.length === 0 ? (
                        <div className="empty-state">
                            <p>該当する学生はいません</p>
                        </div>
                    ) : (
                        activeTabData.data.map((student, index) => (
                            <div
                                key={student.studentId || index}
                                className="student-item"
                                onClick={() => handleStudentClick(student.studentId)}
                            >
                                <div className="student-info">
                                    <span className="student-name">{student.name}</span>
                                    <span className="student-id">{student.studentId}</span>
                                </div>
                                {student.reason && (
                                    <div className="student-reason">
                                        <span className="reason-label">理由:</span>
                                        <span className="reason-text">{student.reason}</span>
                                    </div>
                                )}
                                {student.status && (
                                    <div className="student-status">
                                        <span className={`status-badge status-${student.status}`}>
                                            {student.status === 'approved' ? '承認済' : '承認待ち'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AbsenceListModal;
