import { CONTRACT_ADDRESSES } from './contracts';

export interface TokenConfig {
  name: string;           // 代币名称
  symbol: string;         // 代币符号
  decimals: number;       // 精度位数
  iconUrl?: string;       // 图标URL
  coinType: string;       // 代币全路径类型
}

// 支持的代币类型定义
export const TOKENS: { [key: string]: TokenConfig } = {
  SUI: {
    name: 'Sui',
    symbol: 'SUI',
    decimals: 9,
    iconUrl: '/images/tokens/sui.png',
    coinType: '0x2::sui::SUI'
  },
  TEST_USDT: {
    name: 'testUSDT',
    symbol: 'testUSDT',
    decimals: 8,
    iconUrl: '/images/tokens/usdt.png',
    coinType: `${CONTRACT_ADDRESSES.COIN.PACKAGE_ID}::test_usdt::TEST_USDT`
  }
};

// 代币精度转换函数
export const toTokenAmount = (amount: number, token: TokenConfig): bigint => {
  return BigInt(Math.floor(amount * 10 ** token.decimals));
};

export const fromTokenAmount = (amount: bigint, token: TokenConfig): number => {
  return Number(amount) / 10 ** token.decimals;
};
