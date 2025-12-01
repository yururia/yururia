import React, { useState, useEffect } from 'react';
import useAuthStore from '../stores/authStore';
import { attendanceApi } from '../api/attendanceApi';
import QRScannerComponent from '../components/common/QRScanner';
import './StudentAttendancePage.css';

const StudentAttendancePage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);

  // フォーム状態
  const [formData, setFormData] = useState({
    studentId: '',
    timestamp: new Date().toISOString().slice(0, 16)
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadStudents();
      loadAttendanceRecords();
    }
  }, [isAuthenticated]);

  const loadStudents = async () => {
    try {
      const response = await attendanceApi.getStudents();
      if (response.success) {
        setStudents(response.data.students);
      }
    } catch (err) {
      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('学生データ読み込みエラー:', err);
      }
    }
  };

  const loadAttendanceRecords = async (studentId = null) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await attendanceApi.getStudentAttendance(studentId ? { studentId } : {});

      if (response.success) {
        setAttendanceRecords(response.data.records);
      } else {
        setError('出欠記録の読み込みに失敗しました');
      }
    } catch (err) {
      setError('出欠記録の読み込みに失敗しました');
      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('出欠記録読み込みエラー:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentSelect = (studentId) => {
    setSelectedStudent(studentId);
    loadAttendanceRecords(studentId);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      setError(null);

      const response = await attendanceApi.recordStudentAttendance(
        formData.studentId,
        formData.timestamp
      );

      if (response.success) {
        setShowAddForm(false);
        setFormData({
          studentId: '',
          timestamp: new Date().toISOString().slice(0, 16)
        });
        await loadAttendanceRecords(selectedStudent);
      } else {
        setError(response.message || '出欠記録の作成に失敗しました');
      }
    } catch (err) {
      setError('出欠記録の作成に失敗しました');
      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('出欠記録作成エラー:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('この出欠記録を削除しますか？')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await attendanceApi.deleteStudentAttendance(recordId);

      if (response.success) {
        await loadAttendanceRecords(selectedStudent);
      } else {
        setError(response.message || '削除に失敗しました');
      }
    } catch (err) {
      setError('削除に失敗しました');
      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('出欠記録削除エラー:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setFormData({
      studentId: '',
      timestamp: new Date().toISOString().slice(0, 16)
    });
  };

  const handleQRScan = async (studentId) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await attendanceApi.recordQRAttendance(studentId);

      if (response.success) {
        setLastScanResult(response.data);
        setShowQRScanner(false);
        await loadAttendanceRecords(selectedStudent);

        // 成功メッセージを表示
        alert(`出欠記録が正常に処理されました\n学生: ${response.data.studentName}\n授業: ${response.data.className}\nステータス: ${response.data.status === 'present' ? '出席' : '遅刻'}`);
      } else {
        setError(response.message || 'QRコード読み取りによる出欠記録に失敗しました');
      }
    } catch (err) {
      setError('QRコード読み取りによる出欠記録に失敗しました');
      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('QR出欠記録エラー:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenQRScanner = () => {
    setShowQRScanner(true);
    setError(null);
  };

  const handleCloseQRScanner = () => {
    setShowQRScanner(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="student-attendance-page">
        <div className="access-denied">
          <h2>ログインが必要です</h2>
          <p>このページにアクセスするにはログインが必要です。</p>
        </div>
      </div>
    );
  }

  if (isLoading && attendanceRecords.length === 0) {
    return (
      <div className="student-attendance-page">
        <div className="loading">
          <div className="spinner" />
          <p>出欠記録を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-attendance-page">
      <div className="student-attendance-container">
        <div className="student-attendance-header">
          <h1>学生出欠記録管理</h1>
          <div className="header-buttons">
            <button
              className="btn btn--primary"
              onClick={handleOpenQRScanner}
              disabled={isLoading}
            >
              📱 QRコード読み取り
            </button>
            <button
              className="btn btn--secondary"
              onClick={() => setShowAddForm(true)}
              disabled={isLoading}
            >
              手動記録追加
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button
              className="retry-button"
              onClick={() => loadAttendanceRecords(selectedStudent)}
            >
              再試行
            </button>
          </div>
        )}

        {/* 学生選択 */}
        <div className="student-selector">
          <h3>学生選択</h3>
          <div className="student-buttons">
            <button
              className={`btn ${!selectedStudent ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => handleStudentSelect(null)}
            >
              全学生
            </button>
            {students.map((student) => (
              <button
                key={student.student_id}
                className={`btn ${selectedStudent === student.student_id ? 'btn--primary' : 'btn--secondary'}`}
                onClick={() => handleStudentSelect(student.student_id)}
              >
                {student.name} ({student.student_id})
              </button>
            ))}
          </div>
        </div>

        {/* 出欠記録追加フォーム */}
        {showAddForm && (
          <div className="attendance-form-overlay">
            <div className="attendance-form">
              <h2>出欠記録追加</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="studentId">学生 *</label>
                  <select
                    id="studentId"
                    name="studentId"
                    value={formData.studentId}
                    onChange={handleInputChange}
                    required
                    className="form-select"
                  >
                    <option value="">学生を選択してください</option>
                    {students.map((student) => (
                      <option key={student.student_id} value={student.student_id}>
                        {student.name} ({student.student_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="timestamp">日時 *</label>
                  <input
                    type="datetime-local"
                    id="timestamp"
                    name="timestamp"
                    value={formData.timestamp}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn btn--secondary"
                    disabled={isLoading}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={isLoading}
                  >
                    追加
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 出欠記録一覧 */}
        <div className="attendance-list">
          <h3>
            {selectedStudent
              ? `出欠記録 - ${students.find(s => s.student_id === selectedStudent)?.name || selectedStudent}`
              : '全学生の出欠記録'
            }
          </h3>

          {attendanceRecords.length === 0 ? (
            <div className="no-records">
              <p>出欠記録が見つかりません</p>
            </div>
          ) : (
            <div className="attendance-table">
              <table>
                <thead>
                  <tr>
                    <th>学生名</th>
                    <th>学生ID</th>
                    <th>日時</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{record.student_name}</td>
                      <td>{record.student_id}</td>
                      <td>{new Date(record.timestamp).toLocaleString('ja-JP')}</td>
                      <td>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="btn btn--small btn--danger"
                          disabled={isLoading}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* QRコードスキャナー */}
      <QRScannerComponent
        isOpen={showQRScanner}
        onScan={handleQRScan}
        onClose={handleCloseQRScanner}
      />
    </div>
  );
};

export default StudentAttendancePage;

