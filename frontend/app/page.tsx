"use client";

import { useLog } from "@/hooks/useLog";
import { useRecharge } from "@/hooks/useRecharge";
import { SuiPriceProvider, useSuiPrice } from "@/contexts/SuiPriceContext";
import { RechargeDialog } from "@/components/wallet/RechargeDialog";
import { LogDisplay } from "@/components/debug/LogDisplay";
import { Header } from "@/components/layout/Header";
import { SubscriptionPlans } from "@/components/subscription/SubscriptionPlans";
import { SubscriptionManagementDialog } from "@/components/subscription/SubscriptionManagementDialog";
import { PaymentDialog } from "@/components/payment/PaymentDialog";
import { ZkLoginStatus } from "@/components/zklogin/ZkLoginStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { usePayment } from "@/contexts/PaymentContext";
import { ZkLoginProvider, useZkLogin } from "@/contexts/ZkLoginContext";
import { useEffect } from "react";

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

export default function Home() {
  // 使用Hooks
  const { logs, addLog, clearLogs } = useLog();
  const { user } = useAuth();
  
  return (
    <SuiPriceProvider onLog={addLog}>
      <ZkLoginProvider userId={user?.id} onLog={addLog}>
        <HomeContent 
          logs={logs} 
          addLog={addLog} 
          clearLogs={clearLogs} 
        />
      </ZkLoginProvider>
    </SuiPriceProvider>
  );
}

function HomeContent({ logs, addLog, clearLogs }: { 
  logs: string[], 
  addLog: (message: string) => void, 
  clearLogs: () => void 
}) {
  // 使用Context
  const { user, zkLoginAddress } = useAuth();
  const { 
    activeSubscription,
    showSubscriptionManagement,
    setShowSubscriptionManagement,
    handleSubscribeClick,
    handleToggleAutoRenew,
    handleCancelSubscription
  } = useSubscriptionContext();
  const {
    showPaymentDialog,
    setShowPaymentDialog,
    selectedPlan,
    setSelectedPlan,
    handlePaymentConfirm
  } = usePayment();
  
  // 使用ZkLogin - 现在是在ZkLoginProvider内部调用
  const { handleJwtReceived } = useZkLogin();
  
  // 使用Hooks
  const { showRechargeDialog, setShowRechargeDialog, handleRecharge } = useRecharge();
  const { suiPrice: currentSuiPrice, isLoadingPrice: isSuiPriceLoading } = useSuiPrice();

  // 检查并处理可能存在的JWT
  useEffect(() => {
    // 函数用于检查URL hash中的JWT
    const checkUrlHashForJwt = () => {
      // 只在客户端运行
      if (typeof window === 'undefined') return;
      
      // 如果URL中有hash
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const idToken = hashParams.get('id_token');
        
        if (idToken) {
          addLog("在URL hash中找到id_token，长度: " + idToken.length);
          
          // 处理JWT
          handleJwtReceived(idToken).catch(error => {
            addLog("处理JWT失败: " + error.message);
          });
          
          // 清除URL中的hash以避免刷新页面时重复处理
          // 保留原始路径
          const newUrl = window.location.pathname + window.location.search;
          window.history.replaceState({}, document.title, newUrl);
        }
      }
      
      // 继续检查sessionStorage中的pending_jwt (原有逻辑)
      const pendingJwt = sessionStorage.getItem('pending_jwt');
      if (pendingJwt) {
        addLog("主页发现待处理的JWT，长度: " + pendingJwt.length);
        handleJwtReceived(pendingJwt).catch(error => {
          addLog("处理JWT失败: " + error.message);
        });
      }
    };
    
    // 页面加载时执行
    checkUrlHashForJwt();
  }, [handleJwtReceived, addLog]);

  // 修改handleRecharge函数以匹配RechargeDialog的期望
  const handleRechargeWrapper = async (amount: string) => {
    try {
      await handleRecharge(amount);
    } catch (error: any) {
      addLog('充值失败: ' + error.message);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Header 
        onRechargeClick={() => setShowRechargeDialog(true)}
        onSubscriptionManagementClick={() => setShowSubscriptionManagement(true)}
      />
      
      <LogDisplay logs={logs} onClearLogs={clearLogs} />
      
      <SubscriptionPlans
        plans={plans}
        activeSubscription={activeSubscription}
        onSubscribe={handleSubscribeClick}
      />
      
      {/* 充值对话框 */}
      <RechargeDialog
        isOpen={showRechargeDialog}
        onClose={() => setShowRechargeDialog(false)}
        zkLoginAddress={zkLoginAddress}
        suiPrice={currentSuiPrice}
        isLoadingPrice={isSuiPriceLoading}
        onRecharge={handleRechargeWrapper}
      />

      {/* 订阅管理对话框 */}
      <SubscriptionManagementDialog
        isOpen={showSubscriptionManagement}
        onClose={() => setShowSubscriptionManagement(false)}
        activeSubscription={activeSubscription}
        onSubscriptionUpdate={() => {}}
        onToggleAutoRenew={handleToggleAutoRenew}
        onCancelSubscription={handleCancelSubscription}
      />

      {/* 支付对话框 */}
      <PaymentDialog
        isOpen={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        selectedPlan={selectedPlan}
        onPaymentConfirm={handlePaymentConfirm}
      />
    </div>
  );
}