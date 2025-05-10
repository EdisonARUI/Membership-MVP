/**
 * Service for handling zkLogin authentication operations on the SUI blockchain
 * Provides methods for registering addresses and binding wallets
 */
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { PartialZkLoginSignature } from '@/interfaces/ZkLogin';
import { useZkLoginTransactions } from '@/hooks/useZkLoginTransactions';
import { SUI_RPC_URL } from '@/config/client';

// SUI client configuration
const FULLNODE_URL = SUI_RPC_URL;
export const suiClient = new SuiClient({ url: FULLNODE_URL });


/**
 * Service for managing contract interactions related to zkLogin authentication
 * Handles zkLogin address registration and wallet binding operations
 */
export class ContractService {
  private client: SuiClient;

  /**
   * Creates a new instance of ContractService
   * Initializes connection to SUI blockchain
   */
  constructor() {
    this.client = suiClient;
  }

  /**
   * Gets the SUI client instance
   * 
   * @returns {SuiClient} The SUI client instance
   */
  getClient(): SuiClient {
    return this.client;
  }

  /**
   * Registers a zkLogin address with the authentication registry
   * 
   * @param {string} zkLoginAddress - The zkLogin address to register
   * @param {Ed25519Keypair} ephemeralKeyPair - Ephemeral keypair for signing
   * @param {PartialZkLoginSignature} partialSignature - Partial zkLogin signature
   * @param {string} userSalt - User's salt value
   * @param {any} decodedJwt - Decoded JWT information
   * @returns {Promise<{ success: boolean; txId?: string; error?: string }>} Result of the registration
   */
  async registerZkLoginAddress(
    zkLoginAddress: string,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      console.log("Using zkLogin sender address:", zkLoginAddress);
      
      // Create transaction block
      const txb = new Transaction();
      
      // Call register_zk_address method
        txb.moveCall({
          target: `${CONTRACT_ADDRESSES.AUTHENTICATION.PACKAGE_ID}::${CONTRACT_ADDRESSES.AUTHENTICATION.MODULE_NAME}::register_zk_address`,
          arguments: [
            txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID)
          ]
        });
      
      // Sign and execute transaction with zkLogin
      const { signAndExecuteTransaction } = useZkLoginTransactions();
      
