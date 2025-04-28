"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AuthCallback() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const jwt = searchParams.get('jwt') || localStorage.getItem('supabase.auth.token');
    
    if (jwt) {
      // 发送JWT到我们的zkLogin处理逻辑
      window.postMessage({ type: 'JWT_RECEIVED', jwt }, window.location.origin);
    }
  }, [searchParams]);
  
  return <div>处理认证中...</div>;
}
