import { create } from 'zustand';
import { attendanceApi } from '../api/attendanceApi';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  viewMode: null, // 'student' | null

  setLoading: (loading) => set({ isLoading: loading }),

  // 表示モード切り替えアクション
  toggleViewMode: () => {
    const { user, viewMode } = get();
    // 学生ユーザーは切り替え不可
    if (!user || user.role === 'student') return;

    set({ viewMode: viewMode === 'student' ? null : 'student' });
  },

  // ログインアクション
  login: async (email, password) => {
    try {
      const response = await attendanceApi.login(email, password);

      if (response.success) {
        const { user } = response.data;
        set({ user, isAuthenticated: true, viewMode: null });
        return { success: true };
      } else {
        set({ user: null, isAuthenticated: false, viewMode: null });
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Login failed:', error);
      set({ user: null, isAuthenticated: false, viewMode: null });
      return { success: false, message: 'ログインに失敗しました' };
    }
  },

  // 新規登録アクション
  register: async (userData) => {
    try {
      const response = await attendanceApi.register(userData);

      if (response.success) {
        const { user } = response.data;
        set({ user, isAuthenticated: true, viewMode: null });
        return { success: true };
      } else {
        set({ user: null, isAuthenticated: false, viewMode: null });
        return { success: false, message: response.message || '登録に失敗しました' };
      }
    } catch (error) {
      console.error('Registration failed:', error);
      set({ user: null, isAuthenticated: false, viewMode: null });
      return { success: false, message: error.message || '登録に失敗しました' };
    }
  },

  // ログアウトアクション
  logout: async () => {
    try {
      await attendanceApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      set({ user: null, isAuthenticated: false, viewMode: null });
    }
  },

  // ユーザー情報をセットするアクション
  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  // 初期化チェック（Cookieによる自動ログイン確認用）
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const response = await attendanceApi.getAuthUser();
      if (response.success) {
        set({ user: response.data.user, isAuthenticated: true });
      }
    } catch (error) {
      // 認証切れなどはここで無視して未ログイン状態にする
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  }
}));

export default useAuthStore;
