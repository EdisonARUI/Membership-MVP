/**
 * Token configuration constants
 * This file contains token specifications and conversion utilities
 */
import { CONTRACT_ADDRESSES } from './contracts';

/**
 * Token configuration interface 
 * Defines properties for each supported token
 */
export interface TokenConfig {
  /**
   * Full token name
   */
  name: string;
  
  /**
   * Token symbol/ticker
   */
  symbol: string;
  
  /**
   * Number of decimal places for the token
   */
  decimals: number;
  
  /**
   * Optional URL to token icon image
   */
  iconUrl?: string;
  
  /**
   * Full on-chain type path for the token
   */
  coinType: string;
}

/**
 * Supported tokens and their configurations
 */
export const TOKENS: { [key: string]: TokenConfig } = {
  /**
   * SUI native token
   */
  SUI: {
    name: 'Sui',
    symbol: 'SUI',
    decimals: 9,
    iconUrl: '/images/tokens/sui.png',
    coinType: '0x2::sui::SUI'
  },
  
  /**
   * Test USDT token used for payments
   */
  TEST_USDT: {
    name: 'testUSDT',
    symbol: 'testUSDT',
    decimals: 8,
    iconUrl: '/images/tokens/usdt.png',
    coinType: `${CONTRACT_ADDRESSES.COIN.PACKAGE_ID}::test_usdt::TEST_USDT`
  }
};

/**
 * Converts a human-readable token amount to on-chain representation
 * 
 * @param amount - Amount in human-readable form (e.g., 10.5)
 * @param token - Token configuration object
 * @returns On-chain token amount with applied decimal precision
 */
export const toTokenAmount = (amount: number, token: TokenConfig): bigint => {
  return BigInt(Math.floor(amount * 10 ** token.decimals));
};

/**
 * Converts an on-chain token amount to human-readable form
 * 
 * @param amount - On-chain token amount
 * @param token - Token configuration object
 * @returns Human-readable token amount (e.g., 10.5)
 */
export const fromTokenAmount = (amount: bigint, token: TokenConfig): number => {
  return Number(amount) / 10 ** token.decimals;
};
