import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useLogContext } from '@/contexts/LogContext';

export function useSubscription() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { addLog } = useLogContext();
  const supabase = createClient();

  // 获取用户订阅
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
      console.error('获取订阅信息失败:', error);
      addLog("错误: 获取订阅信息失败");
    } finally {
      setLoading(false);
    }
  };

  // 创建订阅
  const createSubscription = async (planPeriod: string, price: number, userId: string) => {
    try {
      setLoading(true);
      
      // 1. 获取选择的计划ID
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('period', planPeriod)
        .single();
      
      if (planError) throw planError;
      
      // 2. 计算日期
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
      
      // 3. 创建订阅记录
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
      
      // 4. 创建支付记录
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
      
      // 5. 刷新数据
      await fetchUserSubscriptions();
      
      addLog(`订阅成功：您已成功订阅${planPeriod === 'monthly' ? '月付' : planPeriod === 'quarterly' ? '季付' : '年付'}计划`);
      
      return true;
    } catch (error: any) {
      console.error('创建订阅失败:', error);
      addLog(`订阅失败: ${error.message || "创建订阅时发生错误"}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 更新订阅（切换自动续订状态）
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
      addLog(currentAutoRenew ? "已关闭自动续订" : "已开启自动续订");
      return true;
    } catch (error: any) {
      console.error('更新订阅失败:', error);
      addLog(`操作失败: ${error.message || "更新订阅时发生错误"}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 取消订阅
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
      addLog("订阅已取消");
      return true;
    } catch (error: any) {
      console.error('取消订阅失败:', error);
      addLog(`操作失败: ${error.message || "取消订阅时发生错误"}`);
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