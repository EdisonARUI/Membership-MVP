/**
 * Service for SUI blockchain operations
 * Provides utilities for zkLogin operations, keypair management, and address activation
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { generateNonce, generateRandomness, jwtToAddress, getExtendedEphemeralPublicKey } from '@mysten/sui/zklogin';
import { EphemeralKeyPair } from '@/components/zklogin/types';
import { toB64 } from '@mysten/sui/utils';
import { API_ENDPOINTS } from '../app/api/endpoints';
import { api } from '../app/api/clients';
import { AppError } from '../interfaces/Error';
import { SUI_RPC_URL } from '@/config/client';
// SUI Devnet client
const FULLNODE_URL = SUI_RPC_URL;
export const suiClient = new SuiClient({ url: FULLNODE_URL });

// Maximum Epoch increment
const MAX_EPOCH_INCREMENT = 2;

/**
 * Service for SUI blockchain operations
 * Provides utilities for zkLogin operations and SUI interactions
 */
export const SuiService = {
  /**
   * Creates an ephemeral keypair for zkLogin operations
   * Generates keypair, randomness, and nonce for the current epoch
   * 
   * @returns {Promise<EphemeralKeyPair>} The created ephemeral keypair details
   * @throws {Error} If keypair creation fails or epoch information is unavailable
   */
  async createEphemeralKeyPair(): Promise<EphemeralKeyPair> {
    try {
      // Get current Epoch
      const epochState = await suiClient.getLatestSuiSystemState().catch(error => {
        console.error('Failed to get SUI system state:', error);
        throw new Error(`Failed to get current Epoch: ${error.message || 'Network error'}`);
      });
      
      if (!epochState || !epochState.epoch) {
        console.error('SUI system state returned invalid:', epochState);
        throw new Error('Unable to get valid Epoch information');
      }
      
      const currentEpoch = Number(epochState.epoch);
      console.log('Current Epoch:', currentEpoch);
      const maxEpoch = currentEpoch + MAX_EPOCH_INCREMENT;
      
      try {
        // Create keypair and randomness
        const keypair = new Ed25519Keypair();
        const randomness = generateRandomness();
        const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);
        
        // Verify generated keypair
        try {
          const address = keypair.getPublicKey().toSuiAddress();
          console.log('Generated keypair temporary address:', address);
        } catch (verifyError) {
          console.warn('Warning during keypair verification:', verifyError);
          // Continue execution, don't interrupt flow
        }
        
        return {
          keypair: {
            publicKey: toB64(keypair.getPublicKey().toRawBytes()),
            secretKey: keypair.getSecretKey()
          },
          randomness,
          maxEpoch,
          nonce
        };
      } catch (keypairError: any) {
        console.error('Error creating keypair:', keypairError);
        throw new Error(`Failed to generate keypair: ${keypairError.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('createEphemeralKeyPair complete error:', error);
      throw error; // Preserve original error
    }
  },

  /**
   * Gets extended public key from a keypair
   * 
   * @param {Ed25519Keypair} keypair - The keypair to get extended public key from
   * @returns {string} The extended public key
   */
  getExtendedPublicKey(keypair: Ed25519Keypair): string {
    return getExtendedEphemeralPublicKey(keypair.getPublicKey());
  },

  /**
   * Gets extended public key from stored keypair object
   * 
   * @param {any} storedKeypair - The stored keypair object
   * @returns {string} The extended public key
   * @throws {Error} If keypair format is invalid
   */
  getExtendedPublicKeyFromStored(storedKeypair: any): string {
    try {
      // If input is complete Ed25519Keypair instance
      if (typeof storedKeypair.getPublicKey === 'function') {
        return getExtendedEphemeralPublicKey(storedKeypair.getPublicKey());
      }
      
      // If input is stored format of keypair object
      if (storedKeypair.publicKey) {
        return getExtendedEphemeralPublicKey(storedKeypair.publicKey);
      }
      
      throw new Error('Invalid keypair format');
    } catch (error) {
      console.error('Error getting extended public key:', error);
      throw error;
    }
  },

  /**
   * Recreates an Ed25519Keypair instance from stored keypair data
   * 
   * @param {any} storedKeypair - The stored keypair data
   * @returns {Ed25519Keypair} The recreated keypair instance
   * @throws {Error} If keypair recreation fails
   */
  recreateKeypairFromStored(storedKeypair: any): Ed25519Keypair {
    console.log("Starting to rebuild keypair, provided storedKeypair:", {
      ...storedKeypair,
      secretKey: storedKeypair.secretKey ? '*** Hidden ***' : 'Not provided'
    });
    
    if (!storedKeypair.secretKey) {
      throw new Error('Invalid keypair format: missing secretKey field');
    }
    
    try {
      // Reference implementation in zklogin.tsx, directly rebuild keypair from secretKey
      // This method is more concise as Ed25519 public key can be derived from private key
      const keypair = Ed25519Keypair.fromSecretKey(storedKeypair.secretKey);
      console.log("Keypair rebuilt successfully, address:", keypair.getPublicKey().toSuiAddress());
      return keypair;
    } catch (error: any) {
      console.error('Failed to recreate keypair:', error);
      throw new Error(`Failed to recreate keypair: ${error.message}`);
    }
  },

  /**
   * Derives zkLogin address from JWT and user salt
   * 
   * @param {string} jwt - The JWT token
   * @param {string} userSalt - The user's salt value
   * @returns {string} The derived zkLogin address
   */
  deriveZkLoginAddress(jwt: string, userSalt: string): string {
    return jwtToAddress(jwt, userSalt);
  },

  /**
   * Activates a zkLogin address by requesting tokens from faucet
   * 
   * @param {string} address - The address to activate
   * @returns {Promise<boolean>} True if activation was successful, false otherwise
   */
  async activateAddress(address: string): Promise<boolean> {
    try {
      const response = await api.post(
        API_ENDPOINTS.SUI.FAUCET,
        { FixedAmountRequest: { recipient: address } }
      );
      
      if (!response.success) {
        console.error('Address activation failed:', response.error);
        return false;
      }
      
      return true;
    } catch (error) {
      if (error instanceof AppError) {
        console.error('Address activation failed:', error.message);
      } else {
        console.error('Address activation failed:', error);
      }
      return false;
    }
  },

  /**
   * Gets the current epoch from SUI system state
   * 
   * @returns {Promise<number>} The current epoch number
   */
  async getCurrentEpoch(): Promise<number> {
    const { epoch } = await suiClient.getLatestSuiSystemState();
    return Number(epoch);
  },

  /**
   * Checks if an address is active by looking for owned objects
   * 
   * @param {string} address - The address to check
   * @returns {Promise<boolean>} True if address is active, false otherwise
   */
  async isAddressActive(address: string): Promise<boolean> {
    try {
      const objects = await suiClient.getOwnedObjects({ owner: address });
      return objects.data.length > 0;
    } catch (error) {
      console.error('Failed to check address status:', error);
      return false;
    }
  }
}; 