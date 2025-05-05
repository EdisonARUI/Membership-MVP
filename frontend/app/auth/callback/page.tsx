"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { jwtDecode } from 'jwt-decode';
import { ZkLoginStorage } from '@/utils/storage';
import { saveUserWithWalletAddress } from '@/app/actions';
import { useLog } from '@/hooks/useLog';
import { SuiService } from '@/utils/sui';
import { contractService } from '@/utils/contractService';
import { LogDisplay } from '@/components/debug/LogDisplay';
import { ZkLoginService } from '@/utils/zkLoginService';

export default function AuthCallback() {
  const [status, setStatus] = useState('处理登录...');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const { logs, addLog, clearLogs } = useLog();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 尝试保存zkLogin地址的函数
  const trySaveZkLoginAddress = async () => {
    console.log("=== 开始执行 trySaveZkLoginAddress ===");
    addLog("call trySaveZkLoginAddress ");
    try {
      const zkLoginAddress = ZkLoginStorage.getZkLoginAddress();
      console.log("获取到的zkLogin地址:", zkLoginAddress);
      if (!zkLoginAddress) {
        addLog("未找到zkLogin地址，跳过保存");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      console.log("获取到的用户信息:", user);
      if (!user) {
        addLog("未找到用户信息，跳过保存zkLogin地址");
        return;
      }

      // 尝试执行链上认证
      console.log("开始执行链上认证...");
      await registerOnChain(zkLoginAddress, user.id);

      addLog("尝试保存zkLogin地址到数据库...");
      await saveUserWithWalletAddress(user.id, zkLoginAddress);
      addLog("zkLogin地址保存成功");
    } catch (error: any) {
      console.error("trySaveZkLoginAddress 执行失败:", error);
      addLog(`保存zkLogin地址失败: ${error.message}`);
    }
  };

  // 链上认证
  const registerOnChain = async (address: string, userId: string) => {
    addLog("call registerOnChain ");

    try {
      const ephemeralKeypair = ZkLoginStorage.getEphemeralKeypair();
      if (!ephemeralKeypair) {
        addLog("找不到临时密钥对，无法完成链上认证");
        return;
      }

      // 重建密钥对
      const keypair = SuiService.recreateKeypairFromStored(ephemeralKeypair.keypair);
      
      // 检查是否已经认证
      const verificationResult = await contractService.isAddressVerified(address);
      if (verificationResult.verified) {
        addLog("zkLogin地址已在链上认证，跳过认证");
        return;
      }

      // 1. 注册zkLogin地址
      setStatus('链上认证: 注册zkLogin地址...');
      addLog("开始链上认证: 注册zkLogin地址...");
      const registerResult = await contractService.registerZkLoginAddress(keypair);
      
      if (!registerResult.success) {
        throw new Error(`注册zkLogin地址失败: ${registerResult.error}`);
      }
      
      addLog(`zkLogin地址注册成功，交易ID: ${registerResult.txId}`);

      // 2. 绑定钱包地址与用户ID
      setStatus('链上认证: 绑定钱包地址...');
      addLog("绑定钱包地址与用户ID...");
      const bindResult = await contractService.bindWalletAddress(keypair, userId);
      
      if (!bindResult.success) {
        throw new Error(`绑定钱包地址失败: ${bindResult.error}`);
      }
      
      addLog(`钱包地址绑定成功，交易ID: ${bindResult.txId}`);
      setStatus('链上认证完成');
      
      // 将交易哈希保存到本地存储，以便后续查询
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_tx_hash', bindResult.txId || '');
      }
      
      return true;
    } catch (error: any) {
      addLog(`链上认证失败: ${error.message}`);
      setStatus(`链上认证失败: ${error.message}`);
      return false;
    }
  };
  const handleSupabaseSignInWithIdToken = async () => {
    setStatus('开始处理supabase sign in with id_token...');

    try {
      // 获取hash中的id_token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      addLog("hashParams:" + hashParams);

      const idToken = hashParams.get("id_token");
      addLog("idToken:" + idToken);
      if (idToken) {
        setStatus('已获取身份令牌，正在处理...');
        addLog("获取到id_token:" + idToken);
        const payload = ZkLoginService.parseJwt(idToken);
        addLog("获取到payload nonce:" + payload.nonce);
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
          // nonce: payload.nonce,
        });
        if (error) {
          addLog(`授权错误: ${error}`);
          // 重定向到/?error=auth_failed
          router.push(`/?error=auth_failed`);
        }
    
        const jwt = (data as any)?.id_token;
        addLog("获取到jwt:" + jwt);

        if (jwt) {
          // 重定向回原始页面，并带上 JWT
          addLog("重定向回原始页面，并带上 JWT:" + jwt);
          router.push(`${redirectPath}?jwt=${jwt}`);
          
        }
        else {
          addLog("没有获取到jwt");
          // 重定向到/?error=auth_failed
          router.push(`/?error=auth_failed`);
        }
      }
    } catch (error) {
      console.error('处理认证回调时出错:', error);
      setStatus(`认证失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const handleAuth = async () => {
    try {
      // 1. 检查URL hash中的id_token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const idToken = hashParams.get("id_token");

      if (idToken) {
        setStatus('已获取身份令牌，正在处理...');
        addLog("获取到ID Token，长度:" + idToken.length);
        
        try {
          const decoded = jwtDecode(idToken);
          addLog("解码的Google ID Token:" + JSON.stringify(decoded));
        } catch (e) {
          addLog("解码令牌失败:" + e);
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
          
          setStatus('身份验证完成，正在处理链上认证...');
          
          // 在重定向前尝试保存zkLogin地址
          await trySaveZkLoginAddress();
          
          // 3. 重定向到指定页面
          setStatus('认证完成，正在重定向...');
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
          setStatus('已获取会话，正在处理链上认证...');
          // 在重定向前尝试保存zkLogin地址
          await trySaveZkLoginAddress();
          setStatus('认证完成，正在重定向...');
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

  useEffect(() => {
    addLog("call AuthCallback useEffect");
    
    // handleAuth();
    handleSupabaseSignInWithIdToken();
  }, [router, redirectPath, addLog]);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-white max-w-md w-full mb-8">
        <h1 className="text-2xl font-bold mb-4">认证处理</h1>
        <div className="flex items-center space-x-3 mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-400 border-t-transparent"></div>
          <p>{status}</p>
        </div>
      </div>
      
      <LogDisplay logs={logs} onClearLogs={clearLogs} />
    </div>
  );
}
