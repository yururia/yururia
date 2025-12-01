import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import { attendanceApi } from './api/attendanceApi';
import ErrorBoundary from './components/common/ErrorBoundary';
import Header from './components/layout/Header';
import ToastContainer from './components/common/ToastContainer'; // [追加]
import { registerServiceWorker, unregister } from './services/pwaService';
import UpdateNotification from './components/common/UpdateNotification';
import './styles/global.css';

// コード分割と遅延読み込み
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const StudentPage = lazy(() => import('./pages/StudentPage'));
const StudentAttendancePage = lazy(() => import('./pages/StudentAttendancePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const GroupsPage = lazy(() => import('./pages/GroupsPage'));
const StudentDashboardPage = lazy(() => import('./pages/StudentDashboardPage'));
const EventManagementPage = lazy(() => import('./pages/EventManagementPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const QRGeneratorPage = React.lazy(() => import('./pages/QRGeneratorPage'));
const AbsenceRequestPage = React.lazy(() => import('./pages/AbsenceRequestPage'));
const ApprovalManagementPage = React.lazy(() => import('./pages/ApprovalManagementPage'));
const TimetablePage = React.lazy(() => import('./pages/TimetablePage'));

// グローバルなローディングスピナー
const GlobalLoader = () => (
  <div className="loading-container">
    <div className="spinner" />
    <p>読み込み中...</p>
  </div>
);

// ページ読み込み中のフォールバック
const PageLoader = () => (
  <div className="loading-container">
    <div className="spinner" />
    <p>ページを読み込み中...</p>
  </div>
);

// 認証が必要なページを保護するコンポーネント
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading); // AppContentで管理するローディング状態を想定

  // 認証状態の読み込み中はローディングを表示
  if (isLoading) {
    return <PageLoader />;
  }

  // 認証されていない場合はログインページにリダイレクト
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// ログインページ用のコンポーネント（認証済みの場合はダッシュボードにリダイレクト）
const PublicRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  // 認証状態の読み込み中はローディングを表示
  if (isLoading) {
    return <PageLoader />;
  }

  // 認証済みの場合はダッシュボードにリダイレクト
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// ゲストアクセス可能なページ（認証済みの場合はダッシュボードにリダイレクト）
const GuestRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  // 認証状態の読み込み中はローディングを表示
  if (isLoading) {
    return <PageLoader />;
  }

  // 認証済みの場合はダッシュボードにリダイレクト
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// 404 Not Found ページ
const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div className="not-found">
      <h1>404 - ページが見つかりません</h1>
      <p>お探しのページは存在しません。</p>
      <button
        onClick={() => navigate('/dashboard')}
        className="btn btn--primary"
      >
        ダッシュボードに戻る
      </button>
    </div>
  );
};

// メインアプリケーションコンポーネント
const AppContent = React.memo(() => {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const [error, setError] = React.useState(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const renderRoutes = () => (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ゲストアクセス可能なルート */}
        <Route
          path="/"
          element={
            <GuestRoute>
              <HomePage />
            </GuestRoute>
          }
        />

        {/* パブリックルート */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />

        {/* 保護されたルート */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students"
          element={
            <ProtectedRoute>
              <StudentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student-attendance"
          element={
            <ProtectedRoute>
              <StudentAttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <GroupsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute>
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <EventManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/qr-generator"
          element={
            <ProtectedRoute>
              <QRGeneratorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/absence-request"
          element={
            <ProtectedRoute>
              <AbsenceRequestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute>
              <ApprovalManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/timetable"
          element={
            <ProtectedRoute>
              <TimetablePage />
            </ProtectedRoute>
          }
        />

        {/* 404ページ */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );

  return (
    <div className="app">
      {isAuthenticated && <Header />}
      <main className="main-content">
        {error && (
          <div style={{
            padding: '15px',
            margin: '10px',
            backgroundColor: '#ffebee',
            border: '1px solid #f44336',
            borderRadius: '4px',
            color: '#d32f2f',
            fontSize: '14px'
          }}>
            <strong>認証エラー:</strong> {error}
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
              <div>時刻: {new Date().toLocaleString()}</div>
              <div>URL: {window.location.href}</div>
              <div>ユーザーエージェント: {navigator.userAgent}</div>
            </div>
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  marginRight: '10px',
                  padding: '5px 10px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                再読み込み
              </button>
              <button
                onClick={() => {
                  // localStorage.removeItem('authToken'); // 削除
                  window.location.href = '/login';
                }}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                ログイン画面へ
              </button>
            </div>
          </div>
        )}
        {isLoading ? <GlobalLoader /> : renderRoutes()}
      </main>
    </div>
  );
});


// アプリケーションのルートコンポーネント
const App = () => {
  const [waitingWorker, setWaitingWorker] = React.useState(null);
  const [showUpdateNotification, setShowUpdateNotification] = React.useState(false);

  useEffect(() => {
    // 開発環境ではService Workerを解除して、常に最新の状態にする
    if (process.env.NODE_ENV === 'development') {
      unregister();
      return;
    }

    // 本番環境ではPWAのService Workerを登録
    registerServiceWorker({
      onUpdate: (registration) => {
        setWaitingWorker(registration.waiting);
        setShowUpdateNotification(true);
      }
    }).catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Service Worker登録エラー:', error);
      }
    });
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ action: 'skipWaiting' });
    }
    // リロードはService Workerのcontrollerchangeイベントで処理されるのが理想だが、
    // 簡易的にここでリロードする（pwaService.jsの実装依存）
    // pwaService.jsでは reload() を呼んでいないため、ここで呼ぶか、
    // controllerchangeを監視する必要がある。
    // 今回は手動でリロードする。
    window.location.reload();
  };

  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
        <ToastContainer />
        <UpdateNotification
          show={showUpdateNotification}
          onUpdate={handleUpdate}
          onClose={() => setShowUpdateNotification(false)}
        />
      </Router>
    </ErrorBoundary>
  );
};

export default App;
