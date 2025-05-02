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
    console.log(message);
    if (onLog) {
      onLog(message);
    }
  };

  // 初始化临时密钥对
  const initializeZkLogin = async (): Promise<string | null> => {
    if (state.ephemeralKeypair) {
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

      // 获取用户ID，优先使用传入的userId
      let currentUserId = userId;
      
      if (!currentUserId) {
        log("尝试从Supabase获取用户ID");
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data: userData } = await supabase.auth.getUser();
            if (userData && userData.user) {
              currentUserId = userData.user.id;
              log(`从Supabase获取到用户ID: ${currentUserId.substring(0, 8)}...`);
            }
          }
        } catch (error: any) {
          log(`获取Supabase用户ID失败: ${error.message}`);
        }
      }

      // 如果有用户ID，保存钱包地址到数据库
      if (currentUserId) {
        try {
          await saveUserWithWalletAddress(currentUserId, address);
          log("钱包地址已保存到数据库");
        } catch (error: any) {
          log(`保存钱包地址到数据库失败: ${error.message}`);
        }
      }

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