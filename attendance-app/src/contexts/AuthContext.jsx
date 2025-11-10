import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { attendanceApi } from '../api/attendanceApi';

// 認証状態の初期値
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isGuest: true, // ゲストモード
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
        isGuest: false,
      };
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
        isGuest: true,
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
        isGuest: true,
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
      const token = localStorage.getItem('authToken');
      
      if (token) {
        try {
          // トークンが有効かチェック
          const response = await attendanceApi.getUserProfile();
          
          if (response.success) {
            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: {
                user: response.data.user,
                token: token
              }
            });
          } else {
            localStorage.removeItem('authToken');
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
          }
        } catch (error) {
          const errorDetails = {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            code: error.code,
            timestamp: new Date().toISOString()
          };

          // 開発環境でのみエラーログ出力
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
          console.error('AuthProvider: 認証チェックエラー:', error);
            // eslint-disable-next-line no-console
          console.error('AuthProvider: エラー詳細:', errorDetails);
          }

          localStorage.removeItem('authToken');
          
          // エラーメッセージの詳細化
          let errorMessage = 'API接続エラー';
          
          if (!error.response) {
            // ネットワークエラーの場合
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
              errorMessage = 'サーバーへの接続がタイムアウトしました。サーバーが起動しているか確認してください。';
            } else if (error.code === 'ERR_CONNECTION_REFUSED') {
              errorMessage = 'サーバーに接続できません。バックエンドサーバーが起動しているか確認してください。';
            } else if (error.code === 'ERR_NETWORK') {
              errorMessage = 'ネットワークエラーが発生しました。サーバーの状態を確認してください。';
            } else {
              errorMessage = `サーバーに接続できません: ${error.message || '不明なエラー'}`;
            }
          } else if (error.response.status === 401) {
            errorMessage = '認証トークンが無効です。再度ログインしてください。';
          } else {
            errorMessage = `API接続エラー: ${error.message || '不明なエラー'}`;
          }

          dispatch({ 
            type: AUTH_ACTIONS.LOGIN_FAILURE,
            payload: errorMessage
          });
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    };

    initializeAuth();
  }, []);

  // ログイン関数
  const login = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    
    try {
      const response = await attendanceApi.login(credentials);
      
      if (response.success) {
        localStorage.setItem('authToken', response.data.token);
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
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: errorMessage
        });
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        code: error.code,
        timestamp: new Date().toISOString()
      };

      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
      console.error('ログインエラー:', errorDetails);
      }
      
      let errorMessage = 'ログインに失敗しました';
      
      // レスポンスがある場合（HTTPエラー）
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'メールアドレスまたはパスワードが正しくありません';
        } else if (error.response.status === 500) {
          errorMessage = 'サーバーエラーが発生しました。管理者にお問い合わせください';
        } else if (error.response.status >= 400 && error.response.status < 500) {
          errorMessage = error.response.data?.message || 'リクエストが不正です';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else {
        // ネットワークエラーの場合
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          errorMessage = 'サーバーへの接続がタイムアウトしました。サーバーが起動しているか確認してください。';
        } else if (error.code === 'ERR_CONNECTION_REFUSED') {
          errorMessage = 'サーバーに接続できません。バックエンドサーバー（ポート3001）が起動しているか確認してください。';
        } else if (error.code === 'ERR_NETWORK' || error.code === 'NETWORK_ERROR') {
          errorMessage = 'ネットワークエラーが発生しました。サーバーの状態を確認してください。';
        } else if (error.message) {
          errorMessage = error.message;
        }
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
      const response = await attendanceApi.register(userData);
      
      if (response.success) {
        localStorage.setItem('authToken', response.data.token);
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
        dispatch({
          type: AUTH_ACTIONS.REGISTER_FAILURE,
          payload: errorMessage
        });
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        code: error.code,
        timestamp: new Date().toISOString()
      };

      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
      console.error('新規登録エラー:', errorDetails);
      }
      
      let errorMessage = '新規登録に失敗しました';
      
      // レスポンスがある場合（HTTPエラー）
      if (error.response) {
        if (error.response.status === 400) {
          errorMessage = '入力情報に誤りがあります。確認してください';
        } else if (error.response.status === 409) {
          errorMessage = 'このメールアドレスは既に登録されています';
        } else if (error.response.status === 500) {
          errorMessage = 'サーバーエラーが発生しました。管理者にお問い合わせください';
        } else if (error.response.status >= 400 && error.response.status < 500) {
          errorMessage = error.response.data?.message || 'リクエストが不正です';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else {
        // ネットワークエラーの場合
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          errorMessage = 'サーバーへの接続がタイムアウトしました。サーバーが起動しているか確認してください。';
        } else if (error.code === 'ERR_CONNECTION_REFUSED') {
          errorMessage = 'サーバーに接続できません。バックエンドサーバー（ポート3001）が起動しているか確認してください。';
        } else if (error.code === 'ERR_NETWORK' || error.code === 'NETWORK_ERROR') {
          errorMessage = 'ネットワークエラーが発生しました。サーバーの状態を確認してください。';
        } else if (error.message) {
          errorMessage = error.message;
        }
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
      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
      console.error('ログアウトAPI呼び出しエラー:', error);
      }
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
