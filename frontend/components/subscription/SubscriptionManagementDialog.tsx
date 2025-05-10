/**
 * SubscriptionManagementDialog component provides a modal dialog for managing the user's active subscription.
 * It allows toggling auto-renewal, canceling, and renewing subscriptions, and displays current subscription status.
 *
 * Features:
 * - Displays current subscription details and status
 * - Allows toggling auto-renewal, canceling, and renewing subscriptions
 * - Shows confirmation dialogs for cancel and renew actions
 * - Integrates with LogContext for logging subscription events
 */
import { useState } from "react";
import { Check, X, RefreshCw, RotateCw } from "lucide-react";
import { Subscription } from "@/interfaces/Subscription";
import { useLogContext } from '@/contexts/LogContext';

/**
 * Props for SubscriptionManagementDialog component
 */
interface SubscriptionManagementDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  /**
   * Callback to close the dialog
   */
  onClose: () => void;
  /**
   * The user's active subscription
   */
  activeSubscription: Subscription | null;
  /**
   * Whether a loading state is active for subscription actions
   */
  loadingAction: boolean;
  /**
   * Callback to refresh subscription data after updates
   */
  onSubscriptionUpdate: () => void;
  /**
   * Callback to toggle auto-renewal
   * @param subscriptionId - The subscription ID
   * @param currentAutoRenew - Current auto-renewal status
   * @returns {Promise<boolean>} Whether the update was successful
   */
  onToggleAutoRenew: (subscriptionId: string, currentAutoRenew: boolean) => Promise<boolean>;
  /**
   * Callback to cancel the subscription
   * @param subscriptionId - The subscription ID
   * @returns {Promise<boolean>} Whether the cancellation was successful
   */
  onCancelSubscription: (subscriptionId: string) => Promise<boolean>;
  /**
   * Callback to renew the subscription
   * @param subscriptionId - The subscription ID
   * @returns {Promise<boolean>} Whether the renewal was successful
   */
  onRenewSubscription: (subscriptionId: string) => Promise<boolean>;
}

/**
 * SubscriptionManagementDialog component for managing active subscriptions
 *
 * @param {SubscriptionManagementDialogProps} props - Component props
 * @returns {JSX.Element|null} The rendered dialog or null if not open
 */
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

  /**
   * Handles toggling auto-renewal for the active subscription
   */
  const handleToggleAutoRenew = async () => {
    if (!activeSubscription) return;
    try {
      const success = await onToggleAutoRenew(activeSubscription.id, activeSubscription.auto_renew);
      if (success) {
        onSubscriptionUpdate();
      }
    } catch (error: any) {
      console.error('Failed to update subscription:', error);
      addLog(`Operation failed: ${error.message || "Error occurred while updating subscription"}`);
    }
  };

  /**
   * Handles canceling the active subscription
   */
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
      console.error('Failed to cancel subscription:', error);
      addLog(`Operation failed: ${error.message || "Error occurred while canceling subscription"}`);
    }
  };
  
  /**
   * Handles renewing the active subscription
   */
  const handleRenewSubscription = async () => {
    if (!activeSubscription) return;
    try {
      const success = await onRenewSubscription(activeSubscription.id);
      if (success) {
        onSubscriptionUpdate();
        setShowConfirmRenew(false);
      }
    } catch (error: any) {
      console.error('Failed to renew subscription:', error);
      addLog(`Operation failed: ${error.message || "Error occurred while renewing subscription"}`);
    }
  };

  // Determine if the subscription is expired
  const isExpired = activeSubscription && 
    (activeSubscription.status === 'expired' || new Date(activeSubscription.end_date) < new Date());

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Subscription Management</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-700 rounded-lg">
              <h3 className="font-medium mb-2">Current Subscription</h3>
              <p className="text-slate-300">
                {activeSubscription?.plan_name} Plan
              </p>
              <p className={`text-sm ${isExpired ? "text-red-400" : "text-slate-400"}`}>
                {isExpired ? "Expired: " : "Expires: "}
                {new Date(activeSubscription?.end_date || "").toLocaleDateString()}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Status: 
                <span className={`ml-1 ${
                  activeSubscription?.status === 'active' ? "text-green-400" : 
                  activeSubscription?.status === 'canceled' ? "text-red-400" : "text-yellow-400"
                }`}>
                  {activeSubscription?.status === 'active' ? "Active" : 
                   activeSubscription?.status === 'canceled' ? "Canceled" : "Expired"}
                </span>
              </p>
            </div>

            {activeSubscription?.status === 'active' && (
              <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                <div>
                  <h3 className="font-medium">Auto-Renewal</h3>
                  <p className="text-sm text-slate-400">
                    {activeSubscription?.auto_renew ? "Enabled" : "Disabled"}
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
                  <span>{activeSubscription?.auto_renew ? "Disable" : "Enable"}</span>
                </button>
              </div>
            )}
            
            {/* Renew button */}
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
                <span>Renew Subscription</span>
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
                Cancel Subscription
              </button>
            )}
          </div>
        </div>
      </div>

      {showConfirmCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Confirm Cancel Subscription</h3>
            <p className="text-slate-300 mb-6">
              Are you sure you want to cancel your current subscription? You will lose access to premium features.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmCancel(false)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg"
              >
                Back
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={loadingAction}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white flex items-center"
              >
                {loadingAction ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showConfirmRenew && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Confirm Renew Subscription</h3>
            <p className="text-slate-300 mb-6">
              Are you sure you want to renew your subscription? The original plan price will be charged from your account.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmRenew(false)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg"
              >
                Back
              </button>
              <button
                onClick={handleRenewSubscription}
                disabled={loadingAction}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white flex items-center"
              >
                {loadingAction ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Confirm Renew
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 