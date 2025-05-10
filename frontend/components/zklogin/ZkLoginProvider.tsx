/**
 * ZkLoginProvider component provides context and methods for zkLogin authentication.
 * It manages ephemeral keypair preparation, Google authentication, and exposes ready callbacks for parent components.
 *
 * Features:
 * - Prepares zkLogin ephemeral keypair
 * - Handles Google authentication
 * - Exposes ready callback with login methods
 * - Displays current zkLogin status and errors
 */
"use client";

import { useState, useEffect, useRef } from 'react';
import { useZkLogin } from "@/contexts/ZkLoginContext";
import { ZkLoginMethods, ZkLoginProviderProps } from "@/components/zklogin/types";

/**
 * ZkLoginProvider component for managing zkLogin authentication and exposing login methods
 *
 * @param {ZkLoginProviderProps} props - Component props
 * @returns {JSX.Element} The rendered provider status panel
 */
export default function ZkLoginProvider({ 
  userId, 
  autoInitialize = false, 
  onLog, 
  onReady 
}: ZkLoginProviderProps) {
  const { 
    state: { zkLoginAddress, ephemeralKeypair, loading, error },
    prepareZkLogin
  } = useZkLogin();
  
  const [hasMounted, setHasMounted] = useState(false);
  const onReadyCalledRef = useRef<boolean>(false);
  
  /**
   * Adds a log message to the console and calls the onLog callback if provided
   * @param message - The log message
   */
  const addLog = (message: string) => {
    console.log(message);
    if (onLog) {
      onLog(message);
    }
  };
  
  /**
   * Prepares the onReady callback with login methods when available
   */
  useEffect(() => {
    if (onReady && !onReadyCalledRef.current) {
      const methods: ZkLoginMethods = {
        initiateLogin: async () => {
          addLog("Initializing login...");
        },
        handleGoogleAuth: async () => {
          addLog("Starting Google authentication...");
          try {
            await prepareZkLogin();
            addLog("zkLogin keypair prepared");
          } catch (error: any) {
            addLog(`Failed to prepare zkLogin: ${error.message}`);
          }
        }
      };
      
      onReady(methods);
      onReadyCalledRef.current = true;
    }
  }, [prepareZkLogin, onReady]);
  
  // Mark component as mounted
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  // Render status panel or error/loading states
  return (
    <div className="mt-4">
      {!hasMounted ? (
        <div />
      ) : zkLoginAddress ? (
        <div className="p-4 bg-slate-700 rounded-lg text-white">
          <h3 className="text-lg font-bold">Connected to Sui Devnet</h3>
          <p className="text-sm truncate">Address: {zkLoginAddress}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {error && (
            <div className="p-2 bg-red-500 rounded text-white text-sm">
              {error}
            </div>
          )}
          {loading && (
            <div className="p-4 bg-slate-700 rounded-lg text-white">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
                <span>Processing...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
