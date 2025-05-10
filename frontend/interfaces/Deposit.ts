export interface DepositRequest {
  recipient: string;
  amount: number;
}

export interface DepositResponse {
  success: boolean;
  txId?: string;
  amount?: number;
  error?: string;
  errorDetails?: any;
}

export interface DepositRecord {
  id: string;
  user_address: string;
  amount: number;
  tx_hash: string;
  created_at: string;
}

export interface DepositRecordsResponse {
  success: boolean;
  records?: DepositRecord[];
  error?: string;
  total_count?: number;
  total_amount?: number;
}
