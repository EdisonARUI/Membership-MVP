/**
 * Context for managing subscription operations
 * Provides functionality for subscription management and plan handling
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useZkLogin } from './ZkLoginContext';
import { useZkLoginParams } from '@/hooks/useZkLoginParams';
import { useLogContext } from '@/contexts/LogContext';
import { toast } from 'react-hot-toast';
import { 
  Subscription, 
  SubscriptionPlan,
  CreateSubscriptionRequest, 
  RenewSubscriptionRequest
} from '@/interfaces/Subscription';
import { SubscriptionService } from '@/utils/SubscriptionService';

/**
 * Interface defining the shape of the subscription context
 * Contains state and methods for subscription operations
 */
interface SubscriptionContextType {
  subscriptions: Subscription[];
  plans: SubscriptionPlan[];
  activeSubscription: Subscription | null;
  loading: boolean;
  loadingAction: boolean;
  showSubscriptionManagement: boolean;
  setShowSubscriptionManagement: (show: boolean) => void;
  handleSubscribeClick: (plan: SubscriptionPlan) => void;
  handleToggleAutoRenew: (subscriptionId: string, currentAutoRenew: boolean) => Promise<boolean>;
  handleCancelSubscription: (subscriptionId: string) => Promise<boolean>;
  handleRenewSubscription: (subscriptionId: string) => Promise<boolean>;
  fetchSubscriptions: () => Promise<void>;
  fetchPlans: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

/**
 * Provider component for subscription context
 * Manages subscription operations and state
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 */
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { state: zkLoginState } = useZkLogin();
  const { zkLoginAddress } = zkLoginState;
  const { prepareKeypair, getZkLoginParams } = useZkLoginParams();
  const { addLog } = useLogContext();
  const subscriptionService = new SubscriptionService();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showSubscriptionManagement, setShowSubscriptionManagement] = useState(false);

  // Fetch subscription plans - no user login required
  useEffect(() => {
    const loadPlans = async () => {
      await fetchPlans();
    };
    loadPlans();
  }, []);

  // Fetch user subscriptions - requires user login
  useEffect(() => {
    if (user && zkLoginAddress) {
      fetchSubscriptions();
    }
  }, [user, zkLoginAddress]);

  /**
   * Fetches user subscriptions
   * Retrieves subscription status and active subscription
   * 
   * @returns {Promise<void>}
   */
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await subscriptionService.getSubscriptionStatus();
      
      if (response.success) {
        setSubscriptions(response.subscriptions || []);
        setActiveSubscription(response.active_subscription || null);
      } else {
        toast.error(`Failed to fetch subscription information: ${response.error}`);
        addLog(`Error: Failed to fetch subscription information - ${response.error}`);
      }
    } catch (error: any) {
      console.error('Failed to fetch subscription information:', error);
      addLog(`Error: Failed to fetch subscription information - ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches subscription plans
   * Retrieves available subscription plans
   * 
   * @returns {Promise<void>}
   */
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await subscriptionService.getSubscriptionPlans();
      
      if (response.success) {
        setPlans(response.plans || []);
      } else {
        toast.error(`Failed to fetch subscription plans: ${response.error}`);
        addLog(`Error: Failed to fetch subscription plans - ${response.error}`);
      }
    } catch (error: any) {
      console.error('Failed to fetch subscription plans:', error);
      addLog(`Error: Failed to fetch subscription plans - ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles subscription button click
   * Initiates subscription creation process
   * 
   * @param {SubscriptionPlan} plan - Selected subscription plan
   */
  const handleSubscribeClick = async (plan: SubscriptionPlan) => {
    if (!user) {
      window.location.href = '/sign-in';
      return;
    }
    
    if (!zkLoginAddress) {
      toast.error('Please complete zkLogin authentication first');
      return;
    }
    
    try {
      setLoadingAction(true);
      addLog(`Starting subscription creation: ${plan.name}`);
      
      // Prepare zkLogin parameters
      const keypair = prepareKeypair();
      if (!keypair) {
        throw new Error('Unable to get ephemeral keypair');
      }
      
      const params = getZkLoginParams();
      if (!params) {
        throw new Error('Unable to get zkLogin parameters');
      }
      
      const { partialSignature, userSalt, decodedJwt } = params;
      
      // Create subscription request
      const request: CreateSubscriptionRequest = {
        plan_id: plan.id,
        auto_renew: true
      };
      
      // Call subscription service
      const result = await subscriptionService.createSubscription(
        request,
        zkLoginAddress,
        keypair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      if (result.success) {
        toast.success('Subscription created successfully');
        addLog(`Subscription created successfully: ${plan.name}`);
        await fetchSubscriptions();
        setShowSubscriptionManagement(true);
      } else {
        toast.error(`Failed to create subscription: ${result.error}`);
        addLog(`Failed to create subscription: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Failed to create subscription:', error);
      toast.error(`Failed to create subscription: ${error.message}`);
      addLog(`Error: Failed to create subscription - ${error.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  /**
   * Toggles subscription auto-renewal
   * Updates auto-renewal status for a subscription
   * 
   * @param {string} subscriptionId - ID of the subscription to update
   * @param {boolean} currentAutoRenew - Current auto-renewal status
   * @returns {Promise<boolean>} Whether the update was successful
   */
  const handleToggleAutoRenew = async (subscriptionId: string, currentAutoRenew: boolean) => {
    try {
      setLoadingAction(true);
      
      const result = await subscriptionService.toggleAutoRenew({
        subscription_id: subscriptionId,
        auto_renew: !currentAutoRenew
      });
      
      if (result.success) {
        toast.success(currentAutoRenew ? 'Auto-renewal disabled' : 'Auto-renewal enabled');
        addLog(currentAutoRenew ? 'Auto-renewal disabled' : 'Auto-renewal enabled');
        await fetchSubscriptions();
        return true;
      } else {
        toast.error(`Failed to update auto-renewal: ${result.error}`);
        addLog(`Failed to update auto-renewal: ${result.error}`);
        return false;
      }
    } catch (error: any) {
      console.error('Failed to update auto-renewal:', error);
      toast.error(`Failed to update auto-renewal: ${error.message}`);
      addLog(`Error: Failed to update auto-renewal - ${error.message}`);
      return false;
    } finally {
      setLoadingAction(false);
    }
  };

  /**
   * Cancels a subscription
   * Handles subscription cancellation process
   * 
   * @param {string} subscriptionId - ID of the subscription to cancel
   * @returns {Promise<boolean>} Whether the cancellation was successful
   */
  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!zkLoginAddress) {
      toast.error('Please complete zkLogin authentication first');
      return false;
    }
    
    try {
      setLoadingAction(true);
      addLog(`Starting subscription cancellation: ${subscriptionId}`);
      
      // Prepare zkLogin parameters
      const keypair = prepareKeypair();
      if (!keypair) {
        throw new Error('Unable to get ephemeral keypair');
      }
      
      const params = getZkLoginParams();
      if (!params) {
        throw new Error('Unable to get zkLogin parameters');
      }
      
      const { partialSignature, userSalt, decodedJwt } = params;
      
      // Cancel subscription request
      const result = await subscriptionService.cancelSubscription(
        { subscription_id: subscriptionId },
        zkLoginAddress,
        keypair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      if (result.success) {
        toast.success('Subscription cancelled');
        addLog('Subscription cancelled');
        await fetchSubscriptions();
        setShowSubscriptionManagement(false);
        return true;
      } else {
        toast.error(`Failed to cancel subscription: ${result.error}`);
        addLog(`Failed to cancel subscription: ${result.error}`);
        return false;
      }
    } catch (error: any) {
      console.error('Failed to cancel subscription:', error);
      toast.error(`Failed to cancel subscription: ${error.message}`);
      addLog(`Error: Failed to cancel subscription - ${error.message}`);
      return false;
    } finally {
      setLoadingAction(false);
    }
  };

  /**
   * Renews a subscription
   * Handles subscription renewal process
   * 
   * @param {string} subscriptionId - ID of the subscription to renew
   * @returns {Promise<boolean>} Whether the renewal was successful
   */
  const handleRenewSubscription = async (subscriptionId: string) => {
    if (!zkLoginAddress) {
      toast.error('Please complete zkLogin authentication first');
      return false;
    }
    
    try {
      setLoadingAction(true);
      addLog(`Starting subscription renewal: ${subscriptionId}`);
      
      // Prepare zkLogin parameters
      const keypair = prepareKeypair();
      if (!keypair) {
        throw new Error('Unable to get ephemeral keypair');
      }
      
      const params = getZkLoginParams();
      if (!params) {
        throw new Error('Unable to get zkLogin parameters');
      }
      
      const { partialSignature, userSalt, decodedJwt } = params;
      
      // Renew request
      const request: RenewSubscriptionRequest = {
        subscription_id: subscriptionId
      };
      
      // Call subscription service
      const result = await subscriptionService.renewSubscription(
        request,
        zkLoginAddress,
        keypair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      if (result.success) {
        toast.success('Subscription renewed successfully');
        addLog('Subscription renewed successfully');
        await fetchSubscriptions();
        return true;
      } else {
        toast.error(`Failed to renew subscription: ${result.error}`);
        addLog(`Failed to renew subscription: ${result.error}`);
        return false;
      }
    } catch (error: any) {
      console.error('Failed to renew subscription:', error);
      toast.error(`Failed to renew subscription: ${error.message}`);
      addLog(`Error: Failed to renew subscription - ${error.message}`);
      return false;
    } finally {
      setLoadingAction(false);
    }
  };

  const value = {
    subscriptions,
    plans,
    activeSubscription,
    loading,
    loadingAction,
    showSubscriptionManagement,
    setShowSubscriptionManagement,
    handleSubscribeClick,
    handleToggleAutoRenew,
    handleCancelSubscription,
    handleRenewSubscription,
    fetchSubscriptions,
    fetchPlans
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

/**
 * Hook for accessing subscription context
 * Must be used within a SubscriptionProvider
 * 
 * @returns {SubscriptionContextType} Subscription context value
 * @throws {Error} If used outside of SubscriptionProvider
 */
export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
} 