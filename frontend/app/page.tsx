"use client";

import { useEffect, useState, useRef } from "react";
import { Check, Sparkles, Zap, Shield, CreditCard, Calendar, RefreshCw, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useUser } from "@/hooks/use-user";
import ZkLoginProvider from "@/components/zklogin/zklogin";
import { generateNonce, generateRandomness } from "@mysten/sui/zklogin";
import { SuiClient } from "@mysten/sui/client";
import { useLog } from "@/hooks/useLog";
import { useRecharge } from "@/hooks/useRecharge";
import { useSuiPrice } from "@/hooks/useSuiPrice";
import { RechargeDialog } from "@/components/wallet/RechargeDialog";
import { PlanCard } from "@/components/subscription/PlanCard";
import { LogDisplay } from "@/components/debug/LogDisplay";

const FULLNODE_URL = 'https://fullnode.devnet.sui.io';
const suiClient = new SuiClient({ url: FULLNODE_URL });
const FAUCET_URL = 'https://faucet.devnet.sui.io/v2/gas';

// 订阅计划定义
const plans = [
  {
    name: "月付",
    price: "$35",
    period: "monthly",
    realPrice: 35,
    features: []
  },
  {
    name: "季付",
    price: "$99",
    period: "quarterly",
    realPrice: 99,
    popular: true,
    features: []
  },
  {
    name: "年付",
    price: "$365",
    period: "yearly",
    realPrice: 365,
    features: []
  }
];

// 定义数据类型
type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  is_popular: boolean;
};

type UserSubscription = {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  plan?: SubscriptionPlan;
};

type PaymentTransaction = {
  id: string;
  user_id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
};

type SubscriptionStatusView = {
  id: string;
  user_id: string;
  plan_name: string;
  plan_period: string;
  start_date: string;
  end_date: string;
  status: string;
  auto_renew: boolean;
  is_active: boolean;
};

