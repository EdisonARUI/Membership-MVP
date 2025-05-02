'use client';

import { useZkLogin } from "@/contexts/ZkLoginContext";

export function ZkLoginStatus() {
  const { zkLoginAddress, loading, error } = useZkLogin();

  if (loading) {
    return (
      <div className="p-4 bg-slate-700 rounded-lg text-white">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
          <span>处理中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/20 rounded-lg text-red-400">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (zkLoginAddress) {
    return (
      <div className="p-4 bg-slate-700 rounded-lg text-white">
        <h3 className="text-lg font-bold">已连接到Sui Devnet</h3>
        <p className="text-sm truncate mt-1">地址: {zkLoginAddress}</p>
      </div>
    );
  }

  // 未登录状态显示引导信息
  return (
    <div className="p-4 bg-slate-700 rounded-lg text-white">
      <h3 className="text-lg font-bold">未连接到Sui网络</h3>
      <p className="text-sm mt-1">点击顶部的"zkLogin"按钮，使用Google账号快速登录并创建Sui钱包。</p>
    </div>
  );
} 