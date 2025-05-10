/**
 * AuthContext provides authentication and zkLogin address management for the application.
 * It integrates user authentication, zkLogin address registration, and on-chain verification.
 *
 * Features:
 * - User authentication and session management
 * - zkLogin address registration and on-chain verification
 * - Wallet address binding and database persistence
 * - Centralized logging for authentication events
 */
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useUser } from '@/hooks/useUser';
import { useZkLogin } from '@/contexts/ZkLoginContext';
import { useLogContext } from '@/contexts/LogContext';
import { createClient } from '@/utils/supabase/client';
import { AppStorage } from '@/utils/StorageService';
import { saveUserWithWalletAddress, checkWalletAddressSaved, checkDatabasePermissions } from '@/app/actions';
import { contractService } from '@/utils/ZkLoginAuthService';
import { SuiService } from '@/utils/SuiService';
import { ZkLoginProcessResult } from '@/interfaces/ZkLogin';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { useZkLoginParams } from '@/hooks/useZkLoginParams';
import { usePathname } from 'next/navigation';

/**
 * AuthContextType defines the shape of the authentication context, including state and operations.
 */
interface AuthContextType {
  /**
   * Current user object
   */
  user: any;
  /**
   * Indicates if user data is loading
   */
  isLoading: boolean;
  /**
   * Indicates if the user is authenticated
   */
  isAuthenticated: boolean;
  /**
   * zkLogin address (reference only)
   */
  zkLoginAddress: string | null;
  /**
   * Indicates if the address is verified on-chain
   */
  onChainVerified: boolean;
  /**
   * Handles the login process, integrating all authentication steps
   */
  handleLogin: () => Promise<void>;
  /**
   * Handles the logout process
   */
  handleLogout: () => Promise<void>;
  /**
   * Completes authentication with zkLogin result
   * @param zkLoginResult - The zkLogin process result
   */
  completeAuthentication: (zkLoginResult: ZkLoginProcessResult) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider supplies authentication context to its children.
 * Manages user authentication, zkLogin address registration, and on-chain verification.
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useUser();
  const { addLog } = useLogContext();
  const supabase = createClient();
  
  // Use ZkLoginContext
  const { 
    state: zkLoginState,
    prepareZkLogin,
    clearState: clearZkLoginState
  } = useZkLogin();
  
  const zkLoginAddress = zkLoginState.zkLoginAddress;
  
  // Use zkLogin parameter hook
  const { validateParams, prepareKeypair, getZkLoginParams } = useZkLoginParams();
  
  // On-chain verification state
  const [onChainVerified, setOnChainVerified] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  
  // Ref to track if the user/address has been processed
  const processedRef = useRef<{userId?: string, address?: string}>({});

  const pathname = usePathname();

  /**
   * Checks the on-chain verification status of a zkLogin address
   * @param address - zkLogin address to check
   * @returns {Promise<boolean>} Whether the address is verified on-chain
   */
  const checkVerificationStatus = useCallback(async (address: string) => {
    try {
      addLog("Start checking on-chain verification status...");
      const result = await contractService.isAddressVerified(address);
      
      if (result.verified) {
        addLog("zkLogin address is already verified on-chain, skipping verification");
        setOnChainVerified(true);
        return true;
      } else {
        addLog("zkLogin address is not verified on-chain, proceeding with verification");
        return false;
      }
    } catch (error: any) {
      addLog(`Failed to check verification status: ${error.message}, proceeding with verification`);
      return false;
    }
  }, [addLog, setOnChainVerified]);

