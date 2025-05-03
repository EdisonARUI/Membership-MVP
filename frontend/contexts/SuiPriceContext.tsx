'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

interface SuiPriceContextType {
  suiPrice: number | null;
  isLoadingPrice: boolean;
  getSuiPrice: () => Promise<number>;
}

const SuiPriceContext = createContext<SuiPriceContextType | undefined>(undefined);

export function SuiPriceProvider({ 
  children,
  onLog
}: { 
  children: ReactNode;
  onLog?: (message: string) => void;
}) {
  const [suiPrice, setSuiPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  
  // 使用 useRef 存储 onLog 以保持稳定引用
  const onLogRef = useRef(onLog);
  
  // 更新 ref 值
  useEffect(() => {
    onLogRef.current = onLog;
  }, [onLog]);
  
  const log = useCallback((message: string) => {
    if (onLogRef.current) {
      onLogRef.current(message);
    }
  }, []);
  
  const getSuiPrice = useCallback(async (): Promise<number> => {
    setIsLoadingPrice(true);
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd');
      if (!response.ok) {
        throw new Error(`获取价格失败: ${response.status}`);
      }
      
      const data = await response.json();
      const price = data.sui?.usd;
      
      if (!price) {
        throw new Error('无法获取SUI价格数据');
      }
      
      log(`获取SUI实时价格: 1 SUI = $${price} USD`);
      setSuiPrice(price);
      return price;
    } catch (error: any) {
      if (onLogRef.current) {
        log(`获取SUI价格失败: ${error.message}，使用默认价格`);
      }
      // 获取失败时使用默认价格
      const defaultPrice = 0.1;
      setSuiPrice(defaultPrice);
      return defaultPrice;
    } finally {
      setIsLoadingPrice(false);
    }
  }, [log]);
  
  useEffect(() => {
    // 初次加载获取价格
    getSuiPrice();
    
    // 每5分钟更新一次价格
    const priceInterval = setInterval(() => {
      getSuiPrice();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(priceInterval);
  }, [getSuiPrice]);
  
  return (
    <SuiPriceContext.Provider value={{ suiPrice, isLoadingPrice, getSuiPrice }}>
      {children}
    </SuiPriceContext.Provider>
  );
}

export function useSuiPrice() {
  const context = useContext(SuiPriceContext);
  if (context === undefined) {
    throw new Error('useSuiPrice must be used within a SuiPriceProvider');
  }
  return context;
} 