export default function Home() {
  const supabase = createClient();
  const { user, isLoading } = useUser();
  const { logs, addLog, clearLogs } = useLog();
  const { showRechargeDialog, setShowRechargeDialog, handleRecharge, suiPrice, isLoadingPrice } = useRecharge();
  const { suiPrice: currentSuiPrice, isLoadingPrice: isSuiPriceLoading } = useSuiPrice(addLog);
  
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionStatusView[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<SubscriptionStatusView | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentTransaction[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [confirmCancelDialog, setConfirmCancelDialog] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showSubscriptionManagement, setShowSubscriptionManagement] = useState(false);
  
  // zkLogin 相关状态
  const [jwt, setJwt] = useState<string | null>(null);
  const [ephemeralKeypair, setEphemeralKeypair] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const zkLoginMethods = useRef<any>(null);
  const [zkLoginInitialized, setZkLoginInitialized] = useState(false);
  
  // 用户头像下拉菜单状态
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 当用户登录后，如果URL中包含jwt参数，则获取并传递给ZkLogin组件
  useEffect(() => {
    // 执行JWT检查
    checkForJWT();
    
    // 监听ZKLogin过程中的消息
    const handleZkLoginMessages = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      const { type, data } = event.data || {};
      
      if (type === 'ZK_LOG') {
        addLog(data);
      } else if (type === 'USER_SALT') {
        addLog(`3. User salt管理: ${data}`);
      } else if (type === 'SUI_ADDRESS') {
        addLog(`4. 获取用户的Sui地址: ${data}`);
      } else if (type === 'ZK_PROOF') {
        addLog(`5. 获取零知识证明: 成功`);
      } else if (type === 'JWT_ERROR') {
        addLog(`JWT处理错误: ${data}`);
      } else if (type === 'TOKEN_TYPE_ERROR') {
        addLog(`令牌类型错误: ${data}`);
      }
    };
    
    window.addEventListener('message', handleZkLoginMessages);
    return () => {
      window.removeEventListener('message', handleZkLoginMessages);
      // 在组件卸载时清除会话存储中的检查标记
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('has_checked_jwt');
        // 不要清除jwt_already_processed，以防止在组件重新挂载时重复处理
      }
    };
  }, []);

  // 获取用户订阅
  useEffect(() => {
    if (user) {
      fetchUserSubscriptions();
      fetchPaymentHistory();
    }
  }, [user]);
  
  // 监控zkLogin初始化状态
  useEffect(() => {
    // 定期检查zkLoginMethods是否已初始化
    const checkInterval = setInterval(() => {
      if (!zkLoginInitialized && zkLoginMethods.current) {
        setZkLoginInitialized(true);
        addLog("ZkLogin组件已自动初始化");
        clearInterval(checkInterval);
      }
    }, 500); // 每500ms检查一次
    
    // 如果30秒后仍未初始化，记录警告并停止检查
    const timeout = setTimeout(() => {
      if (!zkLoginInitialized) {
        addLog("警告: ZkLogin组件初始化超时");
        clearInterval(checkInterval);
      }
    }, 30000);
    
    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [zkLoginInitialized]);

  // 处理点击头像外部区域关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const checkForJWT = () => {
    if (typeof window !== 'undefined') {
      // 使用会话存储来跟踪此次页面加载是否已经检查过JWT
      const hasCheckedJWT = sessionStorage.getItem('has_checked_jwt');
      // 检查是否已经处理过JWT (在消息处理期间设置的标记)
      const alreadyProcessed = sessionStorage.getItem('jwt_already_processed');
      
      // 如果已经处理过JWT或已经检查过，则不再进行检查
      if (hasCheckedJWT || alreadyProcessed) {
        return;
      }
      
      // 标记为已检查，避免重复检查
      sessionStorage.setItem('has_checked_jwt', 'true');
      
      // 现在才记录日志，避免每次刷新都记录
  addLog(`0. 尝试获取JWT`);
      
    // 尝试从URL参数和hash片段中获取id_token
    const urlParams = new URLSearchParams(window.location.search);
    let idToken = urlParams.get('id_token');
    
    // 有些情况下token会在hash中而不是query参数
    if (!idToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      idToken = hashParams.get('id_token');
      addLog(`0.1 从hash中获取token`);
    }
    
    if (idToken) {
      addLog(`1. 获取JWT成功: ${idToken.substring(0, 15)}...`);
      
      // 分析JWT/令牌的类型
      if (idToken.startsWith('ya29.')) {
        addLog(`1.1 检测到可能是Google OAuth访问令牌而非JWT (以ya29.开头)`);
      }
      
      if (idToken.includes('.')) {
        addLog(`1.2 令牌包含.分隔符，计数: ${(idToken.match(/\./g) || []).length}个`);
      } else {
        addLog(`1.2 令牌不包含.分隔符，不符合JWT格式`);
      }
      
      // 解析JWT
      try {
        addLog(`2.1 开始解析JWT，长度: ${idToken.length}`);
        const parts = idToken.split('.');
        addLog(`2.2 JWT分割后部分数量: ${parts.length}`);
        
        // 分析每一部分
        parts.forEach((part, index) => {
          addLog(`2.2.${index+1} 第${index+1}部分长度: ${part.length}, 开头内容: ${part.substring(0, Math.min(10, part.length))}...`);
        });
        
        if (parts.length === 3) {
          addLog(`2.3 JWT header: ${parts[0].substring(0, 10)}...`);
          addLog(`2.4 JWT payload(编码): ${parts[1].substring(0, 10)}...`);
          
          try {
            // 进一步检查 base64 解码过程
            addLog(`2.5 尝试解码payload部分...`);
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            addLog(`2.6 转换后的base64: ${base64.substring(0, 10)}...`);
            
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            
            addLog(`2.7 解码JWT payload成功`);
            const payload = JSON.parse(jsonPayload);
            addLog(`2.8 解析JSON成功: ${JSON.stringify(payload).substring(0, 50)}...`);
            addLog(`2.9 解码JWT成功: sub=${payload.sub || '未找到'}, iss=${payload.iss || '未找到'}`);
          } catch (decodeErr) {
            addLog(`2.5 payload解码失败: ${decodeErr}`);
            console.error('JWT payload解码失败:', decodeErr);
          }
        } else {
          addLog(`2.3 JWT格式不正确，应该有3部分但实际有${parts.length}部分`);
          if (parts.length === 2) {
            const [part1, part2] = parts;
            addLog(`2.3.1 分析第1部分: 长度=${part1.length}, 是否像base64编码=${/^[A-Za-z0-9+/=_-]+$/.test(part1)}`);
            addLog(`2.3.2 分析第2部分: 长度=${part2.length}, 是否像base64编码=${/^[A-Za-z0-9+/=_-]+$/.test(part2)}`);
            
            // 检测是否为谷歌访问令牌
            if (part1 === 'ya29' && part2.length > 100) {
              addLog(`2.3.3 这可能是谷歌OAuth2访问令牌(access_token)而不是JWT`);
              addLog(`2.3.4 谷歌OAuth2访问令牌通常不是JWT格式，需要使用不同方法处理`);
            }
          }
        }
      } catch (e) {
        addLog(`2. 解码JWT失败，错误详情: ${e}`);
        console.error('JWT解析出错:', e);
      }
      
      // 尝试直接使用访问令牌获取用户信息
      if (idToken.startsWith('ya29.')) {
        addLog(`3.1 尝试使用Google访问令牌获取用户信息`);
        try {
          // 记录令牌用途
          addLog(`3.2 注意: 如果这是Access Token而非JWT，则应通过Google API使用它`);
        } catch (err) {
          addLog(`3.3 访问令牌处理错误: ${err}`);
        }
      }
      
      // 清除URL中的JWT参数
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // 通过window消息传递JWT给ZkLogin组件
        addLog(`4 过window消息传递JWT给ZkLogin组件`);

      window.postMessage(
        { type: 'JWT_RECEIVED', jwt: idToken },
        window.location.origin
      );
        
        // 设置标记，表示当前会话已经处理过JWT，避免在消息处理过程中因为状态更新导致重复检查
        sessionStorage.setItem('jwt_already_processed', 'true');
    } else {
      addLog(`0.2 URL中未找到id_token参数`);
    }
  }
  };
  // 查询用户订阅
  const fetchUserSubscriptions = async () => {
    try {
      setLoadingSubscriptions(true);
      const { data, error } = await supabase
        .from('user_subscription_status')
        .select('*');

      if (error) throw error;

      setSubscriptions(data || []);

      // 检查是否有活跃订阅
      const active = data?.find(sub => sub.is_active);
      setActiveSubscription(active || null);
    } catch (error) {
      console.error('获取订阅信息失败:', error);
      alert("错误: 获取订阅信息失败");
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  // 查询支付记录
  const fetchPaymentHistory = async () => {
    try {
      setLoadingPayments(true);
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error) {
      console.error('获取支付记录失败:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  // 创建订阅
  const createSubscription = async (planPeriod: string, price: number) => {
    try {
      setLoadingAction(true);
      
      // 1. 获取选择的计划ID
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('period', planPeriod)
        .single();
      
      if (planError) throw planError;
      
      // 2. 计算日期
      const startDate = new Date();
      const endDate = new Date();
      
      switch (planPeriod) {
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quarterly':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
      }
      
      // 3. 创建订阅记录
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user!.id,
          plan_id: planData.id,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: true
        })
        .select()
        .single();
      
      if (subscriptionError) throw subscriptionError;
      
      // 4. 创建支付记录
      const { error: paymentError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: user!.id,
          subscription_id: subscriptionData.id,
          amount: price,
          currency: 'CNY',
          status: 'completed',
          payment_method: 'crypto' // 假设使用加密货币支付
        });
      
      if (paymentError) throw paymentError;
      
      // 5. 刷新数据
      await fetchUserSubscriptions();
      await fetchPaymentHistory();
      
      alert(`订阅成功：您已成功订阅${planPeriod === 'monthly' ? '月付' : planPeriod === 'quarterly' ? '季付' : '年付'}计划`);
      
      setShowPaymentDialog(false);
    } catch (error: any) {
      console.error('创建订阅失败:', error);
      alert(`订阅失败: ${error.message || "创建订阅时发生错误"}`);
    } finally {
      setLoadingAction(false);
    }
  };

  // 更新订阅（切换自动续订状态）
  const toggleAutoRenew = async () => {
    if (!activeSubscription) return;
    
    try {
      setLoadingAction(true);
      
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          auto_renew: !activeSubscription.auto_renew
        })
        .eq('id', activeSubscription.id);
      
      if (error) throw error;
      
      // 刷新数据
      await fetchUserSubscriptions();
      
      alert(activeSubscription.auto_renew ? "已关闭自动续订" : "已开启自动续订");
    } catch (error: any) {
      console.error('更新订阅失败:', error);
      alert(`操作失败: ${error.message || "更新订阅时发生错误"}`);
    } finally {
      setLoadingAction(false);
    }
  };

  // 取消订阅
  const cancelSubscription = async () => {
    if (!activeSubscription) return;
    
    try {
      setLoadingAction(true);
      
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'canceled',
          auto_renew: false
        })
        .eq('id', activeSubscription.id);
      
      if (error) throw error;
      
      // 刷新数据
      await fetchUserSubscriptions();
      
      alert("订阅已取消");
      
      setConfirmCancelDialog(false);
    } catch (error: any) {
      console.error('取消订阅失败:', error);
      alert(`操作失败: ${error.message || "取消订阅时发生错误"}`);
    } finally {
      setLoadingAction(false);
    }
  };

  // 处理订阅点击
  const handleSubscribeClick = (plan: any) => {
    if (!user) {
      // 如果用户未登录，重定向到登录页面
      window.location.href = '/sign-in';
      return;
    }
    
    setSelectedPlan(plan);
    setShowPaymentDialog(true);
  };

  // 处理支付确认
  const handlePaymentConfirm = () => {
    if (selectedPlan) {
      createSubscription(selectedPlan.period, selectedPlan.realPrice);
    }
  };

  // 格式化日期函数（替代date-fns库）
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // 返回 YYYY-MM-DD 格式
  };

  // 修改handleGoogleAuth函数，增加状态检查逻辑
  const handleGoogleAuth = async () => {
    // 同时检查initiateLogin和handleGoogleAuth方法
    if (zkLoginMethods.current && (zkLoginMethods.current.initiateLogin || zkLoginMethods.current.handleGoogleAuth)) {
      try {
        // 清除JWT检查标记，使下次登录时能够正常检查JWT
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('has_checked_jwt');
          sessionStorage.removeItem('jwt_already_processed');
          // 添加登录开始标记，用于重定向回来后检查
          sessionStorage.setItem('login_initiated', 'true');
        }
        
        addLog("开始Google授权流程...");
        
        // 优先使用handleGoogleAuth方法，如果不存在则使用initiateLogin
        if (zkLoginMethods.current.handleGoogleAuth) {
        await zkLoginMethods.current.handleGoogleAuth();
        } else if (zkLoginMethods.current.initiateLogin) {
          await zkLoginMethods.current.initiateLogin();
        }
      } catch (err: any) {
        addLog(`Google授权异常: ${err.message}`);
      }
    } else {
      addLog("ZkLogin组件尚未准备好");
    }
  };

  // 定义检查认证状态的函数
  const checkAuthStatus = async () => {
    const loginInitiated = sessionStorage.getItem('login_initiated');
    
    if (loginInitiated && !user && !isLoading) {
      addLog("检测到登录重定向回来，但用户状态未更新，尝试手动刷新状态...");
      
      // 使用Promise.all和Promise.resolve进行延迟，避免在函数内定义函数
      await Promise.all([
        new Promise(resolve => {
          // 简单延迟2秒
          setTimeout(resolve, 2000);
        })
      ]);
      
      // 延迟后再执行
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data.user) {
          addLog(`延迟获取用户成功: ${data.user.email}`);
          window.location.reload();
        } else {
          addLog("延迟获取用户状态仍然失败，检查登录流程是否完整");
          // 保留标记用于下次检查
        }
    } catch (err: any) {
        addLog(`延迟检查认证状态出错: ${err.message}`);
      }
    } else if (user && loginInitiated) {
      addLog(`用户${user.email}登录成功，状态已更新`);
      sessionStorage.removeItem('login_initiated');
    }
  };

  // 在useEffect中添加登录重定向后的状态检查
  useEffect(() => {
    checkAuthStatus();
  }, [user, isLoading]);

  // 修改handleRecharge函数以匹配RechargeDialog的期望
  const handleRechargeWrapper = async (amount: string) => {
    try {
      await handleRecharge(amount);
    } catch (error) {
      console.error('充值失败:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="w-full py-4 px-8 border-b border-slate-700">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-xl font-bold">
            <Sparkles className="h-6 w-6 text-yellow-400" />
            <span>会员订阅</span>
          </Link>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowRechargeDialog(true)}
              className="px-4 py-2 text-white hover:text-yellow-400 transition-colors flex items-center"
            >
              <Wallet className="h-4 w-4 mr-1" />
              充值
            </button>
            
            {user ? (
              <>
                <button 
                  onClick={() => setShowSubscriptionManagement(true)}
                  className="px-4 py-2 text-white hover:text-yellow-400 transition-colors"
                >
                  我的订阅
                </button>
                
                <button 
                  onClick={() => {
                    addLog("开始退出登录...");
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('zklogin_logs', JSON.stringify(logs));
                      sessionStorage.removeItem('has_checked_jwt');
                      sessionStorage.removeItem('jwt_already_processed');
                    }
                    
                    supabase.auth.signOut().then(({ error }) => {
                      if (error) {
                        console.error("退出登录失败:", error);
                        addLog(`退出登录失败: ${error}`);
                        return;
                      }
                      
                      localStorage.removeItem('zkLogin_ephemeral');
                      localStorage.removeItem('zkLogin_address');
                      localStorage.removeItem('zkLogin_proof');
                      localStorage.removeItem('zkLogin_signature');
                      
                      addLog("已成功退出登录");
                      
                      setTimeout(() => {
                        window.location.reload();
                      }, 100);
                    }).catch(err => {
                      console.error("退出登录失败:", err);
                      addLog(`退出登录失败: ${err}`);
                    });
                  }} 
                  className="px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  退出
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
                        个人中心
                      </Link>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button 
                  onClick={handleGoogleAuth}
                  className="px-4 py-2 text-white hover:text-yellow-400 transition-colors flex items-center space-x-2"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    width="20" 
                    height="20" 
                    className="h-5 w-5"
                  >
                    <path 
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" 
                      fill="#4285F4" 
                    />
                    <path 
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" 
                      fill="#34A853" 
                    />
                    <path 
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" 
                      fill="#FBBC05" 
                    />
                    <path 
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" 
                      fill="#EA4335" 
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <LogDisplay logs={logs} onClearLogs={clearLogs} />
        
        <div className="text-center mb-20">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-yellow-400 mr-2" />
            <h1 className="text-4xl font-bold">选择您的完美套餐</h1>
          </div>
          <p className="text-slate-400 text-lg mt-4 max-w-2xl mx-auto">
            解锁高级功能，通过我们灵活的订阅计划将您的体验提升到新的水平。
          </p>
          {activeSubscription && (
            <div className="mt-8 inline-block px-6 py-2 bg-green-600 rounded-full">
              <span className="text-white font-medium flex items-center">
                <Check className="h-5 w-5 mr-2" />
                您当前已订阅 {activeSubscription.plan_name} 计划
              </span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.name}
              plan={plan}
              isHovered={hoveredPlan === index}
              onMouseEnter={() => setHoveredPlan(index)}
              onMouseLeave={() => setHoveredPlan(null)}
              onSubscribe={() => handleSubscribeClick(plan)}
              isActive={!!activeSubscription}
            />
          ))}
        </div>

        {/* 修改 zkLogin 组件部分 */}
        <div className="mt-12 p-6 bg-slate-800 rounded-lg" style={{visibility: 'hidden', height: 0, overflow: 'hidden'}}>
          <h2 className="text-xl font-bold mb-4">Sui 钱包</h2>
          <div id="zk-login-instance">
            <ZkLoginProvider 
              userId={user?.id} 
              autoInitialize={true} 
              onLog={(message) => {
                window.postMessage({ type: 'ZK_LOG', data: message }, window.location.origin);
              }}
              onReady={(methods) => {
                if (!zkLoginMethods.current) {
                  zkLoginMethods.current = methods;
                  setZkLoginInitialized(true);
                  addLog("ZkLogin组件已准备就绪");
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* 充值对话框 */}
      <RechargeDialog
        isOpen={showRechargeDialog}
        onClose={() => setShowRechargeDialog(false)}
        zkLoginAddress={typeof window !== 'undefined' ? localStorage.getItem('zkLogin_address') : null}
        suiPrice={currentSuiPrice}
        isLoadingPrice={isSuiPriceLoading}
        onRecharge={handleRechargeWrapper}
      />

      {/* 其他对话框组件保持不变 */}
      {/* ... */}
    </div>
  );
}