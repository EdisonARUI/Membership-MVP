import { useState, useEffect } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { ZkLoginState, EphemeralKeyPair } from '@/components/zklogin/types';
import { ZkLoginStorage } from '@/utils/storage';
import { SuiService } from '@/utils/sui';
import { saveUserWithWalletAddress } from '@/app/actions';
import { createClient } from '@/utils/supabase/client';

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

  const supabase = createClient();

  // 日志处理
  const log = (message: string) => {
    if (onLog) {
      onLog(message);
    }
  };

  // 初始化临时密钥对
  const initializeZkLogin = async (forceNew: boolean = false): Promise<string | null> => {
    // 如果已有临时密钥对且不强制创建新的
    if (state.ephemeralKeypair && !forceNew) {
      log("使用现有临时密钥对，不需要重新创建");
      return state.ephemeralKeypair.nonce;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      log("开始创建临时密钥对...");
      const keypair = await SuiService.createEphemeralKeyPair();
      ZkLoginStorage.setEphemeralKeypair(keypair);
      setState(prev => ({ 
        ...prev, 
        ephemeralKeypair: keypair,
        isInitialized: true,
        loading: false 
      }));
      log("临时密钥对创建成功");
      return keypair.nonce;
    } catch (error: any) {
      const errorMessage = `准备密钥对失败: ${error.message}`;
      log(errorMessage);
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        loading: false 
      }));
      return null;
    }
  };

  // 处理获取到的zkLogin地址
  const handleZkLoginAddress = async (address: string): Promise<void> => {
    try {
      // 保存到状态
      setState(prev => ({ ...prev, zkLoginAddress: address }));
      ZkLoginStorage.setZkLoginAddress(address);
      log(`zkLogin地址已保存: ${address}`);

      // 激活地址
      try {
        await SuiService.activateAddress(address);
        log("zkLogin地址激活请求已发送");
      } catch (error: any) {
        log(`激活地址失败: ${error.message}`);
      }
    } catch (error: any) {
      log(`处理zkLogin地址时出错: ${error.message}`);
    }
  };

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
    initializeZkLogin,
    handleZkLoginAddress,
    clearZkLoginState,
    log
  };
} 