'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ZkLoginState } from '@/components/zklogin/types';
import { useZkLogin as useZkLoginHook } from '@/hooks/useZkLogin';
import { useJwtHandler } from '@/hooks/useJwtHandler';
import { ZkLoginStorage } from '@/utils/storage';

// 对外暴露的Context接口
interface ZkLoginContextType extends ZkLoginState {
  handleGoogleAuth: () => Promise<void>;
  handleJwtReceived: (jwt: string) => Promise<void>;
  clearZkLoginState: () => void;
}

const ZkLoginContext = createContext<ZkLoginContextType | undefined>(undefined);

export function ZkLoginProvider({ 
  children,
  userId,
  onLog
}: { 
  children: ReactNode;
  userId?: string;
  onLog?: (message: string) => void;
}) {
  const supabase = createClient();

  // 使用拆分的hooks
  const {
    zkLoginAddress,
    ephemeralKeypair,
    isInitialized,
    error: zkLoginError,
    loading: zkLoginLoading,
    jwt: zkLoginJwt,
    initializeZkLogin,
    handleZkLoginAddress,
    clearZkLoginState,
    log
  } = useZkLoginHook(userId, onLog);

  // 使用ref存储稳定的函数引用
  const stableCallbacks = useRef({
    logMessage: (message: string) => {
      if (onLog) onLog(message);
    },
    handleJwtReceived: async (jwt: string) => {}
  });

  // 使用 JWT 处理钩子
  const {
    processing: jwtProcessing,
    error: jwtError,
    jwtProcessed,
    handleJwtReceived: processJwt
  } = useJwtHandler({
    onLog: stableCallbacks.current.logMessage,
    onAddressGenerated: handleZkLoginAddress
  });

  // 合并状态
  const [state, setState] = useState<ZkLoginState>({
    zkLoginAddress,
    ephemeralKeypair,
    isInitialized,
    error: zkLoginError || jwtError,
    loading: zkLoginLoading || jwtProcessing,
    jwt: zkLoginJwt
  });

  // 当各子状态更新时更新总状态
  useEffect(() => {
    setState({
      zkLoginAddress,
      ephemeralKeypair,
      isInitialized,
      error: zkLoginError || jwtError,
      loading: zkLoginLoading || jwtProcessing,
      jwt: zkLoginJwt
    });
  }, [
    zkLoginAddress,
    ephemeralKeypair,
    isInitialized,
    zkLoginError,
    jwtError,
    zkLoginLoading,
    jwtProcessing,
    zkLoginJwt
  ]);

  // 处理Google登录
  const handleGoogleAuth = async () => {
    try {
      // 强制创建新的临时密钥对，解决nonce问题
      const generatedNonce = await initializeZkLogin(true);
      if (!generatedNonce) {
        stableCallbacks.current.logMessage("无法继续：临时密钥对创建失败");
        return;
      }

      stableCallbacks.current.logMessage("开始 Google 授权流程...");
      
      // 获取最新保存的临时密钥对数据，确保使用刚刚创建的密钥对
      const updatedEphemeralData = ZkLoginStorage.getEphemeralKeypair();
      if (!updatedEphemeralData) {
        stableCallbacks.current.logMessage("无法获取最新的临时密钥对数据");
        return;
      }
      
      // Google OAuth 2.0 参数
      const googleOAuthEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
      const clientId =  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const redirectUri = `${window.location.origin}`;
      const scope = 'openid email profile';
      const responseType = 'id_token';
      
      // 使用最新创建的密钥对的nonce，而不是可能尚未更新的state中的nonce
      const nonce = updatedEphemeralData.nonce;
      
      // 记录nonce和其他重要参数，帮助调试
      stableCallbacks.current.logMessage(`使用nonce: ${nonce}`);
      stableCallbacks.current.logMessage(`maxEpoch: ${updatedEphemeralData.maxEpoch}`);
      
      // 保存OAuth流程中使用的原始参数，以便后续ZK证明验证使用
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('zklogin_original_nonce', nonce);
        sessionStorage.setItem('zklogin_original_maxEpoch', updatedEphemeralData.maxEpoch.toString());
        sessionStorage.setItem('zklogin_original_randomness', JSON.stringify(updatedEphemeralData.randomness));
      }
      
      // 构建OAuth URL
      const oauthUrl = new URL(googleOAuthEndpoint);
      oauthUrl.searchParams.append('client_id', clientId!);
      oauthUrl.searchParams.append('redirect_uri', redirectUri);
      oauthUrl.searchParams.append('response_type', responseType);
      oauthUrl.searchParams.append('scope', scope);
      oauthUrl.searchParams.append('nonce', nonce);
      oauthUrl.searchParams.append('prompt', 'consent');
      
      // 可选：添加state参数以验证回调
      const state = btoa(JSON.stringify({
        redirect: window.location.pathname,
        timestamp: Date.now()
      }));
      oauthUrl.searchParams.append('state', state);
      
      // 在本地存储中保存状态以便回调时验证
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('oauth_state', state);
      }
      
      stableCallbacks.current.logMessage("Google 授权请求已发送");
      
      // 重定向到Google授权页面
      window.location.href = oauthUrl.toString();
    } catch (err: any) {
      stableCallbacks.current.logMessage(`Google 授权异常: ${err.message}`);
    }
  };

  // 更新稳定的回调函数引用
  useEffect(() => {
    stableCallbacks.current.handleJwtReceived = async (jwt: string) => {
      stableCallbacks.current.logMessage(`接收到JWT，长度: ${jwt.length}`);
      await processJwt(jwt);
    };
  }, [processJwt]);

  // JWT处理封装 - 作为暴露给外部的方法
  const handleJwtReceived = useCallback(async (jwt: string) => {
    if (onLog) onLog("ZkLoginContext: handleJwtReceived被调用，JWT长度: " + jwt.length);
    
    // 直接调用processJwt而不是通过stableCallbacks
    try {
      // 记录接收JWT日志
      if (onLog) onLog(`接收到JWT，长度: ${jwt.length}`);
      
      // 直接调用processJwt处理
      await processJwt(jwt);
    } catch (error: any) {
      if (onLog) onLog(`处理JWT时出错: ${error.message}`);
    }
  }, [onLog, processJwt]);

  // 监听消息 - 使用稳定的引用避免频繁重新注册
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'JWT_RECEIVED') {
        stableCallbacks.current.logMessage(`通过window消息接收到JWT`);
        stableCallbacks.current.handleJwtReceived(event.data.jwt);
      }
    };

    stableCallbacks.current.logMessage("注册JWT消息监听器");
    window.addEventListener('message', handleMessage);
    return () => {
      stableCallbacks.current.logMessage("移除JWT消息监听器");
      window.removeEventListener('message', handleMessage);
    };
  }, []); // 移除所有依赖项，使用ref中的稳定引用

  // 扩展原有的clearZkLoginState函数，确保完全清除所有zkLogin状态
  const enhancedClearZkLoginState = () => {
    // 调用原始清除函数
    clearZkLoginState();
    
    // 手动重置所有会话状态
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('jwt_already_processed');
      sessionStorage.removeItem('has_checked_jwt');
      sessionStorage.removeItem('pending_jwt');
      sessionStorage.removeItem('oauth_state');
    }
    
    stableCallbacks.current.logMessage("已完全清除zkLogin状态和会话数据");
  };

  const value = {
    ...state,
    handleGoogleAuth,
    handleJwtReceived,
    clearZkLoginState: enhancedClearZkLoginState // 替换为增强版的清除函数
  };

  return (
    <ZkLoginContext.Provider value={value}>
      {children}
    </ZkLoginContext.Provider>
  );
}

export function useZkLogin() {
  const context = useContext(ZkLoginContext);
  if (context === undefined) {
    throw new Error('useZkLogin must be used within a ZkLoginProvider');
  }
  return context;
} 