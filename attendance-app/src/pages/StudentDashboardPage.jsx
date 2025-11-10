import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLoginRedirect } from '../hooks/useLoginRedirect';
import { attendanceApi } from '../api/attendanceApi';
import StudentQRScanner from '../components/common/StudentQRScanner';
import './StudentDashboardPage.css';

const StudentDashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { requireAuth } = useLoginRedirect();
  const [groups, setGroups] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [classSelectionData, setClassSelectionData] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user?.student_id) {
      loadStudentData();
    }
  }, [isAuthenticated, user]);

  const loadStudentData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 学生のグループ一覧を取得
      const response = await attendanceApi.getStudentGroups(user.student_id);
      
      if (response.success) {
        const studentGroups = response.data.groups;
        
        // 参加済みグループと招待中のグループを分離
        const joinedGroups = studentGroups.filter(group => group.status === 'joined');
        const invitedGroups = studentGroups.filter(group => group.status === 'invited');
        
        setGroups(joinedGroups);
        setInvitations(invitedGroups);
      } else {
        setError('グループ情報の読み込みに失敗しました');
      }
    } catch (err) {
      setError('グループ情報の読み込みに失敗しました');
      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
      console.error('学生データ読み込みエラー:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async (membershipId) => {
    requireAuth(async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await attendanceApi.acceptInvitation(membershipId, user.student_id);
        
        if (response.success) {
          await loadStudentData(); // データを再読み込み
        } else {
          setError(response.message || '招待の承諾に失敗しました');
        }
      } catch (err) {
        setError('招待の承諾に失敗しました');
        // 開発環境でのみエラーログ出力
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
        console.error('招待承諾エラー:', err);
        }
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleQRScan = async (scanData) => {
    requireAuth(async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await attendanceApi.recordScan(
          scanData.qrData,
          new Date().toISOString()
        );
        
        if (response.success && response.requiresSelection) {
          // 複数授業がある場合は選択UIを表示
          setClassSelectionData(response.data);
        } else if (response.success) {
          // 記録成功
          setShowQRScanner(false);
          setClassSelectionData(null);
          alert(`出席記録が完了しました！`);
          await loadStudentData();
        } else {
          setError(response.message);
        }
      } catch (err) {
        setError('出欠記録の送信に失敗しました');
        // 開発環境でのみエラーログ出力
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
        console.error('出欠記録エラー:', err);
        }
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleSelectClass = async (classId) => {
    try {
      setIsLoading(true);
      const response = await attendanceApi.confirmClassAttendance(
        classId,
        new Date().toISOString()
      );
      
      if (response.success) {
        setShowQRScanner(false);
        setClassSelectionData(null);
        alert(`出席記録が完了しました！`);
        await loadStudentData();
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('出欠記録の送信に失敗しました');
      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
      console.error('出欠記録エラー:', err);
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
      <div className="student-dashboard-page">
        <div className="access-denied">
          <h2>ログインが必要です</h2>
          <p>このページにアクセスするにはログインが必要です。</p>
        </div>
      </div>
    );
  }

  if (isLoading && groups.length === 0 && invitations.length === 0) {
    return (
      <div className="student-dashboard-page">
        <div className="loading">
          <div className="spinner" />
          <p>ダッシュボードを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard-page">
      <div className="student-dashboard-container">
        <div className="dashboard-header">
          <h1>学生ダッシュボード</h1>
          <div className="student-info">
            <p>ようこそ、{user?.name || '学生'}さん</p>
            <p>学生ID: {user?.student_id}</p>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button
              className="retry-button"
              onClick={loadStudentData}
            >
              再試行
            </button>
          </div>
        )}

        {/* QRコードスキャンセクション */}
        <div className="qr-scan-section">
          <div className="section-header">
            <h2>📱 QRコードスキャン</h2>
            <p>グループのQRコードをスキャンして出欠記録を行います</p>
          </div>
          <button
            className="btn btn--primary btn--large"
            onClick={handleOpenQRScanner}
            disabled={isLoading}
          >
            QRコードをスキャン
          </button>
        </div>

        {/* 招待中のグループ */}
        {invitations.length > 0 && (
          <div className="invitations-section">
            <div className="section-header">
              <h2>📨 招待中のグループ</h2>
              <p>参加を承諾するグループがあります</p>
            </div>
            <div className="invitations-list">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="invitation-card">
                  <div className="invitation-info">
                    <h3>{invitation.group_name}</h3>
                    <p>招待者: {invitation.creator_name}</p>
                    <p>招待日: {new Date(invitation.created_at).toLocaleDateString('ja-JP')}</p>
                  </div>
                  <div className="invitation-actions">
                    <button
                      className="btn btn--primary"
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      disabled={isLoading}
                    >
                      参加する
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 参加中のグループ */}
        <div className="groups-section">
          <div className="section-header">
            <h2>👥 参加中のグループ</h2>
            <p>現在参加しているグループ一覧</p>
          </div>
          
          {groups.length === 0 ? (
            <div className="no-groups">
              <p>参加しているグループがありません</p>
              <p>教員からグループに招待されると、ここに表示されます。</p>
            </div>
          ) : (
            <div className="groups-grid">
              {groups.map((group) => (
                <div key={group.id} className="group-card">
                  <div className="group-card-header">
                    <h3>{group.group_name}</h3>
                    <span className="group-status">参加中</span>
                  </div>
                  
                  <div className="group-card-content">
                    {group.description && (
                      <p className="group-description">{group.description}</p>
                    )}
                    
                    <div className="group-info">
                      <p><strong>作成者:</strong> {group.creator_name}</p>
                      <p><strong>参加日:</strong> {new Date(group.joined_at).toLocaleDateString('ja-JP')}</p>
                    </div>
                  </div>
                  
                  <div className="group-card-footer">
                    <button
                      className="btn btn--secondary"
                      onClick={() => {
                        // グループ詳細ページへの遷移（実装予定）
                        alert('グループ詳細機能は実装予定です');
                      }}
                    >
                      詳細を見る
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 最近の出欠記録 */}
        {lastScanResult && (
          <div className="recent-activity">
            <div className="section-header">
              <h2>📊 最近の活動</h2>
            </div>
            <div className="activity-card">
              <div className="activity-icon">
                {lastScanResult.action === 'checkin' ? '✅' : '🚪'}
              </div>
              <div className="activity-info">
                <h3>
                  {lastScanResult.action === 'checkin' ? '出席記録' : '退出記録'}
                </h3>
                <p>
                  {lastScanResult.action === 'checkin' 
                    ? `出席時刻: ${new Date(lastScanResult.checkInTime).toLocaleString('ja-JP')}`
                    : `退出時刻: ${new Date(lastScanResult.checkOutTime).toLocaleString('ja-JP')}`
                  }
                </p>
                <p className="activity-time">
                  {new Date().toLocaleString('ja-JP')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
              {/* QRコードスキャナー */}
        <StudentQRScanner
          isOpen={showQRScanner}
          onScan={handleQRScan}
          onClose={handleCloseQRScanner}
          scanResult={classSelectionData}
          onSelectClass={handleSelectClass}
        />
    </div>
  );
};

export default StudentDashboardPage;
