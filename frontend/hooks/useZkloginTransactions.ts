/**
 * Hook for managing zkLogin transaction operations
 * Provides functionality for signing and executing transactions with zkLogin credentials
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { genAddressSeed, getZkLoginSignature } from "@mysten/sui/zklogin";
import { PartialZkLoginSignature } from '@/interfaces/ZkLogin';
import { SUI_RPC_URL } from '@/config/client';

type LogFunction = (message: string) => void;

/**
 * Hook for zkLogin transaction operations
 * Handles transaction signing and execution using zkLogin authentication
 * 
 * @param {LogFunction} logFn - Optional function for logging transaction steps
 * @returns {Object} Transaction operations
 */
export function useZkLoginTransactions(logFn?: LogFunction) {
  /**
   * Internal logging function
   * 
   * @param {string} message - Message to log
   * @private
   */
  const log = (message: string) => {
    if (logFn) {
      logFn(message);
    }
  };

  /**
   * Signs and executes a transaction using zkLogin credentials
   * Handles generating zkLogin signature and submitting to blockchain
   * 
   * @param {Transaction} txb - Transaction block to sign and execute
   * @param {string} zkLoginAddress - zkLogin address of the sender
   * @param {Ed25519Keypair} ephemeralKeyPair - Ephemeral keypair for signing
   * @param {PartialZkLoginSignature} partialSignature - Partial zkLogin signature
   * @param {string} userSalt - User's salt value
   * @param {any} decodedJwt - Decoded JWT information
   * @returns {Promise<any>} Transaction execution result
   * @throws {Error} If transaction signing or execution fails
   */
  async function signAndExecuteTransaction(
    txb: Transaction,
    zkLoginAddress: string,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ) {
    log("Preparing to sign and execute transaction with zkLogin...");
    const client = new SuiClient({ url: SUI_RPC_URL });
    
    // Set sender
    txb.setSender(zkLoginAddress);
    log(`Transaction sender set: ${zkLoginAddress}`);
    
    // Sign with ephemeral keypair
    log("Signing transaction with ephemeral keypair...");
    const { bytes, signature: userSignature } = await txb.sign({
      client,
      signer: ephemeralKeyPair,
    });
    log("Transaction signing complete, preparing to generate address seed");
    
    // Generate address seed
    try {
    const addressSeed = genAddressSeed(
      BigInt(userSalt), 
      "sub", 
      decodedJwt.sub, 
      decodedJwt.aud
    ).toString();
      log(`Address seed generation successful: ${addressSeed.substring(0, 10)}...`);
      
      // Parameter validation and compatibility handling
      if (!partialSignature || !partialSignature.inputs) {
        log("Error: Invalid partialSignature structure");
        throw new Error("Invalid partialSignature structure");
      }
      
      log("Validating partialSignature structure...");
      const { proofPoints, issBase64Details, headerBase64 } = partialSignature.inputs;
      
      if (!proofPoints) {
        log("Error: partialSignature missing required field proofPoints");
        throw new Error("partialSignature missing required field proofPoints");
      }
      
      if (!issBase64Details) {
        log("Error: partialSignature missing required field issBase64Details");
        throw new Error("partialSignature missing required field issBase64Details");
      }
      
      if (!headerBase64) {
        log("Error: partialSignature missing required field headerBase64");
        throw new Error("partialSignature missing required field headerBase64");
      }
      
      // Check issBase64Details internal structure
      if (!issBase64Details.value) {
        log("Error: issBase64Details missing required field value");
        throw new Error("issBase64Details missing required field value");
      }
      
      if (issBase64Details.indexMod4 === undefined) {
        log("Error: issBase64Details missing required field indexMod4");
        throw new Error("issBase64Details missing required field indexMod4");
      }
      
      // Check proofPoints internal structure 
      if (!proofPoints.a || !proofPoints.b || !proofPoints.c) {
        log("Error: proofPoints structure incomplete (missing a, b, or c)");
        throw new Error("proofPoints structure incomplete");
      }
      
      log("Serializing zkLogin signature...");
      // Serialize zkLogin signature - corrected per latest documentation
    const zkLoginSignature = getZkLoginSignature({
      inputs: {
          ...partialSignature.inputs,
        addressSeed
      },
        maxEpoch: partialSignature.maxEpoch,
      userSignature,
    });
      log("zkLogin signature serialization successful, preparing to execute transaction");
    
    // Execute transaction
      log("Submitting transaction to blockchain...");
      const result = await client.executeTransactionBlock({
      transactionBlock: bytes,
      signature: zkLoginSignature,
      options: {
        showEvents: true,
        showEffects: true
      }
    });
      
      log(`Transaction execution complete, transaction ID: ${result.digest}`);
      return result;
    } catch (error: any) {
      log(`Transaction execution failure details: ${JSON.stringify(error)}`);
      throw error;
    }
  }
  
  return {
    signAndExecuteTransaction
  };
}
