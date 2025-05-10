import { useState } from "react";
import { Check, X, RefreshCw, RotateCw } from "lucide-react";
import { Subscription } from "@/interfaces/Subscription";
import { useLogContext } from '@/contexts/LogContext';

interface SubscriptionManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubscription: Subscription | null;
  loadingAction: boolean;
  onSubscriptionUpdate: () => void;
  onToggleAutoRenew: (subscriptionId: string, currentAutoRenew: boolean) => Promise<boolean>;
  onCancelSubscription: (subscriptionId: string) => Promise<boolean>;
  onRenewSubscription: (subscriptionId: string) => Promise<boolean>;
}

export function SubscriptionManagementDialog({
  isOpen,
  onClose,
  activeSubscription,
  loadingAction,
  onSubscriptionUpdate,
  onToggleAutoRenew,
  onCancelSubscription,
  onRenewSubscription,
}: SubscriptionManagementDialogProps) {
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showConfirmRenew, setShowConfirmRenew] = useState(false);
  const { addLog } = useLogContext();

  if (!isOpen) return null;

  const handleToggleAutoRenew = async () => {
    if (!activeSubscription) return;
    
    try {
      const success = await onToggleAutoRenew(activeSubscription.id, activeSubscription.auto_renew);
      if (success) {
        onSubscriptionUpdate();
      }
    } catch (error: any) {
      console.error('更新订阅失败:', error);
      addLog(`操作失败: ${error.message || "更新订阅时发生错误"}`);
    }
  };

  const handleCancelSubscription = async () => {
    if (!activeSubscription) return;
    
    try {
      const success = await onCancelSubscription(activeSubscription.id);
      if (success) {
        onSubscriptionUpdate();
        setShowConfirmCancel(false);
        onClose();
      }
    } catch (error: any) {
      console.error('取消订阅失败:', error);
      addLog(`操作失败: ${error.message || "取消订阅时发生错误"}`);
    }
  };
  
  const handleRenewSubscription = async () => {
    if (!activeSubscription) return;
    
    try {
      const success = await onRenewSubscription(activeSubscription.id);
      if (success) {
        onSubscriptionUpdate();
        setShowConfirmRenew(false);
      }
    } catch (error: any) {
      console.error('续订订阅失败:', error);
      addLog(`操作失败: ${error.message || "续订订阅时发生错误"}`);
    }
  };

  const isExpired = activeSubscription && 
    (activeSubscription.status === 'expired' || new Date(activeSubscription.end_date) < new Date());

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">订阅管理</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-700 rounded-lg">
              <h3 className="font-medium mb-2">当前订阅</h3>
              <p className="text-slate-300">
                {activeSubscription?.plan_name} 计划
              </p>
              <p className={`text-sm ${isExpired ? "text-red-400" : "text-slate-400"}`}>
                {isExpired ? "已过期: " : "到期时间: "}
                {new Date(activeSubscription?.end_date || "").toLocaleDateString()}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                状态: 
                <span className={`ml-1 ${
                  activeSubscription?.status === 'active' ? "text-green-400" : 
                  activeSubscription?.status === 'canceled' ? "text-red-400" : "text-yellow-400"
                }`}>
                  {activeSubscription?.status === 'active' ? "活跃" : 
                   activeSubscription?.status === 'canceled' ? "已取消" : "已过期"}
                </span>
              </p>
            </div>

            {activeSubscription?.status === 'active' && (
              <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                <div>
                  <h3 className="font-medium">自动续订</h3>
                  <p className="text-sm text-slate-400">
                    {activeSubscription?.auto_renew ? "已开启" : "已关闭"}
                  </p>
                </div>
                <button
                  onClick={handleToggleAutoRenew}
                  disabled={loadingAction}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                    activeSubscription?.auto_renew
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-slate-600 hover:bg-slate-500"
                  }`}
                >
                  {loadingAction ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>{activeSubscription?.auto_renew ? "关闭" : "开启"}</span>
                </button>
              </div>
            )}
            
            {/* 续订按钮 */}
            {(isExpired || activeSubscription?.status === 'expired') && (
              <button
                onClick={() => setShowConfirmRenew(true)}
                disabled={loadingAction}
                className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white flex items-center justify-center space-x-2"
              >
                {loadingAction ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4" />
                )}
                <span>续订订阅</span>
              </button>
            )}

            {activeSubscription?.status === 'active' && (
              <button
                onClick={() => setShowConfirmCancel(true)}
                disabled={loadingAction}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
              >
                {loadingAction ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                取消订阅
              </button>
            )}
          </div>
        </div>
      </div>

      {showConfirmCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">确认取消订阅</h3>
            <p className="text-slate-300 mb-6">
              您确定要取消当前订阅吗？取消后，您将无法继续使用高级功能。
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmCancel(false)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg"
              >
                返回
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={loadingAction}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white flex items-center"
              >
                {loadingAction ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                确认取消
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showConfirmRenew && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">确认续订</h3>
            <p className="text-slate-300 mb-6">
              您确定要续订当前订阅吗？将按原计划价格从您的账户中扣除费用。
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmRenew(false)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg"
              >
                返回
              </button>
              <button
                onClick={handleRenewSubscription}
                disabled={loadingAction}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white flex items-center"
              >
                {loadingAction ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                确认续订
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 