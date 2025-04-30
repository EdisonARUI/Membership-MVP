"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function PopupCallback() {
  const [message, setMessage] = useState<string>("处理授权中，请稍候...");
  
  useEffect(() => {
    // 防止页面重定向到其他地方
    const hash = window.location.hash;
    if (hash !== '#noredirect') {
      window.location.hash = '#noredirect';
    }
    
    async function handleCallback() {
      try {
        setMessage("正在获取认证信息...");
        const supabase = createClient();
        
        // 先检查URL中的session
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        
        if (code) {
          // 交换code获取session和token
          setMessage("正在交换会话令牌...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('授权错误:', error);
            setMessage(`授权失败: ${error.message}`);
            window.opener?.postMessage({ 
              type: 'AUTH_ERROR', 
              error: error.message 
            }, window.location.origin);
            return;
          }
          
          // 获取JWT
          if (data.session?.provider_token) {
            setMessage("成功获取令牌，正在传递回主页面...");
            console.log("获取到provider_token", data.session.provider_token.substring(0, 20) + "...");
            
            // 发送JWT回主窗口并保存成功标志
            window.opener?.postMessage({
              type: 'AUTH_POPUP_RESPONSE',
              jwt: data.session.provider_token
            }, window.location.origin);
            
            // 保存成功标志，防止重定向导致的中断
            localStorage.setItem('auth_success', 'true');
            
            // 延迟关闭窗口，确保消息已发送
            setTimeout(() => {
              setMessage("授权成功，窗口即将关闭...");
              window.close();
            }, 1000);
          } else {
            setMessage("无法获取授权令牌");
            window.opener?.postMessage({ 
              type: 'AUTH_ERROR', 
              error: "Provider token not found" 
            }, window.location.origin);
          }
        } else {
          // 可能是重定向后回来的，检查localStorage
          if (localStorage.getItem('auth_success') === 'true') {
            setMessage("授权已成功，窗口即将关闭...");
            setTimeout(() => window.close(), 1000);
          } else {
            setMessage("未收到授权码");
          }
        }
      } catch (err: any) {
        console.error('处理回调错误:', err);
        setMessage(`处理回调时出错: ${err.message}`);
      }
    }
    
    handleCallback();
    
    // 阻止页面自动重定向
    const preventRedirect = (e: BeforeUnloadEvent) => {
      if (!localStorage.getItem('auth_success')) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', preventRedirect);
    return () => window.removeEventListener('beforeunload', preventRedirect);
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-900 text-white">
      <h1 className="text-xl font-bold mb-4">Google 授权</h1>
      <p className="text-center">{message}</p>
      <button 
        onClick={() => window.close()} 
        className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded"
      >
        关闭窗口
      </button>
    </div>
  );
}
