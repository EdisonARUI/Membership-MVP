import { NextRequest, NextResponse } from 'next/server';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Keypair } from '@mysten/sui/cryptography';
import { fromB64, fromHEX } from '@mysten/sui/utils';

export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const body = await req.json();
    const { privateKey } = body;
    
    if (!privateKey) {
      return NextResponse.json({ error: '缺少私钥参数' }, { status: 400 });
    }
    
    // 尝试多种方式加载私钥
    try {
      // 方法1: 直接使用Ed25519Keypair的标准方法
      let keypair: Keypair | null = null;
      let method = '';
      let details = {};
      
      try {
        // 尝试作为导出的私钥字符串
        if (privateKey.startsWith('0x')) {
          // 十六进制格式
          const privateKeyBytes = fromHEX(privateKey.slice(2));
          keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
          method = '十六进制密钥';
        } else {
          // 尝试作为base64编码的私钥
          const privateKeyBytes = fromB64(privateKey);
          keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
          method = 'Base64密钥';
        }
      } catch (e: any) {
        console.log('标准加载方式失败:', e.message);
        
        // 尝试作为Sui钱包导出的格式
        try {
          // 尝试从钱包导出的格式
          const exported = JSON.parse(privateKey);
          if (exported.privateKey) {
            const privateKeyBytes = fromB64(exported.privateKey);
            keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
            method = '钱包导出格式-privateKey';
          } else if (exported.key) {
            const privateKeyBytes = fromB64(exported.key);
            keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
            method = '钱包导出格式-key';
          }
          details = { exportFormat: '解析导出JSON格式' };
        } catch (jsonError) {
          // 不是JSON格式，继续尝试其他方法
          console.log('非JSON格式, 尝试兼容模式');
        }
      }
      
      // 如果上述方法都失败，尝试兼容模式
      if (!keypair) {
        try {
          // 尝试base64解码并取前32字节
          const rawBytes = Buffer.from(privateKey, 'base64');
          if (rawBytes.length >= 32) {
            const compatBytes = rawBytes.slice(0, 32);
            keypair = Ed25519Keypair.fromSecretKey(compatBytes);
            method = '兼容模式-截取';
            details = { originalLength: rawBytes.length, trimmed: true };
          }
        } catch (e) {
          console.log('兼容模式失败:', e);
        }
      }
      
      if (!keypair) {
        throw new Error('所有已知的私钥格式解析方法都失败');
      }
      
      // 获取钱包地址
      const address = keypair.getPublicKey().toSuiAddress();
      
      // 返回地址信息
      return NextResponse.json({
        success: true,
        address: address,
        method: method,
        details: details
      });
    } catch (error: any) {
      console.error('处理私钥失败:', error);
      return NextResponse.json({ 
        success: false,
        error: `处理私钥失败: ${error.message}` 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('验证私钥失败:', error);
    return NextResponse.json({ 
      success: false,
      error: `验证私钥失败: ${error.message}` 
    }, { status: 500 });
  }
} 