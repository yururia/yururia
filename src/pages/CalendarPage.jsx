import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useAuthStore from '../stores/authStore';
import { attendanceApi } from '../api/attendanceApi';
import { formatDate, getMonthDays, isToday, formatTime as formatTimeUtil } from '../utils/dateUtils';
import ExportButton from '../components/common/ExportButton';
import './CalendarPage.css';

const CalendarPage = React.memo(({ isDashboardMode = false }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [events, setEvents] = useState({}); // [追加] イベント用 state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCalendarData = useCallback(async () => {
    try {
      if (!isAuthenticated || !user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const userId = user.id;

      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      // [修正] Promise.allで出欠とイベントを同時に取得
      const [attendanceResponse, eventResponse] = await Promise.all([
        attendanceApi.getMonthlyReport(userId, year, month),
        attendanceApi.getEvents({
          start_date: startDate,
          end_date: endDate,
        })
      ]);

      // 1. 出欠記録の処理
      if (attendanceResponse && attendanceResponse.success) {
        // [修正] response.data.records が配列であることを確認
        const records = (attendanceResponse.data && Array.isArray(attendanceResponse.data.records))
          ? attendanceResponse.data.records
          : [];
        const recordsMap = {};
        records.forEach((record) => {
          const recordDate = record.date || record.attendance_date;
          if (recordDate) {
            recordsMap[recordDate.split('T')[0]] = record;
          }
        });
        setAttendanceRecords(recordsMap);
      } else {
        throw new Error(attendanceResponse?.message || 'カレンダーデータの取得に失敗しました');
      }

      // 2. [追加] イベントの処理
      if (eventResponse && eventResponse.success) {
        // [修正] eventResponse.data.events が配列であることを確認
        const eventList = (eventResponse.data && Array.isArray(eventResponse.data.events))
          ? eventResponse.data.events
          : [];
        const eventsMap = {};
        eventList.forEach((event) => {
          const eventDate = event.start_date.split('T')[0];
          if (!eventsMap[eventDate]) {
            eventsMap[eventDate] = [];
          }
          eventsMap[eventDate].push(event);
        });
        setEvents(eventsMap);
      } else {
        throw new Error(eventResponse?.message || 'イベントデータの取得に失敗しました');
      }

    } catch (err) {
      console.error('カレンダーデータ読み込みエラー:', err);
      setError('カレンダーデータの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadCalendarData();
    }
  }, [isAuthenticated, user?.id, loadCalendarData]);

  const changeMonth = (offset) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const handleExport = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    return await attendanceApi.exportAttendanceRecords(startDate, endDate);
  };

  const calendarDays = useMemo(() => {
    return getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  const formatTime = (timeStr) => {
    if (!timeStr) return '---';
    return formatTimeUtil(timeStr);
  };

  if (isLoading) {
    return (
      <div className="calendar-page">
        <div className="calendar-loading">
          <div className="spinner"></div>
          <p>カレンダーを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error && !isDashboardMode) {
    return (
      <div className="calendar-page">
        <div className="calendar-container">
          <div className="error-message">
            {error}
            <button onClick={loadCalendarData} className="retry-button">
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`calendar-page ${isDashboardMode ? 'dashboard-mode' : ''}`}>
      <div className="calendar-container">
        {!isDashboardMode && (
          <div className="calendar-header">
            <h1 className="calendar-title">出欠カレンダー</h1>
          </div>
        )}

        <div className="calendar-navigation">
          <button onClick={() => changeMonth(-1)} className="nav-button">
            &lt; 前月
          </button>
          <span className="current-month">
            {formatDate(currentDate, 'YYYY年 MM月')}
          </span>
          <button onClick={() => changeMonth(1)} className="nav-button">
            次月 &gt;
          </button>
          {!isDashboardMode && (
            <ExportButton
              onExport={handleExport}
              filename={`attendance_${currentDate.getFullYear()}_${String(currentDate.getMonth() + 1).padStart(2, '0')}.csv`}
              label="エクスポート"
              size="small"
            />
          )}
        </div>

        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
              <div key={day} className="weekday-header">
                {day}
              </div>
            ))}
          </div>

          <div className="calendar-days">
            {calendarDays.map((day, index) => {
              const dateStr = day.date ? formatDate(day.date, 'YYYY-MM-DD') : '';
              const record = day.date ? attendanceRecords[dateStr] : null;
              const dayEvents = day.date ? (events[dateStr] || []) : [];

              const isCurrentMonth = day.isCurrentMonth;
              const isTodayFlag = day.date && isToday(day.date);

              const dayClasses = [
                'calendar-day',
                isCurrentMonth ? 'current-month' : 'other-month',
                isTodayFlag ? 'today' : '',
                record ? `status-${record.status}` : 'status-none',
                dayEvents.length > 0 ? 'has-event' : ''
              ].join(' ');

              return (
                <div key={index} className={dayClasses}>
                  <div className="day-number">{day.day}</div>
                  {isCurrentMonth && (
                    <div className="day-content">
                      {record && (
                        <div className="attendance-info">
                          <span className="status-badge">
                            {record.status === 'present' ? '出' :
                              record.status === 'absent' ? '欠' :
                                record.status === 'late' ? '遅' :
                                  record.status === 'early_departure' ? '早' : '他'}
                          </span>

                          <div className="attendance-times-calendar">
                            <span className="time-value">
                              {formatTime(record.check_in_time)}
                            </span>
                            <span className="time-separator">~</span>
                            <span className="time-value">
                              {formatTime(record.check_out_time)}
                            </span>
                          </div>

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

                      {dayEvents.length > 0 && (
                        <div className="event-info">
                          {dayEvents.map(event => (
                            <div key={event.id} className="event-item" title={event.title}>
                              {event.title}
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
          <div className="legend-item">
            <div className="legend-color legend-color--event"></div>
            <span>イベント</span>
          </div>
        </div>
      </div>
    </div>
  );
});

CalendarPage.displayName = 'CalendarPage';

export default CalendarPage;
