import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useUser } from '@/hooks/use-user';
import { useZkLogin as useZkLoginHook } from '@/hooks/useZkLogin';
import { useZkLogin } from '@/contexts/ZkLoginContext';
import { useLog } from '@/hooks/useLog';
import { createClient } from '@/utils/supabase/client';
import { ZkLoginStorage } from '@/utils/storage';
import { saveUserWithWalletAddress, checkWalletAddressSaved, checkDatabasePermissions } from '@/app/actions';
import { contractService } from '@/utils/contractService';
import { SuiService } from '@/utils/sui';

interface AuthContextType {
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  zkLoginAddress: string | null;
  onChainVerified: boolean;
  handleGoogleAuth: () => Promise<void>;
  handleLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useUser();
  const { addLog } = useLog();
  const supabase = createClient();
  
  // 使用 ZkLoginContext 中的 useZkLogin
  const {
    zkLoginAddress,
    isInitialized,
    clearZkLoginState,
    handleGoogleAuth: zkLoginGoogleAuth
  } = useZkLogin();
  
  // 新增链上认证状态
  const [onChainVerified, setOnChainVerified] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  
  // 使用引用跟踪是否已经处理
  const processedRef = useRef<{userId?: string, address?: string}>({});
  
  // 避免函数重新创建导致useEffect重新执行的问题
  const registerOnChain = useCallback(async (address: string, userId: string) => {
    addLog("call registerOnChain ");
    addLog(`用户ID: ${userId}, 类型: ${typeof userId}`);
    addLog(`zkLogin地址: ${address}`);

    try {
      // 确保address是有效格式
      if (!address || !address.startsWith('0x')) {
        addLog("错误: 无效的zkLogin地址格式");
        return false;
      }

      const ephemeralKeypair = ZkLoginStorage.getEphemeralKeypair();
      if (!ephemeralKeypair) {
        addLog("找不到临时密钥对，无法完成链上认证");
        return false;
      }

      // 重建密钥对
      let keypair;
      try {
        keypair = SuiService.recreateKeypairFromStored(ephemeralKeypair.keypair);
      } catch (error: any) {
        addLog(`重建密钥对失败: ${error.message}`);
        return false;
      }
      
      // 检查传入的地址是否与密钥对生成的地址一致
      const keypairAddress = keypair.getPublicKey().toSuiAddress();
      addLog(`临时密钥对地址: ${keypairAddress}`);
      
      if (keypairAddress !== address) {
        addLog("警告: 临时密钥对地址与zkLogin地址不匹配");
        // 这里我们可以继续，因为Sui会使用发送者的地址，但需要记录一下
      }
      
      // 检查是否已经认证 - 简化处理逻辑，不再抛出异常
      let isVerified = false;
      try {
        const verificationResult = await contractService.isAddressVerified(address);
        isVerified = verificationResult.verified;
        
        if (isVerified) {
          addLog("zkLogin地址已在链上认证，跳过认证");
          setOnChainVerified(true);
          return true;
        } else {
          addLog("zkLogin地址未在链上认证，需要进行认证");
        }
      } catch (error: any) {
        // 如果检查认证状态失败，我们假设未认证，并继续进行认证流程
        addLog(`检查认证状态失败: ${error.message}，将继续进行认证`);
      }

      // 获取zkLogin签名和证明 - 仅做日志记录用
      const zkLoginProof = ZkLoginStorage.getZkLoginProof();
      const zkLoginSignature = ZkLoginStorage.getZkLoginSignature();
      
      if (!zkLoginProof) addLog("警告: 找不到zkLogin证明");
      if (!zkLoginSignature) addLog("警告: 找不到zkLogin签名");
      
      // 1. 注册zkLogin地址
      addLog("开始链上认证: 注册zkLogin地址...");
      
      // 创建专门用于注册的Transaction
      let registerSuccess = false;
      try {
        const registerResult = await contractService.registerZkLoginAddress(keypair);
        
        if (registerResult.success) {
          addLog(`zkLogin地址注册成功，交易ID: ${registerResult.txId}`);
          registerSuccess = true;
        } else {
          addLog(`注册zkLogin地址失败: ${registerResult.error}`);
          // 如果注册失败，我们可以尝试继续绑定，因为可能地址已经注册但我们的检查失败了
        }
      } catch (registerError: any) {
        addLog(`注册zkLogin地址时发生异常: ${registerError.message}`);
        // 同样，我们继续尝试绑定
      }

      // 2. 绑定钱包地址与用户ID
      addLog("绑定钱包地址与用户ID...");
      addLog(`用户ID类型: ${typeof userId}`);
      
      // 确保userId是字符串并对其进行清理
      // 如果是UUID，只保留其基本部分
      let userIdStr = String(userId);
      
      // 移除UUID中的连字符和其他特殊字符
      userIdStr = userIdStr.replace(/[^\w]/g, '');
      
      // 如果太长，截断一下
      if (userIdStr.length > 20) {
        userIdStr = userIdStr.substring(0, 20);
      }
      
      addLog(`处理后的用户ID: ${userIdStr}`);
      
      // 尝试绑定钱包地址
      let bindSuccess = false;
      try {
        const bindResult = await contractService.bindWalletAddress(keypair, userIdStr);
        
        if (bindResult.success) {
          addLog(`钱包地址绑定成功，交易ID: ${bindResult.txId}`);
          
          // 将交易哈希保存到本地存储，以便后续查询
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_tx_hash', bindResult.txId || '');
          }
          
          bindSuccess = true;
        } else {
          addLog(`绑定钱包地址失败: ${bindResult.error}`);
        }
      } catch (bindError: any) {
        addLog(`绑定钱包地址时发生异常: ${bindError.message}`);
      }
      
      // 如果注册或绑定成功，我们认为链上认证成功
      if (registerSuccess || bindSuccess) {
        setOnChainVerified(true);
        return true;
      } else {
        addLog("链上认证失败: 注册和绑定操作均未成功");
        return false;
      }
    } catch (error: any) {
      addLog(`链上认证失败: ${error.message}`);
      console.error("链上认证详细错误:", error);
      return false;
    }
  }, [addLog]);

  // 监听用户登录状态变化，当检测到用户登录时尝试保存zkLogin地址
  useEffect(() => {
    // 如果用户或zkLogin地址不存在，返回
    if (!user || !zkLoginAddress) {
      return;
    }
    
    // 检查是否已经处理过相同的用户ID和地址
    if (processedRef.current.userId === user.id && 
        processedRef.current.address === zkLoginAddress) {
      return;
    }
    
    // 更新处理记录
    processedRef.current = { userId: user.id, address: zkLoginAddress };
    
    addLog(`AuthContext useEffect触发: userId=${user.id}, zkLoginAddress=${zkLoginAddress}`);
    
    const saveZkLoginAddress = async () => {
      try {
        addLog("检测到用户登录，尝试保存zkLogin地址...");
        
        // 首先检查数据库权限
        addLog("检查数据库权限...");
        const permissionResults = await checkDatabasePermissions();
        addLog(`数据库权限检查结果: ${JSON.stringify(permissionResults)}`);
        
        // 尝试获取已保存状态
        const walletSaved = localStorage.getItem("wallet_saved") === "true";
        if (walletSaved) {
          addLog("本地记录显示钱包地址已经保存过，验证数据库中是否存在...");
          const checkResult = await checkWalletAddressSaved(user.id);
          
          if (checkResult.saved) {
            addLog(`数据库中已存在钱包记录: ${JSON.stringify(checkResult.data)}`);
            return;
          } else {
            addLog(`本地记录与数据库不一致，需要重新保存。错误: ${checkResult.error || '无'}`);
          }
        }
        
        // 检查链上认证状态 - 不抛出异常，简化流程
        if (!checkingVerification && !onChainVerified) {
          setCheckingVerification(true);
          
          // 使用try/catch包装每个步骤，防止一个步骤失败影响整个流程
          let verificationSuccess = false;
          
          try {
            // 1. 检查认证状态
            addLog("开始检查链上认证状态...");
            const result = await contractService.isAddressVerified(zkLoginAddress);
            
            if (result.verified) {
              addLog("链上认证状态: 已认证");
              setOnChainVerified(true);
              verificationSuccess = true;
            } else {
              addLog("链上认证状态: 未认证，开始进行链上认证...");
              
              // 2. 执行链上认证
              const registerResult = await registerOnChain(zkLoginAddress, user.id);
              
              if (registerResult) {
                addLog("链上认证成功完成");
                verificationSuccess = true;
              } else {
                addLog("链上认证未成功，但将继续尝试保存地址到数据库");
              }
            }
          } catch (error: any) {
            addLog(`链上认证流程异常: ${error.message}`);
            // 即使认证出错，我们仍然尝试保存地址到数据库
          } finally {
            setCheckingVerification(false);
          }
        }
        
        // 尝试保存钱包地址到数据库
        try {
          addLog("尝试保存zkLogin地址到数据库...");
          const saveResult = await saveUserWithWalletAddress(user.id, zkLoginAddress);
          
          if (saveResult.success) {
            addLog(`zkLogin地址保存成功: ${JSON.stringify(saveResult.data)}`);
            
            // 再次检查数据库中是否真的保存了
            const verifyResult = await checkWalletAddressSaved(user.id);
            if (verifyResult.saved) {
              addLog(`数据库验证成功，找到 ${verifyResult.count} 条记录`);
              // 如果保存成功，也更新本地状态
              localStorage.setItem("wallet_saved", "true");
            } else {
              addLog(`警告: 数据库验证失败，未找到保存的记录。错误: ${verifyResult.error || '无'}`);
            }
          } else {
            addLog(`保存zkLogin地址失败: ${saveResult.error}`);
          }
        } catch (dbError: any) {
          addLog(`保存zkLogin地址到数据库失败: ${dbError.message}`);
          throw dbError; // 这里仍然抛出异常，因为这是主要功能
        }
      } catch (error: any) {
        addLog(`保存zkLogin地址流程失败: ${error.message}`);
        console.error("保存zkLogin地址详细错误:", error);
      }
    };

    saveZkLoginAddress();
  }, [user, zkLoginAddress, addLog, onChainVerified, checkingVerification, registerOnChain]);

  const handleGoogleAuth = async () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('has_checked_jwt');
        sessionStorage.removeItem('jwt_already_processed');
        sessionStorage.setItem('login_initiated', 'true');
      }
      
      addLog("开始Google授权流程...");
      await zkLoginGoogleAuth();
    } catch (err: any) {
      addLog(`Google授权异常: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      addLog("开始退出登录...");
      if (typeof window !== 'undefined') {
        localStorage.removeItem('zkLogin_ephemeral');
        localStorage.removeItem('zkLogin_address');
        localStorage.removeItem('zkLogin_proof');
        localStorage.removeItem('zkLogin_signature');
        localStorage.removeItem('auth_tx_hash');
        localStorage.removeItem('wallet_saved');
        
        // 清除处理状态
        processedRef.current = {};
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      clearZkLoginState();
      setOnChainVerified(false);
      addLog("已成功退出登录");
      window.location.reload();
    } catch (error: any) {
      console.error("退出登录失败:", error);
      addLog(`退出登录失败: ${error.message}`);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    zkLoginAddress,
    onChainVerified,
    handleGoogleAuth,
    handleLogout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 