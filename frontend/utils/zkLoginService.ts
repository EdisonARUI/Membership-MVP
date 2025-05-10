/**
 * Service for zkLogin authentication flow 
 * Manages the zkLogin process including JWT handling, salt retrieval, and zero-knowledge proof generation
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { AppStorage } from './StorageService';
import { SuiService } from './SuiService';
import { 
  PartialZkLoginSignature, 
  ZkProofRequestBody,
  ZkLoginProcessResult 
} from '../interfaces/ZkLogin';
import { parseJwt } from '@/utils/jwt/client';
import { API_ENDPOINTS } from '../app/api/endpoints';
import { api } from '../app/api/clients';
import { AppError } from '../interfaces/Error';

// Log callback function type
type LogCallback = (message: string) => void;

/**
 * Service for managing zkLogin authentication process
 * Handles JWT processing, salt retrieval, and zkLogin signature generation
 */
export class ZkLoginService {
  // Static log callback
  private static logCallback: LogCallback | null = null;
  
  /**
   * Sets log callback function
   * @param {LogCallback} callback - The log callback function
   */
  static setLogCallback(callback: LogCallback): void {
    this.logCallback = callback;
  }
  
  /**
   * Outputs log message
   * @param {string} message - The log message
   * @private
   */
  private static log(message: string): void {
    // If callback is set, call it
    if (this.logCallback) {
      this.logCallback(message);
    }
  }

