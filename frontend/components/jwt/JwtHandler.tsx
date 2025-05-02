"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useJwtHandler } from '@/hooks/useJwtHandler';
import { useZkLogin } from '@/contexts/ZkLoginContext';
import { useLog } from '@/hooks/useLog';

export default function JwtHandler() {
  const searchParams = useSearchParams();
  const { handleJwtReceived } = useZkLogin();
  const { addLog } = useLog();
  
  // 使用 useJwtHandler
  const { checkUrlForJwt } = useJwtHandler({
    onLog: addLog,
    onAddressGenerated: async (address) => {
      addLog(`JWT处理成功生成地址: ${address}`);
    }
  });
  
  // 从URL参数获取JWT
  useEffect(() => {
    addLog("开始检查URL参数中的JWT...");
    
    // 检查多个可能的JWT来源
    const jwt = searchParams.get('jwt') || 
                searchParams.get('id_token') || 
                localStorage.getItem('supabase.auth.token');
    
    if (jwt) {
      addLog(`从URL参数或localStorage找到JWT，长度: ${jwt.length}`);
      
      // 清除URL中的参数
      if (typeof window !== 'undefined') {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
      
      // 直接通过Context处理JWT
      handleJwtReceived(jwt);
    } else {
      // 检查URL中的其他JWT格式（如hash中的id_token）
      addLog("未在URL参数中找到JWT，检查其他来源...");
      checkUrlForJwt();
    }
  }, [searchParams, handleJwtReceived, checkUrlForJwt, addLog]);
  
  return (
    <div className="flex items-center justify-center p-6">
      <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">处理认证中</h2>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
          <span className="text-white">处理认证信息，请稍候...</span>
        </div>
      </div>
    </div>
  );
}
