/**
 * Context for managing deposit operations
 * Provides functionality for handling USDT deposits and deposit record management
 * 
 * RESTful API Design:
 * - Resource: Deposit
 * - Operations: Create (POST), Read (GET)
 * - Endpoints:
 *   - POST /api/deposits - Create new deposit
 *   - GET /api/deposits - Get deposit records
 */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useZkLoginParams } from '@/hooks/useZkLoginParams';
import { useLogContext } from '@/contexts/LogContext';
import { DepositService } from '@/utils/DepositService';
import { DepositResponse, DepositRecordsResponse } from '@/interfaces/Deposit';
import { useUser } from '@/hooks/useUser';
import { useZkLogin } from './ZkLoginContext';
import { toast } from 'react-hot-toast';
import { usePathname } from 'next/navigation';
import React from 'react';

/**
 * Interface defining the shape of the deposit context
 * Contains state and methods for deposit operations
 * 
 * State Management:
 * - loading: Operation status indicator
 * - result: Operation result with success/failure status
 * - depositRecords: Collection of deposit transactions
 * - showDepositDialog: UI state for deposit modal
 */
interface DepositContextType {
  loading: boolean;
  result: {
    success: boolean;
    amount?: number;
    message?: string;
  } | null;
  depositRecords: DepositRecordsResponse | null;
  
  executeDeposit: (usdAmount: string) => Promise<DepositResponse | null>;
  fetchDepositRecords: (limit?: number) => Promise<void>;
  resetResult: () => void;
  showDepositDialog: boolean;
  setShowDepositDialog: (show: boolean) => void;
}

const DepositContext = createContext<DepositContextType | undefined>(undefined);

/**
 * Provider component for deposit context
 * Manages deposit operations and state
 * 
 * Features:
 * - USDT token minting
 * - Deposit record management
 * - Transaction signing with zkLogin
 * - Rate limiting for API calls
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 */
export function DepositProvider({ children }: { children: ReactNode }) {
  const { addLog } = useLogContext();
  const { user } = useUser();
  const { state: zkLoginState } = useZkLogin();
  const { zkLoginAddress } = zkLoginState;
  
  const { prepareKeypair, getZkLoginParams } = useZkLoginParams();
  
  // State management for deposit operations
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    amount?: number;
    message?: string;
  } | null>(null);
  const [depositRecords, setDepositRecords] = useState<DepositRecordsResponse | null>(null);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);
  
  const depositService = new DepositService();
  const pathname = usePathname();

  /**
   * Fetches deposit records for the current user
   * Implements throttling to prevent excessive API calls
   * 
   * API Endpoint: GET /api/deposits
   * Query Parameters:
   * - limit: Maximum number of records to fetch
   * 
   * @param {number} limit - Maximum number of records to fetch
   * @returns {Promise<void>}
   */
  const fetchDepositRecords = useCallback(async (limit: number = 10): Promise<void> => {
    try {
      const now = Date.now();
      if (now - lastUpdated < 2000) {
        return;
      }
      
      if (zkLoginAddress) {
        const response = await depositService.getDepositRecords(zkLoginAddress, limit);
        
        if (response.success) {
          setDepositRecords(response);
          setLastUpdated(now);
        } else {
          addLog(`Failed to fetch deposit records: ${response.error}`);
          setDepositRecords(null);
        }
      }
    } catch (error: any) {
      addLog(`Error fetching deposit records: ${error.message}`);
      setDepositRecords(null);
      toast.error(`Failed to fetch deposit records: ${error.message}`);
    }
  }, [zkLoginAddress, depositService, addLog, lastUpdated]);
  
  /**
   * Executes a deposit operation
   * Handles USDT token minting and transaction signing
   * 
   * API Endpoint: POST /api/deposits
   * Request Body:
   * - usdAmount: Amount in USD to deposit
   * 
   * Authentication:
   * - Requires zkLogin authentication
   * - Uses ephemeral keypair for transaction signing
   * 
   * @param {string} usdAmount - Amount in USD to deposit
   * @returns {Promise<DepositResponse|null>} Deposit operation result
   */
  const executeDeposit = useCallback(async (usdAmount: string): Promise<DepositResponse | null> => {
    if (!user || !zkLoginAddress) {
      toast.error('Please login and complete zkLogin authentication first');
      return null;
    }
    
    setLoading(true);
    setResult(null);
    addLog("Starting deposit process...");
    
    try {
      const usdValue = parseFloat(usdAmount);
      
      // Convert USD amount to testUSDT token amount (considering precision)
      const tokenAmount = usdValue * 10**8; // Assuming token precision is 8 decimals
      
      // Prepare ephemeral keypair
      const keypair = prepareKeypair();
      if (!keypair) {
        throw new Error("Unable to get ephemeral keypair");
      }
      
      // Get zkLogin parameters
      const params = getZkLoginParams();
      if (!params) {
        throw new Error("Unable to get zkLogin parameters");
      }
      
      const { partialSignature, userSalt, decodedJwt } = params;
      
      // Execute deposit
      addLog(`Calling contract to deposit ${tokenAmount} testUSDT...`);
      const depositResult = await depositService.mintUSDT(
        zkLoginAddress,
        tokenAmount,
        keypair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      if (depositResult.success) {
        setResult({
          success: true,
          amount: usdValue,
          message: `Deposit successful! You have received ${usdValue} USDT`
        });
        
        // Update records
        setTimeout(() => {
          fetchDepositRecords();
        }, 1000);
        
        return depositResult;
      } else {
        setResult({
          success: false,
          message: depositResult.error || 'Deposit failed'
        });
        
        return depositResult;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      addLog(`Error during deposit process: ${errorMessage}`);
      
      setResult({
        success: false,
        message: `Deposit failed: ${errorMessage}`
      });
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [user, zkLoginAddress, addLog, depositService, prepareKeypair, getZkLoginParams, fetchDepositRecords]);
  
  /**
   * Resets the deposit operation result
   * Used to clear previous operation state
   */
  const resetResult = useCallback(() => {
    setResult(null);
  }, []);
  
  // Add rehydrate effect
  React.useEffect(() => {
    if (sessionStorage.getItem('justLoggedIn')) {
      fetchDepositRecords();
      sessionStorage.removeItem('justLoggedIn');
    }
  }, [pathname]);
  
  const value = {
    loading,
    result,
    depositRecords,
    executeDeposit,
    fetchDepositRecords,
    resetResult,
    showDepositDialog,
    setShowDepositDialog
  };
  
  return (
    <DepositContext.Provider value={value}>
      {children}
    </DepositContext.Provider>
  );
}

/**
 * Hook for accessing deposit context
 * Must be used within a DepositProvider
 * 
 * @returns {DepositContextType} Deposit context value
 * @throws {Error} If used outside of DepositProvider
 */
export function useDeposit() {
  const context = useContext(DepositContext);
  if (context === undefined) {
    throw new Error('useDeposit must be used within a DepositProvider');
  }
  return context;
}
