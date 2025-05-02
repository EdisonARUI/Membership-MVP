"use client";

import { useLog } from "@/hooks/useLog";
import { useRecharge } from "@/hooks/useRecharge";
import { useSuiPrice } from "@/hooks/useSuiPrice";
import { RechargeDialog } from "@/components/wallet/RechargeDialog";
import { LogDisplay } from "@/components/debug/LogDisplay";
import { Header } from "@/components/layout/Header";
import { SubscriptionPlans } from "@/components/subscription/SubscriptionPlans";
import { SubscriptionManagementDialog } from "@/components/subscription/SubscriptionManagementDialog";
import { PaymentDialog } from "@/components/payment/PaymentDialog";
import ZkLoginProvider from "@/components/zklogin/zklogin";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { usePayment } from "@/contexts/PaymentContext";

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

  // 使用Hooks
  const { logs, addLog, clearLogs } = useLog();
  const { showRechargeDialog, setShowRechargeDialog, handleRecharge } = useRecharge();
  const { suiPrice: currentSuiPrice, isLoadingPrice: isSuiPriceLoading } = useSuiPrice(addLog);

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

      {/* zkLogin 组件 */}
      <div className="mt-12 p-6 bg-slate-800 rounded-lg" style={{visibility: 'hidden', height: 0, overflow: 'hidden'}}>
        <h2 className="text-xl font-bold mb-4">Sui 钱包</h2>
        <div id="zk-login-instance">
          <ZkLoginProvider 
            userId={user?.id} 
            autoInitialize={true} 
            onLog={(message) => {
              window.postMessage({ type: 'ZK_LOG', data: message }, window.location.origin);
            }}
          />
        </div>
      </div>

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