/**
 * Hook for managing zkLogin parameters
 * Provides functionality for retrieving and validating zkLogin authentication parameters
 */
import { useCallback } from 'react';
import { ZkLoginStorage } from '@/utils/StorageService';
import { SuiService } from '@/utils/SuiService';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { PartialZkLoginSignature } from '@/interfaces/ZkLogin';
import { useLogContext } from '@/contexts/LogContext';

/**
 * Hook for managing zkLogin parameters
 * Handles retrieval and validation of zkLogin authentication parameters
 * 
 * @returns {Object} zkLogin parameter management functions
 */
export function useZkLoginParams() {
  const { addLog } = useLogContext();

  /**
   * Prepares ephemeral keypair for zkLogin
   * Retrieves and reconstructs the ephemeral keypair from storage
   * 
   * @returns {Ed25519Keypair|null} Reconstructed ephemeral keypair or null if not found
   */
  const prepareKeypair = useCallback((): Ed25519Keypair | null => {
    const ephemeralKeypairData = ZkLoginStorage.getEphemeralKeypair();
    if (!ephemeralKeypairData) {
      addLog("Ephemeral keypair not found, operation cannot be completed");
      return null;
    }

    // Reconstruct keypair
    try {
      return SuiService.recreateKeypairFromStored(ephemeralKeypairData.keypair);
    } catch (error: any) {
      addLog(`Failed to reconstruct keypair: ${error.message}`);
      return null;
    }
  }, [addLog]);

  /**
   * Retrieves all required zkLogin parameters
   * Fetches zkLogin address, partial signature, user salt, and decoded JWT
   * 
   * @returns {Object|null} Object containing all zkLogin parameters or null if any parameter is missing
   */
  const getZkLoginParams = useCallback(() => {
    // Get zkLogin address
    const zkLoginAddress = ZkLoginStorage.getZkLoginAddress();
    if (!zkLoginAddress) {
      addLog("zkLogin address not found");
      return null;
    }

    // Get partial signature
    const partialSignature = ZkLoginStorage.getZkLoginPartialSignature();
    if (!partialSignature) {
      addLog("zkLogin partial signature not found");
      return null;
    }

    // Get user salt
    const userSalt = ZkLoginStorage.getZkLoginUserSalt();
    if (!userSalt) {
      addLog("User salt not found");
      return null;
    }

    // Get decoded JWT
    const decodedJwt = ZkLoginStorage.getDecodedJwt();
    if (!decodedJwt) {
      addLog("Decoded JWT not found");
      return null;
    }

    // Verify all parameters are retrieved
    return {
      zkLoginAddress,
      partialSignature,
      userSalt,
      decodedJwt
    };
  }, [addLog]);

  /**
   * Validates zkLogin parameters
   * Checks if address and user ID meet required format and presence criteria
   * 
   * @param {string} address - zkLogin address to validate
   * @param {string} userId - User ID to validate
   * @returns {boolean} Whether parameters are valid
   */
  const validateParams = useCallback((address: string, userId: string): boolean => {
    addLog(`Validating parameters - User ID: ${userId}, Type: ${typeof userId}`);
    addLog(`Validating parameters - zkLogin address: ${address}`);

    if (!address || !address.startsWith('0x')) {
      addLog("Error: Invalid zkLogin address format");
      return false;
    }

    if (!userId) {
      addLog("Error: Invalid user ID");
      return false;
    }

    return true;
  }, [addLog]);

  return {
    prepareKeypair,
    getZkLoginParams,
    validateParams
  };
} 