  /**
   * Registers a zkLogin address on-chain
   * @param address - zkLogin address
   * @param keypair - Ephemeral keypair
   * @param partialSignature - Partial signature for zkLogin
   * @param userSalt - User salt for zkLogin
   * @param decodedJwt - Decoded JWT for zkLogin
   * @returns {Promise<boolean>} Whether registration was successful
   */
  const registerAddress = useCallback(async (address: string, keypair: any, partialSignature: any, userSalt: string, decodedJwt: any) => {
    addLog("Start on-chain registration: Register zkLogin address...");
    
    try {
      const registerResult = await contractService.registerZkLoginAddress(
        address,
        keypair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      if (registerResult.success) {
        addLog(`zkLogin address registered successfully, txId: ${registerResult.txId}`);
        return true;
      } else {
        addLog(`Failed to register zkLogin address: ${registerResult.error}`);
        return false;
      }
    } catch (registerError: any) {
      addLog(`Exception during zkLogin address registration: ${registerError.message}`);
      return false;
    }
  }, [addLog]);

  /**
   * Binds a wallet address to a user ID on-chain
   * @param address - zkLogin address
   * @param userId - User ID
   * @param keypair - Ephemeral keypair
   * @param partialSignature - Partial signature for zkLogin
   * @param userSalt - User salt for zkLogin
   * @param decodedJwt - Decoded JWT for zkLogin
   * @returns {Promise<boolean>} Whether binding was successful
   */
  const bindWalletAddress = useCallback(async (address: string, userId: string, keypair: any, partialSignature: any, userSalt: string, decodedJwt: any) => {
    addLog("Binding wallet address to user ID...");
    
    // Clean user ID
    let userIdStr = String(userId).replace(/[^\w]/g, '');
    if (userIdStr.length > 20) {
      userIdStr = userIdStr.substring(0, 20);
    }
    addLog(`Processed user ID: ${userIdStr}`);
    
    try {
      const bindResult = await contractService.bindWalletAddress(
        address,
        userIdStr,
        keypair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      if (bindResult.success) {
        addLog(`Wallet address bound successfully, txId: ${bindResult.txId}`);
        AppStorage.setAuthTxHash(bindResult.txId || '');
        return true;
      } else {
        addLog(`Failed to bind wallet address: ${bindResult.error}`);
        return false;
      }
    } catch (bindError: any) {
      addLog(`Exception during wallet address binding: ${bindError.message}`);
      return false;
    }
  }, [addLog]);

  /**
   * Main function for on-chain registration process
   * @param address - zkLogin address
   * @param userId - User ID
   * @returns {Promise<boolean>} Whether registration and binding were successful
   */
  const registerOnChain = useCallback(async (address: string, userId: string) => {
    addLog("call registerOnChain ");
    
    // Parameter validation
    if (!validateParams(address, userId)) {
      return false;
    }

    // Prepare ephemeral keypair
    const keypair = prepareKeypair();
    if (!keypair) return false;
    
    // Get zkLogin parameters
    const params = getZkLoginParams();
    if (!params) return false;
    const { partialSignature, userSalt, decodedJwt } = params;
    
    // Check on-chain verification status
    const isVerified = await checkVerificationStatus(address);

    // If not verified, bind wallet address (includes registration)
    if (!isVerified) {
      const bindSuccess = await bindWalletAddress(
        address, userId, keypair, partialSignature, userSalt, decodedJwt);
      if (bindSuccess) {
        setOnChainVerified(true);
        return true;
      }
      return false;
    }
    return true;

  }, [addLog, validateParams, prepareKeypair, getZkLoginParams, checkVerificationStatus, bindWalletAddress, setOnChainVerified]);

  // Listen for user and address changes, attempt to save zkLogin address
  useEffect(() => {
    // If user or zkLogin address does not exist, return
    if (!user || !zkLoginAddress) {
      return;
    }
    
    // Check if already processed for this user ID and address
    if (processedRef.current.userId === user.id && 
        processedRef.current.address === zkLoginAddress) {
      return;
    }
    
    // Update processed record
    processedRef.current = { userId: user.id, address: zkLoginAddress };
    
    addLog(`AuthContext useEffect triggered: userId=${user.id}, zkLoginAddress=${zkLoginAddress}`);

  }, [user, zkLoginAddress, addLog, onChainVerified, checkingVerification, registerOnChain]);

  useEffect(() => {
    // Rehydrate user from Supabase session
    const rehydrate = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        // Optionally update state here if you have custom user state
      }
    };
    rehydrate();
    if (sessionStorage.getItem('justLoggedIn')) {
      sessionStorage.removeItem('justLoggedIn');
    }
  }, [pathname]);

  /**
   * Handles the login process, integrating all authentication steps
   * Redirects to Google OAuth for authentication
   */
  const handleLogin = async () => {
    try {
      if (typeof window !== 'undefined') {
        AppStorage.setHasCheckedJwt(false);
        AppStorage.setJwtProcessed(false);
        AppStorage.setLoginInitiated(true);
      }
      
      addLog("Start login process...");
      
      // 1. Prepare zkLogin (create ephemeral keypair)
      const nonce = await prepareZkLogin();
      addLog("zkLogin preparation complete, nonce: " + nonce);
      
      // 2. Build OAuth URL and redirect
      const googleOAuthEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const redirectUri = `${window.location.origin}/auth/callback`;
      const scope = 'openid email profile';
      const responseType = 'id_token';
      
      const oauthUrl = new URL(googleOAuthEndpoint);
      oauthUrl.searchParams.append('client_id', clientId!);
      oauthUrl.searchParams.append('redirect_uri', redirectUri);
      oauthUrl.searchParams.append('response_type', responseType);
      oauthUrl.searchParams.append('scope', scope);
      oauthUrl.searchParams.append('nonce', nonce);
      oauthUrl.searchParams.append('prompt', 'consent');
      
      addLog("Redirecting to Google authorization page...");
      window.location.href = oauthUrl.toString();
    } catch (err: any) {
      addLog(`Exception during login process: ${err.message}`);
    }
  };

  /**
   * Completes authentication (called from callback page)
   * @param zkLoginResult - The zkLogin process result
   */
  const completeAuthentication = async (zkLoginResult: ZkLoginProcessResult) => {
    try {
      addLog(`Completing authentication process, zkLogin address: ${zkLoginResult.zkLoginAddress}`);
      
      // Check user login status
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error("User information not found");
      }
      
      // On-chain verification
      await registerOnChain(zkLoginResult.zkLoginAddress, currentUser.id);
      
      // Save address to database
      await saveUserWithWalletAddress(currentUser.id, zkLoginResult.zkLoginAddress);
      AppStorage.setWalletSaved(true);
      
      addLog("Authentication process complete");
      
      // Update processed record
      processedRef.current = { 
        userId: currentUser.id, 
        address: zkLoginResult.zkLoginAddress 
      };
    } catch (error: any) {
      addLog(`Failed to complete authentication process: ${error.message}`);
      throw error;
    }
  };

  /**
   * Handles the logout process
   * Clears all storage, resets state, and logs out from Supabase
   */
  const handleLogout = async () => {
    try {
      addLog("Start logout process...");
      
      // Clear all storage
      AppStorage.clearAll();
      
      // Clear processed state
      processedRef.current = {};
      
      // Clear zkLogin state
      clearZkLoginState();
      
      // Logout from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setOnChainVerified(false);
      addLog("Successfully logged out");
      window.location.reload();
    } catch (error: any) {
      console.error("Logout failed:", error);
      addLog(`Logout failed: ${error.message}`);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    zkLoginAddress,
    onChainVerified,
    handleLogin,
    handleLogout,
    completeAuthentication
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth provides access to the authentication context
 * Must be used within an AuthProvider
 *
 * @returns {AuthContextType} Authentication context value
 * @throws {Error} If used outside of AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 