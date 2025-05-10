/**
 * ZkLogin configuration constants
 * This file contains configuration for zkLogin proof generation
 */

/**
 * Prover URL for devnet environment
 * Used when SUI_ENV is set to 'devnet'
 */
const DEV_PROVER_URL = 'https://prover-dev.mystenlabs.com/v1';

/**
 * Prover URL for mainnet and testnet environments
 * Used when SUI_ENV is not set to 'devnet'
 */
const MAIN_AND_TEST_PROVER_URL = 'https://prover.mystenlabs.com/v1';

/**
 * Dynamically selected zkProof API URL based on the current environment
 * Uses development prover for devnet, and production prover for testnet/mainnet
 */
export const ZKPROOF_URL = process.env.SUI_ENV === 'devnet' ? DEV_PROVER_URL : MAIN_AND_TEST_PROVER_URL;
