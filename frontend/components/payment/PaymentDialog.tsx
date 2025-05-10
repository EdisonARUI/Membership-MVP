import { useState } from "react";
import { X, CreditCard, RefreshCw } from "lucide-react";
import { useLogContext } from '@/contexts/LogContext';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: any;
  onPaymentConfirm: (plan: any) => void;
}

export function PaymentDialog({
  isOpen,
  onClose,
  selectedPlan,
  onPaymentConfirm,
}: PaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const { addLog } = useLogContext();

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onPaymentConfirm(selectedPlan);
      addLog("支付处理中...");
    } catch (error: any) {
      console.error('支付失败:', error);
      addLog(`支付失败: ${error.message || "处理支付时发生错误"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">确认支付</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-700 rounded-lg">
            <h3 className="font-medium mb-2">订阅计划</h3>
            <p className="text-slate-300">{selectedPlan?.name}</p>
            <p className="text-2xl font-bold mt-2">{selectedPlan?.price}</p>
          </div>

          <div className="p-4 bg-slate-700 rounded-lg">
            <h3 className="font-medium mb-2">支付方式</h3>
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>加密货币支付</span>
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
                <span>确认支付</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 