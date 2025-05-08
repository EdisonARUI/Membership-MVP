"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useAuth } from '@/contexts/AuthContext';
import { useLog } from '@/hooks/useLog';
import { LogDisplay } from '@/components/debug/LogDisplay';
import { ZkLoginService } from '@/utils/zkLoginService';

export default function AuthCallback() {
  const [status, setStatus] = useState('处理登录...');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const { addLog } = useLog();
  const { completeAuthentication } = useAuth();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSupabaseSignInWithIdToken = async () => {
    setStatus('开始处理认证回调...');

    try {
      // 获取hash中的id_token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      addLog("获取到hash参数");

      const idToken = hashParams.get("id_token");
      if (!idToken) {
        throw new Error("未找到id_token");
      }
      
      setStatus('已获取身份令牌，正在处理...');
      addLog("获取到id_token, 开始处理");
      
      // 1. 处理Supabase登录
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      
      if (error) {
        addLog(`Supabase授权错误: ${error.message}`);
        router.push(`/?error=auth_failed`);
        return;
      }
      
      addLog("Supabase登录成功");
      setStatus('Supabase登录成功，处理zkLogin...');
      
      // 2. 处理 zkLogin
      const zkLoginResult = await ZkLoginService.processJwt(idToken);
      addLog(`zkLogin处理成功，地址: ${zkLoginResult.zkLoginAddress}`);
      
      setStatus('zkLogin处理成功，完成认证...');
      
      // 3. 完成认证流程 - 链上认证和保存用户关联
      await completeAuthentication(zkLoginResult);
      
      // 4. 重定向到目标页面
      addLog(`认证完成，重定向到: ${redirectPath}`);
      router.push(redirectPath);
    } catch (error: any) {
      console.error('处理认证回调时出错:', error);
      setStatus(`认证失败: ${error.message}`);
      addLog(`认证失败: ${error.message}`);
      
      // 5秒后重定向回首页
      setTimeout(() => {
        router.push('/?error=auth_failed');
      }, 5000);
    }
  }

  useEffect(() => {
    addLog("认证回调页面初始化");
    handleSupabaseSignInWithIdToken();
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-white max-w-md w-full mb-8">
        <h1 className="text-2xl font-bold mb-4">认证处理</h1>
        <div className="flex items-center space-x-3 mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-400 border-t-transparent"></div>
          <p>{status}</p>
        </div>
      </div>
      
      <LogDisplay />
    </div>
  );
}
