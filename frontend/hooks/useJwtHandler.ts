import { useState, useEffect } from 'react';
import { ZkLoginStorage } from '@/utils/storage';
import { ZkLoginService } from '@/utils/zkLoginService';

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
    if (onLog) {
      onLog(message);
    }
  };

  // 处理JWT核心逻辑 - 使用服务层方法
  const handleJwtReceived = async (jwt: string): Promise<boolean> => {
    // 添加调试日志
    const currentProcessedState = ZkLoginStorage.getJwtProcessed();
    log(`JWT处理开始，当前处理状态: ${currentProcessedState ? '已处理' : '未处理'}`);
    
    if (jwtProcessed) {
      log("JWT已经处理过，跳过");
      return true;
    }

    setProcessing(true);
    setError(null);

    try {
      log(`开始处理JWT，长度: ${jwt.length}`);
      
      // 调用服务层方法处理JWT
      const result = await ZkLoginService.processJwt(jwt);
      
      log(`JWT处理成功，地址: ${result.zkLoginAddress}`);
      
      // 调用钩子函数处理地址
      if (onAddressGenerated) {
        await onAddressGenerated(result.zkLoginAddress);
      }

      // 更新状态
      setJwtProcessed(true);
      
      // 清理sessionStorage中的pending_jwt
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