  /**
   * Parses JWT token
   * @param {string} jwt - JWT token to parse
   * @returns {any} Parsed JWT payload
   * @throws {Error} If JWT parsing fails
   */
  static parseJwt(jwt: string): any {
    try {
      return parseJwt(jwt);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Initializes zkLogin process
   * Creates ephemeral keypair and saves it
   * 
   * @param {boolean} forceNew - Whether to force creation of new keypair
   * @returns {Promise<{ keypair: any, nonce: string }>} Created ephemeral keypair and nonce
   * @throws {Error} If keypair creation fails
   */
  static async initialize(forceNew: boolean = false): Promise<{ keypair: any, nonce: string }> {
    try {
      this.log("Starting to create ephemeral keypair...");
      
      if (!SuiService) {
        this.log("SuiService is undefined");
        throw new Error("SuiService is undefined");
      }
      
      if (!SuiService.createEphemeralKeyPair) {
        this.log("SuiService.createEphemeralKeyPair method is undefined");
        throw new Error("createEphemeralKeyPair method is undefined");
      }
      
      const keypair = await SuiService.createEphemeralKeyPair()
        .catch(error => {
          this.log(`SuiService.createEphemeralKeyPair execution failed: ${error.message}`);
          throw new Error(`Failed to create keypair: ${error.message || 'Unknown error'}`);
        });
      
      if (!keypair || !keypair.nonce) {
        this.log("Created ephemeral keypair is invalid");
        throw new Error("Created ephemeral keypair is invalid");
      }
      
      this.log(`Ephemeral keypair created successfully, nonce: ${keypair.nonce}`);
      
      return {
        keypair,
        nonce: keypair.nonce
      };
    } catch (error: any) {
      this.log(`Keypair preparation failed: ${error.message || 'Unknown error'}`);
      throw error instanceof Error ? error : new Error(`Keypair preparation failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Fetches user salt value from API
   * 
   * @param {string} jwt - JWT token to use for salt retrieval
   * @param {string} keyClaimName - Key claim name to use (default: 'sub')
   * @returns {Promise<string>} User salt value
   * @throws {AppError} If salt retrieval fails
   */
  static async fetchUserSalt(jwt: string, keyClaimName: string = 'sub'): Promise<string> {
    try {
      this.log("Starting to fetch user salt...");
      const response = await api.post<{ salt: string }>(
        API_ENDPOINTS.ZKLOGIN.USER.SALT,
        { jwt, keyClaimName }
      );
      
      if (!response.success || !response.data?.salt) {
        this.log("Failed to get salt");
        
        // Check if error details include response text
        let errorMessage = response.error?.message || 'Failed to get user salt';
        if (response.error?.details?.responseText) {
          this.log(`Error response content: ${response.error.details.contentType || 'Unknown'}`);
          errorMessage += ` - Unexpected response format: ${response.error.details.contentType || 'Unknown'}`;
        }
        
        throw AppError.fromApiError(response.error || {
          status: 500,
          code: 'SALT_ERROR',
          message: errorMessage
        });
      }
      
      this.log(`User salt retrieval successful: ${response.data.salt.substring(0, 10)}...`);
      return response.data.salt;
    } catch (error: any) {
      this.log(`Salt retrieval request failed: ${error.message || 'Unknown error'}`);
      throw error; // Let upper layer handle this error
    }
  }

  /**
   * Gets ZKP (Zero Knowledge Proof)
   * 
   * @param {string} jwt - JWT token
   * @param {Ed25519Keypair} ephemeralKeypair - Ephemeral keypair
   * @param {string} userSalt - User salt value
   * @param {string} jwtRandomness - JWT randomness
   * @param {number} maxEpoch - Maximum epoch
   * @param {('mainnet' | 'testnet' | 'devnet')} networkType - Network type (default: 'devnet')
   * @returns {Promise<PartialZkLoginSignature>} The zkLogin partial signature
   * @throws {AppError} If proof retrieval fails
   */
  static async getZkProof(
    jwt: string,
    ephemeralKeypair: Ed25519Keypair,
    userSalt: string,
    jwtRandomness: string,
    maxEpoch: number,
    networkType: 'mainnet' | 'testnet' | 'devnet' = 'devnet'
  ): Promise<PartialZkLoginSignature> {
    try {
      this.log("Starting to get ZKP (Zero Knowledge Proof)...");
      const ephemeralPublicKey = ephemeralKeypair.getPublicKey().toBase64();
            
      const requestBody: ZkProofRequestBody = {
        jwt,
        ephemeralPublicKey,
        userSalt,
        networkType,
        jwtRandomness,
        maxEpoch
      };
      
      // Use centralized API definition and request tools
      const response = await api.post<{ proof: PartialZkLoginSignature }>(
        API_ENDPOINTS.ZKLOGIN.PROOF, 
        requestBody
      );
      
      if (!response.success || !response.data?.proof) {
        this.log("Failed to get ZKP");
        
        // Check if error details include response text
        let errorMessage = response.error?.message || 'Failed to get ZKP';
        if (response.error?.details?.responseText) {
          this.log(`Error response content: ${response.error.details.contentType || 'Unknown'}`);
          errorMessage += ` - Unexpected response format: ${response.error.details.contentType || 'Unknown'}`;
        }
        
        throw AppError.fromApiError(response.error || {
          status: 500,
          code: 'ZKP_ERROR',
          message: errorMessage
        });
      }
      
      this.log("ZKP retrieval successful");
      return response.data.proof;
    } catch (error: any) {
      this.log(`ZKP request failed: ${error.message || 'Unknown error'}`);
      throw error; // Let upper layer handle this error
    }
  }

  /**
   * Activates address
   */
  static async activateAddress(address: string): Promise<void> {
    try {
      this.log(`Starting to activate address: ${address}`);
      await SuiService.activateAddress(address);
      this.log(`Address activation request sent: ${address}`);
    } catch (error: any) {
      this.log(`Failed to activate address: ${error.message || 'Unknown error'}`);
      // Continue execution without interruption
    }
  }

  /**
   * Checks and gets ephemeral keypair
   * @private
   */
  private static checkAndGetEphemeralKeyPair(): Ed25519Keypair {
    const ephemeralKeypair = AppStorage.getEphemeralKeypair()?.keypair;
      if (!ephemeralKeypair) {
      this.log("Ephemeral keypair not found, cannot process JWT");
        throw new Error("Ephemeral keypair not found, cannot process JWT");
      }
      
      // Recreate keypair
    return SuiService.recreateKeypairFromStored(ephemeralKeypair);
  }

  /**
   * Parses and stores JWT
   * @private
   */
  private static parseAndStoreJwt(jwt: string): any {
      const payload = this.parseJwt(jwt);
    this.log(`JWT parsing successful: sub=${payload.sub}, iss=${payload.iss}`);
      
      // Store parsed JWT
      AppStorage.setDecodedJwt(payload);
    return payload;
  }

  /**
   * Gets or gets user salt value
   * @private
   */
  private static async getOrFetchUserSalt(jwt: string): Promise<string> {
      let userSalt = AppStorage.getZkLoginUserSalt();
      if (!userSalt) {
        try {
        this.log("Local salt not found, fetching from API...");
          userSalt = await this.fetchUserSalt(jwt);
          AppStorage.setZkLoginUserSalt(userSalt);
        this.log(`User salt retrieval successful: ${userSalt.substring(0, 10)}...`);
        } catch (saltError: any) {
        this.log(`Error occurred while getting salt: ${saltError.message || 'Unknown error'}`);
          
          // Try recording response content
          if (saltError.responseText) {
          this.log("Error response content available, recording details");
          }
          
          throw new Error(`Failed to get user salt: ${saltError.message}`);
        }
    } else {
      this.log("Using local stored salt");
      }
      
    return userSalt;
  }
      
  /**
   * Gets and processes JWT randomness and maximum epoch
   * @private
   */
  private static getJwtParams(): { jwtRandomness: string, maxEpoch: number } {
      const jwtRandomness = AppStorage.getZkLoginOriginalRandomness()
        ? JSON.parse(AppStorage.getZkLoginOriginalRandomness()!)
        : '';
        
      // Get maxEpoch
      const maxEpoch = parseInt(AppStorage.getZkLoginOriginalMaxEpoch() || '2');
    this.log(`Using maxEpoch: ${maxEpoch}`);

    return { jwtRandomness, maxEpoch };
  }

  /**
   * Gets and stores ZKP proof
   * @private
   */
  private static async getAndStoreProof(
    jwt: string, 
    keypair: Ed25519Keypair, 
    userSalt: string,
    jwtRandomness: string,
    maxEpoch: number
  ): Promise<PartialZkLoginSignature> {
    try {
      this.log("Starting to get zero knowledge proof...");
      const proofResponse = await this.getZkProof(
        jwt, 
        keypair, 
        userSalt, 
        jwtRandomness, 
        maxEpoch
      );
        
        // Store result
        AppStorage.setZkLoginPartialSignature(proofResponse);
      return proofResponse;
      } catch (proofError: any) {
      this.log(`Error occurred while getting ZKP proof: ${proofError.message || 'Unknown error'}`);
        
        // Try recording response content
        if (proofError.responseText) {
        this.log("Error response content available, recording details");
        }
        
        throw new Error(`Failed to get ZKP proof: ${proofError.message}`);
      }
  }

  /**
   * Processes JWT and completes zkLogin process
   * @param {string} jwt - JWT token
   * @returns {Promise<ZkLoginProcessResult>} Processing result
   */
  static async processJwt(jwt: string): Promise<ZkLoginProcessResult> {
    try {
      this.log("Starting to process JWT...");
      
      // 1. Checks and gets ephemeral keypair
      const keypair = this.checkAndGetEphemeralKeyPair();
      
      // 2. Parses JWT
      const payload = this.parseAndStoreJwt(jwt);
      
      // 3. Gets user salt value
      const userSalt = await this.getOrFetchUserSalt(jwt);
      
      // 4. Calculates zkLogin address
      this.log("Starting to calculate zkLogin address...");
      const zkLoginAddress = await SuiService.deriveZkLoginAddress(jwt, userSalt);
      this.log(`zkLogin address calculation successful: ${zkLoginAddress}`);
      
      // 5. Gets JWT randomness and maximum epoch
      const { jwtRandomness, maxEpoch } = this.getJwtParams();
      
      // 6. Gets and stores ZKP
      const partialSignature = await this.getAndStoreProof(
        jwt, 
        keypair, 
        userSalt, 
        jwtRandomness, 
        maxEpoch
      );
      
      // 7. Saves address and marks processing status
      AppStorage.setZkLoginAddress(zkLoginAddress);
      AppStorage.setJwtProcessed(true);
      
      // 8. Activates address
      await this.activateAddress(zkLoginAddress);
      
      this.log("JWT processing completed, returning result");
      return {
        zkLoginAddress,
        partialSignature,
        ephemeralKeypair: keypair
      };
    } catch (error: any) {
      this.log(`Processing JWT failed: ${error.message || 'Unknown error'}`);
      throw new Error(`JWT processing failed: ${error.message}`);
    }
  }
} 