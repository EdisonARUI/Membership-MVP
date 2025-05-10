/**
 * Hook for managing subscription operations
 * Provides functionality to fetch, create, update, and cancel user subscriptions
 */
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useLogContext } from '@/contexts/LogContext';

/**
 * Hook for managing user subscriptions
 * Handles subscription CRUD operations via Supabase
 * 
 * @returns {Object} Subscription state and methods
 */
export function useSubscription() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { addLog } = useLogContext();
  const supabase = createClient();

  /**
   * Fetches user subscriptions from the database
   * Gets all subscriptions and identifies the active one
   * 
   * @returns {Promise<void>}
   */
  const fetchUserSubscriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_subscription_status')
        .select('*');

      if (error) throw error;

      setSubscriptions(data || []);
      const active = data?.find(sub => sub.is_active);
      setActiveSubscription(active || null);
    } catch (error) {
      console.error('Failed to get subscription information:', error);
      addLog("Error: Failed to get subscription information");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Creates a new subscription for a user
   * Handles plan selection, date calculation, and payment record creation
   * 
   * @param {string} planPeriod - Period of the subscription plan ('monthly', 'quarterly', 'yearly')
   * @param {number} price - Price of the subscription
   * @param {string} userId - ID of the user creating the subscription
   * @returns {Promise<boolean>} Whether subscription creation was successful
   */
  const createSubscription = async (planPeriod: string, price: number, userId: string) => {
    try {
      setLoading(true);
      
      // 1. Get selected plan ID
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('period', planPeriod)
        .single();
      
      if (planError) throw planError;
      
      // 2. Calculate dates
      const startDate = new Date();
      const endDate = new Date();
      
      switch (planPeriod) {
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quarterly':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
      }
      
      // 3. Create subscription record
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_id: planData.id,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: true
        })
        .select()
        .single();
      
      if (subscriptionError) throw subscriptionError;
      
      // 4. Create payment record
      const { error: paymentError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: userId,
          subscription_id: subscriptionData.id,
          amount: price,
          currency: 'CNY',
          status: 'completed',
          payment_method: 'crypto'
        });
      
      if (paymentError) throw paymentError;
      
      // 5. Refresh data
      await fetchUserSubscriptions();
      
      addLog(`Subscription successful: You have successfully subscribed to the ${planPeriod === 'monthly' ? 'monthly' : planPeriod === 'quarterly' ? 'quarterly' : 'yearly'} plan`);
      
      return true;
    } catch (error: any) {
      console.error('Failed to create subscription:', error);
      addLog(`Subscription failed: ${error.message || "Error occurred while creating subscription"}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Updates subscription auto-renewal status
   * Toggles between on and off for auto-renewal
   * 
   * @param {string} subscriptionId - ID of the subscription to update
   * @param {boolean} currentAutoRenew - Current auto-renewal status
   * @returns {Promise<boolean>} Whether the update was successful
   */
  const toggleAutoRenew = async (subscriptionId: string, currentAutoRenew: boolean) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          auto_renew: !currentAutoRenew
        })
        .eq('id', subscriptionId);
      
      if (error) throw error;
      
      await fetchUserSubscriptions();
      addLog(currentAutoRenew ? "Auto-renewal has been disabled" : "Auto-renewal has been enabled");
      return true;
    } catch (error: any) {
      console.error('Failed to update subscription:', error);
      addLog(`Operation failed: ${error.message || "Error occurred while updating subscription"}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancels a subscription
   * Updates status to 'canceled' and disables auto-renewal
   * 
   * @param {string} subscriptionId - ID of the subscription to cancel
   * @returns {Promise<boolean>} Whether the cancellation was successful
   */
  const cancelSubscription = async (subscriptionId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'canceled',
          auto_renew: false
        })
        .eq('id', subscriptionId);
      
      if (error) throw error;
      
      await fetchUserSubscriptions();
      addLog("Subscription has been canceled");
      return true;
    } catch (error: any) {
      console.error('Failed to cancel subscription:', error);
      addLog(`Operation failed: ${error.message || "Error occurred while canceling subscription"}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    subscriptions,
    activeSubscription,
    loading,
    fetchUserSubscriptions,
    createSubscription,
    toggleAutoRenew,
    cancelSubscription
  };
} 