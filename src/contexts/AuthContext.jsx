import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { attendanceApi } from '../api/attendanceApi';

// 認証状態の初期値
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// アクションタイプ
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// リデューサー関数
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case AUTH_ACTIONS.REGISTER_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.REGISTER_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// コンテキストの作成
const AuthContext = createContext();

// プロバイダーコンポーネント
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 初期化時にトークンをチェック
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('AuthProvider: 初期化開始');
      const token = localStorage.getItem('authToken');
      console.log('AuthProvider: トークン確認', token ? '存在' : 'なし');
      
      if (token) {
        try {
          console.log('AuthProvider: ユーザープロファイル取得中...');
          // トークンが有効かチェック
          const response = await attendanceApi.getUserProfile();
          console.log('AuthProvider: プロファイル応答', response);
          
          if (response.success) {
            console.log('AuthProvider: 認証成功');
            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: {
                user: response.data.user,
                token: token
              }
            });
          } else {
            console.log('AuthProvider: 認証失敗 - トークン無効');
            localStorage.removeItem('authToken');
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
          }
        } catch (error) {
          console.error('AuthProvider: 認証チェックエラー:', error);
          console.error('AuthProvider: エラー詳細:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          });
          localStorage.removeItem('authToken');
          dispatch({ 
            type: AUTH_ACTIONS.LOGIN_FAILURE,
            payload: `API接続エラー: ${error.message}`
          });
        }
      } else {
        console.log('AuthProvider: トークンなし - ログアウト状態');
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      console.log('AuthProvider: 初期化完了');
    };

    initializeAuth();
  }, []);

  // ログイン関数
  const login = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    
    try {
      console.log('ログイン試行:', { email: credentials.email, timestamp: new Date().toISOString() });
      const response = await attendanceApi.login(credentials);
      console.log('ログインAPI応答:', response);
      
      if (response.success) {
        localStorage.setItem('authToken', response.data.token);
        console.log('ログイン成功:', { user: response.data.user, token: response.data.token });
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: response.data.user,
            token: response.data.token
          }
        });
        return { success: true };
      } else {
        const errorMessage = response.message || 'ログインに失敗しました';
        console.error('ログイン失敗:', { message: errorMessage, response });
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: errorMessage
        });
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.error('ログインエラー:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        stack: error.stack
      });
      
      let errorMessage = 'ログインに失敗しました';
      
      if (error.response?.status === 401) {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません';
      } else if (error.response?.status === 500) {
        errorMessage = 'サーバーエラーが発生しました。管理者にお問い合わせください';
      } else if (error.response?.status === 0) {
        errorMessage = 'サーバーに接続できません。ネットワーク接続を確認してください';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      });
      return { success: false, message: errorMessage };
    }
  };

  // 新規登録関数
  const register = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.REGISTER_START });
    
    try {
      console.log('新規登録試行:', { email: userData.email, name: userData.name, timestamp: new Date().toISOString() });
      const response = await attendanceApi.register(userData);
      console.log('新規登録API応答:', response);
      
      if (response.success) {
        localStorage.setItem('authToken', response.data.token);
        console.log('新規登録成功:', { user: response.data.user, token: response.data.token });
        dispatch({
          type: AUTH_ACTIONS.REGISTER_SUCCESS,
          payload: {
            user: response.data.user,
            token: response.data.token
          }
        });
        return { success: true };
      } else {
        const errorMessage = response.message || '新規登録に失敗しました';
        console.error('新規登録失敗:', { message: errorMessage, response });
        dispatch({
          type: AUTH_ACTIONS.REGISTER_FAILURE,
          payload: errorMessage
        });
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.error('新規登録エラー:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        stack: error.stack
      });
      
      let errorMessage = '新規登録に失敗しました';
      
      if (error.response?.status === 400) {
        errorMessage = '入力情報に誤りがあります。確認してください';
      } else if (error.response?.status === 409) {
        errorMessage = 'このメールアドレスは既に登録されています';
      } else if (error.response?.status === 500) {
        errorMessage = 'サーバーエラーが発生しました。管理者にお問い合わせください';
      } else if (error.response?.status === 0) {
        errorMessage = 'サーバーに接続できません。ネットワーク接続を確認してください';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAILURE,
        payload: errorMessage
      });
      return { success: false, message: errorMessage };
    }
  };

  // ログアウト関数
  const logout = async () => {
    try {
      await attendanceApi.logout();
    } catch (error) {
      console.error('ログアウトAPI呼び出しエラー:', error);
    } finally {
      localStorage.removeItem('authToken');
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  // エラーをクリアする関数
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// カスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthはAuthProvider内で使用する必要があります');
  }
  return context;
};

export default AuthContext;
