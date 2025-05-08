import { useState, useEffect } from 'react';
import { X, Loader2, Gift } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useZkLogin } from '@/contexts/ZkLoginContext';
import { useLog } from '@/hooks/useLog';
import { toast } from 'react-hot-toast';
import { LotteryService } from '@/utils/lotteryService';
import { LotteryRecord, LotteryHistoryResponse, DrawResult } from '@/interfaces/Lottery';

interface LotteryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// 本地UI展示用历史记录类型
interface LotteryHistoryItem {
  player: string;
  amount: number;
  time: Date;
}

export default function LotteryDialog({ isOpen, onClose }: LotteryDialogProps) {
  const { user } = useUser();
  const { state } = useZkLogin();
  const { zkLoginAddress } = state;
  const { addLog } = useLog();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    amount?: number;
    message?: string;
  } | null>(null);
  const [lotteryHistory, setLotteryHistory] = useState<LotteryHistoryItem[]>([]);
  const [totalStats, setTotalStats] = useState<{
    count: number;
    amount: number;
  }>({ count: 0, amount: 0 });

  useEffect(() => {
    if (isOpen) {
      fetchLotteryHistory();
      
      // 确保zkLogin初始化
      if (!zkLoginAddress) {
        addLog("zkLogin地址未初始化，请先完成登录");
      }
    }
  }, [isOpen, zkLoginAddress]);

  // 转换API记录为UI展示格式
  const convertToHistoryItems = (records: LotteryRecord[]): LotteryHistoryItem[] => {
    return records.map(record => ({
      player: record.player_address,
      amount: record.win_amount,
      time: new Date(record.created_at)
    }));
  };

  const fetchLotteryHistory = async () => {
    try {
      if (zkLoginAddress) {
        const lotteryService = new LotteryService();
        // 获取用户的抽奖历史
        const response = await lotteryService.getLotteryHistory(zkLoginAddress, 10, false);
        
        if (response.success && response.records) {
          setLotteryHistory(convertToHistoryItems(response.records));
          
          // 设置统计数据
          setTotalStats({
            count: response.total_count || 0,
            amount: response.total_amount || 0
          });
          return;
        }
      }
      
      // 如果无法获取真实数据，使用空数组
      setLotteryHistory([]);
      setTotalStats({ count: 0, amount: 0 });
    } catch (error) {
      console.error('获取抽奖历史失败:', error);
      setLotteryHistory([]);
    }
  };

  const handleDraw = async () => {
    if (!user || !zkLoginAddress) {
      toast.error('请先登录并完成zkLogin认证');
      return;
    }

    setLoading(true);
    setResult(null);
    addLog("开始抽奖...");

    try {
      // 调用抽奖服务，抽奖逻辑转移到LotteryService中处理
      const lotteryService = new LotteryService();
      addLog("调用抽奖合约...");
      const drawResult = await lotteryService.instantDraw();
      
      addLog(`抽奖结果: ${JSON.stringify(drawResult)}`);
      
      if (drawResult.success) {
        setResult({
          success: true,
          amount: drawResult.amount,
          message: drawResult.amount ? `恭喜！你赢得了 ${drawResult.amount / 1000000000} SUI` : '很遗憾，未中奖'
        });
        
        // 重新获取最新抽奖历史，包括本次结果
        fetchLotteryHistory();
      } else {
        setResult({
          success: false,
          message: drawResult.error || '抽奖失败'
        });
        toast.error(`抽奖失败: ${drawResult.error}`);
      }
    } catch (error: any) {
      addLog(`抽奖过程中发生错误: ${error.message}`);
      console.error('抽奖错误:', error);
      setResult({
        success: false,
        message: `抽奖失败: ${error.message}`
      });
      toast.error(`抽奖失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="text-center mb-6">
          <Gift className="h-12 w-12 text-yellow-400 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-white">即时抽奖</h2>
          <p className="text-gray-400 mt-1">使用 zkLogin 身份验证，在区块链上实时抽奖</p>
        </div>
        
        {/* 抽奖按钮 */}
        <div className="mb-6">
          <button 
            onClick={handleDraw}
            disabled={loading || !user || !zkLoginAddress}
            className={`w-full py-3 rounded-lg text-center font-semibold ${
              loading || !user || !zkLoginAddress 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-yellow-400 hover:bg-yellow-500 text-black'
            } transition-colors`}
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5 mx-auto" />
            ) : !user ? (
              '请先登录'
            ) : !zkLoginAddress ? (
              '请完成 zkLogin 认证'
            ) : (
              '立即抽奖'
            )}
          </button>
        </div>
        
        {/* 抽奖结果 */}
        {result && (
          <div className={`p-4 rounded-lg mb-6 ${
            result.success && result.amount ? 'bg-green-900 bg-opacity-30' : 'bg-red-900 bg-opacity-30'
          }`}>
            <p className="text-center">{result.message}</p>
          </div>
        )}
        
        {/* 抽奖历史 */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            我的抽奖 
            {totalStats.count > 0 && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                共 {totalStats.count} 次，已赢得 {totalStats.amount / 1000000000} SUI
              </span>
            )}
          </h3>
          <div className="space-y-2">
            {lotteryHistory.length > 0 ? (
              lotteryHistory.map((item, idx) => (
                <div key={idx} className={`flex justify-between items-center p-2 rounded ${item.amount > 0 ? 'bg-green-800 bg-opacity-20' : 'bg-slate-700 bg-opacity-50'}`}>
                  <div className="overflow-hidden">
                    <p className="text-xs text-gray-400">{item.time.toLocaleString()}</p>
                  </div>
                  <div className={`font-semibold ${item.amount > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {item.amount > 0 
                      ? `+${item.amount / 1000000000} SUI` 
                      : '未中奖'}
                  </div>
                </div>
              ))
            ) : zkLoginAddress ? (
              <p className="text-gray-500 text-center py-4">暂无抽奖记录</p>
            ) : (
              <p className="text-gray-500 text-center py-4">请先完成 zkLogin 认证</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 