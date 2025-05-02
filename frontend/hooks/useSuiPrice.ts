import { useState, useEffect, useCallback } from 'react';

export function useSuiPrice(logCallback?: (message: string) => void) {
  const [suiPrice, setSuiPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  
  const getSuiPrice = useCallback(async (): Promise<number> => {
    setIsLoadingPrice(true);
    try {
      // 使用CoinGecko API获取SUI的价格
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd');
      if (!response.ok) {
        throw new Error(`获取价格失败: ${response.status}`);
      }
      
      const data = await response.json();
      const price = data.sui?.usd;
      
      if (!price) {
        throw new Error('无法获取SUI价格数据');
      }
      
      if (logCallback) {
        logCallback(`获取SUI实时价格: 1 SUI = $${price} USD`);
      }
      setSuiPrice(price);
      return price;
    } catch (error: any) {
      console.error('获取SUI价格失败:', error);
      if (logCallback) {
        logCallback(`获取SUI价格失败: ${error.message}，使用默认价格`);
      }
      // 获取失败时使用默认价格
      const defaultPrice = 0.1; // 假设1 SUI = 0.1 USD
      setSuiPrice(defaultPrice);
      return defaultPrice;
    } finally {
      setIsLoadingPrice(false);
    }
  }, [logCallback]);
  
  useEffect(() => {
    getSuiPrice();
    
    // 每5分钟更新一次价格
    const priceInterval = setInterval(() => {
      getSuiPrice();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(priceInterval);
  }, [getSuiPrice]);
  
  return { suiPrice, isLoadingPrice, getSuiPrice };
}
