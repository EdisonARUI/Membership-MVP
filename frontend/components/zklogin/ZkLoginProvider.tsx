"use client";

import { useState, useEffect, useRef } from 'react';
import { useZkLogin } from "@/contexts/ZkLoginContext";
import { ZkLoginMethods, ZkLoginProviderProps } from "@/components/zklogin/types";

export default function ZkLoginProvider({ 
  userId, 
  autoInitialize = false, 
  onLog, 
  onReady 
}: ZkLoginProviderProps) {
  const { 
    zkLoginAddress, 
    ephemeralKeypair, 
    loading, 
    error,
    handleGoogleAuth,
    handleJwtReceived
  } = useZkLogin();
  
  const [hasMounted, setHasMounted] = useState(false);
  const onReadyCalledRef = useRef<boolean>(false);
  
  const addLog = (message: string) => {
    console.log(message);
    if (onLog) {
      onLog(message);
    }
  };

  // 监听JWT消息
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type !== 'JWT_RECEIVED') return;
      
      const jwt = event.data.jwt;
      if (jwt && ephemeralKeypair) {
        await handleJwtReceived(jwt);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [ephemeralKeypair, handleJwtReceived]);
  
  // 准备onReady回调方法
  useEffect(() => {
    if (onReady && !onReadyCalledRef.current) {
      const methods: ZkLoginMethods = {
        initiateLogin: async () => {
          addLog("初始化登录...");
        },
        handleGoogleAuth: async () => {
          addLog("开始Google授权...");
          await handleGoogleAuth();
        }
      };
      
      onReady(methods);
      onReadyCalledRef.current = true;
    }
  }, [handleGoogleAuth, onReady]);
  
  // 组件挂载标记
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  // 使用更小、更专注的组件来呈现内容
  return (
    <div className="mt-4">
      {!hasMounted ? (
        <div />
      ) : zkLoginAddress ? (
        <div className="p-4 bg-slate-700 rounded-lg text-white">
          <h3 className="text-lg font-bold">已连接到Sui Devnet</h3>
          <p className="text-sm truncate">地址: {zkLoginAddress}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {error && (
            <div className="p-2 bg-red-500 rounded text-white text-sm">
              {error}
            </div>
          )}
          {loading && (
            <div className="p-4 bg-slate-700 rounded-lg text-white">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
                <span>处理中...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
