import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useZkLoginParams } from '@/hooks/useZkLoginParams';
import { useLogContext } from '@/contexts/LogContext';
import { LotteryService } from '@/utils/LotteryService';
import { DrawResult, LotteryHistoryResponse, LotteryStats } from '@/interfaces/Lottery';
import { useUser } from '@/hooks/useUser';
import { useZkLogin } from './ZkLoginContext';
import { toast } from 'react-hot-toast';

interface LotteryContextType {
  // 状态
  loading: boolean;
  result: {
    success: boolean;
    amount?: number;
    message?: string;
  } | null;
  lotteryHistory: LotteryHistoryResponse | null;
  lotteryStats: LotteryStats | null;
  
  // 方法
  executeDraw: () => Promise<DrawResult | null>;
  fetchLotteryHistory: (limit?: number, winnersOnly?: boolean) => Promise<void>;
  fetchLotteryStats: (period?: string) => Promise<void>;
  resetResult: () => void;
  resetUpdateTimestamp: () => void;
}

const LotteryContext = createContext<LotteryContextType | undefined>(undefined);

export function LotteryProvider({ children }: { children: ReactNode }) {
  const { addLog } = useLogContext();
  const { user } = useUser();
  const { state: zkLoginState } = useZkLogin();
  const { zkLoginAddress } = zkLoginState;
  
  // 使用zkLogin参数Hook
  const { prepareKeypair, getZkLoginParams } = useZkLoginParams();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    amount?: number;
    message?: string;
  } | null>(null);
  const [lotteryHistory, setLotteryHistory] = useState<LotteryHistoryResponse | null>(null);
  const [lotteryStats, setLotteryStats] = useState<LotteryStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<{
    history: number;
    stats: number;
  }>({
    history: 0,
    stats: 0
  });
  
  // 服务实例
  const lotteryService = new LotteryService();

  /**
   * 获取抽奖历史
   * @param limit 获取数量
   * @param winnersOnly 是否只获取中奖记录
   */
  const fetchLotteryHistory = useCallback(async (limit: number = 10, winnersOnly: boolean = false): Promise<void> => {
    try {
      // 添加节流逻辑，避免短时间内重复请求
      const now = Date.now();
      if (now - lastUpdated.history < 2000) { // 2秒内不重复请求
        return;
      }
      
      if (zkLoginAddress) {
        // 获取抽奖历史
        const response = await lotteryService.getLotteryHistory(zkLoginAddress, limit, winnersOnly);
        
        if (response.success) {
          setLotteryHistory(response);
          setLastUpdated(prev => ({ ...prev, history: now }));
        } else {
          addLog(`获取抽奖历史失败: ${response.error}`);
          setLotteryHistory(null);
        }
      }
    } catch (error: any) {
      // 详细记录错误信息
      const errorMessage = error.message || '未知错误';
      addLog(`获取抽奖历史异常: ${errorMessage}`);
      
      // 如果有详细信息，也记录下来
      if (error.details) {
        addLog(`错误详情: ${JSON.stringify(error.details)}`);
      }
      
      setLotteryHistory(null);
      toast.error(`获取抽奖历史失败: ${errorMessage}`);
    }
  }, [zkLoginAddress, lotteryService, addLog, lastUpdated.history]);
  
  /**
   * 获取抽奖统计
   * @param period 统计周期
   */
  const fetchLotteryStats = useCallback(async (period: string = 'all'): Promise<void> => {
    try {
      // 添加节流逻辑，避免短时间内重复请求
      const now = Date.now();
      if (now - lastUpdated.stats < 2000) { // 2秒内不重复请求
        return;
      }
      
      if (zkLoginAddress) {
        // 获取抽奖统计
        const stats = await lotteryService.getLotteryStats(zkLoginAddress, period);
        
        if (stats.success) {
          setLotteryStats(stats);
          setLastUpdated(prev => ({ ...prev, stats: now }));
        } else {
          addLog(`获取抽奖统计失败: ${stats.error}`);
          setLotteryStats(null);
        }
      }
    } catch (error: any) {
      // 详细记录错误信息
      const errorMessage = error.message || '未知错误';
      addLog(`获取抽奖统计异常: ${errorMessage}`);
      
      // 如果有详细信息，也记录下来
      if (error.details) {
        addLog(`错误详情: ${JSON.stringify(error.details)}`);
      }
      
      setLotteryStats(null);
      toast.error(`获取抽奖统计失败: ${errorMessage}`);
    }
  }, [zkLoginAddress, lotteryService, addLog, lastUpdated.stats]);
  
  /**
   * 执行抽奖
   * @returns 抽奖结果
   */
  const executeDraw = useCallback(async (): Promise<DrawResult | null> => {
    // 检查用户是否登录
    if (!user || !zkLoginAddress) {
      toast.error('请先登录并完成zkLogin认证');
      return null;
    }
    
    setLoading(true);
    setResult(null);
    addLog("开始抽奖流程...");
    
    try {
      // 准备临时密钥对
      const keypair = prepareKeypair();
      if (!keypair) {
        addLog("抽奖失败：无法获取临时密钥对");
        toast.error("抽奖失败：无法获取临时密钥对");
        setResult({
          success: false,
          message: "抽奖失败：无法获取临时密钥对"
        });
        return null;
      }
      
      // 获取zkLogin所需参数
      const params = getZkLoginParams();
      if (!params) {
        addLog("抽奖失败：无法获取zkLogin参数");
        toast.error("抽奖失败：无法获取zkLogin参数");
        setResult({
          success: false,
          message: "抽奖失败：无法获取zkLogin参数"
        });
        return null;
      }
      
      const { partialSignature, userSalt, decodedJwt } = params;
      
      // 执行抽奖
      addLog("调用抽奖合约...");
      const drawResult = await lotteryService.instantDraw(
        zkLoginAddress,
        keypair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      addLog(`抽奖结果: ${JSON.stringify(drawResult)}`);
      
      if (drawResult.success) {
        // 设置结果
        setResult({
          success: true,
          amount: drawResult.amount,
          message: drawResult.amount 
            ? `恭喜！你赢得了 ${drawResult.amount / 1000000000} SUI` 
            : '很遗憾，未中奖'
        });
        
        // 抽奖成功后务必更新数据，无需条件判断
        // 延迟一小段时间让数据库更新
        setTimeout(() => {
          fetchLotteryHistory();
          fetchLotteryStats();
        }, 1000);
        
        return drawResult;
      } else {
        // 处理失败，添加更多错误细节到日志
        const errorDetails = drawResult.errorDetails 
          ? `详细信息: ${JSON.stringify(drawResult.errorDetails)}` 
          : '';
        
        addLog(`抽奖失败: ${drawResult.error || '未知错误'}`);
        if (errorDetails) {
          addLog(errorDetails);
        }
        
        setResult({
          success: false,
          message: drawResult.error || '抽奖失败'
        });
        
        toast.error(`抽奖失败: ${drawResult.error}`);
        return drawResult;
      }
    } catch (error: any) {
      // 处理异常
      const errorMessage = error.message || '未知异常';
      addLog(`抽奖过程中发生错误: ${errorMessage}`);
      
      // 如果有详细信息，也记录下来
      if (error.details) {
        addLog(`错误详情: ${JSON.stringify(error.details)}`);
      }
      
      setResult({
        success: false,
        message: `抽奖失败: ${errorMessage}`
      });
      
      toast.error(`抽奖失败: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        errorDetails: error.details || error.stack
      };
    } finally {
      setLoading(false);
    }
  }, [user, zkLoginAddress, addLog, lotteryService, prepareKeypair, getZkLoginParams, fetchLotteryHistory, fetchLotteryStats]);
  
  /**
   * 重置抽奖结果
   */
  const resetResult = useCallback(() => {
    setResult(null);
  }, []);

  /**
   * 重置数据更新时间戳
   * 用于在对话框关闭后，确保下次打开时能获取最新数据
   */
  const resetUpdateTimestamp = useCallback(() => {
    setLastUpdated({
      history: 0,
      stats: 0
    });
  }, []);
  
  // 上下文值
  const value = {
    loading,
    result,
    lotteryHistory,
    lotteryStats,
    executeDraw,
    fetchLotteryHistory,
    fetchLotteryStats,
    resetResult,
    resetUpdateTimestamp
  };
  
  return (
    <LotteryContext.Provider value={value}>
      {children}
    </LotteryContext.Provider>
  );
}

export function useLottery() {
  const context = useContext(LotteryContext);
  if (context === undefined) {
    throw new Error('useLottery must be used within a LotteryProvider');
  }
  return context;
} 