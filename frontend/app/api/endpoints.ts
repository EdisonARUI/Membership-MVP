/**
 * API_ENDPOINTS defines all RESTful API endpoints used in the application.
 * Organizes endpoints for zkLogin, SUI, lottery, deposit, and subscription modules.
 *
 * Features:
 * - Centralized endpoint management for all API routes
 * - Grouped by module for clarity and maintainability
 */
export const API_ENDPOINTS = {

  ZKLOGIN: {
    ADDRESS: {
      REGISTER: '/api/zklogin/addresses/register',
      ACTIVATE: '/api/zklogin/addresses/activate',
      VERIFY: '/api/zklogin/addresses/verify'
    },
    USER: {
      SALT: '/api/zklogin/users/salt',
    },
    PROOF: '/api/zklogin/proofs'
  },
  SUI: {
    FAUCET: 'https://faucet.devnet.sui.io/v2/gas'
  },
  LOTTERY: {
    HISTORY: '/api/lottery/history',
    RECORDS: '/api/lottery/records',
    STATS: '/api/lottery/stats'
  },
  DEPOSIT: {
    RECORDS: '/api/deposit/records'
  },
  SUBSCRIPTION: {
    CREATE: '/api/subscription/create',
    RENEW: '/api/subscription/renew',
    CANCEL: '/api/subscription/cancel',
    AUTO_RENEW: '/api/subscription/auto-renew',
    STATUS: '/api/subscription/status',
    PLANS: '/api/subscription/plans',
  }
};
