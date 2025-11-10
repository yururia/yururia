import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLoginRedirect } from '../../hooks/useLoginRedirect';
import Button from '../common/Button';
import './Header.css';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { requireAuth } = useLoginRedirect();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
    } catch (error) {
      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
      console.error('ログアウトエラー:', error);
      }
    }
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleRegisterClick = () => {
    navigate('/register');
  };

  const handleProfileClick = () => {
    requireAuth(() => {
      navigate('/profile');
    });
  };

  const handleGroupsClick = () => {
    requireAuth(() => {
      navigate('/groups');
    });
  };

  const handleStudentDashboardClick = () => {
    requireAuth(() => {
      navigate('/student-dashboard');
    });
  };

  return (
    <header className="header">
      <div className="header__container">
        <div className="header__brand">
          <h1 className="header__title">出欠管理システム</h1>
        </div>
        
        <nav className="header__nav">
          <ul className="header__nav-list">
            <li className="header__nav-item">
              <a href="/dashboard" className="header__nav-link">
                ダッシュボード
              </a>
            </li>
            <li className="header__nav-item">
              <a href="/calendar" className="header__nav-link">
                カレンダー
              </a>
            </li>
            {user?.role === 'admin' && (
              <li className="header__nav-item">
                <a href="/students" className="header__nav-link">
                  学生管理
                </a>
              </li>
            )}
            <li className="header__nav-item">
              <a href="/student-attendance" className="header__nav-link">
                学生出欠記録
              </a>
            </li>
            <li className="header__nav-item">
              <a href="/reports" className="header__nav-link">
                レポート
              </a>
            </li>
          </ul>
        </nav>

        <div className="header__user">
          {isAuthenticated ? (
            <div className="header__user-section">
              <div className="header__user-info">
                <span className="header__user-name">
                  こんにちは、{user?.name}さん
                </span>
                <span className="header__user-role">
                  {user?.role === 'admin' ? '管理者' : user?.role === 'employee' ? '教員' : '学生'}
                </span>
              </div>
              
              <div className="header__user-menu">
                <button 
                  className="header__user-avatar"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label="ユーザーメニュー"
                >
                  <div className="avatar">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                </button>
                
                {showUserMenu && (
                  <div className="header__user-dropdown">
                    <div className="dropdown-header">
                      <div className="dropdown-user-info">
                        <div className="dropdown-avatar">
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="dropdown-details">
                          <div className="dropdown-name">{user?.name}</div>
                          <div className="dropdown-email">{user?.email}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="dropdown-menu">
                      <button 
                        className="dropdown-item"
                        onClick={handleProfileClick}
                      >
                        <span className="dropdown-icon">👤</span>
                        プロファイル
                      </button>
                      
                      {user?.role === 'admin' || user?.role === 'employee' ? (
                        <button 
                          className="dropdown-item"
                          onClick={handleGroupsClick}
                        >
                          <span className="dropdown-icon">👥</span>
                          グループ管理
                        </button>
                      ) : (
                        <button 
                          className="dropdown-item"
                          onClick={handleStudentDashboardClick}
                        >
                          <span className="dropdown-icon">📱</span>
                          学生ダッシュボード
                        </button>
                      )}
                      
                      <div className="dropdown-divider"></div>
                      
                      <button 
                        className="dropdown-item dropdown-item--danger"
                        onClick={handleLogout}
                      >
                        <span className="dropdown-icon">🚪</span>
                        ログアウト
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="header__auth">
              <Button
                variant="outline"
                size="small"
                onClick={handleLoginClick}
              >
                ログイン
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={handleRegisterClick}
              >
                新規登録
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
