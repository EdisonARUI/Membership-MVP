/**
 * Header component provides the main navigation bar for the application.
 * It displays user authentication status, navigation links, and quick actions for recharge, subscription, and lottery.
 *
 * Features:
 * - Displays user info and avatar when logged in
 * - Provides login/logout functionality
 * - Navigation to recharge, subscription management, and lottery
 * - Integrates with AuthContext, ZkLoginContext, and DepositContext
 */
import { useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, Wallet, User, LogOut, Gift, CreditCard } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/utils/supabase/client";
import { useLogContext } from '@/contexts/LogContext';
import { useZkLogin } from "@/contexts/ZkLoginContext";
import { useAuth } from "@/contexts/AuthContext";
import LotteryDialog from "../lottery/LotteryDialog";
import { FcGoogle } from "react-icons/fc";
import { useDeposit } from "@/contexts/DepositContext";
import { AppStorage } from "@/utils/StorageService";

/**
 * Props for Header component
 */
interface HeaderProps {
  /**
   * Callback for recharge button click
   */
  onRechargeClick: () => void;
  /**
   * Callback for subscription management button click
   */
  onSubscriptionManagementClick: () => void;
}

/**
 * Header component for main navigation and user actions
 *
 * @param {HeaderProps} props - Component props
 * @returns {JSX.Element} The rendered header
 */
export function Header({ onRechargeClick, onSubscriptionManagementClick }: HeaderProps) {
  const { user } = useUser();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { addLog } = useLogContext();
  const supabase = createClient();
  
  // Use AuthContext for login logic, ZkLoginContext for state only
  const { handleLogin } = useAuth();
  const { handleLogout } = useAuth();
  const { state } = useZkLogin();
  const { zkLoginAddress, loading } = state;
  
  const [showLotteryDialog, setShowLotteryDialog] = useState(false);
  const { showDepositDialog, setShowDepositDialog } = useDeposit();

  /**
   * Handles lottery button click, opens the lottery dialog
   */
  const handleLotteryClick = () => {
    setShowLotteryDialog(true);
  };

  return (
    <header className="w-full py-4 px-8 border-b border-slate-700">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 text-xl font-bold">
          <Sparkles className="h-6 w-6 text-yellow-400" />
          <span>Membership</span>
        </Link>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <button 
                onClick={() => setShowDepositDialog(true)}
                className="px-4 py-2 text-white hover:text-yellow-400 transition-colors flex items-center"
              >
                <Wallet className="h-4 w-4 mr-1" />
                Recharge
              </button>
              
              <button 
                onClick={onSubscriptionManagementClick}
                className="px-4 py-2 text-white hover:text-yellow-400 transition-colors flex items-center"
              >
                <CreditCard className="h-4 w-4 mr-1" />
                My Subscription
              </button>
              
              <button 
                onClick={handleLotteryClick}
                className="px-4 py-2 text-white hover:text-yellow-400 transition-colors flex items-center"
              >
                <Gift className="h-4 w-4 mr-1" />
                Lottery
              </button>
              
              <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-600 hover:border-yellow-400 transition-colors"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt={user.user_metadata?.full_name || "User Avatar"} 
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
                    
                    {/* <Link 
                      href="/profile"
                      className="block px-4 py-2 text-sm text-white hover:bg-slate-700 transition-colors"
                    >
                      <User className="h-4 w-4 inline-block mr-2" />
                      Profile
                    </Link> */}
                    
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                    >
                      <LogOut className="h-4 w-4 inline-block mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full max-w-sm px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition flex items-center justify-center space-x-3"
              >
                <FcGoogle size={20} />
                <span className="text-sm font-medium text-gray-700">
                  {loading ? "Processing..." : "Continue with Google"}
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