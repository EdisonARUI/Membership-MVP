import { useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, Wallet, User, LogOut, Gift } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/utils/supabase/client";
import { useLog } from "@/hooks/useLog";
import { useZkLogin } from "@/contexts/ZkLoginContext";
import { useAuth } from "@/contexts/AuthContext";
import LotteryDialog from "../lottery/LotteryDialog";
import { FcGoogle } from "react-icons/fc";

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
  
  // 使用AuthContext处理登录逻辑，ZkLoginContext只用于状态获取
  const { handleLogin } = useAuth();
  const { state } = useZkLogin();
  const { zkLoginAddress, loading } = state;
  
  const [showLotteryDialog, setShowLotteryDialog] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      addLog("开始Google登录流程...");
      // 调用AuthContext的handleLogin方法
      await handleLogin();
    } catch (error: any) {
      addLog(`Google登录失败: ${error.message}`);
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
        
        sessionStorage.removeItem('jwt_already_processed');
        sessionStorage.removeItem('has_checked_jwt');
        sessionStorage.removeItem('pending_jwt');
        sessionStorage.removeItem('oauth_state');
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      addLog("已成功退出登录");
      window.location.reload();
    } catch (error: any) {
      addLog(`退出登录失败: ${error.message}`);
    }
  };

  const handleLotteryClick = () => {
    setShowLotteryDialog(true);
  };

  return (
    <header className="w-full py-4 px-8 border-b border-slate-700">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 text-xl font-bold">
          <Sparkles className="h-6 w-6 text-yellow-400" />
          <span>FREEHOME</span>
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
              
              <button 
                onClick={handleLotteryClick}
                className="px-4 py-2 text-white hover:text-yellow-400 transition-colors flex items-center"
              >
                <Gift className="h-4 w-4 mr-1" />
                抽奖
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
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full max-w-sm px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition flex items-center justify-center space-x-3"
              >
                <FcGoogle size={20} />
                <span className="text-sm font-medium text-gray-700">
                  {loading ? "处理中..." : "Continue with Google"}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
      
      {showLotteryDialog && (
        <LotteryDialog 
          isOpen={showLotteryDialog} 
          onClose={() => setShowLotteryDialog(false)}
        />
      )}
    </header>
  );
} 