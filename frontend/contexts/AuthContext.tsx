import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useUser } from '@/hooks/useUser';
import { useZkLogin } from '@/contexts/ZkLoginContext';
import { useLogContext } from '@/contexts/LogContext';
import { createClient } from '@/utils/supabase/client';
import { AppStorage } from '@/utils/StorageService';
import { saveUserWithWalletAddress, checkWalletAddressSaved, checkDatabasePermissions } from '@/app/actions';
import { contractService } from '@/utils/ZkLoginAuthService';
import { SuiService } from '@/utils/SuiService';
import { ZkLoginProcessResult } from '@/interfaces/ZkLogin';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { useZkLoginParams } from '@/hooks/useZkLoginParams';

interface AuthContextType {
  // 状态
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  zkLoginAddress: string | null; // 只保留引用，不管理
  onChainVerified: boolean;
  
  // 方法
  handleLogin: () => Promise<void>; // 整合所有登录流程
  handleLogout: () => Promise<void>;
  completeAuthentication: (zkLoginResult: ZkLoginProcessResult) => Promise<void>; // 新增
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useUser();
  const { addLog } = useLogContext();
  const supabase = createClient();
  
  // 使用ZkLoginContext
  const { 
    state: zkLoginState,
    prepareZkLogin,
    clearState: clearZkLoginState
  } = useZkLogin();
  
  const zkLoginAddress = zkLoginState.zkLoginAddress;
  
  // 使用zkLogin参数Hook
  const { validateParams, prepareKeypair, getZkLoginParams } = useZkLoginParams();
  
  // 认证状态
  const [onChainVerified, setOnChainVerified] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  
  // 使用引用跟踪是否已经处理
  const processedRef = useRef<{userId?: string, address?: string}>({});

  // 检查认证状态
  const checkVerificationStatus = useCallback(async (address: string) => {
    try {
      addLog("开始检查链上认证状态...");
      const result = await contractService.isAddressVerified(address);
      
      if (result.verified) {
        addLog("zkLogin地址已在链上认证，跳过认证");
        setOnChainVerified(true);
        return true;
      } else {
        addLog("zkLogin地址未在链上认证，需要进行认证");
        return false;
      }
    } catch (error: any) {
      addLog(`检查认证状态失败: ${error.message}，将继续进行认证`);
      return false;
    }
  }, [addLog, setOnChainVerified]);

