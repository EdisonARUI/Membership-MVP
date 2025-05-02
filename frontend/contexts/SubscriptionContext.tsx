import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from './AuthContext';

interface SubscriptionContextType {
  subscriptions: any[];
  activeSubscription: any;
  loading: boolean;
  showSubscriptionManagement: boolean;
  setShowSubscriptionManagement: (show: boolean) => void;
  handleSubscribeClick: (plan: any) => void;
  handleToggleAutoRenew: (subscriptionId: string, currentAutoRenew: boolean) => Promise<boolean>;
  handleCancelSubscription: (subscriptionId: string) => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const {
    subscriptions,
    activeSubscription,
    loading,
    fetchUserSubscriptions,
    toggleAutoRenew,
    cancelSubscription
  } = useSubscription();

  const [showSubscriptionManagement, setShowSubscriptionManagement] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserSubscriptions();
    }
  }, [user]);

  const handleSubscribeClick = (plan: any) => {
    if (!user) {
      window.location.href = '/sign-in';
      return;
    }
    setShowSubscriptionManagement(true);
  };

  const handleToggleAutoRenew = async (subscriptionId: string, currentAutoRenew: boolean) => {
    const success = await toggleAutoRenew(subscriptionId, currentAutoRenew);
    if (success) {
      await fetchUserSubscriptions();
    }
    return success;
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    const success = await cancelSubscription(subscriptionId);
    if (success) {
      await fetchUserSubscriptions();
      setShowSubscriptionManagement(false);
    }
    return success;
  };

  const value = {
    subscriptions,
    activeSubscription,
    loading,
    showSubscriptionManagement,
    setShowSubscriptionManagement,
    handleSubscribeClick,
    handleToggleAutoRenew,
    handleCancelSubscription
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
} 