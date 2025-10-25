// useAuthフックの再エクスポート
// このファイルは、AuthContextからuseAuthをインポートして再エクスポートすることで、
// 他のコンポーネントからより簡単にアクセスできるようにします。
import { useAuth } from '../contexts/AuthContext';
export { useAuth } from '../contexts/AuthContext';

// 必要に応じて、認証関連の追加のカスタムフックをここに定義できます

// 例：認証が必要なページの保護用フック
export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  return {
    isAuthenticated,
    isLoading,
    shouldRedirect: !isLoading && !isAuthenticated,
  };
};

// 例：ユーザー権限チェック用フック
export const useUserRole = () => {
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || isAdmin;
  const isEmployee = user?.role === 'employee' || isManager;
  
  return {
    isAdmin,
    isManager,
    isEmployee,
    userRole: user?.role,
  };
};
