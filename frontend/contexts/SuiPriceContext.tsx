/**
 * SuiPriceContext provides real-time SUI price data and related operations.
 * It fetches the SUI price from an external API, manages loading state, and logs price fetch events.
 *
 * Features:
 * - Fetches SUI price from CoinGecko API
 * - Provides loading state for price fetch operations
 * - Logs price fetch results and errors
 * - Updates price at regular intervals
 */
'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLogContext } from '@/contexts/LogContext';

/**
 * SuiPriceContextType defines the shape of the SUI price context, including state and operations.
 */
interface SuiPriceContextType {
  /**
   * The current SUI price in USD, or null if not available
   */
  suiPrice: number | null;
  /**
   * Indicates if the price is currently being loaded
   */
  isLoadingPrice: boolean;
  /**
   * Fetches the latest SUI price from the API
   * @returns {Promise<number>} The fetched SUI price
   */
  getSuiPrice: () => Promise<number>;
}

/**
 * SuiPriceContext provides the SUI price state and operations to consumers
 */
const SuiPriceContext = createContext<SuiPriceContextType | undefined>(undefined);

/**
 * SuiPriceProvider supplies the SUI price context to its children
 * Fetches and updates the SUI price at regular intervals
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 */
export function SuiPriceProvider({ 
  children
}: { 
  children: ReactNode;
}) {
  const [suiPrice, setSuiPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const { addLog } = useLogContext();
  
  /**
   * Fetches the latest SUI price from CoinGecko API
   * Logs the result and updates state
   *
   * @returns {Promise<number>} The fetched SUI price
   */
  const getSuiPrice = useCallback(async (): Promise<number> => {
    setIsLoadingPrice(true);
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd');
      if (!response.ok) {
        throw new Error(`Failed to fetch price: ${response.status}`);
      }
      
      const data = await response.json();
      const price = data.sui?.usd;
      
      if (!price) {
        throw new Error('Unable to get SUI price data');
      }
      
      addLog(`Fetched SUI real-time price: 1 SUI = $${price} USD`);
      setSuiPrice(price);
      return price;
    } catch (error: any) {
      addLog(`Failed to fetch SUI price: ${error.message}, using default price`);
      // Use default price if fetch fails
      const defaultPrice = 0.1;
      setSuiPrice(defaultPrice);
      return defaultPrice;
    } finally {
      setIsLoadingPrice(false);
    }
  }, [addLog]);
  
  useEffect(() => {
    // Fetch price on initial load
    getSuiPrice();
    
    // Update price every 5 minutes
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

/**
 * useSuiPrice provides access to the SUI price context
 * Must be used within a SuiPriceProvider
 *
 * @returns {SuiPriceContextType} SUI price context value
 * @throws {Error} If used outside of SuiPriceProvider
 */
export function useSuiPrice() {
  const context = useContext(SuiPriceContext);
  if (context === undefined) {
    throw new Error('useSuiPrice must be used within a SuiPriceProvider');
  }
  return context;
} 