/**
 * Context for managing lottery operations
 * Provides functionality for lottery draws, history, and statistics
 */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useZkLoginParams } from '@/hooks/useZkLoginParams';
import { useLogContext } from '@/contexts/LogContext';
import { LotteryService } from '@/utils/LotteryService';
import { DrawResult, LotteryHistoryResponse, LotteryStats } from '@/interfaces/Lottery';
import { useUser } from '@/hooks/useUser';
import { useZkLogin } from './ZkLoginContext';
import { toast } from 'react-hot-toast';

/**
 * Interface defining the shape of the lottery context
 * Contains state and methods for lottery operations
 */
interface LotteryContextType {
  // State
  loading: boolean;
  result: {
    success: boolean;
    amount?: number;
    message?: string;
  } | null;
  lotteryHistory: LotteryHistoryResponse | null;
  lotteryStats: LotteryStats | null;
  
  // Methods
  executeDraw: () => Promise<DrawResult | null>;
  fetchLotteryHistory: (limit?: number, winnersOnly?: boolean) => Promise<void>;
  fetchLotteryStats: (period?: string) => Promise<void>;
  resetResult: () => void;
  resetUpdateTimestamp: () => void;
}

const LotteryContext = createContext<LotteryContextType | undefined>(undefined);

/**
 * Provider component for lottery context
 * Manages lottery operations and state
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 */
export function LotteryProvider({ children }: { children: ReactNode }) {
  const { addLog } = useLogContext();
  const { user } = useUser();
  const { state: zkLoginState } = useZkLogin();
  const { zkLoginAddress } = zkLoginState;
  
  // Use zkLogin parameters hook
  const { prepareKeypair, getZkLoginParams } = useZkLoginParams();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    amount?: number;
    message?: string;
  } | null>(null);
  const [lotteryHistory, setLotteryHistory] = useState<LotteryHistoryResponse | null>(null);
  const [lotteryStats, setLotteryStats] = useState<LotteryStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<{
    history: number;
    stats: number;
  }>({
    history: 0,
    stats: 0
  });
  
  // Service instance
  const lotteryService = new LotteryService();

  /**
   * Fetches lottery history
   * Implements throttling to prevent excessive API calls
   * 
   * @param {number} limit - Maximum number of records to fetch
   * @param {boolean} winnersOnly - Whether to fetch only winning records
   * @returns {Promise<void>}
   */
  const fetchLotteryHistory = useCallback(async (limit: number = 10, winnersOnly: boolean = false): Promise<void> => {
    try {
      // Add throttling logic to prevent duplicate requests
      const now = Date.now();
      if (now - lastUpdated.history < 2000) { // No requests within 2 seconds
        return;
      }
      
      if (zkLoginAddress) {
        // Get lottery history
        const response = await lotteryService.getLotteryHistory(zkLoginAddress, limit, winnersOnly);
        
        if (response.success) {
          setLotteryHistory(response);
          setLastUpdated(prev => ({ ...prev, history: now }));
        } else {
          addLog(`Failed to fetch lottery history: ${response.error}`);
          setLotteryHistory(null);
        }
      }
    } catch (error: any) {
      // Log detailed error information
      const errorMessage = error.message || 'Unknown error';
      addLog(`Error fetching lottery history: ${errorMessage}`);
      
      // Log additional details if available
      if (error.details) {
        addLog(`Error details: ${JSON.stringify(error.details)}`);
      }
      
      setLotteryHistory(null);
      toast.error(`Failed to fetch lottery history: ${errorMessage}`);
    }
  }, [zkLoginAddress, lotteryService, addLog, lastUpdated.history]);
  
  /**
   * Fetches lottery statistics
   * Implements throttling to prevent excessive API calls
   * 
   * @param {string} period - Statistics period
   * @returns {Promise<void>}
   */
  const fetchLotteryStats = useCallback(async (period: string = 'all'): Promise<void> => {
    try {
      // Add throttling logic to prevent duplicate requests
      const now = Date.now();
      if (now - lastUpdated.stats < 2000) { // No requests within 2 seconds
        return;
      }
      
      if (zkLoginAddress) {
        // Get lottery statistics
        const stats = await lotteryService.getLotteryStats(zkLoginAddress, period);
        
        if (stats.success) {
          setLotteryStats(stats);
          setLastUpdated(prev => ({ ...prev, stats: now }));
        } else {
          addLog(`Failed to fetch lottery statistics: ${stats.error}`);
          setLotteryStats(null);
        }
      }
    } catch (error: any) {
      // Log detailed error information
      const errorMessage = error.message || 'Unknown error';
      addLog(`Error fetching lottery statistics: ${errorMessage}`);
      
      // Log additional details if available
      if (error.details) {
        addLog(`Error details: ${JSON.stringify(error.details)}`);
      }
      
      setLotteryStats(null);
      toast.error(`Failed to fetch lottery statistics: ${errorMessage}`);
    }
  }, [zkLoginAddress, lotteryService, addLog, lastUpdated.stats]);
  
  /**
   * Executes a lottery draw
   * Handles transaction signing and execution
   * 
   * @returns {Promise<DrawResult|null>} Draw operation result
   */
  const executeDraw = useCallback(async (): Promise<DrawResult | null> => {
    // Check if user is logged in
    if (!user || !zkLoginAddress) {
      toast.error('Please login and complete zkLogin authentication first');
      return null;
    }
    
    setLoading(true);
    setResult(null);
    addLog("Starting lottery draw process...");
    
    try {
      // Prepare ephemeral keypair
      const keypair = prepareKeypair();
      if (!keypair) {
        addLog("Draw failed: Unable to get ephemeral keypair");
        toast.error("Draw failed: Unable to get ephemeral keypair");
        setResult({
          success: false,
          message: "Draw failed: Unable to get ephemeral keypair"
        });
        return null;
      }
      
      // Get zkLogin parameters
      const params = getZkLoginParams();
      if (!params) {
        addLog("Draw failed: Unable to get zkLogin parameters");
        toast.error("Draw failed: Unable to get zkLogin parameters");
        setResult({
          success: false,
          message: "Draw failed: Unable to get zkLogin parameters"
        });
        return null;
      }
      
      const { partialSignature, userSalt, decodedJwt } = params;
      
      // Execute draw
      addLog("Calling lottery contract...");
      const drawResult = await lotteryService.instantDraw(
        zkLoginAddress,
        keypair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      addLog(`Draw result: ${JSON.stringify(drawResult)}`);
      
      if (drawResult.success) {
        // Set result
        setResult({
          success: true,
          amount: drawResult.amount,
          message: drawResult.amount 
            ? `Congratulations! You won ${drawResult.amount / 1000000000} SUI` 
            : 'Sorry, no win this time'
        });
        
        // Update data after successful draw
        // Delay to allow database update
        setTimeout(() => {
          fetchLotteryHistory();
          fetchLotteryStats();
        }, 1000);
        
        return drawResult;
      } else {
        // Handle failure, add more error details to logs
        const errorDetails = drawResult.errorDetails 
          ? `Details: ${JSON.stringify(drawResult.errorDetails)}` 
          : '';
        
        addLog(`Draw failed: ${drawResult.error || 'Unknown error'}`);
        if (errorDetails) {
          addLog(errorDetails);
        }
        
        setResult({
          success: false,
          message: drawResult.error || 'Draw failed'
        });
        
        toast.error(`Draw failed: ${drawResult.error}`);
        return drawResult;
      }
    } catch (error: any) {
      // Handle exception
      const errorMessage = error.message || 'Unknown error';
      addLog(`Error during draw process: ${errorMessage}`);
      
      // Log additional details if available
      if (error.details) {
        addLog(`Error details: ${JSON.stringify(error.details)}`);
      }
      
      setResult({
        success: false,
        message: `Draw failed: ${errorMessage}`
      });
      
      toast.error(`Draw failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        errorDetails: error.details || error.stack
      };
    } finally {
      setLoading(false);
    }
  }, [user, zkLoginAddress, addLog, lotteryService, prepareKeypair, getZkLoginParams, fetchLotteryHistory, fetchLotteryStats]);
  
  /**
   * Resets the draw result
   */
  const resetResult = useCallback(() => {
    setResult(null);
  }, []);

  /**
   * Resets data update timestamps
   * Ensures fresh data fetch when dialog reopens
   */
  const resetUpdateTimestamp = useCallback(() => {
    setLastUpdated({
      history: 0,
      stats: 0
    });
  }, []);
  
  // Context value
  const value = {
    loading,
    result,
    lotteryHistory,
    lotteryStats,
    executeDraw,
    fetchLotteryHistory,
    fetchLotteryStats,
    resetResult,
    resetUpdateTimestamp
  };
  
  return (
    <LotteryContext.Provider value={value}>
      {children}
    </LotteryContext.Provider>
  );
}

/**
 * Hook for accessing lottery context
 * Must be used within a LotteryProvider
 * 
 * @returns {LotteryContextType} Lottery context value
 * @throws {Error} If used outside of LotteryProvider
 */
export function useLottery() {
  const context = useContext(LotteryContext);
  if (context === undefined) {
    throw new Error('useLottery must be used within a LotteryProvider');
  }
  return context;
} 