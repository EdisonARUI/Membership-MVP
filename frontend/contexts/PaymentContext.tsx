/**
 * Context for managing payment operations
 * Provides functionality for handling subscription payments and payment history
 */
import { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useLogContext } from '@/contexts/LogContext';
import { createClient } from '@/utils/supabase/client';

/**
 * Interface defining the shape of the payment context
 * Contains state and methods for payment operations
 */
interface PaymentContextType {
  showPaymentDialog: boolean;
  setShowPaymentDialog: (show: boolean) => void;
  selectedPlan: any;
  setSelectedPlan: (plan: any) => void;
  handlePaymentConfirm: () => Promise<void>;
  paymentHistory: any[];
  loading: boolean;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

/**
 * Provider component for payment context
 * Manages payment operations and state
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 */
export function PaymentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { createSubscription } = useSubscription();
  const { addLog } = useLogContext();
  const supabase = createClient();

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Fetches payment history for the current user
   * Retrieves payment records from Supabase
   * 
   * @returns {Promise<void>}
   */
  const fetchPaymentHistory = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error: any) {
      console.error('Failed to fetch payment records:', error);
      addLog(`Failed to fetch payment records: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles payment confirmation
   * Creates subscription and updates payment history
   * 
   * @returns {Promise<void>}
   */
  const handlePaymentConfirm = async () => {
    if (!selectedPlan || !user) return;

    try {
      setLoading(true);
      const success = await createSubscription(
        selectedPlan.period,
        selectedPlan.realPrice,
        user.id
      );

      if (success) {
        setShowPaymentDialog(false);
        await fetchPaymentHistory();
        addLog('Payment successful');
      } else {
        addLog('Payment failed');
      }
    } catch (error: any) {
      console.error('Payment failed:', error);
      addLog(`Payment failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    showPaymentDialog,
    setShowPaymentDialog,
    selectedPlan,
    setSelectedPlan,
    handlePaymentConfirm,
    paymentHistory,
    loading
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
}

/**
 * Hook for accessing payment context
 * Must be used within a PaymentProvider
 * 
 * @returns {PaymentContextType} Payment context value
 * @throws {Error} If used outside of PaymentProvider
 */
export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
} 