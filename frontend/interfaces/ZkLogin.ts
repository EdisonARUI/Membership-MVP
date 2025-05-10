import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

/**
 * ZkLogin related interfaces and type definitions
 * These interfaces define the contract for zkLogin authentication operations
 */

/**
 * Partial zkLogin signature returned by the ZKP API
 * Used for generating zero-knowledge proofs
 */
export interface PartialZkLoginSignature {
  /**
   * Input parameters for the zero-knowledge proof
   */
  inputs: {
    /**
     * Proof points in the zero-knowledge proof system
     */
    proofPoints: {
      a: string[];
      b: string[][];
      c: string[];
    };
    
    /**
     * JWK base64 details
     */
    issBase64Details: {
      /**
       * JWK hex value
       */
      value: string;
      
      /**
       * Index modulo 4
       */
      indexMod4: number;
    };
    
    /**
     * Base64 encoded header
     */
    headerBase64: string;
  };
  
  /**
   * Maximum epoch until which the signature is valid
   */
  maxEpoch: number;
}

/**
 * Request parameters for zkProof API
 */
export interface ZkProofRequestBody {
  /**
   * JSON Web Token from OAuth provider
   */
  jwt: string;
  
  /**
   * Public key of the ephemeral keypair
   */
  ephemeralPublicKey: string;
  
  /**
   * User's salt value
   */
  userSalt: string;
  
  /**
   * Optional maximum epoch until which the signature is valid
   */
  maxEpoch?: number;
  
  /**
   * Optional JWT randomness
   */
  jwtRandomness?: string;
  
  /**
   * Optional network type (defaults to devnet)
   */
  networkType?: 'mainnet' | 'testnet' | 'devnet';
}

/**
 * Result of processing a zkLogin JWT
 */
export interface ZkLoginProcessResult {
  /**
   * Derived zkLogin wallet address
   */
  zkLoginAddress: string;
  
  /**
   * Partial signature for transaction authorization
   */
  partialSignature: PartialZkLoginSignature;
  
  /**
   * Ephemeral keypair used in the zkLogin process
   */
  ephemeralKeypair: Ed25519Keypair;
}

/**
 * Response data from the zkProof API
 */
export interface ZkProofResponseData {
  /**
   * Whether the request was successful
   */
  success: boolean;
  
  /**
   * Error message if request failed
   */
  error?: string;
  
  /**
   * Generated proof if request was successful
   */
  proof?: PartialZkLoginSignature;
  
  /**
   * Additional details for debugging
   */
  details?: any;
  
  /**
   * Whether the result was served from cache
   */
  cached?: boolean;
} 