  // 注册zkLogin地址
  const registerAddress = useCallback(async (address: string, keypair: any, partialSignature: any, userSalt: string, decodedJwt: any) => {
    addLog("开始链上认证: 注册zkLogin地址...");
    
    try {
      const registerResult = await contractService.registerZkLoginAddress(
        address,
        keypair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      if (registerResult.success) {
        addLog(`zkLogin地址注册成功，交易ID: ${registerResult.txId}`);
        return true;
      } else {
        addLog(`注册zkLogin地址失败: ${registerResult.error}`);
        return false;
      }
    } catch (registerError: any) {
      addLog(`注册zkLogin地址时发生异常: ${registerError.message}`);
      return false;
    }
  }, [addLog]);

  // 绑定钱包地址
  const bindWalletAddress = useCallback(async (address: string, userId: string, keypair: any, partialSignature: any, userSalt: string, decodedJwt: any) => {
    addLog("绑定钱包地址与用户ID...");
    
    // 清理用户ID
    let userIdStr = String(userId).replace(/[^\w]/g, '');
    if (userIdStr.length > 20) {
      userIdStr = userIdStr.substring(0, 20);
    }
    addLog(`处理后的用户ID: ${userIdStr}`);
    
    try {
      const bindResult = await contractService.bindWalletAddress(
        address,
        userIdStr,
        keypair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      if (bindResult.success) {
        addLog(`钱包地址绑定成功，交易ID: ${bindResult.txId}`);
        AppStorage.setAuthTxHash(bindResult.txId || '');
        return true;
      } else {
        addLog(`绑定钱包地址失败: ${bindResult.error}`);
        return false;
      }
    } catch (bindError: any) {
      addLog(`绑定钱包地址时发生异常: ${bindError.message}`);
      return false;
    }
  }, [addLog]);

  // 主函数 - 链上注册流程
  const registerOnChain = useCallback(async (address: string, userId: string) => {
    addLog("call registerOnChain ");
    
    // 参数验证
    if (!validateParams(address, userId)) {
      return false;
    }

    // 准备临时密钥对
    const keypair = prepareKeypair();
    if (!keypair) return false;
    
    // 获取zkLogin所需参数
    const params = getZkLoginParams();
    if (!params) return false;
    const { partialSignature, userSalt, decodedJwt } = params;
    
    // 检查认证状态
    const isVerified = await checkVerificationStatus(address);

    // 如果链上未验证，直接执行绑定（包含注册功能）
    if (!isVerified) {
      const bindSuccess = await bindWalletAddress(
        address, userId, keypair, partialSignature, userSalt, decodedJwt);
      if (bindSuccess) {
        setOnChainVerified(true);
        return true;
      }
      return false;
    }
    return true;

  }, [addLog, validateParams, prepareKeypair, getZkLoginParams, checkVerificationStatus, bindWalletAddress, setOnChainVerified]);

  // 监听用户和地址变化，尝试保存zkLogin地址
  useEffect(() => {
    // 如果用户或zkLogin地址不存在，返回
    if (!user || !zkLoginAddress) {
      return;
    }
    
    // 检查是否已经处理过相同的用户ID和地址
    if (processedRef.current.userId === user.id && 
        processedRef.current.address === zkLoginAddress) {
      return;
    }
    
    // 更新处理记录
    processedRef.current = { userId: user.id, address: zkLoginAddress };
    
    addLog(`AuthContext useEffect触发: userId=${user.id}, zkLoginAddress=${zkLoginAddress}`);

  }, [user, zkLoginAddress, addLog, onChainVerified, checkingVerification, registerOnChain]);

  // 处理登录流程 - 整合所有步骤
  const handleLogin = async () => {
    try {
      if (typeof window !== 'undefined') {
        AppStorage.setHasCheckedJwt(false);
        AppStorage.setJwtProcessed(false);
        AppStorage.setLoginInitiated(true);
      }
      
      addLog("开始登录流程...");
      
      // 1. 准备zkLogin（创建临时密钥对）
      const nonce = await prepareZkLogin();
      addLog("准备zkLogin完成，nonce: " + nonce);
      
      // 2. 构建OAuth URL并重定向
      const googleOAuthEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const redirectUri = `${window.location.origin}/auth/callback`;
      const scope = 'openid email profile';
      const responseType = 'id_token';
      
      const oauthUrl = new URL(googleOAuthEndpoint);
      oauthUrl.searchParams.append('client_id', clientId!);
      oauthUrl.searchParams.append('redirect_uri', redirectUri);
      oauthUrl.searchParams.append('response_type', responseType);
      oauthUrl.searchParams.append('scope', scope);
      oauthUrl.searchParams.append('nonce', nonce);
      oauthUrl.searchParams.append('prompt', 'consent');
      
      addLog("重定向到Google授权页面...");
      window.location.href = oauthUrl.toString();
    } catch (err: any) {
      addLog(`登录流程异常: ${err.message}`);
    }
  };

  // 完成认证（从callback页面调用）
  const completeAuthentication = async (zkLoginResult: ZkLoginProcessResult) => {
    try {
      addLog(`完成认证流程，zkLogin地址: ${zkLoginResult.zkLoginAddress}`);
      
      // 检查用户登录状态
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error("未找到用户信息");
      }
      
      // 链上认证
      await registerOnChain(zkLoginResult.zkLoginAddress, currentUser.id);
      
      // 保存地址到数据库
      await saveUserWithWalletAddress(currentUser.id, zkLoginResult.zkLoginAddress);
      AppStorage.setWalletSaved(true);
      
      addLog("认证流程完成");
      
      // 更新处理记录
      processedRef.current = { 
        userId: currentUser.id, 
        address: zkLoginResult.zkLoginAddress 
      };
    } catch (error: any) {
      addLog(`完成认证流程失败: ${error.message}`);
      throw error;
    }
  };

  // 退出登录
  const handleLogout = async () => {
    try {
      addLog("开始退出登录...");
      
      // 清除所有存储
      AppStorage.clearAll();
      
      // 清除处理状态
      processedRef.current = {};
      
      // 清除zkLogin状态
      clearZkLoginState();
      
      // 登出Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
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
    handleLogin,
    handleLogout,
    completeAuthentication
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