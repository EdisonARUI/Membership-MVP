import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from '@/hooks/use-user';
import { useZkLogin as useZkLoginHook } from '@/hooks/useZkLogin';
import { useZkLogin } from '@/contexts/ZkLoginContext';
import { useLog } from '@/hooks/useLog';
import { createClient } from '@/utils/supabase/client';
import { ZkLoginStorage } from '@/utils/storage';
import { saveUserWithWalletAddress } from '@/app/actions';
import { contractService } from '@/utils/contractService';
import { SuiService } from '@/utils/sui';

interface AuthContextType {
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  zkLoginAddress: string | null;
  onChainVerified: boolean;
  handleGoogleAuth: () => Promise<void>;
  handleLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useUser();
  const { addLog } = useLog();
  const supabase = createClient();
  
  // 使用 ZkLoginContext 中的 useZkLogin
  const {
    zkLoginAddress,
    isInitialized,
    clearZkLoginState,
    handleGoogleAuth: zkLoginGoogleAuth
  } = useZkLogin();
  
  // 新增链上认证状态
  const [onChainVerified, setOnChainVerified] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);

  // 监听用户登录状态变化，当检测到用户登录时尝试保存zkLogin地址
  useEffect(() => {
    const saveZkLoginAddress = async () => {
      if (user && zkLoginAddress) {
        try {
          addLog("检测到用户登录，尝试保存zkLogin地址...");
          
          // 检查链上认证状态
          if (!checkingVerification && !onChainVerified) {
            await checkOnChainVerification(zkLoginAddress);
          }
          
          await saveUserWithWalletAddress(user.id, zkLoginAddress);
          addLog("zkLogin地址保存成功");
        } catch (error: any) {
          addLog(`保存zkLogin地址失败: ${error.message}`);
        }
      }
    };

    saveZkLoginAddress();
  }, [user, zkLoginAddress, addLog, onChainVerified, checkingVerification]);
  
  // 检查链上认证状态
  const checkOnChainVerification = async (address: string) => {
    try {
      setCheckingVerification(true);
      addLog("检查链上认证状态...");
      
      const result = await contractService.isAddressVerified(address);
      setOnChainVerified(result.verified);
      
      addLog(`链上认证状态: ${result.verified ? '已认证' : '未认证'}`);
      
      return result.verified;
    } catch (error: any) {
      addLog(`检查链上认证状态失败: ${error.message}`);
      return false;
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('has_checked_jwt');
        sessionStorage.removeItem('jwt_already_processed');
        sessionStorage.setItem('login_initiated', 'true');
      }
      
      addLog("开始Google授权流程...");
      await zkLoginGoogleAuth();
    } catch (err: any) {
      addLog(`Google授权异常: ${err.message}`);
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
        localStorage.removeItem('auth_tx_hash');
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      clearZkLoginState();
      setOnChainVerified(false);
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
    onChainVerified,
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