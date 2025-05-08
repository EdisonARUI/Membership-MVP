
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
    PACKAGE_ID: '0xf7c2643bb6eaa60abf41e567c8607f84ba7132340e4efcc4de26cf384e40294c', // 替换为实际部署的authentication包ID
    MODULE_NAME: 'authentication',
    REGISTRY_OBJECT_ID: '0x9b3628b563f440b3137f12ebdcd5d41cd1f40179f050163e97dc1445ab6bcbfa', // 替换为实际的AuthRegistry对象ID
    UPGRADE_CAP_OBJECT_ID: '0xf935aae133a4e86340affe9fb34b65994f1e6a506c00eb40c72e36c8780600eb', // 
  },
  SUBSCRIPTION: {
    PACKAGE_ID: '0xcc52f1b8380ed5afe40341cfd85de3388c160c28569bac8b42dc8acdc632549d', // 替换为实际部署的subscription包ID
    MODULE_NAME: 'subscription',
  },
  LOTTERY: {
    PACKAGE_ID: '0xf957d6c163bf41c6eb890a5be15c7179ebac723551bf509c052283c9d3c919c0', // 替换为实际部署的lottery包ID
    LOTTERY_POOL: "0xd7fbe6dda1b6ca66d51375b5d8052018bd23221990747f4c61e154112515d22f",
    MODULE_NAME: 'lottery',
    UPGRADE_CAP_OBJECT_ID: '0x25c5628758bc5e25d238beb9430572204437782d71d4d3bdf7e5fb609225e16c', // 
  }
};