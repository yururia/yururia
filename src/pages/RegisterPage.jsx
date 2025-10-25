import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import './RegisterPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    employeeId: '',
    department: '',
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
    
    if (!formData.name.trim()) {
      errors.name = '氏名を入力してください';
    } else if (formData.name.trim().length < 2) {
      errors.name = '氏名は2文字以上で入力してください';
    }
    
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
    
    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = 'パスワード確認を入力してください';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'パスワードが一致しません';
    }
    
    if (!formData.employeeId.trim()) {
      errors.employeeId = '社員IDを入力してください';
    } else if (!/^[A-Z0-9]+$/.test(formData.employeeId)) {
      errors.employeeId = '社員IDは英数字のみで入力してください';
    }
    
    if (!formData.department.trim()) {
      errors.department = '部署を入力してください';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const result = await register(formData);
    
    if (result.success) {
      // 登録成功時はuseEffectでリダイレクトされる
    } else {
      // エラーはAuthContextで管理される
    }
  };

  if (isLoading) {
    return (
      <div className="register-page">
        <div className="register-container">
          <div className="register-loading">
            <div className="spinner" />
            <p>登録中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <h1 className="register-title">新規登録</h1>
            <p className="register-subtitle">アカウントを作成してください</p>
          </div>
          
          <form onSubmit={handleSubmit} className="register-form">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            <div className="form-row">
              <Input
                label="氏名"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                error={validationErrors.name}
                required
                placeholder="山田太郎"
              />
              
              <Input
                label="社員ID"
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                error={validationErrors.employeeId}
                required
                placeholder="EMP001"
              />
            </div>
            
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
              label="部署"
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              error={validationErrors.department}
              required
              placeholder="営業部"
            />
            
            <div className="form-row">
              <Input
                label="パスワード"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                error={validationErrors.password}
                required
                placeholder="6文字以上で入力"
              />
              
              <Input
                label="パスワード確認"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={validationErrors.confirmPassword}
                required
                placeholder="パスワードを再入力"
              />
            </div>
            
            <Button
              type="submit"
              variant="primary"
              size="large"
              className="register-button"
              loading={isLoading}
            >
              新規登録
            </Button>
          </form>
          
          <div className="register-footer">
            <p className="register-help">
              既にアカウントをお持ちの場合は、
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="login-link"
            >
              ログインはこちら
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
