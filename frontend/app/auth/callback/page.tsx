"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr'; // 或 @supabase/auth-helpers-nextjs
import { jwtDecode } from 'jwt-decode';

export default function AuthCallback() {
  const [status, setStatus] = useState('处理登录...');
  const router = useRouter();
  const [idToken, setIdToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const idToken = hashParams.get("id_token");

    if (idToken) {
        const decoded = jwtDecode(idToken); // 解码 Google 返回的 ID Token
        console.log("Decoded Google ID Token:", decoded);
  
        // 发送到你自己的后端
        fetch("/api/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: idToken }),
        });
      }
    }, []);
  
    return <div>Logging in...</div>;
}
