import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { attendanceApi } from '../api/attendanceApi';
import Button from '../components/common/Button';
import CalendarPage from './CalendarPage'; // カレンダーコンポーネントをインポート
import './DashboardPage.css';

const DashboardPage = () => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState({
    todayStatus: null,
    weeklyStats: null,
    monthlyStats: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const today = new Date();
      const userId = user?.id;
      
      // 今日の出欠状況を取得
      const todayResponse = await attendanceApi.getAttendanceRecords(userId, {
        date: today.toISOString().split('T')[0],
      });
      
      // 週間統計を取得
      const weeklyResponse = await attendanceApi.getAttendanceStats(userId, 'week');
      
      // 月間統計を取得
      const monthlyResponse = await attendanceApi.getAttendanceStats(userId, 'month');
      
      // 年間統計を取得 (新規追加)
      const annualResponse = await attendanceApi.getAttendanceStats(userId, 'year');

      setAttendanceData({
        todayStatus: todayResponse.records[0] || null,
        weeklyStats: weeklyResponse,
        monthlyStats: monthlyResponse,
        annualStats: annualResponse, // 新規追加
      });
    } catch (err) {
      setError('データの読み込みに失敗しました');
      console.error('ダッシュボードデータ読み込みエラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 出欠記録アクションを処理する汎用関数
  const handleAttendanceAction = async (type) => {
    try {
      setError(null); // エラーをクリア
      setIsLoading(true); // アクション実行中はローディング状態に

      const payload = {
        userId: user.id,
        type: type, // 'checkin', 'checkout', 'late', 'absent', 'early_departure'
        timestamp: new Date().toISOString(),
      };
      
      await attendanceApi.recordAttendance(payload);
      
      await loadDashboardData(); // データを再読み込み
    } catch (err) {
      setError(`${action === 'checkin' ? '出勤' : '退勤'}記録に失敗しました`);
      console.error('出欠記録エラー:', err);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'present':
        return '出勤中';
      case 'absent':
        return '欠勤';
      case 'late':
        return '遅刻';
        case 'early_departure': // 新規追加
          return '早退';
      default:
        return '未記録';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'present':
        return 'status-present';
      case 'absent':
        return 'status-absent';
      case 'late':
        return 'status-late';
        case 'early_departure': // 新規追加
          return 'status-early-departure';
      default:
        return 'status-unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="spinner" />
          <p>データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* カレンダーを一番上に配置 */}
      <CalendarPage isDashboardMode={true} />

      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">ダッシュボード</h1>
          <p className="dashboard-subtitle">
            こんにちは、{user?.name}さん
          </p>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <Button
              variant="outline"
              size="small"
              onClick={loadDashboardData}
              className="retry-button"
            >
              再試行
            </Button>
          </div>
        )}

        <div className="dashboard-grid">
          {/* 今日の出欠状況 */}
          <div className="dashboard-card">
            <h2 className="card-title">今日の出欠状況</h2>
            <div className="attendance-status">
              <div className={`status-indicator ${getStatusClass(attendanceData.todayStatus?.status)}`}>
                {getStatusText(attendanceData.todayStatus?.status)}
              </div>
              <div className="attendance-times">
                <div className="time-item">
                  <span className="time-label">出勤:</span>
                  <span className="time-value">
                    {formatTime(attendanceData.todayStatus?.checkInTime)}
                  </span>
                </div>
                <div className="time-item">
                  <span className="time-label">退勤:</span>
                  <span className="time-value">
                    {formatTime(attendanceData.todayStatus?.checkOutTime)}
                  </span>
                </div>
              </div>
            </div>
            
            {!attendanceData.todayStatus?.checkInTime && (
              <Button
                variant="success"
                size="large"
            onClick={() => handleAttendanceAction('checkin')}
            disabled={isLoading}
                className="attendance-button"
              >
                出勤記録
              </Button>
            )}
            
            {attendanceData.todayStatus?.checkInTime && !attendanceData.todayStatus?.checkOutTime && (
              <Button
                variant="danger"
                size="large"
                onClick={() => handleAttendanceAction('checkout')}
                disabled={isLoading}
                className="attendance-button"
              >
                退勤記録
              </Button>
            )}
          </div>

          {/* 週間統計 */}
          <div className="dashboard-card">
            <h2 className="card-title">今週の統計</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">出勤日数</span>
                <span className="stat-value">
                  {attendanceData.weeklyStats?.presentDays || 0}日
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">勤務時間</span>
                <span className="stat-value"> {/* バックエンドで時間計算が必要 */}
                  {attendanceData.weeklyStats?.totalHours || 0}時間
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">平均勤務時間</span>
                <span className="stat-value">
                  {attendanceData.weeklyStats?.averageHours || 0}時間
                </span>
              </div>
            </div>
          </div>

          {/* 月間統計 */}
          <div className="dashboard-card">
            <h2 className="card-title">今月の統計</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">出勤日数</span>
                <span className="stat-value">
                  {attendanceData.monthlyStats?.presentDays || 0}日
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">勤務時間</span>
                <span className="stat-value"> {/* バックエンドで時間計算が必要 */}
                  {attendanceData.monthlyStats?.totalHours || 0}時間
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">平均勤務時間</span>
                <span className="stat-value">
                  {attendanceData.monthlyStats?.averageHours || 0}時間
                </span>
              </div>
            </div>
          </div>

          {/* 年間統計 (新規追加) */}
          <div className="dashboard-card">
            <h2 className="card-title">今年の統計</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">出勤日数</span>
                <span className="stat-value">
                  {attendanceData.annualStats?.presentDays || 0}日
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">遅刻日数</span>
                <span className="stat-value">
                  {attendanceData.annualStats?.lateDays || 0}日
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">欠勤日数</span>
                <span className="stat-value">
                  {attendanceData.annualStats?.absentDays || 0}日
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">早退日数</span>
                <span className="stat-value">
                  {attendanceData.annualStats?.earlyDepartureDays || 0}日
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">総勤務時間</span>
                <span className="stat-value"> {/* バックエンドで時間計算が必要 */}
                  {attendanceData.annualStats?.totalHours || 0}時間
                </span>
              </div>
              {/* 点数付けはバックエンドで計算し、ここに表示する想定 */}
            </div>
          </div>

          {/* クイックアクション */}
          <div className="dashboard-card">
            <h2 className="card-title">クイックアクション</h2>
            <div className="quick-actions">
              <Button
                variant="outline"
                onClick={() => window.location.href = '/calendar'}
                className="action-button"
              >
                カレンダー表示
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/reports'}
                className="action-button"
              >
                レポート表示
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
