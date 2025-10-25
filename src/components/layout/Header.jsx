import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import './Header.css';

const Header = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
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
          {user ? (
            <div className="header__user-info">
              <span className="header__user-name">
                こんにちは、{user.name}さん
              </span>
              <Button
                variant="outline"
                size="small"
                onClick={handleLogout}
              >
                ログアウト
              </Button>
            </div>
          ) : (
            <div className="header__auth">
              <Button
                variant="outline"
                size="small"
                onClick={() => window.location.href = '/login'}
              >
                ログイン
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
