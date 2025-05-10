/**
 * Types and interfaces for zkLogin authentication and provider components.
 * Defines keypair, provider props, state, proof parameters, and signature structures.
 *
 * Features:
 * - Ephemeral keypair and randomness for zkLogin
 * - Provider props and callback interfaces
 * - State and proof parameter/result types
 * - Signature structure for zkLogin
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { ReactNode } from 'react';

/**
 * EphemeralKeyPair represents a temporary keypair and randomness for zkLogin
 */
export interface EphemeralKeyPair {
  keypair: {
    publicKey: string;
    secretKey: string;
  };
  randomness: string;
  maxEpoch: number;
  nonce: string;
}

/**
 * Props for ZkLoginProvider component
 */
export interface ZkLoginProviderProps {
  /**
   * Optional user ID for the provider
   */
  userId?: string;
  /**
   * Whether to auto-initialize the provider
   */
  autoInitialize?: boolean;
  /**
   * Callback for logging messages
   */
  onLog?: (message: string) => void;
  /**
   * Callback when provider is ready, provides ZkLoginMethods
   */
  onReady?: (methods: ZkLoginMethods) => void;
  /**
   * Child components
   */
  children?: ReactNode;
}

/**
 * Methods provided by ZkLoginProvider for login and Google auth
 */
export interface ZkLoginMethods {
  /**
   * Initiates the login process
   */
  initiateLogin: () => Promise<void>;
  /**
   * Handles Google authentication
   */
  handleGoogleAuth: () => Promise<void>;
}

/**
 * Parameters required for generating a zkLogin proof
 */
export interface ZkProofParams {
  jwt: string;
  extendedEphemeralPublicKey: string;
  jwtRandomness: string;
  maxEpoch: number;
  salt: string;
  keyClaimName: string;
  oauthProvider: string;
  originalNonce?: string;
}

/**
 * Result of a zkLogin proof operation
 */
export interface ZkProofResult {
  proofPoints: string;
  issBase64Details: string;
  headerBase64: string;
}

/**
 * State object for zkLogin authentication
 */
export interface ZkLoginState {
  status?: 'idle' | 'initializing' | 'ready' | 'error';
  zkLoginAddress: string | null;
  ephemeralKeypair: EphemeralKeyPair | null;
  isInitialized: boolean;
  error: string | null;
  loading: boolean;
  jwt: string | null;
  partialSignature?: any | null;
}

/**
 * Structure of a zkLogin signature
 */
export interface ZkLoginSignature {
  inputs: {
    proofPoints: string;
    issBase64Details: string;
    headerBase64: string;
    addressSeed: string;
  };
  maxEpoch: number;
  userSignature: string;
} 