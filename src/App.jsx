import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Header from './components/layout/Header';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import StudentPage from './pages/StudentPage';
import StudentAttendancePage from './pages/StudentAttendancePage';
import ProfilePage from './pages/ProfilePage';
import GroupsPage from './pages/GroupsPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import './styles/global.css';

// グローバルなローディングスピナー
const GlobalLoader = () => (
  <div className="loading-container">
    <div className="spinner" />
    <p>読み込み中...</p>
    <div style={{
      marginTop: '20px',
      padding: '10px',
      backgroundColor: '#e3f2fd',
      borderRadius: '4px',
      fontSize: '14px',
      color: '#1976d2'
    }}>
      <strong>デバッグ情報:</strong><br/>
      • API URL: {process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}<br/>
      • 環境: {process.env.NODE_ENV}<br/>
      • 時刻: {new Date().toLocaleString()}
    </div>
  </div>
);

// 認証が必要なページを保護するコンポーネント
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// ログインページ用のコンポーネント（認証済みの場合はダッシュボードにリダイレクト）
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

// ゲストアクセス可能なページ（認証済みの場合はダッシュボードにリダイレクト）
const GuestRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
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
const AppContent = () => {
  const { isAuthenticated, isLoading, error, isGuest } = useAuth();

  // デバッグログを追加
  console.log('AppContent render:', { 
    isAuthenticated, 
    isLoading, 
    error,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    currentPath: window.location.pathname
  });

  const renderRoutes = () => (
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

      {/* 404ページ */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );

  return (
    <div className="app">
      {isAuthenticated && <Header />}
      <main className="main-content" style={isGuest && !isAuthenticated ? { marginTop: 0 } : {}}>
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
                  localStorage.removeItem('authToken');
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
};

// アプリケーションのルートコンポーネント
const App = () => {
  console.log('App component mounting...');
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router basename="/linkup">
          <AppContent />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
