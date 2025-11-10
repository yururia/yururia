import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { attendanceApi } from '../api/attendanceApi';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    if (isAuthenticated && user) {
      loadProfile();
    }
  }, [isAuthenticated, user]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await attendanceApi.getUserProfile();
      
      if (response.success) {
        setProfile(response.data.user);
        setEditData({
          name: response.data.user.name,
          email: response.data.user.email,
          department: response.data.user.department || '',
          phone: response.data.user.phone || ''
        });
      } else {
        setError('プロファイル情報の取得に失敗しました');
      }
    } catch (err) {
      setError('プロファイル情報の取得に失敗しました');
      console.error('プロファイル読み込みエラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await attendanceApi.updateUserProfile(user.id, editData);
      
      if (response.success) {
        setProfile(response.data.user);
        setIsEditing(false);
      } else {
        setError(response.message || 'プロファイルの更新に失敗しました');
      }
    } catch (err) {
      setError('プロファイルの更新に失敗しました');
      console.error('プロファイル更新エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      name: profile.name,
      email: profile.email,
      department: profile.department || '',
      phone: profile.phone || ''
    });
    setIsEditing(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="profile-page">
        <div className="access-denied">
          <h2>ログインが必要です</h2>
          <p>このページにアクセスするにはログインが必要です。</p>
        </div>
      </div>
    );
  }

  if (isLoading && !profile) {
    return (
      <div className="profile-page">
        <div className="loading">
          <div className="spinner" />
          <p>プロファイルを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1>プロファイル</h1>
          <div className="profile-actions">
            {!isEditing ? (
              <button
                className="btn btn--primary"
                onClick={() => setIsEditing(true)}
              >
                編集
              </button>
            ) : (
              <div className="edit-actions">
                <button
                  className="btn btn--secondary"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  キャンセル
                </button>
                <button
                  className="btn btn--primary"
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  保存
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button
              className="retry-button"
              onClick={loadProfile}
            >
              再試行
            </button>
          </div>
        )}

        <div className="profile-content">
          <div className="profile-card">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="profile-basic-info">
                <h2>{profile?.name}</h2>
                <p className="profile-role">
                  {profile?.role === 'admin' ? '管理者' : 
                   profile?.role === 'employee' ? '教員' : '学生'}
                </p>
                <p className="profile-email">{profile?.email}</p>
              </div>
            </div>

            <div className="profile-details">
              <h3>詳細情報</h3>
              
              <div className="profile-fields">
                <div className="profile-field">
                  <label htmlFor="name">氏名</label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={editData.name}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  ) : (
                    <p className="field-value">{profile?.name}</p>
                  )}
                </div>

                <div className="profile-field">
                  <label htmlFor="email">メールアドレス</label>
                  {isEditing ? (
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={editData.email}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  ) : (
                    <p className="field-value">{profile?.email}</p>
                  )}
                </div>

                <div className="profile-field">
                  <label htmlFor="department">部署・学科</label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="department"
                      name="department"
                      value={editData.department}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  ) : (
                    <p className="field-value">{profile?.department || '未設定'}</p>
                  )}
                </div>

                <div className="profile-field">
                  <label htmlFor="phone">電話番号</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={editData.phone}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  ) : (
                    <p className="field-value">{profile?.phone || '未設定'}</p>
                  )}
                </div>

                <div className="profile-field">
                  <label>ユーザーID</label>
                  <p className="field-value field-value--muted">{profile?.id}</p>
                </div>

                <div className="profile-field">
                  <label>登録日</label>
                  <p className="field-value field-value--muted">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ja-JP') : '不明'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 学生の場合は参加グループ情報を表示 */}
          {profile?.role === 'student' && (
            <div className="profile-groups">
              <h3>参加中のグループ</h3>
              <p>グループ情報は学生ダッシュボードで確認できます。</p>
              <button
                className="btn btn--secondary"
                onClick={() => window.location.href = '/student-dashboard'}
              >
                学生ダッシュボードへ
              </button>
            </div>
          )}

          {/* 教員・管理者の場合はグループ管理情報を表示 */}
          {(profile?.role === 'employee' || profile?.role === 'admin') && (
            <div className="profile-groups">
              <h3>グループ管理</h3>
              <p>作成したグループの管理はこちらから行えます。</p>
              <button
                className="btn btn--secondary"
                onClick={() => window.location.href = '/groups'}
              >
                グループ管理へ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
