'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ZkLoginState } from '@/components/zklogin/types';
import { AppStorage } from '@/utils/StorageService';
import { useZkLogin as useZkLoginHook } from '@/hooks/useZkLogin';
import { ZkLoginService } from '@/utils/ZkLoginService';
import { ZkLoginProcessResult } from '@/interfaces/ZkLogin';
import { useLogContext } from '@/contexts/LogContext';

// 新的Context接口，专注于zkLogin技术实现并包含日志功能
interface ZkLoginContextType {
  // 状态
  state: ZkLoginState;
  
  // 方法
  prepareZkLogin: () => Promise<string>; // 只负责准备密钥对并返回nonce
  // processJwt: (jwt: string) => Promise<ZkLoginProcessResult>;
  clearState: () => void;
  
  // 日志相关
  logs: string[];
  addLog: (message: string) => void;
  clearLogs: () => void;
}

const ZkLoginContext = createContext<ZkLoginContextType | undefined>(undefined);

export function ZkLoginProvider({ 
  children,
  userId
}: { 
  children: ReactNode;
  userId?: string;
}) {
  // 使用共享的日志hook
  const logHook = useLogContext();
  
  // 使用hook获取基础zkLogin功能，并传入日志回调函数
  const {
    zkLoginAddress,
    ephemeralKeypair,
    isInitialized,
    error: zkLoginError,
    loading: zkLoginLoading,
    jwt: zkLoginJwt,
    initializeZkLogin,
    clearZkLoginState,
    log
  } = useZkLoginHook(userId);

  // 合成状态
  const [state, setState] = useState<ZkLoginState>({
    zkLoginAddress,
    ephemeralKeypair,
    isInitialized,
    error: zkLoginError,
    loading: zkLoginLoading,
    jwt: zkLoginJwt,
    status: zkLoginLoading ? 'initializing' : (isInitialized ? 'ready' : 'idle'),
    partialSignature: AppStorage.getZkLoginPartialSignature()
  });

  // 当各子状态更新时更新总状态
  useEffect(() => {
    setState({
      zkLoginAddress,
      ephemeralKeypair,
      isInitialized,
      error: zkLoginError,
      loading: zkLoginLoading,
      jwt: zkLoginJwt,
      status: zkLoginLoading ? 'initializing' : (isInitialized ? 'ready' : 'idle'),
      partialSignature: AppStorage.getZkLoginPartialSignature()
    });
  }, [
    zkLoginAddress,
    ephemeralKeypair,
    isInitialized,
    zkLoginError,
    zkLoginLoading,
    zkLoginJwt
  ]);

  // 准备zkLogin（创建临时密钥对）- 不包含OAuth重定向逻辑
  const prepareZkLogin = async (): Promise<string> => {
    try {
      // 强制创建新的临时密钥对
      const generatedNonce = await initializeZkLogin(true);
      if (!generatedNonce) {
        logHook.addLog("无法继续：临时密钥对创建失败");
        throw new Error("临时密钥对创建失败");
      }

      logHook.addLog(`zkLogin准备完成，nonce: ${generatedNonce}`);
      
      // 保存OAuth流程中使用的原始参数，以便后续ZK证明验证使用
      const updatedEphemeralData = AppStorage.getEphemeralKeypair();
      if (updatedEphemeralData) {
        AppStorage.setZkLoginOriginalNonce(updatedEphemeralData.nonce);
        AppStorage.setZkLoginOriginalMaxEpoch(updatedEphemeralData.maxEpoch.toString());
        AppStorage.setZkLoginOriginalRandomness(JSON.stringify(updatedEphemeralData.randomness));
      }
      
      return generatedNonce;
    } catch (err: any) {
      logHook.addLog(`准备zkLogin失败: ${err.message}`);
      throw err;
    }
  };

  // // 处理JWT - 拆分自身份验证流程
  // const processJwt = async (jwt: string): Promise<ZkLoginProcessResult> => {
  //   try {
  //     addLog("开始处理JWT...");
  //     const result = await ZkLoginService.processJwt(jwt);
  //     addLog(`JWT处理成功，地址: ${result.zkLoginAddress}`);
  //     await handleZkLoginAddress(result.zkLoginAddress);
  //     return result;
  //   } catch (error: any) {
  //     // 提取更详细的错误信息
  //     const errorDetails = error.responseText
  //       ? `错误响应: ${error.responseText.substring(0, 100)}...`
  //       : error.message;
      
  //     addLog(`处理JWT失败: ${errorDetails}`);
      
  //     // 如果错误包含"Unexpected token '<'"，可能是API返回了HTML而非JSON
  //     if (error.message.includes("Unexpected token '<'") || error.message.includes("<!DOCTYPE")) {
  //       addLog("API返回了HTML而不是JSON，可能是服务器配置问题或API端点错误");
  //     }
      
  //     throw error;
  //   }
  // };

  // 清除状态
  const clearState = (): void => {
    clearZkLoginState();
    
    // 手动重置所有会话状态
    AppStorage.clearSessionStorage();
    
    logHook.addLog("已完全清除zkLogin状态");
  };

  const value: ZkLoginContextType = {
    state,
    prepareZkLogin,
    // processJwt,
    clearState,
    logs: logHook.logs,
    addLog: logHook.addLog,
    clearLogs: logHook.clearLogs
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