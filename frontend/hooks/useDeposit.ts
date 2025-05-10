import { useState, useCallback } from 'react';
import { useSuiPrice } from '@/contexts/SuiPriceContext';
import { useLogContext } from '@/contexts/LogContext';

const FAUCET_URL = 'https://faucet.devnet.sui.io/v2/gas';

export function useRecharge() {
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const { addLog } = useLogContext();
  const { suiPrice, isLoadingPrice, getSuiPrice } = useSuiPrice();
  
  const handleRecharge = async (amount: string) => {
    const zkLoginAddress = localStorage.getItem('zkLogin_address');
    if (!zkLoginAddress) {
      throw new Error('未找到钱包地址，请先完成 zkLogin 流程');
    }
    
    // 获取实时SUI价格
    const currentPrice = suiPrice || await getSuiPrice();
    
    // 转换USD到SUI: USD金额 / SUI单价 = SUI数量
    const suiAmount = Number(amount) / currentPrice;
    
    addLog(`开始充值流程，USD金额: ${amount}，SUI价格: ${currentPrice} USD/SUI，转换为SUI: ${suiAmount.toFixed(2)}`);
    
    // 调用 Sui Devnet Faucet
    const response = await fetch(FAUCET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        FixedAmountRequest: {
          recipient: zkLoginAddress,
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`充值失败: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    addLog(`充值成功: ${JSON.stringify(result)}`);
    
    return suiAmount;
  };
  
  return { 
    showRechargeDialog, 
    setShowRechargeDialog, 
    handleRecharge,
    suiPrice,
    isLoadingPrice
  };
}
