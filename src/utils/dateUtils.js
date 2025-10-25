// 日付関連のユーティリティ関数

/**
 * 日付を指定された形式でフォーマットする
 * @param {Date} date - フォーマットする日付
 * @param {string} format - フォーマット形式 ('YYYY-MM-DD', 'YYYY/MM/DD', 'MM/DD', etc.)
 * @returns {string} フォーマットされた日付文字列
 */
export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date || !(date instanceof Date)) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYY/MM/DD':
      return `${year}/${month}/${day}`;
    case 'MM/DD':
      return `${month}/${day}`;
    case 'YYYY年MM月DD日':
      return `${year}年${month}月${day}日`;
    case 'MM月DD日':
      return `${month}月${day}日`;
    default:
      return date.toLocaleDateString('ja-JP');
  }
};

/**
 * 時間を指定された形式でフォーマットする
 * @param {Date} date - フォーマットする日付
 * @param {string} format - フォーマット形式 ('HH:mm', 'HH:mm:ss', etc.)
 * @returns {string} フォーマットされた時間文字列
 */
export const formatTime = (date, format = 'HH:mm') => {
  if (!date || !(date instanceof Date)) {
    return '';
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  switch (format) {
    case 'HH:mm':
      return `${hours}:${minutes}`;
    case 'HH:mm:ss':
      return `${hours}:${minutes}:${seconds}`;
    default:
      return date.toLocaleTimeString('ja-JP');
  }
};

/**
 * 日付と時間を組み合わせてフォーマットする
 * @param {Date} date - フォーマットする日付
 * @param {string} dateFormat - 日付フォーマット
 * @param {string} timeFormat - 時間フォーマット
 * @returns {string} フォーマットされた日時文字列
 */
export const formatDateTime = (date, dateFormat = 'YYYY-MM-DD', timeFormat = 'HH:mm') => {
  if (!date || !(date instanceof Date)) {
    return '';
  }

  const formattedDate = formatDate(date, dateFormat);
  const formattedTime = formatTime(date, timeFormat);
  
  return `${formattedDate} ${formattedTime}`;
};

/**
 * 指定された月の日付配列を取得する
 * @param {Date} date - 対象の月
 * @returns {Date[]} その月の日付配列
 */
export const getMonthDays = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // 月の最初の日
  const firstDay = new Date(year, month, 1);
  // 月の最後の日
  const lastDay = new Date(year, month + 1, 0);
  
  // 最初の日の曜日（0=日曜日）
  const firstDayOfWeek = firstDay.getDay();
  // 月の日数
  const daysInMonth = lastDay.getDate();
  
  const days = [];
  
  // 前月の日付を追加（カレンダー表示用）
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(year, month, -i);
    days.push(prevDate);
  }
  
  // 当月の日付を追加
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }
  
  // 次月の日付を追加（42日分のグリッドを作るため）
  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day++) {
    days.push(new Date(year, month + 1, day));
  }
  
  return days;
};

/**
 * 今日の日付かどうかを判定する
 * @param {Date} date - 判定する日付
 * @returns {boolean} 今日の日付の場合true
 */
export const isToday = (date) => {
  if (!date || !(date instanceof Date)) {
    return false;
  }
  
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

/**
 * 昨日の日付かどうかを判定する
 * @param {Date} date - 判定する日付
 * @returns {boolean} 昨日の日付の場合true
 */
export const isYesterday = (date) => {
  if (!date || !(date instanceof Date)) {
    return false;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
};

/**
 * 明日の日付かどうかを判定する
 * @param {Date} date - 判定する日付
 * @returns {boolean} 明日の日付の場合true
 */
export const isTomorrow = (date) => {
  if (!date || !(date instanceof Date)) {
    return false;
  }
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return (
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  );
};

/**
 * 2つの日付の差を日数で取得する
 * @param {Date} date1 - 日付1
 * @param {Date} date2 - 日付2
 * @returns {number} 日数の差（絶対値）
 */
export const getDaysDifference = (date1, date2) => {
  if (!date1 || !date2 || !(date1 instanceof Date) || !(date2 instanceof Date)) {
    return 0;
  }
  
  const timeDiff = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

/**
 * 指定された日数後の日付を取得する
 * @param {Date} date - 基準日付
 * @param {number} days - 加算する日数
 * @returns {Date} 計算された日付
 */
export const addDays = (date, days) => {
  if (!date || !(date instanceof Date)) {
    return new Date();
  }
  
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * 指定された月数後の日付を取得する
 * @param {Date} date - 基準日付
 * @param {number} months - 加算する月数
 * @returns {Date} 計算された日付
 */
export const addMonths = (date, months) => {
  if (!date || !(date instanceof Date)) {
    return new Date();
  }
  
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

/**
 * 指定された年数後の日付を取得する
 * @param {Date} date - 基準日付
 * @param {number} years - 加算する年数
 * @returns {Date} 計算された日付
 */
export const addYears = (date, years) => {
  if (!date || !(date instanceof Date)) {
    return new Date();
  }
  
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};

/**
 * 勤務時間を計算する
 * @param {Date} checkInTime - 出勤時間
 * @param {Date} checkOutTime - 退勤時間
 * @returns {Object} 勤務時間情報 { hours, minutes, totalMinutes }
 */
export const calculateWorkHours = (checkInTime, checkOutTime) => {
  if (!checkInTime || !checkOutTime || 
      !(checkInTime instanceof Date) || !(checkOutTime instanceof Date)) {
    return { hours: 0, minutes: 0, totalMinutes: 0 };
  }
  
  const timeDiff = checkOutTime.getTime() - checkInTime.getTime();
  const totalMinutes = Math.floor(timeDiff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return { hours, minutes, totalMinutes };
};

/**
 * 勤務時間を文字列でフォーマットする
 * @param {number} hours - 時間
 * @param {number} minutes - 分
 * @returns {string} フォーマットされた勤務時間
 */
export const formatWorkHours = (hours, minutes) => {
  if (hours === 0 && minutes === 0) {
    return '0時間0分';
  }
  
  if (hours === 0) {
    return `${minutes}分`;
  }
  
  if (minutes === 0) {
    return `${hours}時間`;
  }
  
  return `${hours}時間${minutes}分`;
};
