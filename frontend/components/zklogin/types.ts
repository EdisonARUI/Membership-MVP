import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { ReactNode } from 'react';

export interface EphemeralKeyPair {
  keypair: {
    publicKey: string;
    secretKey: string;
  };
  randomness: string;
  maxEpoch: number;
  nonce: string;
}

export interface ZkLoginProviderProps {
  userId?: string;
  autoInitialize?: boolean;
  onLog?: (message: string) => void;
  onReady?: (methods: ZkLoginMethods) => void;
  children?: ReactNode;
}

export interface ZkLoginMethods {
  initiateLogin: () => Promise<void>;
  handleGoogleAuth: () => Promise<void>;
}

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

export interface ZkProofResult {
  proofPoints: string;
  issBase64Details: string;
  headerBase64: string;
}

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