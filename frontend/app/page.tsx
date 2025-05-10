"use client";

// import { SuiPriceProvider, useSuiPrice } from "@/contexts/SuiPriceContext";
import DepositDialog from "@/components/deposit/DepositDialog";
// Temporarily hide LogDisplay for users, but keep for future development debugging
// import { LogDisplay } from "@/components/debug/LogDisplay";
import { Header } from "@/components/layout/Header";
import { SubscriptionPlans } from "@/components/subscription/SubscriptionPlans";
import { SubscriptionManagementDialog } from "@/components/subscription/SubscriptionManagementDialog";
import { PaymentDialog } from "@/components/payment/PaymentDialog";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { usePayment } from "@/contexts/PaymentContext";
import { ZkLoginProvider, useZkLogin } from "@/contexts/ZkLoginContext";
import { useDeposit } from "@/contexts/DepositContext";
import { LogProvider } from "@/contexts/LogContext";


export default function Home() {
  return (
    <LogProvider>
      {/* <SuiPriceProvider> */}
        <ZkLoginProvider>
          <HomeContent />
        </ZkLoginProvider>
      {/* </SuiPriceProvider> */}
    </LogProvider>
  );
}

function HomeContent() {
  // 使用Context
  const { 
    activeSubscription,
    loadingAction,
    showSubscriptionManagement,
    setShowSubscriptionManagement,
    handleSubscribeClick,
    handleToggleAutoRenew,
    handleCancelSubscription,
    handleRenewSubscription,
    plans: subscriptionPlans,
    loading
  } = useSubscriptionContext();
  const {
    showPaymentDialog,
    setShowPaymentDialog,
    selectedPlan,
    handlePaymentConfirm
  } = usePayment();
  
  // 使用Hooks
  const { 
    showDepositDialog, 
    setShowDepositDialog, 
  } = useDeposit();

  // 处理数据加载和空数据情况
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg">正在加载订阅计划...</p>
        </div>
      </div>
    );
  }

  if (!subscriptionPlans || subscriptionPlans.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-yellow-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">暂无订阅计划</h2>
          <p className="text-gray-400">目前没有可用的订阅计划，请稍后再试。</p>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <Header 
          onRechargeClick={() => setShowDepositDialog(true)}
          onSubscriptionManagementClick={() => setShowSubscriptionManagement(true)}
        />
        
        {/* Temporarily hide LogDisplay for users, but keep for future development debugging */}
        {/* <LogDisplay /> */}
        
        <SubscriptionPlans
          plans={subscriptionPlans}
          activeSubscription={activeSubscription}
          loadingAction={loadingAction}
          onSubscribe={handleSubscribeClick}
        />
        
        {/* 充值对话框 */}
        <DepositDialog
          isOpen={showDepositDialog}
          onClose={() => setShowDepositDialog(false)}
        />

        {/* 订阅管理对话框 */}
        <SubscriptionManagementDialog
          isOpen={showSubscriptionManagement}
          onClose={() => setShowSubscriptionManagement(false)}
          activeSubscription={activeSubscription}
          loadingAction={loadingAction}
          onSubscriptionUpdate={() => {}}
          onToggleAutoRenew={handleToggleAutoRenew}
          onCancelSubscription={handleCancelSubscription}
          onRenewSubscription={handleRenewSubscription}
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