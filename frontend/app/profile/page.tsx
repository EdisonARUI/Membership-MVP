"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import ZkLoginProvider from "@/components/zklogin/zklogin";

export default function ProfilePage() {
  const { user, isLoading } = useUser();
  const [jwt, setJwt] = useState<string | null>(null);
  
  // 当用户登录后，如果URL中包含jwt参数，则获取并传递给ZkLogin组件
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const jwtParam = params.get('jwt');
      if (jwtParam) {
        setJwt(jwtParam);
        // 清除URL中的JWT参数
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // 通过window消息传递JWT给ZkLogin组件
        window.postMessage(
          { type: 'JWT_RECEIVED', jwt: jwtParam },
          window.location.origin
        );
      }
    }
  }, []);
  
  if (isLoading) {
    return <div className="text-center p-8">加载中...</div>;
  }
  
  if (!user) {
    return <div className="text-center p-8">请先登录</div>;
  }
  
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">用户信息</h1>
      <div className="mb-6 p-4 bg-slate-800 rounded-lg">
        <p><strong>邮箱:</strong> {user.email}</p>
        <p><strong>用户ID:</strong> {user.id}</p>
      </div>
      
      <h2 className="text-xl font-bold mb-2">Sui 钱包</h2>
      <ZkLoginProvider userId={user.id} autoInitialize={!jwt} />
    </div>
  );
}
