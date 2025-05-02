import { useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, Wallet, User, LogOut } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/utils/supabase/client";
import { useLog } from "@/hooks/useLog";
import { useZkLogin } from "@/contexts/ZkLoginContext";

interface HeaderProps {
  onRechargeClick: () => void;
  onSubscriptionManagementClick: () => void;
}

export function Header({ onRechargeClick, onSubscriptionManagementClick }: HeaderProps) {
  const { user } = useUser();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { addLog } = useLog();
  const supabase = createClient();
  const { handleGoogleAuth, zkLoginAddress, loading } = useZkLogin();

  const handleZkLogin = async () => {
    try {
      addLog("开始zkLogin流程...");
      await handleGoogleAuth();
    } catch (error: any) {
      console.error("zkLogin失败:", error);
      addLog(`zkLogin失败: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      addLog("开始退出登录...");
      if (typeof window !== 'undefined') {
        localStorage.removeItem('zkLogin_ephemeral');
        localStorage.removeItem('zkLogin_address');
        localStorage.removeItem('zkLogin_proof');
        localStorage.removeItem('zkLogin_signature');
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      addLog("已成功退出登录");
      window.location.reload();
    } catch (error: any) {
      console.error("退出登录失败:", error);
      addLog(`退出登录失败: ${error.message}`);
    }
  };

  return (
    <header className="w-full py-4 px-8 border-b border-slate-700">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 text-xl font-bold">
          <Sparkles className="h-6 w-6 text-yellow-400" />
          <span>会员订阅</span>
        </Link>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <button 
                onClick={onRechargeClick}
                className="px-4 py-2 text-white hover:text-yellow-400 transition-colors flex items-center"
              >
                <Wallet className="h-4 w-4 mr-1" />
                充值
              </button>
              
              <button 
                onClick={onSubscriptionManagementClick}
                className="px-4 py-2 text-white hover:text-yellow-400 transition-colors"
              >
                我的订阅
              </button>
              
              <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-600 hover:border-yellow-400 transition-colors"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt={user.user_metadata?.full_name || "用户头像"} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-white">
                      {(user.email || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg py-2 shadow-xl border border-slate-700 z-50">
                    <div className="px-4 py-2 border-b border-slate-700">
                      <p className="text-sm font-medium text-white truncate">
                        {user.user_metadata?.full_name || user.email}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    
                    <Link 
                      href="/profile"
                      className="block px-4 py-2 text-sm text-white hover:bg-slate-700 transition-colors"
                    >
                      <User className="h-4 w-4 inline-block mr-2" />
                      个人中心
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                    >
                      <LogOut className="h-4 w-4 inline-block mr-2" />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button 
                onClick={handleZkLogin}
                disabled={loading}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center"
              >
                {loading ? "处理中..." : "zkLogin"}
              </button>
              <Link 
                href="/sign-in"
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg transition-colors"
              >
                登录
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
} 