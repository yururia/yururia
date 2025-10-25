import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { attendanceApi } from '../api/attendanceApi';
import './StudentPage.css';

const StudentPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // フォーム状態
  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    card_id: ''
  });

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      loadStudents();
    }
  }, [isAuthenticated, user]);

  const loadStudents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await attendanceApi.getStudents(searchTerm);
      
      if (response.success) {
        setStudents(response.data.students);
      } else {
        setError('学生データの読み込みに失敗しました');
      }
    } catch (err) {
      setError('学生データの読み込みに失敗しました');
      console.error('学生データ読み込みエラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadStudents();
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
      
      let response;
      if (editingStudent) {
        response = await attendanceApi.updateStudent(editingStudent.student_id, formData);
      } else {
        response = await attendanceApi.createStudent(formData);
      }
      
      if (response.success) {
        setShowAddForm(false);
        setEditingStudent(null);
        setFormData({ student_id: '', name: '', card_id: '' });
        await loadStudents();
      } else {
        setError(response.message || '操作に失敗しました');
      }
    } catch (err) {
      setError('操作に失敗しました');
      console.error('学生操作エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      student_id: student.student_id,
      name: student.name,
      card_id: student.card_id || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm('この学生を削除しますか？')) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await attendanceApi.deleteStudent(studentId);
      
      if (response.success) {
        await loadStudents();
      } else {
        setError(response.message || '削除に失敗しました');
      }
    } catch (err) {
      setError('削除に失敗しました');
      console.error('学生削除エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingStudent(null);
    setFormData({ student_id: '', name: '', card_id: '' });
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="student-page">
        <div className="access-denied">
          <h2>アクセス拒否</h2>
          <p>このページにアクセスするには管理者権限が必要です。</p>
        </div>
      </div>
    );
  }

  if (isLoading && students.length === 0) {
    return (
      <div className="student-page">
        <div className="loading">
          <div className="spinner" />
          <p>学生データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-page">
      <div className="student-container">
        <div className="student-header">
          <h1>学生管理</h1>
          <button
            className="btn btn--primary"
            onClick={() => setShowAddForm(true)}
            disabled={isLoading}
          >
            新規学生追加
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button
              className="retry-button"
              onClick={loadStudents}
            >
              再試行
            </button>
          </div>
        )}

        {/* 検索フォーム */}
        <div className="search-form">
          <form onSubmit={handleSearch}>
            <div className="search-input-group">
              <input
                type="text"
                placeholder="学生名、学生ID、カードIDで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="btn btn--secondary">
                検索
              </button>
            </div>
          </form>
        </div>

        {/* 学生追加・編集フォーム */}
        {showAddForm && (
          <div className="student-form-overlay">
            <div className="student-form">
              <h2>{editingStudent ? '学生情報編集' : '新規学生追加'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="student_id">学生ID *</label>
                  <input
                    type="text"
                    id="student_id"
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleInputChange}
                    required
                    disabled={editingStudent}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="name">名前 *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="card_id">カードID</label>
                  <input
                    type="text"
                    id="card_id"
                    name="card_id"
                    value={formData.card_id}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="オプション"
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
                    {editingStudent ? '更新' : '追加'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 学生一覧 */}
        <div className="student-list">
          {students.length === 0 ? (
            <div className="no-students">
              <p>学生が見つかりません</p>
            </div>
          ) : (
            <div className="student-grid">
              {students.map((student) => (
                <div key={student.student_id} className="student-card">
                  <div className="student-info">
                    <h3>{student.name}</h3>
                    <p className="student-id">ID: {student.student_id}</p>
                    {student.card_id && (
                      <p className="card-id">カードID: {student.card_id}</p>
                    )}
                  </div>
                  
                  <div className="student-actions">
                    <button
                      onClick={() => handleEdit(student)}
                      className="btn btn--small btn--secondary"
                      disabled={isLoading}
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(student.student_id)}
                      className="btn btn--small btn--danger"
                      disabled={isLoading}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPage;
