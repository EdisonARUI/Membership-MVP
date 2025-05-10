/**
 * Context for managing deposit operations
 * Provides functionality for handling USDT deposits and deposit record management
 */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useZkLoginParams } from '@/hooks/useZkLoginParams';
import { useLogContext } from '@/contexts/LogContext';
import { DepositService } from '@/utils/DepositService';
import { DepositResponse, DepositRecordsResponse } from '@/interfaces/Deposit';
import { useUser } from '@/hooks/useUser';
import { useZkLogin } from './ZkLoginContext';
import { toast } from 'react-hot-toast';

/**
 * Interface defining the shape of the deposit context
 * Contains state and methods for deposit operations
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
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 */
export function DepositProvider({ children }: { children: ReactNode }) {
  const { addLog } = useLogContext();
  const { user } = useUser();
  const { state: zkLoginState } = useZkLogin();
  const { zkLoginAddress } = zkLoginState;
  
  const { prepareKeypair, getZkLoginParams } = useZkLoginParams();
  
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

  /**
   * Fetches deposit records for the current user
   * Implements throttling to prevent excessive API calls
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
   * @param {string} usdAmount - Amount in USD to deposit
   * @returns {Promise<DepositResponse|null>} Deposit operation result
   */
  const executeDeposit = useCallback(async (usdAmount: string): Promise<DepositResponse | null> => {
    if (!user || !zkLoginAddress) {
      toast.error('Please login and complete zkLogin authentication first');
      toast.error('请先登录并完成zkLogin认证');
      return null;
    }
    
    setLoading(true);
    setResult(null);
    addLog("开始充值流程...");
    
    try {
      const usdValue = parseFloat(usdAmount);
      
      // 将USD金额转换为testUSDT代币金额（注意精度）
      const tokenAmount = usdValue * 10**8; // 假设代币精度为8位
      
      // 准备临时密钥对
      const keypair = prepareKeypair();
      if (!keypair) {
        throw new Error("无法获取临时密钥对");
      }
      
      // 获取zkLogin所需参数
      const params = getZkLoginParams();
      if (!params) {
        throw new Error("无法获取zkLogin参数");
      }
      
      const { partialSignature, userSalt, decodedJwt } = params;
      
      // 执行充值
      addLog(`调用合约充值 ${tokenAmount} testUSDT...`);
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
          message: `充值成功！您已获得 ${usdValue} USDT`
        });
        
        // 更新记录
        setTimeout(() => {
          fetchDepositRecords();
        }, 1000);
        
        return depositResult;
      } else {
        setResult({
          success: false,
          message: depositResult.error || '充值失败'
        });
        
        return depositResult;
      }
    } catch (error: any) {
      const errorMessage = error.message || '未知异常';
      addLog(`充值过程中发生错误: ${errorMessage}`);
      
      setResult({
        success: false,
        message: `充值失败: ${errorMessage}`
      });
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [user, zkLoginAddress, addLog, depositService, prepareKeypair, getZkLoginParams, fetchDepositRecords]);
  
  const resetResult = useCallback(() => {
    setResult(null);
  }, []);
  
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

export function useDeposit() {
  const context = useContext(DepositContext);
  if (context === undefined) {
    throw new Error('useDeposit must be used within a DepositProvider');
  }
  return context;
}
