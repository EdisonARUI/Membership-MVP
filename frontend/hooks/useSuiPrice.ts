/**
 * Hook for fetching and tracking SUI token price
 * Provides real-time price data for SUI tokens in USD
 */
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for managing SUI token price
 * Fetches real-time price from CoinGecko API and schedules periodic updates
 * 
 * @param {Function} logCallback - Optional callback for logging price updates
 * @returns {Object} SUI price state and methods
 */
export function useSuiPrice(logCallback?: (message: string) => void) {
  const [suiPrice, setSuiPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  
  // Use useRef to store logCallback for stable reference
  const logCallbackRef = useRef(logCallback);
  
  // Update ref value
  useEffect(() => {
    logCallbackRef.current = logCallback;
  }, [logCallback]);
  
  /**
   * Fetches current SUI token price from CoinGecko
   * Falls back to default value if API request fails
   * 
   * @returns {Promise<number>} Current SUI price in USD
   */
  const getSuiPrice = useCallback(async (): Promise<number> => {
    setIsLoadingPrice(true);
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd');
      if (!response.ok) {
        throw new Error(`Failed to get price: ${response.status}`);
      }
      
      const data = await response.json();
      const price = data.sui?.usd;
      
      if (!price) {
        throw new Error('Unable to get SUI price data');
      }
      
      if (logCallbackRef.current) {
        logCallbackRef.current(`Real-time SUI price: 1 SUI = $${price} USD`);
      }
      setSuiPrice(price);
      return price;
    } catch (error: any) {
      console.error('Failed to get SUI price:', error);
      if (logCallbackRef.current) {
        logCallbackRef.current(`Failed to get SUI price: ${error.message}, using default price`);
      }
      // Use default price when fetch fails
      const defaultPrice = 0.1;
      setSuiPrice(defaultPrice);
      return defaultPrice;
    } finally {
      setIsLoadingPrice(false);
    }
  }, []); // Remove dependencies
  
  useEffect(() => {
    getSuiPrice();
    
    // Update price every 5 minutes
    const priceInterval = setInterval(() => {
      getSuiPrice();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(priceInterval);
  }, [getSuiPrice]);
  
  return { suiPrice, isLoadingPrice, getSuiPrice };
}