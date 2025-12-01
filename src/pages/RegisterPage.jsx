import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import './RegisterPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    employeeId: '',
    studentId: '',
    department: '',
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null,
      }));
    }
    if (name === 'role') {
      setValidationErrors(prev => ({
        ...prev,
        studentId: null,
        employeeId: null,
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name) errors.name = '氏名は必須です';
    if (!formData.email) errors.email = 'メールアドレスは必須です';

    if (formData.role === 'student') {
      if (!formData.studentId) errors.studentId = '学生IDは必須です';
    } else if (formData.role === 'employee') {
      if (!formData.employeeId) errors.employeeId = '社員IDは必須です';
    }

    if (formData.password.length < 6) errors.password = 'パスワードは6文字以上で入力してください';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'パスワードが一致しません';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    const { confirmPassword, ...dataToSend } = formData;

    if (dataToSend.role === 'student') {
      dataToSend.employeeId = null;
      dataToSend.department = null;
    } else {
      dataToSend.studentId = null;
    }

    const result = await register(dataToSend);

    if (!result.success) {
      setError(result.message || '登録に失敗しました');
    }

    setIsLoading(false);
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <h1 className="register-title">新規登録</h1>
            <p className="register-subtitle">新しいアカウントを作成します</p>
          </div>

          <form className="register-form" onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}

            <div className="form-role-selection">
              <label>
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={formData.role === 'student'}
                  onChange={handleInputChange}
                />
                <span className="radio-label">学生</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="role"
                  value="employee"
                  checked={formData.role === 'employee'}
                  onChange={handleInputChange}
                />
                <span className="radio-label">教員・管理者</span>
              </label>
            </div>

            <Input
              label="氏名"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              error={validationErrors.name}
              required
              placeholder="例: 山田 太郎"
              autoComplete="name"
            />

            <Input
              label="メールアドレス"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              error={validationErrors.email}
              required
              placeholder="例: user@example.com"
              autoComplete="email"
            />

            {formData.role === 'student' && (
              <Input
                label="学生ID"
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleInputChange}
                error={validationErrors.studentId}
                required
                placeholder="学生IDを入力"
                autoComplete="off"
              />
            )}

            {formData.role === 'employee' && (
              <>
                <Input
                  label="社員ID"
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  error={validationErrors.employeeId}
                  required
                  placeholder="社員IDを入力"
                  autoComplete="off"
                />
                <Input
                  label="部署 (任意)"
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  error={validationErrors.department}
                  placeholder="例: 情報学部"
                  autoComplete="organization"
                />
              </>
            )}

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
                autoComplete="new-password"
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
                autoComplete="new-password"
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