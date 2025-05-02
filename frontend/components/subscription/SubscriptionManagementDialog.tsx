import { useState } from "react";
import { Check, X, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useLog } from "@/hooks/useLog";

interface SubscriptionManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubscription: any;
  onSubscriptionUpdate: () => void;
  onToggleAutoRenew: (subscriptionId: string, currentAutoRenew: boolean) => Promise<boolean>;
  onCancelSubscription: (subscriptionId: string) => Promise<boolean>;
}

export function SubscriptionManagementDialog({
  isOpen,
  onClose,
  activeSubscription,
  onSubscriptionUpdate,
  onToggleAutoRenew,
  onCancelSubscription,
}: SubscriptionManagementDialogProps) {
  const [loadingAction, setLoadingAction] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const { addLog } = useLog();
  const supabase = createClient();

  if (!isOpen) return null;

  const handleToggleAutoRenew = async () => {
    if (!activeSubscription) return;
    
    try {
      setLoadingAction(true);
      const success = await onToggleAutoRenew(activeSubscription.id, activeSubscription.auto_renew);
      if (success) {
        onSubscriptionUpdate();
      }
    } catch (error: any) {
      console.error('更新订阅失败:', error);
      addLog(`操作失败: ${error.message || "更新订阅时发生错误"}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!activeSubscription) return;
    
    try {
      setLoadingAction(true);
      const success = await onCancelSubscription(activeSubscription.id);
      if (success) {
        onSubscriptionUpdate();
        setShowConfirmCancel(false);
        onClose();
      }
    } catch (error: any) {
      console.error('取消订阅失败:', error);
      addLog(`操作失败: ${error.message || "取消订阅时发生错误"}`);
    } finally {
      setLoadingAction(false);
    }
  };

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
              <p className="text-sm text-slate-400">
                到期时间: {activeSubscription?.end_date}
              </p>
            </div>

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

            <button
              onClick={() => setShowConfirmCancel(true)}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
            >
              取消订阅
            </button>
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
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
              >
                {loadingAction ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  "确认取消"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 