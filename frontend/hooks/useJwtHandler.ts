import { useState, useEffect } from 'react';
import { parseJwt, fetchUserSalt, fetchZkProof } from '@/utils/zkProof';
import { SuiService } from '@/utils/sui';
import { ZkLoginStorage } from '@/utils/storage';
import { ZkProofResult } from '@/components/zklogin/types';

interface UseJwtHandlerProps {
  onLog?: (message: string) => void;
  onAddressGenerated?: (address: string) => Promise<void>;
}

export function useJwtHandler({ onLog, onAddressGenerated }: UseJwtHandlerProps = {}) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jwtProcessed, setJwtProcessed] = useState<boolean>(
    () => typeof window !== 'undefined' ? ZkLoginStorage.getJwtProcessed() : false
  );
  
  const log = (message: string) => {
    console.log(message);
    if (onLog) {
      onLog(message);
    }
  };

  // 处理JWT核心逻辑
  const handleJwtReceived = async (jwt: string): Promise<boolean> => {
    if (jwtProcessed) {
      log("JWT已经处理过，跳过");
      return true;
    }

    const ephemeralKeypair = ZkLoginStorage.getEphemeralKeypair();
    if (!ephemeralKeypair) {
      const error = "找不到临时密钥对，请重新开始";
      log(error);
      setError(error);
      return false;
    }

    setProcessing(true);
    setError(null);

    try {
      log(`开始处理JWT，长度: ${jwt.length}`);
      
      // 1. 解析JWT
      const payload = parseJwt(jwt);
      log(`JWT解析成功: sub=${payload.sub}, iss=${payload.iss}`);

      // 2. 获取用户salt
      const userSalt = await fetchUserSalt(jwt);
      log(`获取用户salt成功: ${userSalt.substring(0, 10)}...`);

      // 3. 计算zkLogin地址
      const address = SuiService.deriveZkLoginAddress(jwt, userSalt);
      log(`计算zkLogin地址成功: ${address}`);

      // 4. 获取扩展的临时公钥
      const extendedEphemeralPublicKey = SuiService.getExtendedPublicKey(ephemeralKeypair.keypair as any);
      log(`获取扩展的临时公钥成功`);

      // 5. 获取zkProof
      const proofResponse = await fetchZkProof({
        jwt,
        extendedEphemeralPublicKey,
        jwtRandomness: ephemeralKeypair.randomness,
        maxEpoch: ephemeralKeypair.maxEpoch,
        salt: userSalt,
        keyClaimName: 'sub',
        oauthProvider: 'google'
      });

      // 6. 保存地址和证明
      ZkLoginStorage.setZkLoginProof(proofResponse);
      log(`zkProof已保存`);
      
      // 7. 调用钩子函数处理地址
      if (onAddressGenerated) {
        await onAddressGenerated(address);
      }

      // 8. 标记JWT已处理
      ZkLoginStorage.setJwtProcessed(true);
      setJwtProcessed(true);
      
      // 9. 清理sessionStorage中的pending_jwt
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pending_jwt');
      }
      
      log("JWT处理完成");
      return true;
    } catch (error: any) {
      const errorMessage = `处理JWT失败: ${error.message}`;
      log(errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // 检查JWT来源 - 增强版
  const checkUrlForJwt = (): void => {
    if (typeof window === 'undefined' || jwtProcessed || ZkLoginStorage.getHasCheckedJwt()) {
      return;
    }

    ZkLoginStorage.setHasCheckedJwt(true);
    log(`检查JWT来源...`);

    // 1. 检查sessionStorage中的pending_jwt
    const pendingJwt = sessionStorage.getItem('pending_jwt');
    if (pendingJwt) {
      log(`在sessionStorage中找到pending_jwt: ${pendingJwt.substring(0, 15)}...`);
      
      // 处理JWT
      handleJwtReceived(pendingJwt).catch(err => {
        log(`处理sessionStorage中的JWT失败: ${err.message}`);
      });
      return;
    }
    
    // 2. 检查URL查询参数中的id_token (适用于某些OAuth流程)
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get('id_token');
    if (queryToken) {
      log(`在URL查询参数中找到id_token: ${queryToken.substring(0, 15)}...`);
      
      // 清除URL中的参数
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // 处理JWT
      handleJwtReceived(queryToken).catch(err => {
        log(`处理URL查询参数中的JWT失败: ${err.message}`);
      });
      return;
    }

    // 3. 检查URL hash中的id_token (适用于某些OAuth流程)
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const idToken = hashParams.get('id_token');
      
      if (idToken) {
        log(`在URL hash中找到id_token: ${idToken.substring(0, 15)}...`);
        
        // 清除URL中的hash
        const newUrl = window.location.pathname + window.location.search;
        window.history.replaceState({}, document.title, newUrl);
        
        // 处理JWT
        handleJwtReceived(idToken).catch(err => {
          log(`处理URL hash中的JWT失败: ${err.message}`);
        });
        return;
      } else {
        log(`URL hash中未找到id_token`);
      }
    }
    
    log(`未找到任何JWT来源`);
  };

  // 页面加载时自动检查JWT
  useEffect(() => {
    if (!jwtProcessed) {
      checkUrlForJwt();
    }
  }, [jwtProcessed]);

  return {
    processing,
    error,
    jwtProcessed,
    handleJwtReceived,
    checkUrlForJwt
  };
} 