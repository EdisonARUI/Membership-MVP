/**
 * Contract configuration constants
 * This file contains the addresses and object IDs for the deployed smart contracts
 */

/**
 * Gas configuration for transactions
 */
export const GAS = {
  /**
   * Coin type for gas payments
   */
  COIN: '0x2::sui::SUI',
  
  /**
   * Default gas budget for transactions
   */
  BUDGET: 10000000
}

/**
 * Common objects used across different contracts
 */
export const COMMON_CONTRACT = {  
  /**
   * Clock object ID used for time-dependent operations
   */
  CLOCK: "0x6",
  
  /**
   * Random number generator object ID
   */
  RANDOM_NUMBER_GENERATOR: "0x8"
}

/**
 * Address used for sponsored transactions
 */
export const SPONSOR_ADDRESS = '0x7d87c83c2f71bb9388262c06f0eec7b57ee651bf1892a7a6fd6f1b1b931ac7fc';

/**
 * Deployed contract addresses and object IDs
 */
export const CONTRACT_ADDRESSES = {
  /**
   * ZkLogin authentication contract
   */
  AUTHENTICATION: {
    /**
     * Package ID for the authentication contract
     */
    PACKAGE_ID: '0xf7c2643bb6eaa60abf41e567c8607f84ba7132340e4efcc4de26cf384e40294c',
    
    /**
     * Module name within the package
     */
    MODULE_NAME: 'authentication',
    
    /**
     * AuthRegistry object ID used for user identity verification
     */
    REGISTRY_OBJECT_ID: '0x9b3628b563f440b3137f12ebdcd5d41cd1f40179f050163e97dc1445ab6bcbfa',
    
    /**
     * Object ID for contract upgrade capability
     */
    UPGRADE_CAP_OBJECT_ID: '0xf935aae133a4e86340affe9fb34b65994f1e6a506c00eb40c72e36c8780600eb',
  },
  
  /**
   * Subscription management contract
   */
  SUBSCRIPTION: {
    /**
     * Package ID for the subscription contract
     */
    PACKAGE_ID: '0x9e1cf83ae1df5eaa53f457913e6ea2861ce0aed40d26bcf4e5298ccf44f5509b',
    
    /**
     * Module name within the package
     */
    MODULE_NAME: 'subscription',
    
    /**
     * Object ID for contract upgrade capability
     */
    UPGRADE_CAP_OBJECT_ID: '0xe0d3f4b9b39d930e34ed02f422b3c67252f11e2ef39836ba8a32699d5518059b',
    
    /**
     * Object ID for subscription fund container
     */
    FUND_OBJECT_ID: '0xb2854b66d2391e0e2431c9a6f3e053f3131194bc31c85f7a4ab9d0f45a914119',
    
    /**
     * AuthRegistry object ID for user verification
     */
    REGISTRY_OBJECT_ID: '0x9b3628b563f440b3137f12ebdcd5d41cd1f40179f050163e97dc1445ab6bcbfa',
    
    /**
     * Object ID for TEST_USDT token metadata
     */
    TEST_USDT_OBJECT_ID: '0x08e814a15a98d234fa668559489a4ee71347e948766f75d2d8fdbe3b24d67d0d',
  },
  
  /**
   * Lottery functionality contract
   */
  LOTTERY: {
    /**
     * Package ID for the lottery contract
     */
    PACKAGE_ID: '0x254b578fa2edde51bcfdb27c65315e2a26b0a16f7bdf0ad00612c15a25b28d03',
    
    /**
     * Module name within the package
     */
    MODULE_NAME: 'lottery',
    
    /**
     * Object ID for contract upgrade capability
     */
    UPGRADE_CAP_OBJECT_ID: '0x6e406b5c2aae836bd6028afe24c66aef37f93f60cd66ba57898ed3b702735987'
  },
  
  /**
   * Lottery prize pool contract
   */
  LOTTERY_POOL: {
    /**
     * Package ID for the lottery pool contract
     */
    PACKAGE_ID: '0x0d3b975bbacbfe123773ea873345d396895aa4c48dc7355358a0fb8956eecfd7',
    
    /**
     * Module name within the package
     */
    MODULE_NAME: 'pool',
    
    /**
     * Object ID for contract upgrade capability
     */
    UPGRADE_CAP_OBJECT_ID: '0x63d736d25d173252c41d3bbc07a82c4cee12de2c6d681a27eeb8a573ce5c9fb2',
    
    /**
     * Object ID for InstantPool storing SUI tokens as lottery prizes
     */
    LOTTERY_POOL_OBJECT_ID: "0x9a86a10f67a0f93ecba39a5dc52c27698169cd3650caf7be297d925808145ca0"
  },
  
  /**
   * Fund management contract
   */
  FUND: {
    /**
     * Package ID for the fund contract
     */
    PACKAGE_ID: '0x66d6cbaef7cd986414b4f4374b77ad62eb99cf77b5a176fd2092bcf00a9f7d6a',
    
    /**
     * Module name within the package
     */
    MODULE_NAME: 'fund',
    
    /**
     * Object ID for contract upgrade capability
     */
    UPGRADE_CAP_OBJECT_ID: '0xebd8b2c9119ea900fe794035587f8e3d13a402f060c66e8e9548bd071394a870',
    
    /**
     * Object ID for Fund storing TEST_USDT tokens as subscription revenue
     */
    FUND_OBJECT_ID: '0xb2854b66d2391e0e2431c9a6f3e053f3131194bc31c85f7a4ab9d0f45a914119'
  },
  
  /**
   * Token contract for TEST_USDT
   */
  COIN: {
    /**
     * Package ID for the TEST_USDT token contract
     */
    PACKAGE_ID: '0x513bf7209e6f9ced0430255d25ec58677fbecb5b921830cb4157bacb95b437de',
    
    /**
     * Module name within the package
     */
    MODULE_NAME: 'coin',
    
    /**
     * Object ID for contract upgrade capability
     */
    UPGRADE_CAP_OBJECT_ID: '0x1de3aa8c02b57a9cb659d92a69b14c863f3858d05533f59cee404b33a0454312',
    
    /**
     * Object ID for TEST_USDT token metadata
     */
    TEST_USDT_OBJECT_ID: '0x08e814a15a98d234fa668559489a4ee71347e948766f75d2d8fdbe3b24d67d0d',
    
    /**
     * Object ID for public mint authority allowing anyone to mint TEST_USDT
     */
    MINT_AUTHORITY_OBJECT_ID: '0x2ef9643c8b4bd9ecdab4206e871b6cf964f4843bc39447b320f6755ef4fc9729',
    
    /**
     * Object ID for TEST_USDT treasury
     */
    TREASURY_OBJECT_ID: '0x47aa0d50783163a0effa1b5885ef1c24b5e1db811deaa02294d5a95c8345a9d3',
  }
};