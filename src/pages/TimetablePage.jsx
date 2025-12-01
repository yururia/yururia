import React, { useState, useEffect } from 'react';
import { timetableApi, groupApi } from '../api';
import useAuthStore from '../stores/authStore';
import './TimetablePage.css';

const TimetablePage = () => {
    const user = useAuthStore(state => state.user);
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [timetables, setTimetables] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);

    useEffect(() => {
        fetchGroups();
    }, []);

    useEffect(() => {
        if (selectedGroup) {
            fetchTimetables();
        }
    }, [selectedGroup]);

    const fetchGroups = async () => {
        try {
            const response = await groupApi.getGroups();
            if (response.success) {
                setGroups(response.data);
                if (response.data.length > 0) {
                    setSelectedGroup(response.data[0].id);
                }
            }
        } catch (err) {
            setError('グループの取得に失敗しました');
        }
    };

    const fetchTimetables = async () => {
        setLoading(true);
        try {
            const response = await timetableApi.getTimetablesByGroup(selectedGroup);
            if (response.success) {
                setTimetables(response.data);
            }
        } catch (err) {
            setError('時間割の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
                setError('Excelファイル(.xlsx, .xls)を選択してください');
                return;
            }
            setImportFile(file);
        }
    };

    const handleImport = async () => {
        if (!importFile || !selectedGroup) {
            setError('ファイルとグループを選択してください');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await timetableApi.importFromExcel(importFile, selectedGroup);
            if (response.success) {
                setSuccess(`${response.data.imported}件の時間割をインポートしました`);
                setShowImportModal(false);
                setImportFile(null);
                fetchTimetables();
            } else {
                setError(response.message || 'インポートに失敗しました');
            }
        } catch (err) {
            setError(err.message || 'インポートに失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (time) => {
        if (!time) return '--:--';
        return time.substring(0, 5);
    };

    const getDayLabel = (day) => {
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        return days[day] || day;
    };

    return (
        <div className="timetable-page">
            <div className="timetable-container">
                <div className="page-header">
                    <h1>時間割管理</h1>
                    <p className="page-subtitle">クラスの時間割を管理します</p>
                </div>

                {error && <div className="alert alert--error"><span>⚠️ {error}</span><button onClick={() => setError(null)}>×</button></div>}
                {success && <div className="alert alert--success"><span>✓ {success}</span><button onClick={() => setSuccess(null)}>×</button></div>}

                <div className="timetable-controls">
                    <div className="group-selector">
                        <label>グループ:</label>
                        <select value={selectedGroup || ''} onChange={(e) => setSelectedGroup(Number(e.target.value))} className="form-select">
                            {groups.map(group => (
                                <option key={group.id} value={group.id}>{group.name}</option>
                            ))}
                        </select>
                    </div>
                    {user?.role === 'admin' && (
                        <button className="btn btn--primary" onClick={() => setShowImportModal(true)}>
                            📥 Excelインポート
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="loading-state">読み込み中...</div>
                ) : timetables.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📅</div>
                        <p>時間割がありません</p>
                        {user?.role === 'admin' && <p className="empty-hint">Excelファイルからインポートしてください</p>}
                    </div>
                ) : (
                    <div className="timetable-grid">
                        <div className="timetable-header">
                            <div className="period-column">時限</div>
                            {[1, 2, 3, 4, 5].map(day => (
                                <div key={day} className="day-column">{getDayLabel(day)}</div>
                            ))}
                        </div>
                        {Array.from({ length: 6 }, (_, i) => i + 1).map(period => (
                            <div key={period} className="timetable-row">
                                <div className="period-cell">{period}限</div>
                                {[1, 2, 3, 4, 5].map(day => {
                                    const session = timetables.find(t => t.day_of_week === day && t.period === period);
                                    return (
                                        <div key={`${day}-${period}`} className={`session-cell ${session ? 'has-session' : ''}`}>
                                            {session ? (
                                                <>
                                                    <div className="session-subject">{session.subject}</div>
                                                    <div className="session-time">{formatTime(session.start_time)} - {formatTime(session.end_time)}</div>
                                                    {session.room && <div className="session-room">{session.room}</div>}
                                                </>
                                            ) : (
                                                <div className="empty-session">-</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showImportModal && (
                <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Excelインポート</h2>
                            <button className="modal-close" onClick={() => setShowImportModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="import-instructions">
                                <h3>インポート方法</h3>
                                <ol>
                                    <li>Excelファイルには以下の列が必要です：<br />
                                        <code>day_of_week, period, subject, start_time, end_time, room</code>
                                    </li>
                                    <li>day_of_weekは1(月)〜5(金)の数値</li>
                                    <li>periodは1〜6の数値</li>
                                    <li>時刻は HH:MM 形式（例: 09:00）</li>
                                </ol>
                            </div>
                            <div className="form-group">
                                <label>Excelファイル</label>
                                <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="form-file" />
                                {importFile && <div className="file-preview">📎 {importFile.name}</div>}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn--secondary" onClick={() => setShowImportModal(false)}>キャンセル</button>
                            <button className="btn btn--primary" onClick={handleImport} disabled={!importFile || loading}>
                                {loading ? 'インポート中...' : 'インポート'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimetablePage;
