"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { jwtDecode } from 'jwt-decode';

export default function AuthCallback() {
  const [status, setStatus] = useState('处理登录...');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // 1. 检查URL hash中的id_token
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const idToken = hashParams.get("id_token");

        if (idToken) {
          setStatus('已获取身份令牌，正在处理...');
          console.log("获取到ID Token，长度:", idToken.length);
          
          try {
            const decoded = jwtDecode(idToken);
            console.log("解码的Google ID Token:", decoded);
          } catch (e) {
            console.error("解码令牌失败:", e);
          }
          
          // 2. 发送JWT到主应用进行处理
          if (typeof window !== 'undefined') {
            // 将JWT存储在sessionStorage中，以便主页可以获取
            sessionStorage.setItem('pending_jwt', idToken);
            // 重置已处理标志，确保JWT能被处理
            sessionStorage.removeItem('jwt_already_processed');
            sessionStorage.removeItem('has_checked_jwt');
            
            // 通过消息触发处理 - 虽然这里可能不会被接收，但作为备份机制
            window.postMessage({ type: 'JWT_RECEIVED', jwt: idToken }, window.location.origin);
            
            setStatus('身份验证完成，正在重定向...');
            
            // 3. 重定向到指定页面
            setTimeout(() => {
              router.push(redirectPath);
            }, 500);
          }
        } else {
          // 如果没有找到id_token，可能是常规Supabase登录，等待会话
          setStatus('没有找到OAuth令牌，尝试获取会话...');
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            throw error;
          }
          
          if (data.session) {
            setStatus('已获取会话，正在重定向...');
            router.push(redirectPath);
          } else {
            setStatus('无法获取有效的认证信息');
            setTimeout(() => {
              router.push('/sign-in');
            }, 2000);
          }
        }
      } catch (error) {
        console.error('处理认证回调时出错:', error);
        setStatus(`认证失败: ${error instanceof Error ? error.message : String(error)}`);
        
        setTimeout(() => {
          router.push('/sign-in');
        }, 2000);
      }
    };

    handleAuth();
  }, [router, redirectPath]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-white max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">认证处理</h1>
        <div className="flex items-center space-x-3 mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-400 border-t-transparent"></div>
          <p>{status}</p>
        </div>
      </div>
    </div>
  );
}
