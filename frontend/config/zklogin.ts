const DEV_PROVER_URL = 'https://prover-dev.mystenlabs.com/v1';
const MAIN_AND_TEST_PROVER_URL = 'https://prover.mystenlabs.com/v1';

export const ZKPROOF_URL = process.env.SUI_ENV === 'devnet' ? DEV_PROVER_URL : MAIN_AND_TEST_PROVER_URL;
