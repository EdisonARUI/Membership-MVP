'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ZkLoginState } from '@/components/zklogin/types';
import { useZkLogin as useZkLoginHook } from '@/hooks/useZkLogin';
import { useJwtHandler } from '@/hooks/useJwtHandler';

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
      console.log(`[ZkLogin] ${message}`);
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
      if (!ephemeralKeypair) {
        const nonce = await initializeZkLogin();
        if (!nonce) {
          stableCallbacks.current.logMessage("无法继续：临时密钥对创建失败");
          return;
        }
      }

      stableCallbacks.current.logMessage("开始 Google 授权流程...");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(window.location.pathname)}`,
          queryParams: {
            prompt: 'consent',
            response_type: 'id_token',
            scope: 'openid email profile',
            nonce: ephemeralKeypair?.nonce || ''
          }
        }
      });

      if (error) {
        stableCallbacks.current.logMessage(`Google 授权错误: ${error.message}`);
        return;
      }

      stableCallbacks.current.logMessage("Google 授权请求已发送");
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
    await stableCallbacks.current.handleJwtReceived(jwt);
  }, []);

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

  const value = {
    ...state,
    handleGoogleAuth,
    handleJwtReceived,
    clearZkLoginState
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