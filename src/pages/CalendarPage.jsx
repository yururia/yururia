import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useAuthStore from '../stores/authStore';
import { attendanceApi } from '../api/attendanceApi';
import { formatDate, getMonthDays, isToday, formatTime as formatTimeUtil } from '../utils/dateUtils';
import ExportButton from '../components/common/ExportButton';
import AbsenceRequestModal from '../components/calendar/AbsenceRequestModal';
import AbsenceListModal from '../components/calendar/AbsenceListModal';
import './CalendarPage.css';

const CalendarPage = React.memo(({ isDashboardMode = false }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [events, setEvents] = useState({}); // [追加] イベント用 state
  const [dailyStats, setDailyStats] = useState({}); // [追加] 日次統計
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // モーダル用 state
  const [showAbsenceRequest, setShowAbsenceRequest] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAbsenceList, setShowAbsenceList] = useState(false);
  const [absenceData, setAbsenceData] = useState(null);

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

      // [修正] Promise.allで出欠、イベント、統計を同時に取得
      const [attendanceResponse, eventResponse, statsResponse] = await Promise.all([
        attendanceApi.getMonthlyReport(userId, year, month),
        attendanceApi.getEvents({
          start_date: startDate,
          end_date: endDate,
        }),
        attendanceApi.getDailyStats(year, month)
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

      // 3. [追加] 日次統計の処理
      if (statsResponse && statsResponse.success) {
        console.log('[Calendar Debug] Daily stats loaded:', statsResponse.data);
        setDailyStats(statsResponse.data || {});
      } else {
        console.warn('[Calendar Debug] Stats response failed or empty:', statsResponse);
        setDailyStats({});
      }

    } catch (err) {
      console.error('[Calendar Error] Calendar data loading failed:', err);
      console.error('[Calendar Error] Error details:', {
        message: err.message,
        response: err.response,
        stack: err.stack
      });
      setError('カレンダーデータの読み込みに失敗しました: ' + err.message);
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
    console.log('[Calendar Debug] Date clicked:', {
      role: user?.role,
      date: date,
      isTeacherOrAdmin: user?.role === 'teacher' || user?.role === 'admin'
    });

    if ((user?.role === 'teacher' || user?.role === 'admin') && date) {
      try {
        const dateStr = formatDate(date, 'YYYY-MM-DD');
        console.log('[Calendar Debug] Fetching absence details for:', dateStr);

        const response = await attendanceApi.getAbsenceDetails(dateStr);
        console.log('[Calendar Debug] Absence details response:', response);

        if (response.success) {
          setAbsenceData(response.data);
          setSelectedDate(date);
          setShowAbsenceList(true);
          console.log('[Calendar Debug] Opening absence list modal');
        } else {
          console.warn('[Calendar Debug] Failed to fetch absence details:', response.message);
        }
      } catch (err) {
        console.error('[Calendar Error] Absence details fetch error:', err);
      }
    } else {
      console.log('[Calendar Debug] Click handler not triggered - not teacher/admin or no date');
    }
  };

  // [追加] 欠席申請送信
  const handleAbsenceSubmit = async (formData) => {
    try {
      console.log('[Calendar Debug] Submitting absence request:', formData);
      const response = await attendanceApi.submitAbsenceRequest(formData);
      console.log('[Calendar Debug] Absence request response:', response);
      loadCalendarData(); // カレンダーを再読込
    } catch (err) {
      console.error('[Calendar Error] Absence request submission failed:', err);
      throw err;
    }
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

              // [追加] ツールチップ用タイトル
              const stats = day.date ? dailyStats[dateStr] : null;
              const tooltipText = stats
                ? `欠席: ${stats.absent || 0}名, 遅刻: ${stats.late || 0}名, 早退: ${stats.early_departure || 0}名`
                : '';

              return (
                <div
                  key={index}
                  className={dayClasses}
                  onContextMenu={(e) => handleContextMenu(e, day.date)}
                  onClick={() => handleDateClick(day.date)}
                  title={tooltipText}
                >
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

        {/* [追加] 欠席申請モーダル (学生用) */}
        <AbsenceRequestModal
          isOpen={showAbsenceRequest}
          onClose={() => setShowAbsenceRequest(false)}
          defaultDate={selectedDate}
          onSubmit={handleAbsenceSubmit}
        />

        {/* [追加] 欠席者リストモーダル (教員用) */}
        <AbsenceListModal
          isOpen={showAbsenceList}
          onClose={() => setShowAbsenceList(false)}
          date={selectedDate}
          absenceData={absenceData}
        />
      </div>
    </div >
  );
});

CalendarPage.displayName = 'CalendarPage';

export default CalendarPage;
