import { useEffect } from 'react';
import { X, Loader2, Gift } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useZkLogin } from '@/contexts/ZkLoginContext';
import { useLogContext } from '@/contexts/LogContext';
import { useLottery } from '@/contexts/LotteryContext';
import { LotteryRecord } from '@/interfaces/Lottery';

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
  const { addLog } = useLogContext();
  
  // 使用LotteryContext
  const { 
    loading, 
    result, 
    lotteryHistory,
    lotteryStats, 
    executeDraw,
    fetchLotteryHistory,
    fetchLotteryStats,
    resetUpdateTimestamp
  } = useLottery();

  // 转换API记录为UI展示格式
  const convertToHistoryItems = (records: LotteryRecord[]): LotteryHistoryItem[] => {
    return records.map(record => ({
      player: record.player_address,
      amount: record.win_amount,
      time: new Date(record.created_at)
    }));
  };
  
  // 组件加载时获取抽奖历史和统计
  useEffect(() => {
    if (isOpen && zkLoginAddress) {
      fetchLotteryHistory(10, false);
      fetchLotteryStats('all');
    } else if (isOpen && !zkLoginAddress) {
      addLog("zkLogin地址未初始化，请先完成登录");
    }
    
    // 对话框关闭时，重置时间戳以确保下次打开时获取最新数据
    return () => {
      if (!isOpen) {
        resetUpdateTimestamp();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, zkLoginAddress]);

  // 处理抽奖按钮点击
  const handleDraw = async () => {
    if (!user || !zkLoginAddress) {
      addLog("抽奖失败：未登录或未初始化zkLogin地址");
      return;
    }

    addLog("开始抽奖...");
    await executeDraw();
  };

  if (!isOpen) return null;

  // 准备显示的历史记录
  const historyItems: LotteryHistoryItem[] = lotteryHistory && lotteryHistory.records 
    ? convertToHistoryItems(lotteryHistory.records)
    : [];
    
  // 获取统计数据
  const totalStats = {
    count: lotteryStats?.total_count || 0,
    amount: lotteryStats?.total_amount || 0
  };

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
            {historyItems.length > 0 ? (
              historyItems.map((item, idx) => (
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