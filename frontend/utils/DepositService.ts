/**
 * Service for managing USDT deposit operations on SUI blockchain
 * Provides methods for minting test USDT tokens and retrieving deposit records
 */
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

/**
 * Service for managing USDT deposits on the SUI blockchain
 * Handles minting test tokens and tracking deposit records
 */
export class DepositService {
  private client: SuiClient;

  /**
   * Creates a new instance of DepositService
   * Initializes SUI client connection
   */
  constructor() {
    this.client = new SuiClient({ url: FULLNODE_URL });
  }

  /**
   * Mints test USDT tokens using the contract's public_mint method
   * 
   * @param {string} zkLoginAddress - The user's zkLogin address
   * @param {number} amount - The amount of tokens to mint
   * @param {Ed25519Keypair} ephemeralKeyPair - Ephemeral keypair for transaction signing
   * @param {PartialZkLoginSignature} partialSignature - Partial zkLogin signature
   * @param {string} userSalt - User's salt value
   * @param {any} decodedJwt - Decoded JWT information
   * @returns {Promise<DepositResponse>} Result of the minting operation
   */
  async mintUSDT(
    zkLoginAddress: string,
    amount: number,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ): Promise<DepositResponse> {
    try {
      // Create transaction
      const txb = new Transaction();
      txb.setSender(zkLoginAddress);
      
      // Call public_mint method
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.COIN.PACKAGE_ID}::test_usdt::public_mint`,
        arguments: [
          txb.object(CONTRACT_ADDRESSES.COIN.MINT_AUTHORITY_OBJECT_ID),
          txb.pure.u64(amount)
        ]
      });
      
      // Execute transaction
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
        // Record deposit
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
          console.warn("Failed to record deposit result:", e);
        }
        
        return {
          success: true,
          txId: txResult.digest,
          amount: amount
        };
      } else {
        return {
          success: false,
          error: "Transaction execution failed",
          errorDetails: txResult.effects?.status?.error
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Error during deposit process: ${error.message || 'Unknown exception'}`,
        errorDetails: error
      };
    }
  }
  
  /**
   * Retrieves deposit records for a specific user
   * 
   * @param {string} userAddress - Address of the user to get records for
   * @param {number} limit - Maximum number of records to retrieve (default: 10)
   * @returns {Promise<DepositRecordsResponse>} List of deposit records
   * @throws {Error} If the API request fails
   */
  async getDepositRecords(userAddress: string, limit: number = 10): Promise<DepositRecordsResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (userAddress) queryParams.append('user', userAddress);
      if (limit) queryParams.append('limit', limit.toString());
      
      const url = `${API_ENDPOINTS.DEPOSIT.RECORDS}?${queryParams.toString()}`;
      const response = await api.get<DepositRecordsResponse>(url);
      
      return response.data as DepositRecordsResponse;
    } catch (error: any) {
      throw new Error(`Failed to get deposit records: ${error.message || 'Unknown exception'}`);
    }
  }
}
