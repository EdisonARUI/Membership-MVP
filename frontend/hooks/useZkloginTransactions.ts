import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { genAddressSeed, getZkLoginSignature } from "@mysten/sui/zklogin";
import { PartialZkLoginSignature } from '@/interfaces/ZkLogin';
import { SUI_RPC_URL } from '@/config/client';

type LogFunction = (message: string) => void;

export function useZkLoginTransactions(logFn?: LogFunction) {
  // 内部日志函数
  const log = (message: string) => {
    if (logFn) {
      logFn(message);
    }
  };

  // 签名并提交交易
  async function signAndExecuteTransaction(
    txb: Transaction,
    zkLoginAddress: string,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ) {
    log("准备使用zkLogin签名执行交易...");
    const client = new SuiClient({ url: SUI_RPC_URL });
    
    // 设置发送者
    txb.setSender(zkLoginAddress);
    log(`设置交易发送者: ${zkLoginAddress}`);
    
    // 使用临时密钥对签名
    log("使用临时密钥对签名交易...");
    const { bytes, signature: userSignature } = await txb.sign({
      client,
      signer: ephemeralKeyPair,
    });
    log("交易签名完成，准备生成地址种子");
    
    // 生成地址种子
    try {
    const addressSeed = genAddressSeed(
      BigInt(userSalt), 
      "sub", 
      decodedJwt.sub, 
      decodedJwt.aud
    ).toString();
      log(`地址种子生成成功: ${addressSeed.substring(0, 10)}...`);
      
      // 参数验证和兼容处理
      if (!partialSignature || !partialSignature.inputs) {
        log("错误: 无效的 partialSignature 结构");
        throw new Error("无效的 partialSignature 结构");
      }
      
      log("验证partialSignature结构...");
      const { proofPoints, issBase64Details, headerBase64 } = partialSignature.inputs;
      
      if (!proofPoints) {
        log("错误: partialSignature 缺少必要字段 proofPoints");
        throw new Error("partialSignature 缺少必要字段 proofPoints");
      }
      
      if (!issBase64Details) {
        log("错误: partialSignature 缺少必要字段 issBase64Details");
        throw new Error("partialSignature 缺少必要字段 issBase64Details");
      }
      
      if (!headerBase64) {
        log("错误: partialSignature 缺少必要字段 headerBase64");
        throw new Error("partialSignature 缺少必要字段 headerBase64");
      }
      
      // 检查 issBase64Details 内部结构
      if (!issBase64Details.value) {
        log("错误: issBase64Details 缺少必要字段 value");
        throw new Error("issBase64Details 缺少必要字段 value");
      }
      
      if (issBase64Details.indexMod4 === undefined) {
        log("错误: issBase64Details 缺少必要字段 indexMod4");
        throw new Error("issBase64Details 缺少必要字段 indexMod4");
      }
      
      // 检查 proofPoints 内部结构 
      if (!proofPoints.a || !proofPoints.b || !proofPoints.c) {
        log("错误: proofPoints 结构不完整 (缺少 a, b 或 c)");
        throw new Error("proofPoints 结构不完整");
      }
      
      log("序列化 zkLogin 签名...");
      // 序列化 zkLogin 签名 - 按照最新文档格式修正
    const zkLoginSignature = getZkLoginSignature({
      inputs: {
          ...partialSignature.inputs,
        addressSeed
      },
        maxEpoch: partialSignature.maxEpoch,
      userSignature,
    });
      log("zkLogin签名序列化成功，准备执行交易");
    
    // 执行交易
      log("向链上提交交易...");
      const result = await client.executeTransactionBlock({
      transactionBlock: bytes,
      signature: zkLoginSignature,
    });
      
      log(`交易执行完成，交易ID: ${result.digest}`);
      return result;
    } catch (error: any) {
      log(`交易执行失败详情: ${JSON.stringify(error)}`);
      throw error;
    }
  }
  
  return {
    signAndExecuteTransaction
  };
}
