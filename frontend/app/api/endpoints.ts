export const API_ENDPOINTS = {

  ZKLOGIN: {
    ADDRESS: {
      REGISTER: '/api/zklogin/addresses/register',
      ACTIVATE: '/api/zklogin/addresses/activate',
      VERIFY: '/api/zklogin/addresses/verify'
    },
    USER: {
      SALT: '/api/zklogin/users/salt',
      BIND: '/api/zklogin/users/bind'
    },
    PROOF: '/api/zklogin/proofs'
  },
  SUI: {
    FAUCET: 'https://faucet.devnet.sui.io/v2/gas'
  },
  LOTTERY: {
    HISTORY: '/api/lottery',
    RECORD: '/api/lottery'
  }
};
