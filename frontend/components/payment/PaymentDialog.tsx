/**
 * PaymentDialog component provides a modal dialog for users to confirm and process subscription payments.
 * It displays selected plan details, payment method, and handles payment confirmation.
 *
 * Features:
 * - Displays selected subscription plan and payment method
 * - Handles payment confirmation and loading state
 * - Integrates with LogContext for logging payment events
 */
import { useState } from "react";
import { X, CreditCard, RefreshCw } from "lucide-react";
import { useLogContext } from '@/contexts/LogContext';

/**
 * Props for PaymentDialog component
 */
interface PaymentDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  /**
   * Callback to close the dialog
   */
  onClose: () => void;
  /**
   * The selected subscription plan
   */
  selectedPlan: any;
  /**
   * Callback to confirm payment
   * @param plan - The selected plan to confirm payment for
   */
  onPaymentConfirm: (plan: any) => void;
}

/**
 * PaymentDialog component for confirming and processing subscription payments
 *
 * @param {PaymentDialogProps} props - Component props
 * @returns {JSX.Element|null} The rendered dialog or null if not open
 */
export function PaymentDialog({
  isOpen,
  onClose,
  selectedPlan,
  onPaymentConfirm,
}: PaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const { addLog } = useLogContext();

  if (!isOpen) return null;

  /**
   * Handles the confirm payment button click, triggers payment confirmation and logs events
   */
  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onPaymentConfirm(selectedPlan);
      addLog("Payment processing...");
    } catch (error: any) {
      console.error('Payment failed:', error);
      addLog(`Payment failed: ${error.message || "Error occurred during payment processing"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Confirm Payment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-700 rounded-lg">
            <h3 className="font-medium mb-2">Subscription Plan</h3>
            <p className="text-slate-300">{selectedPlan?.name}</p>
            <p className="text-2xl font-bold mt-2">{selectedPlan?.price}</p>
          </div>

          <div className="p-4 bg-slate-700 rounded-lg">
            <h3 className="font-medium mb-2">Payment Method</h3>
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Crypto Payment</span>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white flex items-center justify-center space-x-2"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                <span>Confirm Payment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 