/**
 * Hook for managing zkLogin authentication flow
 * Provides functionality for managing the entire zkLogin process
 */
import { useState, useEffect } from 'react';
import { ZkLoginState } from '@/components/zklogin/types';
import { ZkLoginStorage } from '@/utils/StorageService';
import { SuiService } from '@/utils/SuiService';
import { createClient } from '@/utils/supabase/client';
import { ZkLoginService } from '@/utils/ZkLoginService';
import { AppStorage } from '@/utils/StorageService';
import { AppError } from '@/interfaces/Error';
import { useLogContext } from '@/contexts/LogContext';

/**
 * Hook for managing zkLogin authentication process
 * Handles keypair creation, network status checking, and state management
 * 
 * @param {string} userId - Optional user ID for authentication
 * @returns {Object} zkLogin state and operations
 */
export function useZkLogin(userId?: string) {
  const { addLog } = useLogContext();
  
  // Initial state
  const [state, setState] = useState<ZkLoginState>({
    zkLoginAddress: ZkLoginStorage.getZkLoginAddress(),
    ephemeralKeypair: ZkLoginStorage.getEphemeralKeypair(),
    isInitialized: false,
    error: null,
    loading: false,
    jwt: null
  });
  
  // Network connection state
  const [networkStatus, setNetworkStatus] = useState({
    suiNodeConnected: false,
    apiConnected: false,
    lastChecked: null as Date | null
  });

  const supabase = createClient();

  /**
   * Logs a message to both the UI and console
   * 
   * @param {string} message - Message to log
   */
  const log = (message: string) => {
    addLog(message);
    // Always log to console for debugging
    console.log(`[zkLogin] ${message}`);
  };
  
  /**
   * Checks SUI network connection status
   * Verifies connectivity to SUI node
   * 
   * @returns {Promise<Object>} Current network status
   */
  const checkNetworkStatus = async () => {
    // Check SUI node connection
    try {
      const epoch = await SuiService.getCurrentEpoch();
      setNetworkStatus(prev => ({ 
        ...prev, 
        suiNodeConnected: true, 
        lastChecked: new Date() 
      }));
      log(`SUI node connection successful, current Epoch: ${epoch}`);
    } catch (error: any) {
      setNetworkStatus(prev => ({ 
        ...prev, 
        suiNodeConnected: false, 
        lastChecked: new Date() 
      }));
      log(`SUI node connection failed: ${error.message || 'Unknown network error'}`);
    }
    
    return networkStatus;
  };

  /**
   * Initializes zkLogin ephemeral keypair
   * Creates or reuses keypair for zkLogin authentication
   * 
   * @param {boolean} forceNew - Whether to force creation of a new keypair
   * @returns {Promise<string|null>} Nonce from keypair or null if initialization failed
   */
  const initializeZkLogin = async (forceNew: boolean = false): Promise<string | null> => {
    // Check network status first
    if (forceNew) {
      await checkNetworkStatus();
    }
    
    // If already have ephemeral keypair and not forcing new
    if (state.ephemeralKeypair && !forceNew) {
      log("Using existing ephemeral keypair, no need to recreate");
      return state.ephemeralKeypair.nonce;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    log("Starting to create ephemeral keypair...");
    
    try {
      // Call service layer method
      const { keypair, nonce } = await ZkLoginService.initialize(forceNew).catch(error => {
        log(`Ephemeral keypair creation failed (internal error): ${error.message}`);
        console.error("Keypair creation detailed error:", error);
        throw error; // Rethrow for outer catch
      });
      
      if (!keypair || !nonce) {
        log("Ephemeral keypair creation failed: Invalid return result");
        throw new Error("Ephemeral keypair creation failed: Invalid return result");
      }
      
      log("Ephemeral keypair creation intermediate step successful");
      AppStorage.setEphemeralKeypair(keypair);
      
      setState(prev => ({ 
        ...prev, 
        ephemeralKeypair: keypair,
        isInitialized: true,
        loading: false 
      }));
      
      try {
        log(`Ephemeral keypair creation successful: ${JSON.stringify({
          nonce: keypair.nonce,
          maxEpoch: keypair.maxEpoch,
          hasKeypair: !!keypair.keypair
        })}`);
        
        const recreatekeypair = SuiService.recreateKeypairFromStored(keypair.keypair);
        log("Ephemeral keypair parsed address: " + recreatekeypair.getPublicKey().toSuiAddress());
      } catch (logError: any) {
        log(`Keypair info logging error (non-fatal): ${logError.message}`);
      }

      return nonce;
    } catch (error: any) {
      const errorMessage = `Keypair preparation failed: ${error.message || 'Unknown error'}`;
      log(errorMessage);
      console.error("Ephemeral keypair creation complete error:", error);
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        loading: false 
      }));
      return null;
    }
  };

  // Check network status on component load
  useEffect(() => {
    checkNetworkStatus().catch(error => {
      console.error("Failed to check network status:", error);
    });
  }, []);


  /**
   * Clears all zkLogin state
   * Removes all stored zkLogin data
   */
  const clearZkLoginState = (): void => {
    ZkLoginStorage.clearAll();
    setState({
      zkLoginAddress: null,
      ephemeralKeypair: null,
      isInitialized: false,
      error: null,
      loading: false,
      jwt: null
    });
    log("zkLogin state cleared");
  };

  return {
    ...state,
    networkStatus,
    checkNetworkStatus,
    initializeZkLogin,
    clearZkLoginState,
    log
  };
} 