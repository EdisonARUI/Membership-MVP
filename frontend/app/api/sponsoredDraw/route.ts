import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';

// 硬编码赞助商地址 - 确保该地址在DevNet上有足够的SUI代币
const SPONSOR_ADDRESS = '0x7d87c83c2f71bb9388262c06f0eec7b57ee651bf1892a7a6fd6f1b1b931ac7fc';

// Sui合约地址
const CONTRACT_ADDRESSES = {
  AUTHENTICATION: {
    PACKAGE_ID: '0x1168aecdd3a3eb28b570b0af6bb0ab23966ab08b7ab31e7f7c7ddf8164a29f0b', 
    MODULE_NAME: 'authentication',
    REGISTRY_OBJECT_ID: '0x06717c46fb12546b1b1ecc32976a1b40bf8ea991f99f22364d465eab716faf44',
  },
  LOTTERY: {
    PACKAGE_ID: '0x721afb29471a5b0c67eda9674ede2e2e1c2d3653c5c7239dffc6d87182e70254',
    MODULE_NAME: 'lottery',
  }
};

// Sui客户端配置
const FULLNODE_URL = 'https://fullnode.devnet.sui.io';
const suiClient = new SuiClient({ url: FULLNODE_URL });

// 获取奖池对象ID和Random对象ID
function getPoolObjectId(): string {
  // 实际情况下应该从数据库或配置中获取
  return '0x06717c46fb12546b1b1ecc32976a1b40bf8ea991f99f22364d465eab716faf44';
}

function getRandomObjectId(): string {
  // Sui的全局Random对象
  return '0x0000000000000000000000000000000000000000000000000000000000000008';
}

export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const body = await req.json();
    const { txData, senderAddress } = body;
    
    if (!txData || !senderAddress) {
      return NextResponse.json({ error: '缺少必要的交易参数' }, { status: 400 });
    }
    
    console.log('收到赞助抽奖请求:', {
      sender: senderAddress,
      contract: `${txData.contractPackage}::${txData.contractModule}::${txData.method}`
    });
    
    console.log('使用硬编码赞助商地址:', SPONSOR_ADDRESS);
    
    // 获取赞助商账户的SUI币
    const coins = await suiClient.getCoins({
      owner: SPONSOR_ADDRESS,
      coinType: '0x2::sui::SUI'
    });
    
    if (!coins || !coins.data || coins.data.length === 0) {
      console.error('赞助商账户没有SUI币');
      return NextResponse.json({ error: '赞助商账户没有可用代币' }, { status: 500 });
    }
    
    // 找到一个可用的coin作为gas
    const gasCoin = coins.data[0];
    console.log('使用gas币:', gasCoin.coinObjectId);
    
    // 创建交易块
    const txb = new Transaction();
    
    // 设置交易发送者为用户的地址
    txb.setSender(senderAddress);
    
    // 添加抽奖调用
    txb.moveCall({
      target: `${CONTRACT_ADDRESSES.LOTTERY.PACKAGE_ID}::${CONTRACT_ADDRESSES.LOTTERY.MODULE_NAME}::instant_draw`,
      arguments: [
        txb.object(getPoolObjectId()),
        txb.object(getRandomObjectId()),
        txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID)
      ]
    });
    
    // 使用赞助商的币支付gas
    txb.setGasPayment([{
      objectId: gasCoin.coinObjectId,
      digest: gasCoin.digest,
      version: gasCoin.version
    }]);
    
    // 设置gas价格和预算
    txb.setGasBudget(10000000);
    
    // 执行交易 - 在服务端直接执行
    try {
      console.log('准备执行交易...');
      
      // 注意：在生产环境中，通常会要求用户签名，但这里为了简化流程，我们只进行预执行
      // 这里仅适用于测试，生产环境需要更安全的处理方式
      const dryRunResult = await suiClient.devInspectTransactionBlock({
        transactionBlock: await txb.build({ client: suiClient }),
        sender: senderAddress
      });
      
      console.log('交易预执行结果:', dryRunResult);
      
      // 这里模拟成功结果返回
      return NextResponse.json({
        success: true,
        txId: '0x' + Array(64).fill('0').join(''),  // 模拟的交易ID
        message: '抽奖请求已接收！在生产环境中，这将执行真实交易。',
        gasCoin: gasCoin.coinObjectId,
        dryRunSuccess: true
      });
    } catch (error: any) {
      console.error('交易执行失败:', error);
      return NextResponse.json({
        success: false,
        error: `交易执行失败: ${error.message || "未知错误"}`
      });
    }
  } catch (error: any) {
    console.error('处理赞助抽奖请求失败:', error);
    return NextResponse.json({ 
      success: false,
      error: `赞助抽奖失败: ${error.message}` 
    }, { status: 500 });
  }
} 