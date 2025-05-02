import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from '@/hooks/use-user';
import { useZkLogin } from '@/hooks/useZkLogin';
import { useLog } from '@/hooks/useLog';
import { createClient } from '@/utils/supabase/client';

interface AuthContextType {
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  zkLoginAddress: string | null;
  handleGoogleAuth: () => Promise<void>;
  handleLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useUser();
  const { addLog } = useLog();
  const supabase = createClient();
  const {
    zkLoginMethods,
    zkLoginInitialized,
    clearZkLoginState
  } = useZkLogin();

  const [zkLoginAddress, setZkLoginAddress] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const address = localStorage.getItem('zkLogin_address');
      setZkLoginAddress(address);
    }
  }, []);

  const handleGoogleAuth = async () => {
    if (zkLoginMethods && (zkLoginMethods.initiateLogin || zkLoginMethods.handleGoogleAuth)) {
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('has_checked_jwt');
          sessionStorage.removeItem('jwt_already_processed');
          sessionStorage.setItem('login_initiated', 'true');
        }
        
        addLog("开始Google授权流程...");
        
        if (zkLoginMethods.handleGoogleAuth) {
          await zkLoginMethods.handleGoogleAuth();
        } else if (zkLoginMethods.initiateLogin) {
          await zkLoginMethods.initiateLogin();
        }
      } catch (err: any) {
        addLog(`Google授权异常: ${err.message}`);
      }
    } else {
      addLog("ZkLogin组件尚未准备就绪");
    }
  };

  const handleLogout = async () => {
    try {
      addLog("开始退出登录...");
      if (typeof window !== 'undefined') {
        localStorage.removeItem('zkLogin_ephemeral');
        localStorage.removeItem('zkLogin_address');
        localStorage.removeItem('zkLogin_proof');
        localStorage.removeItem('zkLogin_signature');
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      clearZkLoginState();
      addLog("已成功退出登录");
      window.location.reload();
    } catch (error: any) {
      console.error("退出登录失败:", error);
      addLog(`退出登录失败: ${error.message}`);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    zkLoginAddress,
    handleGoogleAuth,
    handleLogout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 