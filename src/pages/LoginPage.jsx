import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [validationErrors, setValidationErrors] = useState({});

  // 既にログインしている場合はダッシュボードにリダイレクト
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // エラーが変更されたときにバリデーションエラーをクリア
  useEffect(() => {
    if (error) {
      setValidationErrors({});
    }
  }, [error]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // 入力時にバリデーションエラーをクリア
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
    
    // エラーメッセージをクリア
    if (error) {
      clearError();
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email.trim()) {
      errors.email = 'メールアドレスを入力してください';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください';
    }
    
    if (!formData.password.trim()) {
      errors.password = 'パスワードを入力してください';
    } else if (formData.password.length < 6) {
      errors.password = 'パスワードは6文字以上で入力してください';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const result = await login(formData);
    
    if (result.success) {
      // ログイン成功時はuseEffectでリダイレクトされる
    } else {
      // エラーはAuthContextで管理される
    }
  };

  if (isLoading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-loading">
            <div className="spinner" />
            <p>ログイン中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">出欠管理システム</h1>
            <p className="login-subtitle">ログインしてください</p>
          </div>
          
          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            <Input
              label="メールアドレス"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              error={validationErrors.email}
              required
              placeholder="example@company.com"
            />
            
            <Input
              label="パスワード"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              error={validationErrors.password}
              required
              placeholder="パスワードを入力"
            />
            
            <Button
              type="submit"
              variant="primary"
              size="large"
              className="login-button"
              loading={isLoading}
            >
              ログイン
            </Button>
          </form>
          
          <div className="login-footer">
            <p className="login-help">
              アカウントをお持ちでない場合は、
            </p>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="register-link"
            >
              新規登録はこちら
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
