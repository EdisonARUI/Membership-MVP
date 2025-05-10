/**
 * Interfaces for Deposit functionality
 * These interfaces define the contract between frontend and backend for deposit operations
 */

/**
 * Request parameters for deposit operation
 */
export interface DepositRequest {
  /**
   * Wallet address of the deposit recipient
   */
  recipient: string;
  
  /**
   * Amount to deposit (in standard units, not wei/smaller units)
   */
  amount: number;
}

/**
 * Response data for deposit operation
 */
export interface DepositResponse {
  /**
   * Whether the deposit operation was successful
   */
  success: boolean;
  
  /**
   * Transaction ID if deposit was successful
   */
  txId?: string;
  
  /**
   * Amount that was deposited
   */
  amount?: number;
  
  /**
   * Error message if deposit failed
   */
  error?: string;
  
  /**
   * Additional error details for debugging
   */
  errorDetails?: any;
}

/**
 * Single deposit transaction record
 */
export interface DepositRecord {
  /**
   * Unique identifier for the deposit record
   */
  id: string;
  
  /**
   * Wallet address of the user who made the deposit
   */
  user_address: string;
  
  /**
   * Amount that was deposited
   */
  amount: number;
  
  /**
   * Blockchain transaction hash
   */
  tx_hash: string;
  
  /**
   * Timestamp when the deposit was created
   */
  created_at: string;
}

/**
 * Response data for fetching deposit records
 */
export interface DepositRecordsResponse {
  /**
   * Whether the request was successful
   */
  success: boolean;
  
  /**
   * Array of deposit records if request was successful
   */
  records?: DepositRecord[];
  
  /**
   * Error message if request failed
   */
  error?: string;
  
  /**
   * Total number of deposit records (for pagination)
   */
  total_count?: number;
  
  /**
   * Total amount deposited across all records
   */
  total_amount?: number;
}
