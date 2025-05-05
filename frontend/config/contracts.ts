
export const GAS = {
  COIN: '0x2::sui::SUI',
  BUDGET: 10000000
}


export const COMMON_CONTRACT = {  
    CLOCK: "0x6",
    RANDOM_NUMBER_GENERATOR: "0x8"
  }

export const SPONSOR_ADDRESS = '0x7d87c83c2f71bb9388262c06f0eec7b57ee651bf1892a7a6fd6f1b1b931ac7fc';

// 合约地址和模块ID - 请替换为实际部署的合约地址
export const CONTRACT_ADDRESSES = {
  AUTHENTICATION: {
    PACKAGE_ID: '0x1168aecdd3a3eb28b570b0af6bb0ab23966ab08b7ab31e7f7c7ddf8164a29f0b', // 替换为实际部署的authentication包ID
    MODULE_NAME: 'authentication',
    REGISTRY_OBJECT_ID: '0x06717c46fb12546b1b1ecc32976a1b40bf8ea991f99f22364d465eab716faf44', // 替换为实际的AuthRegistry对象ID
  },
  SUBSCRIPTION: {
    PACKAGE_ID: '0xcc52f1b8380ed5afe40341cfd85de3388c160c28569bac8b42dc8acdc632549d', // 替换为实际部署的subscription包ID
    MODULE_NAME: 'subscription',
  },
  LOTTERY: {
    PACKAGE_ID: '0x721afb29471a5b0c67eda9674ede2e2e1c2d3653c5c7239dffc6d87182e70254', // 替换为实际部署的lottery包ID
    LOTTERY_POOL: "0xdce1fb810289f4034d3e529112a3344c494876dd100358009b9af33b5e556c16",
    MODULE_NAME: 'lottery',
  }
};