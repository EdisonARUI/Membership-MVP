/**
 * ZkLoginContext provides context and state management for zkLogin authentication flows.
 * It manages ephemeral keypair preparation, state clearing, and centralized logging for zkLogin operations.
 *
 * Features:
 * - zkLogin ephemeral keypair preparation and nonce management
 * - Centralized logging for zkLogin events
 * - State management for zkLogin authentication
 * - Synchronization with persistent storage
 */
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ZkLoginState } from '@/components/zklogin/types';
import { AppStorage } from '@/utils/StorageService';
import { useZkLogin as useZkLoginHook } from '@/hooks/useZkLogin';
import { ZkLoginService } from '@/utils/ZkLoginService';
import { ZkLoginProcessResult } from '@/interfaces/ZkLogin';
import { useLogContext } from '@/contexts/LogContext';
import { usePathname } from 'next/navigation';

/**
 * ZkLoginContextType defines the shape of the zkLogin context, including state and operations.
 */
interface ZkLoginContextType {
  /**
   * zkLogin state object
   */
  state: ZkLoginState;
  /**
   * Prepares zkLogin by generating an ephemeral keypair and returning a nonce
   * @returns {Promise<string>} The generated nonce
   */
  prepareZkLogin: () => Promise<string>;
  /**
   * Clears all zkLogin-related state and session storage
   */
  clearState: () => void;
  /**
   * Array of log messages related to zkLogin
   */
  logs: string[];
  /**
   * Adds a log message
   * @param message - The log message to add
   */
  addLog: (message: string) => void;
  /**
   * Clears all log messages
   */
  clearLogs: () => void;
}

const ZkLoginContext = createContext<ZkLoginContextType | undefined>(undefined);

/**
 * ZkLoginProvider supplies zkLogin context to its children.
 * Manages zkLogin state, ephemeral keypair preparation, and logging.
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 * @param {string} [props.userId] - Optional user ID for zkLogin
 */
export function ZkLoginProvider({ 
  children,
  userId
}: { 
  children: ReactNode;
  userId?: string;
}) {
  // Use shared log hook
  const logHook = useLogContext();
  
  // Use hook to get base zkLogin functionality and pass log callback
  const {
    zkLoginAddress,
    ephemeralKeypair,
    isInitialized,
    error: zkLoginError,
    loading: zkLoginLoading,
    jwt: zkLoginJwt,
    initializeZkLogin,
    clearZkLoginState,
    log
  } = useZkLoginHook(userId);

  // Compose zkLogin state
  const [state, setState] = useState<ZkLoginState>({
    zkLoginAddress,
    ephemeralKeypair,
    isInitialized,
    error: zkLoginError,
    loading: zkLoginLoading,
    jwt: zkLoginJwt,
    status: zkLoginLoading ? 'initializing' : (isInitialized ? 'ready' : 'idle'),
    partialSignature: AppStorage.getZkLoginPartialSignature()
  });

  const pathname = usePathname();

  useEffect(() => {
    const rehydrate = () => {
      setState({
        zkLoginAddress: AppStorage.getZkLoginAddress(),
        ephemeralKeypair: AppStorage.getEphemeralKeypair(),
        isInitialized: !!AppStorage.getZkLoginAddress(),
        error: null,
        loading: false,
        jwt: null
      });
    };
    rehydrate();
    if (sessionStorage.getItem('justLoggedIn')) {
      sessionStorage.removeItem('justLoggedIn');
    }
  }, [pathname]);

  /**
   * Prepares zkLogin by generating a new ephemeral keypair and returning a nonce
   * Also saves original parameters for later ZK proof verification
   *
   * @returns {Promise<string>} The generated nonce
   * @throws {Error} If keypair creation fails
   */
  const prepareZkLogin = async (): Promise<string> => {
    try {
      // Force creation of a new ephemeral keypair
      const generatedNonce = await initializeZkLogin(true);
      if (!generatedNonce) {
        logHook.addLog("Unable to continue: Failed to create ephemeral keypair");
        throw new Error("Failed to create ephemeral keypair");
      }

      logHook.addLog(`zkLogin preparation complete, nonce: ${generatedNonce}`);
      
      // Save original parameters for OAuth/ZK proof verification
      const updatedEphemeralData = AppStorage.getEphemeralKeypair();
      if (updatedEphemeralData) {
        AppStorage.setZkLoginOriginalNonce(updatedEphemeralData.nonce);
        AppStorage.setZkLoginOriginalMaxEpoch(updatedEphemeralData.maxEpoch.toString());
        AppStorage.setZkLoginOriginalRandomness(JSON.stringify(updatedEphemeralData.randomness));
      }
      
      return generatedNonce;
    } catch (err: any) {
      logHook.addLog(`Failed to prepare zkLogin: ${err.message}`);
      throw err;
    }
  };

  /**
   * Clears all zkLogin-related state and session storage
   * Logs the clearing event
   */
  const clearState = (): void => {
    clearZkLoginState();
    // Manually reset all session state
    AppStorage.clearSessionStorage();
    logHook.addLog("zkLogin state fully cleared");
  };

  const value: ZkLoginContextType = {
    state,
    prepareZkLogin,
    clearState,
    logs: logHook.logs,
    addLog: logHook.addLog,
    clearLogs: logHook.clearLogs
  };

  return (
    <ZkLoginContext.Provider value={value}>
      {children}
    </ZkLoginContext.Provider>
  );
}

/**
 * useZkLogin provides access to the zkLogin context
 * Must be used within a ZkLoginProvider
 *
 * @returns {ZkLoginContextType} zkLogin context value
 * @throws {Error} If used outside of ZkLoginProvider
 */
export function useZkLogin() {
  const context = useContext(ZkLoginContext);
  if (context === undefined) {
    throw new Error('useZkLogin must be used within a ZkLoginProvider');
  }
  return context;
} 