export interface DrawResult {
    success: boolean;
    txId?: string;
    amount?: number;
    error?: string;
  }
  
  // API请求参数接口
  export interface DrawRequestParams {
    txData: {
      sender: string;
      contractPackage: string;
      contractModule: string;
      method: string;
      args: string[];
    };
    senderAddress: string;
  }
  
  // API响应接口
  export interface DrawResponseData {
    success: boolean;
    txId?: string;
    randomWin?: boolean;
    winAmount?: number;
    error?: string;
    message?: string;
  }

  export interface LotteryRecord {
    id: string;
    player_address: string;
    win_amount: number;
    tx_hash: string;
    created_at: string;
  }

  export interface LotteryHistoryResponse {
    success: boolean;
    records?: LotteryRecord[];
    error?: string;
    total_count?: number;
    total_amount?: number;
  }