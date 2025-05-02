import { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useLog } from '@/hooks/useLog';
import { createClient } from '@/utils/supabase/client';

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

export function PaymentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { createSubscription } = useSubscription();
  const { addLog } = useLog();
  const supabase = createClient();

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
      console.error('获取支付记录失败:', error);
      addLog(`获取支付记录失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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
        addLog('支付成功');
      } else {
        addLog('支付失败');
      }
    } catch (error: any) {
      console.error('支付失败:', error);
      addLog(`支付失败: ${error.message}`);
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

export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
} 