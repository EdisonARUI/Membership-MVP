import { useState, useEffect } from 'react';
import { ZkLoginState } from '@/components/zklogin/types';
import { ZkLoginStorage } from '@/utils/storage';
import { SuiService } from '@/utils/sui';
import { createClient } from '@/utils/supabase/client';
import { ZkLoginService } from '@/utils/zkLoginService';
import { AppStorage } from '@/utils/storage';
import { AppError } from '@/interfaces/Error';

export function useZkLogin(userId?: string, onLog?: (message: string) => void) {
  // 初始状态
  const [state, setState] = useState<ZkLoginState>({
    zkLoginAddress: ZkLoginStorage.getZkLoginAddress(),
    ephemeralKeypair: ZkLoginStorage.getEphemeralKeypair(),
    isInitialized: false,
    error: null,
    loading: false,
    jwt: null
  });
  
  // 网络连接状态
  const [networkStatus, setNetworkStatus] = useState({
    suiNodeConnected: false,
    apiConnected: false,
    lastChecked: null as Date | null
  });

  const supabase = createClient();

  // 日志处理
  const log = (message: string) => {
    if (onLog) {
      onLog(message);
    }
    // 始终在控制台记录日志，便于调试
    console.log(`[zkLogin] ${message}`);
  };
  
  // 检查网络连接状态
  const checkNetworkStatus = async () => {
    // 检查Sui节点连接
    try {
      const epoch = await SuiService.getCurrentEpoch();
      setNetworkStatus(prev => ({ 
        ...prev, 
        suiNodeConnected: true, 
        lastChecked: new Date() 
      }));
      log(`Sui节点连接正常，当前Epoch: ${epoch}`);
    } catch (error: any) {
      setNetworkStatus(prev => ({ 
        ...prev, 
        suiNodeConnected: false, 
        lastChecked: new Date() 
      }));
      log(`Sui节点连接失败: ${error.message || '未知网络错误'}`);
    }
    
    return networkStatus;
  };

  // 初始化临时密钥对 - 使用服务层方法
  const initializeZkLogin = async (forceNew: boolean = false): Promise<string | null> => {
    // 先检查网络状态
    if (forceNew) {
      await checkNetworkStatus();
    }
    
    // 如果已有临时密钥对且不强制创建新的
    if (state.ephemeralKeypair && !forceNew) {
      log("使用现有临时密钥对，不需要重新创建");
      return state.ephemeralKeypair.nonce;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    log("开始创建临时密钥对...");
    
    try {
      // 调用服务层方法
      const { keypair, nonce } = await ZkLoginService.initialize(forceNew).catch(error => {
        log(`临时密钥对创建失败(内部错误): ${error.message}`);
        console.error("密钥对创建详细错误:", error);
        throw error; // 重新抛出以便外层catch捕获
      });
      
      if (!keypair || !nonce) {
        log("临时密钥对创建失败: 返回结果无效");
        throw new Error("临时密钥对创建失败: 返回结果无效");
      }
      
      log("临时密钥对创建中间步骤成功");
      AppStorage.setEphemeralKeypair(keypair);
      
      setState(prev => ({ 
        ...prev, 
        ephemeralKeypair: keypair,
        isInitialized: true,
        loading: false 
      }));
      
      try {
        log(`临时密钥对创建成功: ${JSON.stringify({
          nonce: keypair.nonce,
          maxEpoch: keypair.maxEpoch,
          hasKeypair: !!keypair.keypair
        })}`);
        
        const recreatekeypair = SuiService.recreateKeypairFromStored(keypair.keypair);
        log("临时密钥对解析地址为: " + recreatekeypair.getPublicKey().toSuiAddress());
      } catch (logError: any) {
        log(`密钥对信息记录错误(非致命): ${logError.message}`);
      }

      return nonce;
    } catch (error: any) {
      const errorMessage = `准备密钥对失败: ${error.message || '未知错误'}`;
      log(errorMessage);
      console.error("临时密钥对创建完整错误:", error);
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        loading: false 
      }));
      return null;
    }
  };

  // 组件加载时检查网络状态
  useEffect(() => {
    checkNetworkStatus().catch(error => {
      console.error("检查网络状态失败:", error);
    });
  }, []);


  // 清除zkLogin状态
  const clearZkLoginState = (): void => {
    ZkLoginStorage.clearAll();
    setState({
      zkLoginAddress: null,
      ephemeralKeypair: null,
      isInitialized: false,
      error: null,
      loading: false,
      jwt: null
    });
    log("已清除zkLogin状态");
  };

  return {
    ...state,
    networkStatus,
    checkNetworkStatus,
    initializeZkLogin,
    clearZkLoginState,
    log
  };
} 