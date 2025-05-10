import { useCallback } from 'react';
import { ZkLoginStorage } from '@/utils/StorageService';
import { SuiService } from '@/utils/SuiService';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { PartialZkLoginSignature } from '@/interfaces/ZkLogin';
import { useLogContext } from '@/contexts/LogContext';

/**
 * zkLogin参数管理Hook
 * 提供获取和验证zkLogin所需参数的方法
 */
export function useZkLoginParams() {
  const { addLog } = useLogContext();

  /**
   * 准备临时密钥对
   * @returns 临时密钥对或null
   */
  const prepareKeypair = useCallback((): Ed25519Keypair | null => {
    const ephemeralKeypairData = ZkLoginStorage.getEphemeralKeypair();
    if (!ephemeralKeypairData) {
      addLog("找不到临时密钥对，无法完成操作");
      return null;
    }

    // 重建密钥对
    try {
      return SuiService.recreateKeypairFromStored(ephemeralKeypairData.keypair);
    } catch (error: any) {
      addLog(`重建密钥对失败: ${error.message}`);
      return null;
    }
  }, [addLog]);

  /**
   * 获取zkLogin所需的所有参数
   * @returns zkLogin参数对象或null
   */
  const getZkLoginParams = useCallback(() => {
    // 获取zkLogin地址
    const zkLoginAddress = ZkLoginStorage.getZkLoginAddress();
    if (!zkLoginAddress) {
      addLog("未找到zkLogin地址");
      return null;
    }

    // 获取部分签名
    const partialSignature = ZkLoginStorage.getZkLoginPartialSignature();
    if (!partialSignature) {
      addLog("未找到zkLogin部分签名");
      return null;
    }

    // 获取用户盐值
    const userSalt = ZkLoginStorage.getZkLoginUserSalt();
    if (!userSalt) {
      addLog("未找到用户盐值");
      return null;
    }

    // 获取解码的JWT
    const decodedJwt = ZkLoginStorage.getDecodedJwt();
    if (!decodedJwt) {
      addLog("未找到解码的JWT");
      return null;
    }

    // 验证所有参数都已获取
    return {
      zkLoginAddress,
      partialSignature,
      userSalt,
      decodedJwt
    };
  }, [addLog]);

  /**
   * 验证参数有效性
   * @param address zkLogin地址
   * @param userId 用户ID
   * @returns 是否有效
   */
  const validateParams = useCallback((address: string, userId: string): boolean => {
    addLog(`验证参数 - 用户ID: ${userId}, 类型: ${typeof userId}`);
    addLog(`验证参数 - zkLogin地址: ${address}`);

    if (!address || !address.startsWith('0x')) {
      addLog("错误: 无效的zkLogin地址格式");
      return false;
    }

    if (!userId) {
      addLog("错误: 无效的用户ID");
      return false;
    }

    return true;
  }, [addLog]);

  return {
    prepareKeypair,
    getZkLoginParams,
    validateParams
  };
} 