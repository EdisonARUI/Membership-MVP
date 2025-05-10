import { useState, useEffect } from 'react';
import { X, Loader2, CreditCard } from 'lucide-react';
import { useDeposit } from '@/contexts/DepositContext';
import { DepositRecord } from '@/interfaces/Deposit';

interface DepositDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// 本地UI展示用充值记录类型
interface DepositHistoryItem {
  amount: number;
  time: Date;
}

export default function DepositDialog({ isOpen, onClose }: DepositDialogProps) {
  const [depositAmount, setDepositAmount] = useState<string>('');
  const { 
    loading, 
    result, 
    depositRecords,
    executeDeposit,
    fetchDepositRecords,
    resetResult 
  } = useDeposit();
  
  // 转换API记录为UI展示格式
  const convertToHistoryItems = (records: DepositRecord[]): DepositHistoryItem[] => {
    return records.map(record => ({
      amount: record.amount,
      time: new Date(record.created_at)
    }));
  };
  
  // 组件加载时获取充值历史
  useEffect(() => {
    if (isOpen) {
      fetchDepositRecords(10);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  
  // 处理充值按钮点击
  const handleDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) {
      return;
    }
    
    await executeDeposit(depositAmount);
  };
  
  if (!isOpen) return null;
  
  // 准备显示的历史记录
  const historyItems: DepositHistoryItem[] = depositRecords && depositRecords.records 
    ? convertToHistoryItems(depositRecords.records)
    : [];
  
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
          <CreditCard className="h-12 w-12 text-yellow-400 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-white">充值USDT</h2>
          <p className="text-gray-400 mt-1">使用zkLogin身份验证，在区块链上安全充值</p>
        </div>
        
        {/* 充值表单 */}
        <div className="mb-6">
          <div className="relative mb-4">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">$</span>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="输入充值金额 (USD)"
              className="w-full py-2 pl-8 pr-4 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
              disabled={loading}
            />
          </div>
          
          <button 
            onClick={handleDeposit}
            disabled={loading || !depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0}
            className={`w-full py-3 rounded-lg text-center font-semibold ${
              loading || !depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-yellow-400 hover:bg-yellow-500 text-black'
            } transition-colors`}
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5 mx-auto" />
            ) : (
              "确认充值"
            )}
          </button>
        </div>
        
        {/* 充值结果 */}
        {result && (
          <div className={`p-4 rounded-lg mb-6 ${
            result.success ? 'bg-green-900 bg-opacity-30' : 'bg-red-900 bg-opacity-30'
          }`}>
            <p className="text-center">{result.message}</p>
          </div>
        )}
        
        {/* 充值历史 */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            我的充值历史
            {depositRecords?.total_count ? (
              <span className="text-sm font-normal text-gray-400 ml-2">
                共 {depositRecords.total_count} 次，总计 {depositRecords.total_amount ? depositRecords.total_amount / 10**8 : 0} USDT
              </span>
            ) : null}
          </h3>
          <div className="space-y-2">
            {historyItems.length > 0 ? (
              historyItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-700 bg-opacity-50">
                  <div className="overflow-hidden">
                    <p className="text-xs text-gray-400">{item.time.toLocaleString()}</p>
                  </div>
                  <div className="font-semibold text-yellow-400">
                    +{item.amount / 10**8} USDT
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">暂无充值记录</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
