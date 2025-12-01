import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import './Header.css';

const Header = () => {
  const { user, isAuthenticated, logout, isLoading, viewMode, toggleViewMode } = useAuthStore();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  // 現在の表示ロール（viewModeがあればそれを優先、なければ本来のロール）
  const currentRole = viewMode || user?.role;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getLinkClass = ({ isActive }) =>
    isActive ? 'nav-link active' : 'nav-link';

  return (
    <header className={`app-header ${isScrolled ? 'scrolled' : ''}`}>
      <nav className="navbar">
        <div className="navbar-left">
          <NavLink to="/" className="navbar-brand">
            📚 出欠管理
          </NavLink>
          {isAuthenticated && (
            <div className="nav-links-left">
              {/* 共通リンク */}
              <NavLink to="/dashboard" className={getLinkClass}>ダッシュボード</NavLink>
              {/* [追加] チャットリンクを追加 */}
              <NavLink to="/chat" className={getLinkClass}>チャット</NavLink>

              {/* ロール別リンク */}
              {currentRole === 'admin' && (
                <>
                  <NavLink to="/students" className={getLinkClass}>学生管理</NavLink>
                  <NavLink to="/student-attendance" className={getLinkClass}>出欠記録</NavLink>
                  {/* [追加] イベント管理リンクを追加 */}
                  <NavLink to="/events" className={getLinkClass}>イベント管理</NavLink>
                </>
              )}
              {currentRole === 'employee' && (
                <>
                  <NavLink to="/student-attendance" className={getLinkClass}>出欠記録</NavLink>
                  <NavLink to="/groups" className={getLinkClass}>グループ管理</NavLink>
                  {/* [追加] イベント管理リンクを追加 */}
                  <NavLink to="/events" className={getLinkClass}>イベント管理</NavLink>
                </>
              )}
              {currentRole === 'student' && (
                <>
                  <NavLink to="/student-dashboard" className={getLinkClass}>学生</NavLink>
                  {/* [追加] イベント一覧リンクを追加 */}
                  <NavLink to="/events" className={getLinkClass}>イベント一覧</NavLink>
                </>
              )}
            </div>
          )}
        </div>

        <div className="navbar-right">
          {isLoading ? (
            <div className="nav-links-right">
              <span className="loading-spinner"></span>
            </div>
          ) : isAuthenticated ? (
            <div className="nav-links-right">
              {/* 管理者・教員向けの学生モード切り替えボタン */}
              {user?.role !== 'student' && (
                <button
                  onClick={toggleViewMode}
                  className={`nav-link nav-button ${viewMode === 'student' ? 'active-mode' : ''}`}
                  style={{
                    backgroundColor: viewMode === 'student' ? '#10b981' : 'transparent',
                    color: viewMode === 'student' ? 'white' : 'inherit',
                    border: viewMode === 'student' ? 'none' : '1px solid currentColor'
                  }}
                >
                  {viewMode === 'student' ? '管理者に戻る' : '学生モード'}
                </button>
              )}

              <NavLink to="/calendar" className={getLinkClass}>カレンダー</NavLink>
              <NavLink to="/profile" className="nav-link profile-link">
                <span className="profile-icon">{user?.name?.charAt(0) || 'P'}</span>
                {user?.name}
              </NavLink>
              <button onClick={handleLogout} className="nav-link nav-button">
                ログアウト
              </button>
            </div>
          ) : (
            <div className="nav-links-right">
              <NavLink to="/login" className={getLinkClass}>ログイン</NavLink>
              <NavLink to="/register" className={getLinkClass}>新規登録</NavLink>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
