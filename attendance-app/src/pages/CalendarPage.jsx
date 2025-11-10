import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { attendanceApi } from '../api/attendanceApi';
import { formatDate, getMonthDays, isToday, formatTime as formatTimeUtil } from '../utils/dateUtils';
import './CalendarPage.css';
 
const CalendarPage = React.memo(({ isDashboardMode = false }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAttendanceData();
  }, [loadAttendanceData]);

  const loadAttendanceData = useCallback(async () => {
    try {
      // 認証されていなければ何もしない
      if (!isAuthenticated || !user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const userId = user.id;
      
      const response = await attendanceApi.getMonthlyReport(userId, year, month);
      
      // レスポンス形式の検証
      if (!response || !response.success) {
        throw new Error(response?.message || 'カレンダーデータの取得に失敗しました');
      }
      
      // 日付をキーとしたオブジェクトに変換
      const recordsMap = {};
      const records = response.records || response.data?.records || [];
      records.forEach(record => {
        const date = new Date(record.date).toISOString().split('T')[0];
        recordsMap[date] = record;
      });
      
      setAttendanceRecords(recordsMap);
    } catch (err) {
      const errorMessage = err.message || 'カレンダーデータの読み込みに失敗しました';
      setError(errorMessage);
      
      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        console.error('CalendarPage: データ読み込みエラー:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, currentDate]);

  const navigateMonth = useCallback((direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  }, []);

  const handleDayClick = async (day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 今日の始まり

    // 未来の日付かどうかを判定
    if (day > today) {
      const dateStr = day.toISOString().split('T')[0];
      const record = attendanceRecords[dateStr];

      if (record && record.id) {
        if (window.confirm(`${formatDate(day, 'YYYY年MM月DD日')}の記録を削除しますか？`)) {
          try {
            setIsLoading(true);
            await attendanceApi.deleteAttendance(record.id);
            await loadAttendanceData(); // データを再読み込み
          } catch (err) {
            setError('記録の削除に失敗しました。');
            // 開発環境でのみエラーログ出力
            if (process.env.NODE_ENV === 'development') {
              // eslint-disable-next-line no-console
            console.error('記録削除エラー:', err);
            }
          } finally {
            setIsLoading(false);
          }
        }
      }
    }
  };

  const getAttendanceStatus = useCallback((date) => {
    const dateStr = date.toISOString().split('T')[0];
    const record = attendanceRecords[dateStr];
    
    if (!record) {
      return 'no-record';
    }
    
    if (record.status === 'present') {
      return 'present';
    } else if (record.status === 'absent') {
      return 'absent';
    } else if (record.status === 'late') {
      return 'late';
    } else if (record.status === 'early_departure') {
      return 'early_departure';
    }
    
    return 'no-record';
  }, [attendanceRecords]);

  const getStatusText = (status) => {
    switch (status) {
      case 'present':
        return '出勤';
      case 'absent':
        return '欠勤';
      case 'late':
        return '遅刻';
      case 'early_departure':
        return '早退';
      default:
        return '';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'present':
        return 'calendar-day--present';
      case 'absent':
        return 'calendar-day--absent';
      case 'late':
        return 'calendar-day--late';
      case 'early_departure':
        return 'calendar-day--early-departure';
      default:
        return '';
    }
  };

  const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate]);
  const monthName = useMemo(() => currentDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
  }), [currentDate]);

  if (isLoading) {
    return (
      <div className="calendar-page">
        <div className="calendar-loading">
          <div className="spinner" />
          <p>カレンダーを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      <div className="calendar-container">
        <div className="calendar-header">
          {!isDashboardMode && (
            <h1 className="calendar-title">出欠カレンダー</h1>
          )}
          
          <div className="calendar-navigation">
            <button
              className="nav-button"
              onClick={() => navigateMonth(-1)}
              disabled={isLoading}
            >
              ← 前月
            </button>
            <h2 className="current-month">{monthName}</h2>
            <button
              className="nav-button"
              onClick={() => navigateMonth(1)}
              disabled={isLoading}
            >
              次月 →
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button
              className="retry-button"
              onClick={loadAttendanceData}
            >
              再試行
            </button>
          </div>
        )}

        <div className="calendar-grid">
          {/* 曜日ヘッダー */}
          <div className="calendar-weekdays">
            {['日', '月', '火', '水', '木', '金', '土'].map(day => (
              <div key={day} className="weekday-header">
                {day}
              </div>
            ))}
          </div>

          {/* カレンダー日付 */}
          <div className="calendar-days">
            {monthDays.map((day, index) => {
              const status = getAttendanceStatus(day);
              const record = attendanceRecords[day.toISOString().split('T')[0]];
              const isCurrentDay = isToday(day);
              
              return (
                <div
                  key={index}
                  className={`calendar-day ${getStatusClass(status)} ${
                    isCurrentDay ? 'calendar-day--today' : ''
                  }`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="day-number">
                    {day.getDate()}
                  </div>
                  
                  {status !== 'no-record' && (
                    <div className="day-status">
                      <div className="status-text">
                        {getStatusText(status)}
                      </div>
                      {record && (
                        <div className="time-info">
                          {record.checkInTime && (
                            <div className="time-item">
                              <span className="time-label">出:</span>
                              <span className="time-value">
                                {formatTimeUtil(new Date(record.checkInTime))}
                              </span>
                            </div>
                          )}
                          {record.checkOutTime && (
                            <div className="time-item">
                              <span className="time-label">退:</span>
                              <span className="time-value">
                                {formatTimeUtil(new Date(record.checkOutTime))}
                              </span>
                            </div>
                          )}
                          {record.reason && (
                            <div className="time-item">
                              <span className="time-label">理由:</span>
                              <span className="time-value">
                                {record.reason}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 凡例 */}
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color legend-color--present"></div>
            <span>出勤</span>
          </div>
          <div className="legend-item">
            <div className="legend-color legend-color--absent"></div>
            <span>欠勤</span>
          </div>
          <div className="legend-item">
            <div className="legend-color legend-color--late"></div>
            <span>遅刻</span>
          </div>
          <div className="legend-item">
            <div className="legend-color legend-color--early-departure"></div>
            <span>早退</span>
          </div>
          <div className="legend-item">
            <div className="legend-color legend-color--today"></div>
            <span>今日</span>
          </div>
        </div>
      </div>
    </div>
  );
});

CalendarPage.displayName = 'CalendarPage';

export default CalendarPage;
