/**
 * Interfaces for Lottery functionality
 * These interfaces define the contract between frontend and backend for lottery operations
 */

/**
 * Result of a lottery draw operation
 */
export interface DrawResult {
  /**
   * Whether the draw operation was successful
   */
  success: boolean;
  
  /**
   * Transaction ID if draw was successful
   */
  txId?: string;
  
  /**
   * Amount won in the draw (0 if no win)
   */
  amount?: number;
  
  /**
   * Error message if draw failed
   */
  error?: string;
  
  /**
   * Additional error details for debugging
   */
  errorDetails?: any;
}
  
/**
 * API request parameters for draw operation
 */
export interface DrawRequestParams {
  /**
   * Transaction data required for the draw
   */
  txData: {
    /**
     * Address of the transaction sender
     */
    sender: string;
    
    /**
     * Contract package ID to execute
     */
    contractPackage: string;
    
    /**
     * Contract module name
     */
    contractModule: string;
    
    /**
     * Method name to call on the contract
     */
    method: string;
    
    /**
     * Arguments to pass to the contract method
     */
    args: string[];
  };
  
  /**
   * Wallet address of the sender
   */
  senderAddress: string;
}
  
/**
 * API response data for draw operation
 */
export interface DrawResponseData {
  /**
   * Whether the draw operation was successful
   */
  success: boolean;
  
  /**
   * Transaction ID if draw was successful
   */
  txId?: string;
  
  /**
   * Whether the user won the draw
   */
  randomWin?: boolean;
  
  /**
   * Amount won in the draw (0 if no win)
   */
  winAmount?: number;
  
  /**
   * Error message if draw failed
   */
  error?: string;
  
  /**
   * Additional message or information about the draw
   */
  message?: string;
}

/**
 * Single lottery record for a user
 */
export interface LotteryRecord {
  /**
   * Unique identifier for the lottery record
   */
  id: string;
  
  /**
   * Wallet address of the player
   */
  player_address: string;
  
  /**
   * Amount won in the draw (0 if no win)
   */
  win_amount: number;
  
  /**
   * Blockchain transaction hash
   */
  tx_hash: string;
  
  /**
   * Timestamp when the draw was created
   */
  created_at: string;
}

/**
 * Response data for fetching lottery history
 */
export interface LotteryHistoryResponse {
  /**
   * Whether the request was successful
   */
  success: boolean;
  
  /**
   * Array of lottery records if request was successful
   */
  records?: LotteryRecord[];
  
  /**
   * Error message if request failed
   */
  error?: string;
  
  /**
   * Total number of lottery records (for pagination)
   */
  total_count?: number;
  
  /**
   * Total amount won across all records
   */
  total_amount?: number;
}

/**
 * Lottery statistics for a user or period
 */
export interface LotteryStats {
  /**
   * Whether the request was successful
   */
  success: boolean;
  
  /**
   * Error message if request failed
   */
  error?: string;
  
  /**
   * Total number of draws
   */
  total_count?: number;
  
  /**
   * Total amount won across all draws
   */
  total_amount?: number;
  
  /**
   * Number of winning draws
   */
  win_count?: number;
}