import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { DepositRequest, DepositResponse, DepositRecordsResponse } from '@/interfaces/Deposit';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { API_ENDPOINTS } from '../app/api/endpoints';
import { api } from '../app/api/clients';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { PartialZkLoginSignature } from '@/interfaces/ZkLogin';
import { SUI_RPC_URL } from '@/config/client';
import { useZkLoginTransactions } from '@/hooks/useZkLoginTransactions';

const FULLNODE_URL = SUI_RPC_URL;

export class DepositService {
  private client: SuiClient;

  constructor() {
    this.client = new SuiClient({ url: FULLNODE_URL });
  }

  // 使用合约的public_mint方法实现充值
  async mintUSDT(
    zkLoginAddress: string,
    amount: number,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ): Promise<DepositResponse> {
    try {
      // 创建交易
      const txb = new Transaction();
      txb.setSender(zkLoginAddress);
      
      // 调用public_mint方法
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.COIN.PACKAGE_ID}::test_usdt::public_mint`,
        arguments: [
          txb.object(CONTRACT_ADDRESSES.COIN.MINT_AUTHORITY_OBJECT_ID),
          txb.pure.u64(amount)
        ]
      });
      
      // 执行交易
      const { signAndExecuteTransaction } = useZkLoginTransactions();
      const txResult = await signAndExecuteTransaction(
        txb,
        zkLoginAddress,
        ephemeralKeyPair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      if (txResult.digest) {
        // 记录充值
        try {
          await api.post(
            API_ENDPOINTS.DEPOSIT.RECORDS,
            {
              user_address: zkLoginAddress,
              tx_hash: txResult.digest,
              amount: amount
            }
          );
        } catch (e) {
          console.warn("记录充值结果失败:", e);
        }
        
        return {
          success: true,
          txId: txResult.digest,
          amount: amount
        };
      } else {
        return {
          success: false,
          error: "交易执行失败",
          errorDetails: txResult.effects?.status?.error
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `充值过程中发生错误: ${error.message || '未知异常'}`,
        errorDetails: error
      };
    }
  }
  
  // 获取充值记录
  async getDepositRecords(userAddress: string, limit: number = 10): Promise<DepositRecordsResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (userAddress) queryParams.append('user', userAddress);
      if (limit) queryParams.append('limit', limit.toString());
      
      const url = `${API_ENDPOINTS.DEPOSIT.RECORDS}?${queryParams.toString()}`;
      const response = await api.get<DepositRecordsResponse>(url);
      
      return response.data as DepositRecordsResponse;
    } catch (error: any) {
      throw new Error(`获取充值记录失败: ${error.message || '未知异常'}`);
    }
  }
}
