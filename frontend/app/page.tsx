/**
 * Home page for the Membership MVP application.
 * Displays subscription plans, handles subscription management, deposit, and payment dialogs.
 *
 * Features:
 * - Shows available subscription plans and allows subscribing
 * - Handles deposit, subscription management, and payment dialogs
 * - Integrates with context providers for state management
 * - Displays loading and empty state feedback
 */
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

/**
 * Home page component
 *
 * @returns {JSX.Element} The rendered home page
 */
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

/**
 * HomeContent component for displaying subscription plans and dialogs
 *
 * @returns {JSX.Element} The rendered content for the home page
 */
function HomeContent() {
  // Use context hooks
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
  
  // Use deposit context
  const { 
    showDepositDialog, 
    setShowDepositDialog, 
  } = useDeposit();

  /**
   * Show loading spinner while subscription plans are loading
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  /**
   * Show empty state if no subscription plans are available
   */
  if (!subscriptionPlans || subscriptionPlans.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-yellow-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">No subscription plans available</h2>
          <p className="text-gray-400">There are currently no available subscription plans. Please try again later.</p>
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
        
        {/* Deposit dialog */}
        <DepositDialog
          isOpen={showDepositDialog}
          onClose={() => setShowDepositDialog(false)}
        />

        {/* Subscription management dialog */}
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

        {/* Payment dialog */}
        <PaymentDialog
          isOpen={showPaymentDialog}
          onClose={() => setShowPaymentDialog(false)}
          selectedPlan={selectedPlan}
          onPaymentConfirm={handlePaymentConfirm}
        />
      </div>
  );
}