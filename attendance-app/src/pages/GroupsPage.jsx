import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLoginRedirect } from '../hooks/useLoginRedirect';
import { attendanceApi } from '../api/attendanceApi';
import './GroupsPage.css';

const GroupsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { requireAuth } = useLoginRedirect();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);

  // フォーム状態
  const [formData, setFormData] = useState({
    groupName: '',
    description: ''
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadGroups();
    }
  }, [isAuthenticated]);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await attendanceApi.getGroups();
      
      if (response.success) {
        setGroups(response.data.groups);
      } else {
        setError('グループ一覧の読み込みに失敗しました');
      }
    } catch (err) {
      setError('グループ一覧の読み込みに失敗しました');
      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
      console.error('グループ読み込みエラー:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    
    requireAuth(async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await attendanceApi.createGroup(
          formData.groupName,
          formData.description
        );
        
        if (response.success) {
          setShowCreateForm(false);
          setFormData({ groupName: '', description: '' });
          await loadGroups();
        } else {
          setError(response.message || 'グループの作成に失敗しました');
        }
      } catch (err) {
        setError('グループの作成に失敗しました');
        // 開発環境でのみエラーログ出力
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
        console.error('グループ作成エラー:', err);
        }
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('このグループを削除しますか？')) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await attendanceApi.deleteGroup(groupId);
      
      if (response.success) {
        await loadGroups();
      } else {
        setError(response.message || 'グループの削除に失敗しました');
      }
    } catch (err) {
      setError('グループの削除に失敗しました');
      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
      console.error('グループ削除エラー:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQR = async (groupId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await attendanceApi.generateQRCode(groupId, 'data');
      
      if (response.success) {
        setQrCodeData(response.data);
        setShowQRCode(true);
      } else {
        setError(response.message || 'QRコードの生成に失敗しました');
      }
    } catch (err) {
      setError('QRコードの生成に失敗しました');
      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
      console.error('QRコード生成エラー:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setFormData({ groupName: '', description: '' });
  };

  if (!isAuthenticated) {
    return (
      <div className="groups-page">
        <div className="access-denied">
          <h2>ログインが必要です</h2>
          <p>このページにアクセスするにはログインが必要です。</p>
        </div>
      </div>
    );
  }

  if (isLoading && groups.length === 0) {
    return (
      <div className="groups-page">
        <div className="loading">
          <div className="spinner" />
          <p>グループ一覧を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="groups-page">
      <div className="groups-container">
        <div className="groups-header">
          <h1>グループ管理</h1>
          <button
            className="btn btn--primary"
            onClick={() => setShowCreateForm(true)}
            disabled={isLoading}
          >
            新しいグループを作成
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button
              className="retry-button"
              onClick={loadGroups}
            >
              再試行
            </button>
          </div>
        )}

        {/* グループ作成フォーム */}
        {showCreateForm && (
          <div className="group-form-overlay">
            <div className="group-form">
              <h2>新しいグループを作成</h2>
              <form onSubmit={handleCreateGroup}>
                <div className="form-group">
                  <label htmlFor="groupName">グループ名 *</label>
                  <input
                    type="text"
                    id="groupName"
                    name="groupName"
                    value={formData.groupName}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                    placeholder="例: 月曜1限 プログラミング"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="description">説明</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="form-textarea"
                    placeholder="グループの説明を入力してください"
                    rows="3"
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
                    作成
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* QRコード表示モーダル */}
        {showQRCode && qrCodeData && (
          <div className="qr-modal-overlay">
            <div className="qr-modal">
              <div className="qr-modal-header">
                <h2>QRコード</h2>
                <button 
                  className="close-button" 
                  onClick={() => setShowQRCode(false)}
                >
                  ×
                </button>
              </div>
              <div className="qr-modal-content">
                <div className="qr-code-container">
                  <img 
                    src={qrCodeData.qrCode} 
                    alt="QR Code" 
                    className="qr-code-image"
                  />
                </div>
                <div className="qr-info">
                  <h3>{qrCodeData.groupName}</h3>
                  <p>学生がこのQRコードをスキャンして出欠記録を行います</p>
                  <div className="qr-actions">
                    <button 
                      className="btn btn--secondary"
                      onClick={() => window.print()}
                    >
                      印刷
                    </button>
                    <button 
                      className="btn btn--primary"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = qrCodeData.qrCode;
                        link.download = `qr-code-${qrCodeData.groupId}.svg`;
                        link.click();
                      }}
                    >
                      ダウンロード
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* グループ一覧 */}
        <div className="groups-list">
          {groups.length === 0 ? (
            <div className="no-groups">
              <p>グループがありません</p>
              <button
                className="btn btn--primary"
                onClick={() => setShowCreateForm(true)}
              >
                最初のグループを作成
              </button>
            </div>
          ) : (
            <div className="groups-grid">
              {groups.map((group) => (
                <div key={group.id} className="group-card">
                  <div className="group-card-header">
                    <h3>{group.group_name}</h3>
                    <div className="group-actions">
                      <button
                        className="btn btn--small btn--primary"
                        onClick={() => handleGenerateQR(group.id)}
                        disabled={isLoading}
                      >
                        QRコード
                      </button>
                      <button
                        className="btn btn--small btn--danger"
                        onClick={() => handleDeleteGroup(group.id)}
                        disabled={isLoading}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  
                  <div className="group-card-content">
                    {group.description && (
                      <p className="group-description">{group.description}</p>
                    )}
                    
                    <div className="group-stats">
                      <div className="stat-item">
                        <span className="stat-label">メンバー数:</span>
                        <span className="stat-value">{group.member_count || 0}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">作成者:</span>
                        <span className="stat-value">{group.creator_name}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">作成日:</span>
                        <span className="stat-value">
                          {new Date(group.created_at).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group-card-footer">
                    <button
                      className="btn btn--secondary"
                      onClick={() => setSelectedGroup(group)}
                    >
                      詳細を見る
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

export default GroupsPage;
