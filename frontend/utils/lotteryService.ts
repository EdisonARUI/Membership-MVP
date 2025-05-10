/**
 * Service for managing lottery operations on the SUI blockchain
 * Provides functionality for instant draws and retrieving lottery history
 */
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { COMMON_CONTRACT, CONTRACT_ADDRESSES } from '../config/contracts';
import { toast } from 'react-hot-toast';
import { DrawResult, LotteryHistoryResponse, LotteryStats } from '../interfaces/Lottery';
import { API_ENDPOINTS } from '../app/api/endpoints';
import { api } from '../app/api/clients';
import { useZkLoginTransactions } from '@/hooks/useZkLoginTransactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { PartialZkLoginSignature } from '@/interfaces/ZkLogin';
import { SUI_RPC_URL } from '@/config/client';
// Sui client configuration
const FULLNODE_URL = SUI_RPC_URL;

/**
 * Custom error class for lottery-specific errors
 * Provides additional details for debugging
 */
export class LotteryError extends Error {
  /**
   * Creates a new LotteryError instance
   * 
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   */
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'LotteryError';
  }
}

/**
 * Service for managing lottery functionality
 * Handles instant draws, history retrieval, and statistics
 */
export class LotteryService {
  private client: SuiClient;

  /**
   * Creates a new LotteryService instance
   * Initializes the SUI client
   */
  constructor() {
    // Create own SuiClient instance
    this.client = new SuiClient({ url: FULLNODE_URL });
  }