      try {
        const result = await signAndExecuteTransaction(
          txb,
          zkLoginAddress,
          ephemeralKeyPair,
          partialSignature,
          userSalt,
          decodedJwt
        );
        
        console.log("Complete transaction result:", JSON.stringify(result, null, 2));
        
      if (result.effects?.status?.status === "success") {
        console.log("register_zk_address transaction succeeded");
        return {
          success: true,
          txId: result.digest
        };
      } else {
          console.error("Transaction execution failed details:", JSON.stringify(result.effects, null, 2));
          
          // Extract more detailed error information
          let errorDetails = '';
          
          if (result.effects?.status?.error) {
            errorDetails = result.effects.status.error;
          } else if (result.effects) {
            // Try to get more information from effects
            errorDetails = JSON.stringify(result.effects, null, 2);
          } else if (result.errors && result.errors.length > 0) {
            errorDetails = JSON.stringify(result.errors, null, 2);
          } else {
            errorDetails = JSON.stringify(result, null, 2);
          }
          
          return {
            success: false,
            error: `Transaction execution failed: ${errorDetails}`
          };
        }
      } catch (executeError: any) {
        // More detailed error logging
        console.error("Execute transaction exception details:", executeError);
        console.error("Exception stack:", executeError.stack);
        
        let errorMsg = '';
        if (typeof executeError === 'object') {
          try {
            // Try to extract all possible error information
            errorMsg = JSON.stringify({
              message: executeError.message,
              name: executeError.name,
              code: executeError.code,
              cause: executeError.cause,
              data: executeError.data
            }, (key, value) => value === undefined ? 'undefined' : value, 2);
          } catch (e) {
            errorMsg = executeError.message || executeError.toString();
          }
        } else {
          errorMsg = String(executeError);
        }
        
        return {
          success: false,
          error: `Transaction execution failed: ${errorMsg}`
        };
      }
    } catch (error: any) {
      console.error('Failed to register zkLogin address:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred while registering zkLogin address'
      };
    }
  }

  /**
   * Checks if an address is verified in the authentication registry
   * 
   * @param {string} address - The address to check
   * @returns {Promise<{ verified: boolean; error?: string }>} Result indicating if address is verified
   */
  async isAddressVerified(address: string): Promise<{ verified: boolean; error?: string }> {
    try {
      const txb = new Transaction();
      txb.moveCall({
          target: `${CONTRACT_ADDRESSES.AUTHENTICATION.PACKAGE_ID}::${CONTRACT_ADDRESSES.AUTHENTICATION.MODULE_NAME}::is_address_verified`,
        arguments: [txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID), txb.pure.address(address)]
        });
      
      const result = await this.client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: txb
      });
      
      // Check return value - Sui returns format is [number[], string], first element is BCS encoded, second is type
      if (result.results && result.results[0]?.returnValues && result.results[0].returnValues.length > 0) {
        // Get raw return value - boolean in Sui is typically represented as 0 for false, 1 for true
        const bcsBytes = result.results[0].returnValues[0][0]; // Get BCS encoded byte array
        
        // Typically boolean will be encoded as a single byte, 1 for true, 0 for false
        if (Array.isArray(bcsBytes) && bcsBytes.length > 0) {
          return { verified: bcsBytes[0] === 1 };
        }
        
        console.log("Return value parsing:", result.results[0].returnValues);
      }
      
      return { verified: false, error: "Unable to parse return value" };
    } catch (error: any) {
      console.error("Failed to check address verification status:", error);
      return {
        verified: false,
        error: `Address verification check failed: ${error.message || JSON.stringify(error)}`
      };
    }
  }

  /**
   * Binds a wallet address to user ID in the authentication registry
   * 
   * @param {string} zkLoginAddress - The zkLogin address to bind
   * @param {string} userId - User ID to bind to the address
   * @param {Ed25519Keypair} ephemeralKeyPair - Ephemeral keypair for signing
   * @param {PartialZkLoginSignature} partialSignature - Partial zkLogin signature
   * @param {string} userSalt - User's salt value
   * @param {any} decodedJwt - Decoded JWT information
   * @returns {Promise<{ success: boolean; txId?: string; error?: string }>} Result of the binding operation
   */
  async bindWalletAddress(
    zkLoginAddress: string,
    userId: string,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      console.log("Using zkLogin sender address:", zkLoginAddress);
      console.log("Binding user ID (original):", userId);
      
      // Create transaction block
      const txb = new Transaction();
      
      // Ensure userId is a string and doesn't contain special characters
      // We only keep letters, numbers and basic punctuation
      const safeUserId = String(userId).replace(/[^\w\s\-]/g, '');
      console.log("Filtered userId:", safeUserId);
      
      // Convert userId to Sui Move's vector<u8>
      const userIdBytes = new TextEncoder().encode(safeUserId);
      console.log("Converted userId bytes:", Array.from(userIdBytes));
      
      // Use simpler approach to create vector<u8> type parameter
      // Default to using pure string, if error, try simpler value
      let userIdArg;
      try {
        userIdArg = txb.pure.vector('u8', Array.from(userIdBytes));
      } catch (error) {
        console.error("Failed to create userIdArg, trying simpler value:", error);
        // Use simple "user" string as fallback
        const fallbackBytes = new TextEncoder().encode("user");
        userIdArg = txb.pure.vector('u8', Array.from(fallbackBytes));
      }
      
      // Call bind_wallet_address method
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.AUTHENTICATION.PACKAGE_ID}::${CONTRACT_ADDRESSES.AUTHENTICATION.MODULE_NAME}::bind_wallet_address`,
        arguments: [
          txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID),
          userIdArg
        ]
      });
      
      // Sign and execute transaction with zkLogin
      const { signAndExecuteTransaction } = useZkLoginTransactions();
      
      try {
        const result = await signAndExecuteTransaction(
          txb,
          zkLoginAddress,
          ephemeralKeyPair,
          partialSignature,
          userSalt,
          decodedJwt
        );
      
      console.log("Transaction execution result:", result);
      
      // Check if transaction was successful
      if (result.effects?.status?.status === "success") {
        console.log("Transaction executed successfully");
        return {
          success: true,
          txId: result.digest
        };
      } else {
        console.error("Transaction execution failed:", result.effects?.status);
        return {
          success: false,
          error: `Transaction execution failed: ${result.effects?.status?.error || "Unknown error"}`
          };
        }
      } catch (executeError: any) {
        console.error("Transaction execution failed:", executeError);
        return {
          success: false,
          error: `Transaction execution failed: ${executeError.message}`
        };
      }
    } catch (error: any) {
      console.error('Binding wallet address failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred while binding wallet address'
      };
    }
  }
}

// Export service instance
export const contractService = new ContractService(); 