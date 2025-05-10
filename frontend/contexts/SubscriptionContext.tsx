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
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showSubscriptionManagement, setShowSubscriptionManagement] = useState(false);

  // 获取订阅计划 - 不需要用户登录
  useEffect(() => {
    const loadPlans = async () => {
      await fetchPlans();
    };
    loadPlans();
  }, []);

  // 获取用户订阅 - 需要用户登录
  useEffect(() => {
    if (user && zkLoginAddress) {
      fetchSubscriptions();
    }
  }, [user, zkLoginAddress]);

  // 获取用户订阅
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await subscriptionService.getSubscriptionStatus();
      
      if (response.success) {
        setSubscriptions(response.subscriptions || []);
        setActiveSubscription(response.active_subscription || null);
      } else {
        toast.error(`获取订阅信息失败: ${response.error}`);
        addLog(`错误: 获取订阅信息失败 - ${response.error}`);
      }
    } catch (error: any) {
      console.error('获取订阅信息失败:', error);
      addLog(`错误: 获取订阅信息失败 - ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取订阅计划
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await subscriptionService.getSubscriptionPlans();
      
      if (response.success) {
        setPlans(response.plans || []);
      } else {
        toast.error(`获取订阅计划失败: ${response.error}`);
        addLog(`错误: 获取订阅计划失败 - ${response.error}`);
      }
    } catch (error: any) {
      console.error('获取订阅计划失败:', error);
      addLog(`错误: 获取订阅计划失败 - ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 处理订阅按钮点击
  const handleSubscribeClick = async (plan: SubscriptionPlan) => {
    if (!user) {
      window.location.href = '/sign-in';
      return;
    }
    
    if (!zkLoginAddress) {
      toast.error('请先完成zkLogin认证');
      return;
    }
    
    try {
      setLoadingAction(true);
      addLog(`开始创建订阅: ${plan.name}`);
      
      // 准备zkLogin参数
      const keypair = prepareKeypair();
      if (!keypair) {
        throw new Error('无法获取临时密钥对');
      }
      
      const params = getZkLoginParams();
      if (!params) {
        throw new Error('无法获取zkLogin参数');
      }
      
      const { partialSignature, userSalt, decodedJwt } = params;
      
      // 创建订阅请求
      const request: CreateSubscriptionRequest = {
        plan_id: plan.id,
        auto_renew: true
      };
      
      // 调用订阅服务
      const result = await subscriptionService.createSubscription(
        request,
        zkLoginAddress,
        keypair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      if (result.success) {
        toast.success('订阅创建成功');
        addLog(`订阅创建成功: ${plan.name}`);
        await fetchSubscriptions();
        setShowSubscriptionManagement(true);
      } else {
        toast.error(`订阅创建失败: ${result.error}`);
        addLog(`订阅创建失败: ${result.error}`);
      }
    } catch (error: any) {
      console.error('创建订阅失败:', error);
      toast.error(`创建订阅失败: ${error.message}`);
      addLog(`错误: 创建订阅失败 - ${error.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  // 切换自动续订
  const handleToggleAutoRenew = async (subscriptionId: string, currentAutoRenew: boolean) => {
    try {
      setLoadingAction(true);
      
      const result = await subscriptionService.toggleAutoRenew({
        subscription_id: subscriptionId,
        auto_renew: !currentAutoRenew
      });
      
      if (result.success) {
        toast.success(currentAutoRenew ? '已关闭自动续订' : '已开启自动续订');
        addLog(currentAutoRenew ? '已关闭自动续订' : '已开启自动续订');
        await fetchSubscriptions();
        return true;
      } else {
        toast.error(`更新自动续订失败: ${result.error}`);
        addLog(`更新自动续订失败: ${result.error}`);
        return false;
      }
    } catch (error: any) {
      console.error('更新自动续订失败:', error);
      toast.error(`更新自动续订失败: ${error.message}`);
      addLog(`错误: 更新自动续订失败 - ${error.message}`);
      return false;
    } finally {
      setLoadingAction(false);
    }
  };

  // 取消订阅
  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!zkLoginAddress) {
      toast.error('请先完成zkLogin认证');
      return false;
    }
    
    try {
      setLoadingAction(true);
      addLog(`开始取消订阅: ${subscriptionId}`);
      
      // 准备zkLogin参数
      const keypair = prepareKeypair();
      if (!keypair) {
        throw new Error('无法获取临时密钥对');
      }
      
      const params = getZkLoginParams();
      if (!params) {
        throw new Error('无法获取zkLogin参数');
      }
      
      const { partialSignature, userSalt, decodedJwt } = params;
      
      // 取消订阅请求
      const result = await subscriptionService.cancelSubscription(
        { subscription_id: subscriptionId },
        zkLoginAddress,
        keypair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      if (result.success) {
        toast.success('订阅已取消');
        addLog('订阅已取消');
        await fetchSubscriptions();
        setShowSubscriptionManagement(false);
        return true;
      } else {
        toast.error(`取消订阅失败: ${result.error}`);
        addLog(`取消订阅失败: ${result.error}`);
        return false;
      }
    } catch (error: any) {
      console.error('取消订阅失败:', error);
      toast.error(`取消订阅失败: ${error.message}`);
      addLog(`错误: 取消订阅失败 - ${error.message}`);
      return false;
    } finally {
      setLoadingAction(false);
    }
  };

  // 续订订阅
  const handleRenewSubscription = async (subscriptionId: string) => {
    if (!zkLoginAddress) {
      toast.error('请先完成zkLogin认证');
      return false;
    }
    
    try {
      setLoadingAction(true);
      addLog(`开始续订订阅: ${subscriptionId}`);
      
      // 准备zkLogin参数
      const keypair = prepareKeypair();
      if (!keypair) {
        throw new Error('无法获取临时密钥对');
      }
      
      const params = getZkLoginParams();
      if (!params) {
        throw new Error('无法获取zkLogin参数');
      }
      
      const { partialSignature, userSalt, decodedJwt } = params;
      
      // 续订请求
      const request: RenewSubscriptionRequest = {
        subscription_id: subscriptionId
      };
      
      // 调用订阅服务
      const result = await subscriptionService.renewSubscription(
        request,
        zkLoginAddress,
        keypair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      if (result.success) {
        toast.success('订阅续订成功');
        addLog('订阅续订成功');
        await fetchSubscriptions();
        return true;
      } else {
        toast.error(`订阅续订失败: ${result.error}`);
        addLog(`订阅续订失败: ${result.error}`);
        return false;
      }
    } catch (error: any) {
      console.error('续订订阅失败:', error);
      toast.error(`续订订阅失败: ${error.message}`);
      addLog(`错误: 续订订阅失败 - ${error.message}`);
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

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
} 