  /**
   * Performs an instant lottery draw 
   * Calls the contract's instant_draw method and processes the result
   * 
   * @param {string} zkLoginAddress - User's zkLogin address
   * @param {Ed25519Keypair} ephemeralKeyPair - Ephemeral keypair for transaction signing
   * @param {PartialZkLoginSignature} partialSignature - Partial zkLogin signature
   * @param {string} userSalt - User's salt value
   * @param {any} decodedJwt - Decoded JWT information
   * @returns {Promise<DrawResult>} Result of the lottery draw
   */
  async instantDraw(
    zkLoginAddress: string,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ): Promise<DrawResult> {
    try {
      // Validate parameters
      if (!zkLoginAddress) {
        throw new LotteryError('zkLogin address not provided');
      }
      
      if (!ephemeralKeyPair) {
        throw new LotteryError('Ephemeral keypair not provided');
      }
      
      if (!partialSignature) {
        throw new LotteryError('zkLogin partial signature not provided', { signature: partialSignature });
      }
      
      if (!userSalt) {
        throw new LotteryError('User salt not provided');
      }
      
      if (!decodedJwt) {
        throw new LotteryError('JWT data not provided');
      }
      
      // Create transaction
      const txb = new Transaction();
      
      // Set sender
      txb.setSender(zkLoginAddress);
      
      // Add lottery draw call
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.LOTTERY.PACKAGE_ID}::${CONTRACT_ADDRESSES.LOTTERY.MODULE_NAME}::instant_draw`,
        arguments: [
          txb.object(CONTRACT_ADDRESSES.LOTTERY_POOL.LOTTERY_POOL_OBJECT_ID),
          txb.object(COMMON_CONTRACT.RANDOM_NUMBER_GENERATOR),
          txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID)
        ]
      });
      
      // Use useZkLoginTransactions to execute transaction
      const { signAndExecuteTransaction } = useZkLoginTransactions();
      
      // Execute transaction using sign and execute method
      const txResult = await signAndExecuteTransaction(
        txb,
        zkLoginAddress,
        ephemeralKeyPair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      // If transaction hash exists, consider transaction submitted to the chain
      if (txResult.digest) {
        console.log("Transaction submitted, ID:", txResult.digest);
        console.log("Transaction details:", txResult);
        
        // Add original txResult debug exception
        if (!txResult.events) {
          throw new Error(`Events are empty: txResult.events=${JSON.stringify(txResult.events)}, type=${typeof txResult.events}`);
        }
        
        // Check if transaction result contains InstantWin event
        const events = txResult.events || [];
        
        // Add event array debug exception
        if (events.length === 0) {
          throw new Error(`No events detected: events=${JSON.stringify(events)}`);
        }
        
        // Build event match result report for debugging
        const eventReport = events.map((event, index) => {
          if (!event || !event.type) {
            return { index, valid: false, message: "Event invalid or missing type attribute" };
          }
          
          // Check if matches InstantWin
          const isInstantWin = event.type.includes('InstantWin');
          
          // Check if matches PrizeWithdrawn
          const isPrizeWithdrawn = event.type.includes('PrizeWithdrawn');
          
          // Check data structure
          const hasAmount = event.parsedJson && typeof (event.parsedJson as Record<string, any>).amount !== 'undefined';
          const hasPlayer = event.parsedJson && typeof (event.parsedJson as Record<string, any>).player !== 'undefined';
          
          return {
            index,
            type: event.type,
            parsedJsonSummary: event.parsedJson ? Object.keys(event.parsedJson) : [],
            isInstantWin,
            isPrizeWithdrawn,
            hasAmount,
            hasPlayer
          };
        });
        
        // Use more robust detection method to find lottery events
        const instantWinEvent = events.find(event => 
          event && event.type && (
            event.type.includes(`${CONTRACT_ADDRESSES.LOTTERY.PACKAGE_ID}::lottery::InstantWin`) || 
            event.type.includes('InstantWin')
          )
        );
        
        const prizeWithdrawnEvent = events.find(event => 
          event && event.type && event.type.includes('PrizeWithdrawn')
        );
        
        // Extract win amount, prioritize from InstantWin event
        let winAmount = 0;
        let winSource = "Not found";
        
        if (instantWinEvent && instantWinEvent.parsedJson) {
          const eventData = instantWinEvent.parsedJson as Record<string, any>;
          winAmount = Number(eventData.amount || 0);
          winSource = "InstantWin event";
        } else if (prizeWithdrawnEvent && prizeWithdrawnEvent.parsedJson) {
          const eventData = prizeWithdrawnEvent.parsedJson as Record<string, any>;
          winAmount = Number(eventData.amount || 0);
          winSource = "PrizeWithdrawn event";
        }
        
        // // Comprehensive debug exception point - provide complete event parsing information
        // throw new Error(`Event parsing diagnosis:
        //   1. Found events total: ${events.length}
        //   2. Event details: ${JSON.stringify(eventReport)}
        //   3. Found InstantWin event: ${!!instantWinEvent}
        //   4. Found PrizeWithdrawn event: ${!!prizeWithdrawnEvent}
        //   5. InstantWin event type: ${instantWinEvent?.type || 'none'}
        //   6. PrizeWithdrawn event type: ${prizeWithdrawnEvent?.type || 'none'}
        //   7. Extracted amount: ${winAmount}
        //   8. Amount source: ${winSource}
        //   9. Original InstantWin event: ${JSON.stringify(instantWinEvent)}
        //   10. Original PrizeWithdrawn event: ${JSON.stringify(prizeWithdrawnEvent)}
        // `);
        
        // As long as there is a transaction ID, we consider the transaction successful
        try {
          // Use API client to call lottery record API
          const response = await api.post(
            API_ENDPOINTS.LOTTERY.RECORDS,
            {
              player_address: zkLoginAddress,
              tx_hash: txResult.digest,
              win_amount: winAmount
            }
          );

          if (!response.success) {
            console.warn("Failed to record lottery result:", response.error);
            // Continue execution, don't affect user experience
          }
        } catch (e) {
          console.warn("Failed to record lottery result:", e);
          // Continue execution, don't affect user experience
        }
        
        // Prize handling
        if (winAmount > 0) {
          toast.success(`Congratulations! You won ${winAmount / 1000000000} SUI`);
        } else {
          toast.success('Draw successful, but no prize. Better luck next time!');
        }
        
        // Return DrawResult structure
        return {
          success: true,
          txId: txResult.digest,
          amount: winAmount
        };
      }
      // Transaction failure cases
      else {
        // Extract detailed error information
        const statusError = txResult.effects?.status?.error;
        const errorDetails = {
          txDigest: txResult.digest,
          effects: txResult.effects,
          events: txResult.events
        };
        
        throw new LotteryError(`Transaction execution failed: ${statusError || 'Execution failed'}`, errorDetails);
      }
    } catch (error: any) {
      // Unified error handling
      if (error instanceof LotteryError) {
        return {
          success: false,
          error: error.message,
          errorDetails: error.details
        };
      }
      
      return {
        success: false,
        error: `Error during lottery process: ${error.message || 'Unknown exception'}`,
        errorDetails: {
          errorType: error.name,
          stack: error.stack
        }
      };
    }
  }
  
  /**
   * Retrieves lottery history for a specific player or all players
   * 
   * @param {string} player - Optional player address to filter history
   * @param {number} limit - Maximum number of records to retrieve (default: 10)
   * @param {boolean} winnersOnly - Whether to only return winning draws (default: false)
   * @returns {Promise<LotteryHistoryResponse>} List of lottery history records
   * @throws {LotteryError} If API request fails
   */
  async getLotteryHistory(player?: string, limit: number = 10, winnersOnly: boolean = false): Promise<LotteryHistoryResponse> {
    try {
      // Build query parameters
      let queryParams = new URLSearchParams();
      if (player) queryParams.append('player', player);
      if (limit) queryParams.append('limit', limit.toString());
      if (winnersOnly) queryParams.append('winners_only', 'true');
      
      // Use API client to call history record API
      const url = `${API_ENDPOINTS.LOTTERY.HISTORY}?${queryParams.toString()}`;
      const response = await api.get<LotteryHistoryResponse>(url);
      
      if (!response.success) {
        throw new LotteryError(`Failed to retrieve lottery history: ${response.error?.message || 'API error'}`, {
          url,
          errorResponse: response.error
        });
      }
      
      return response.data as LotteryHistoryResponse;
    } catch (error: any) {
      if (error instanceof LotteryError) {
        throw error; // Directly throw custom errors
      }
      
      // Network or other errors
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new LotteryError('API service unavailable, please check network connection', {
          originalError: error,
          endpoint: API_ENDPOINTS.LOTTERY.HISTORY
        });
      }
      
      throw new LotteryError(`Failed to retrieve lottery history: ${error.message || 'Unknown exception'}`, {
        errorType: error.name,
        stack: error.stack
      });
    }
  }

  /**
   * Retrieves lottery statistics for a player or all players
   * 
   * @param {string} player - Optional player address to filter statistics
   * @param {string} period - Time period for statistics (default: 'all')
   * @returns {Promise<LotteryStats>} Lottery statistics data
   * @throws {LotteryError} If API request fails
   */
  async getLotteryStats(player?: string, period: string = 'all'): Promise<LotteryStats> {
    try {
      // Build query parameters
      let queryParams = new URLSearchParams();
      if (player) queryParams.append('player', player);
      if (period) queryParams.append('period', period);
      
      // Use API client to call statistics API
      const url = `${API_ENDPOINTS.LOTTERY.STATS}?${queryParams.toString()}`;
      const response = await api.get<LotteryStats>(url);
      
      if (!response.success) {
        throw new LotteryError(`Failed to retrieve lottery statistics: ${response.error?.message || 'API error'}`, {
          url,
          errorResponse: response.error,
          parameters: { player, period }
        });
      }
      
      return response.data as LotteryStats;
    } catch (error: any) {
      if (error instanceof LotteryError) {
        throw error; // Directly throw custom errors
      }
      
      // Network or other errors
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new LotteryError('API service unavailable, please check network connection or API endpoint configuration', {
          originalError: error,
          endpoint: API_ENDPOINTS.LOTTERY.STATS,
          parameters: { player, period }
        });
      }
      
      throw new LotteryError(`Failed to retrieve lottery statistics: ${error.message || 'Unknown exception'}`, {
        errorType: error.name,
        stack: error.stack,
        parameters: { player, period }
      });
    }
  }
} 