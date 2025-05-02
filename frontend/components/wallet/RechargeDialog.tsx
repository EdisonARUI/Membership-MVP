import { useState } from 'react';

type RechargeDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  zkLoginAddress: string | null;
  suiPrice: number | null;
  isLoadingPrice: boolean;
  onRecharge: (amount: string) => Promise<void>;
};

export function RechargeDialog({
  isOpen,
  onClose,
  zkLoginAddress,
  suiPrice,
  isLoadingPrice,
  onRecharge
}: RechargeDialogProps) {
  const [rechargeAmount, setRechargeAmount] = useState<string>('');
  const [isRecharging, setIsRecharging] = useState(false);
  const [rechargeResult, setRechargeResult] = useState<{success: boolean, message: string} | null>(null);

  if (!isOpen) return null;

  const handleRecharge = async () => {
    if (!rechargeAmount || isNaN(Number(rechargeAmount)) || Number(rechargeAmount) <= 0) {
      setRechargeResult({
        success: false,
        message: '请输入有效的充值金额'
      });
      return;
    }
    
    if (!zkLoginAddress) {
      setRechargeResult({
        success: false,
        message: '未找到钱包地址，请先完成 zkLogin 流程'
      });
      return;
    }
    
    setIsRecharging(true);
    setRechargeResult(null);
    
    try {
      await onRecharge(rechargeAmount);
      
      const suiAmount = Number(rechargeAmount) / (suiPrice || 0.1);
      
      setRechargeResult({
        success: true,
        message: `成功充值约 ${suiAmount.toFixed(2)} SUI 到您的钱包`
      });
      
      // 充值成功后3秒关闭对话框
      setTimeout(() => {
        onClose();
        setRechargeResult(null);
        setRechargeAmount('');
      }, 3000);
      
    } catch (error: any) {
      setRechargeResult({
        success: false,
        message: `充值失败: ${error.message}`
      });
    } finally {
      setIsRecharging(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
        <div className="mb-4">
          <h3 className="text-xl font-bold">充值 SUI</h3>
          <p className="text-slate-400 mt-2">
            输入您想充值的 USD 金额，系统将自动转换为等值的 SUI 并充值到您的钱包
          </p>
        </div>
        
        <div className="py-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="recharge-amount" className="block text-sm font-medium text-slate-300 mb-1">
                充值金额 (USD)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">$</span>
                <input
                  id="recharge-amount"
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="输入金额"
                  className="w-full py-2 pl-8 pr-4 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  disabled={isRecharging}
                />
              </div>
              {rechargeAmount && !isNaN(Number(rechargeAmount)) && (
                <p className="text-xs text-slate-400 mt-1">
                  预计可获得: {Number(rechargeAmount) / (suiPrice || 0.1)} SUI 
                  {isLoadingPrice ? ' (价格加载中...)' : suiPrice ? ` (1 SUI ≈ $${suiPrice} USD)` : ' (使用默认价格)'}
                </p>
              )}
            </div>
            
            {rechargeResult && (
              <div className={`p-3 rounded-md ${
                rechargeResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {rechargeResult.message}
              </div>
            )}
            
            <div className="flex justify-between items-center text-sm text-slate-400">
              <span>来源:</span>
              <span>Sui Devnet Faucet</span>
            </div>
            
            <div className="flex justify-between items-center text-sm text-slate-400">
              <span>目标钱包:</span>
              <span className="truncate max-w-[200px]">
                {zkLoginAddress || '未找到钱包地址'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 mt-6">
          <button 
            className="px-4 py-2 rounded-md border border-slate-600 hover:bg-slate-700"
            onClick={onClose}
            disabled={isRecharging}
          >
            取消
          </button>
          <button 
            className="px-4 py-2 rounded-md bg-yellow-400 hover:bg-yellow-300 text-black font-medium flex items-center"
            onClick={handleRecharge}
            disabled={isRecharging}
          >
            {isRecharging ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                处理中...
              </>
            ) : (
              "确认充值"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
