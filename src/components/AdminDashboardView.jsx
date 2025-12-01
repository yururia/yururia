import React, { useState, useEffect } from 'react';
import { organizationApi, groupApi } from '../api';
import './AdminDashboardView.css';

/**
 * 管理者ダッシュボードビュー
 */
const AdminDashboardView = () => {
    const [stats, setStats] = useState(null);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);

        try {
            // 組織統計とグループ一覧を並行取得
            const [statsResponse, groupsResponse] = await Promise.all([
                organizationApi.getOrganizationStats(1), // デフォルト組織ID=1
                groupApi.getGroups()
            ]);

            if (statsResponse.success) {
                setStats(statsResponse.data);
            }

            if (groupsResponse.success) {
                setGroups(groupsResponse.data);
            }
        } catch (err) {
            console.error('Dashboard data fetch error:', err);
            setError(err.message || 'データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-dashboard-loading">
                <div className="spinner"></div>
                <p>読み込み中...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-dashboard-error">
                <p className="error-message">⚠️ {error}</p>
                <button onClick={fetchDashboardData} className="btn btn--primary">
                    再読み込み
                </button>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <h1>管理者ダッシュボード</h1>
                <p className="dashboard-subtitle">システム全体の統計と管理</p>
            </div>

            {/* 統計カード */}
            <div className="stats-grid">
                <div className="stat-card stat-card--primary">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3 className="stat-value">{stats?.totalGroups || 0}</h3>
                        <p className="stat-label">グループ数</p>
                    </div>
                </div>

                <div className="stat-card stat-card--success">
                    <div className="stat-icon">🎓</div>
                    <div className="stat-content">
                        <h3 className="stat-value">{stats?.totalStudents || 0}</h3>
                        <p className="stat-label">学生数</p>
                    </div>
                </div>

                <div className="stat-card stat-card--info">
                    <div className="stat-icon">👨‍🏫</div>
                    <div className="stat-content">
                        <h3 className="stat-value">{stats?.totalTeachers || 0}</h3>
                        <p className="stat-label">教員数</p>
                    </div>
                </div>

                <div className="stat-card stat-card--warning">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <h3 className="stat-value">
                            {stats?.todayAttendanceRate
                                ? `${stats.todayAttendanceRate}%`
                                : 'N/A'}
                        </h3>
                        <p className="stat-label">今日の出席率</p>
                    </div>
                </div>
            </div>

            {/* グループ一覧 */}
            <div className="dashboard-section">
                <div className="section-header">
                    <h2>グループ一覧</h2>
                    <button className="btn btn--primary" onClick={() => {/* TODO: グループ作成モーダル */ }}>
                        + 新規グループ
                    </button>
                </div>

                {groups.length === 0 ? (
                    <div className="empty-state">
                        <p>グループがまだありません</p>
                        <button className="btn btn--secondary">最初のグループを作成</button>
                    </div>
                ) : (
                    <div className="groups-grid">
                        {groups.map(group => (
                            <div key={group.id} className="group-card">
                                <div className="group-header">
                                    <h3>{group.name}</h3>
                                    <span className={`group-status ${group.is_active ? 'active' : 'inactive'}`}>
                                        {group.is_active ? 'アクティブ' : '非アクティブ'}
                                    </span>
                                </div>
                                <div className="group-info">
                                    <p className="group-detail">
                                        <span className="label">学年:</span>
                                        <span className="value">{group.grade || 'N/A'}</span>
                                    </p>
                                    <p className="group-detail">
                                        <span className="label">年度:</span>
                                        <span className="value">{group.academic_year || 'N/A'}</span>
                                    </p>
                                    <p className="group-detail">
                                        <span className="label">メンバー数:</span>
                                        <span className="value">{group.member_count || 0}名</span>
                                    </p>
                                </div>
                                <div className="group-actions">
                                    <button className="btn btn--sm btn--secondary">詳細</button>
                                    <button className="btn btn--sm btn--primary">編集</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* クイックアクション */}
            <div className="dashboard-section">
                <h2>クイックアクション</h2>
                <div className="quick-actions">
                    <button className="action-btn">
                        <span className="action-icon">📱</span>
                        <span className="action-text">QRコード生成</span>
                    </button>
                    <button className="action-btn">
                        <span className="action-icon">📅</span>
                        <span className="action-text">時間割管理</span>
                    </button>
                    <button className="action-btn">
                        <span className="action-icon">🔒</span>
                        <span className="action-text">IP範囲設定</span>
                    </button>
                    <button className="action-btn">
                        <span className="action-icon">📊</span>
                        <span className="action-text">レポート出力</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardView;
