import { useState, useEffect } from 'react';
import { X, Loader2, Gift } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useZkLogin } from '@/contexts/ZkLoginContext';
import { useLog } from '@/hooks/useLog';
import { toast } from 'react-hot-toast';
import { ZkLoginStorage } from '@/utils/storage';
import { SuiService } from '@/utils/sui';
import { LotteryService } from '@/utils/lotteryService';

interface LotteryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LotteryDialog({ isOpen, onClose }: LotteryDialogProps) {
  const { user } = useUser();
  const { zkLoginAddress } = useZkLogin();
  const { addLog } = useLog();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    amount?: number;
    message?: string;
  } | null>(null);
  const [lotteryHistory, setLotteryHistory] = useState<Array<{
    player: string;
    amount: number;
    time: Date;
  }>>([]);

  useEffect(() => {
    // 可以在这里加载抽奖历史记录
    if (isOpen) {
      fetchLotteryHistory();
    }
  }, [isOpen]);

  const fetchLotteryHistory = async () => {
    // 这里可以从数据库或链上加载抽奖历史
    // 目前使用模拟数据
    setLotteryHistory([
      {
        player: '0x7d87c83c2f71bb9388262c06f0eec7b57ee651bf1892a7a6fd6f1b1b931ac7fc',
        amount: 1000000000, // 1 SUI
        time: new Date(Date.now() - 3600000)
      },
      {
        player: '0x8aa5e821e6cdce5601d62099d5ac068ca96b3d241a379a0e0b59756d7dcadb65',
        amount: 500000000, // 0.5 SUI
        time: new Date(Date.now() - 7200000)
      }
    ]);
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
      // 从存储中获取临时密钥对
      const ephemeralKeypair = ZkLoginStorage.getEphemeralKeypair();
      if (!ephemeralKeypair) {
        throw new Error('找不到临时密钥对，无法完成抽奖');
      }

      // 重建密钥对
      const keypair = SuiService.recreateKeypairFromStored(ephemeralKeypair.keypair);
      
      // 调用抽奖合约
      const lotteryService = new LotteryService();
      const drawResult = await lotteryService.instantDraw(keypair);
      
      addLog(`抽奖结果: ${JSON.stringify(drawResult)}`);
      
      if (drawResult.success) {
        setResult({
          success: true,
          amount: drawResult.amount,
          message: drawResult.amount ? `恭喜！你赢得了 ${drawResult.amount / 1000000000} SUI` : '很遗憾，未中奖'
        });
        
        // 如果中奖，添加到历史记录
        if (drawResult.amount) {
          setLotteryHistory(prev => [
            {
              player: zkLoginAddress,
              amount: drawResult.amount!,
              time: new Date()
            },
            ...prev
          ]);
        }
        
        toast.success(drawResult.amount ? '恭喜，抽奖成功！' : '未中奖，再接再厉！');
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
          <h3 className="text-lg font-semibold text-white mb-2">最近中奖</h3>
          <div className="space-y-2">
            {lotteryHistory.length > 0 ? (
              lotteryHistory.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-700 bg-opacity-50 p-2 rounded">
                  <div className="overflow-hidden">
                    <p className="text-sm text-gray-300 truncate">{item.player.slice(0, 8)}...{item.player.slice(-4)}</p>
                    <p className="text-xs text-gray-400">{item.time.toLocaleString()}</p>
                  </div>
                  <div className="text-yellow-400 font-semibold">
                    {item.amount / 1000000000} SUI
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-2">暂无中奖记录</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 