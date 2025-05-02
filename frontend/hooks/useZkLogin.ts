import { useState, useRef, useEffect } from 'react';
import { generateNonce, generateRandomness } from '@mysten/sui/zklogin';
import { SuiClient } from '@mysten/sui/client';
import { useLog } from './useLog';

const FULLNODE_URL = 'https://fullnode.devnet.sui.io';
const suiClient = new SuiClient({ url: FULLNODE_URL });

export function useZkLogin() {
  const [jwt, setJwt] = useState<string | null>(null);
  const [ephemeralKeypair, setEphemeralKeypair] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const zkLoginMethods = useRef<any>(null);
  const [zkLoginInitialized, setZkLoginInitialized] = useState(false);
  const { addLog } = useLog();

  // 初始化 zkLogin
  const initializeZkLogin = () => {
    if (typeof window !== 'undefined') {
      const storedEphemeral = localStorage.getItem('zkLogin_ephemeral');
      const storedAddress = localStorage.getItem('zkLogin_address');
      const storedProof = localStorage.getItem('zkLogin_proof');
      const storedSignature = localStorage.getItem('zkLogin_signature');

      if (storedEphemeral && storedAddress && storedProof && storedSignature) {
        setEphemeralKeypair(JSON.parse(storedEphemeral));
        setJwt(storedSignature);
        addLog("从本地存储恢复 zkLogin 状态");
      }
    }
    setLoading(false);
  };

  // 生成随机数和 nonce
  const generateZkLoginParams = async () => {
    try {
      setLoading(true);
      const randomness = generateRandomness();
      const maxEpoch = 2;
      const nonce = await generateNonce(
        ephemeralKeypair,
        maxEpoch,
        randomness
      );
      return { randomness, maxEpoch, nonce };
    } catch (error: any) {
      console.error('生成 zkLogin 参数失败:', error);
      setError(error.message);
      addLog(`错误: 生成 zkLogin 参数失败 - ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 验证 zkLogin 证明
  const verifyZkLoginProof = async (proof: any) => {
    try {
      setLoading(true);
      if (!zkLoginMethods.current) {
        throw new Error('zkLogin 方法未初始化');
      }

      const result = await zkLoginMethods.current.verifyProof(proof);
      if (result) {
        addLog("zkLogin 证明验证成功");
        return true;
      } else {
        throw new Error('证明验证失败');
      }
    } catch (error: any) {
      console.error('验证 zkLogin 证明失败:', error);
      setError(error.message);
      addLog(`错误: 验证 zkLogin 证明失败 - ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 设置 zkLogin 方法
  const setZkLoginMethods = (methods: any) => {
    if (!zkLoginMethods.current) {
      zkLoginMethods.current = methods;
      setZkLoginInitialized(true);
      addLog("ZkLogin 组件已准备就绪");
    }
  };

  // 清除 zkLogin 状态
  const clearZkLoginState = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zkLogin_ephemeral');
      localStorage.removeItem('zkLogin_address');
      localStorage.removeItem('zkLogin_proof');
      localStorage.removeItem('zkLogin_signature');
    }
    setJwt(null);
    setEphemeralKeypair(null);
    setError(null);
    addLog("已清除 zkLogin 状态");
  };

  // 检查JWT
  const checkForJWT = () => {
    if (typeof window !== 'undefined') {
      // 使用会话存储来跟踪此次页面加载是否已经检查过JWT
      const hasCheckedJWT = sessionStorage.getItem('has_checked_jwt');
      // 检查是否已经处理过JWT (在消息处理期间设置的标记)
      const alreadyProcessed = sessionStorage.getItem('jwt_already_processed');
      
      // 如果已经处理过JWT或已经检查过，则不再进行检查
      if (hasCheckedJWT || alreadyProcessed) {
        return;
      }
      
      // 标记为已检查，避免重复检查
      sessionStorage.setItem('has_checked_jwt', 'true');
      
      addLog(`0. 尝试获取JWT`);
      
      // 尝试从URL参数和hash片段中获取id_token
      const urlParams = new URLSearchParams(window.location.search);
      let idToken = urlParams.get('id_token');
      
      // 有些情况下token会在hash中而不是query参数
      if (!idToken && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        idToken = hashParams.get('id_token');
        addLog(`0.1 从hash中获取token`);
      }
      
      if (idToken) {
        addLog(`1. 获取JWT成功: ${idToken.substring(0, 15)}...`);
        
        // 分析JWT/令牌的类型
        if (idToken.startsWith('ya29.')) {
          addLog(`1.1 检测到可能是Google OAuth访问令牌而非JWT (以ya29.开头)`);
        }
        
        if (idToken.includes('.')) {
          addLog(`1.2 令牌包含.分隔符，计数: ${(idToken.match(/\./g) || []).length}个`);
        } else {
          addLog(`1.2 令牌不包含.分隔符，不符合JWT格式`);
        }
        
        // 解析JWT
        try {
          addLog(`2.1 开始解析JWT，长度: ${idToken.length}`);
          const parts = idToken.split('.');
          addLog(`2.2 JWT分割后部分数量: ${parts.length}`);
          
          // 分析每一部分
          parts.forEach((part, index) => {
            addLog(`2.2.${index+1} 第${index+1}部分长度: ${part.length}, 开头内容: ${part.substring(0, Math.min(10, part.length))}...`);
          });
          
          if (parts.length === 3) {
            addLog(`2.3 JWT header: ${parts[0].substring(0, 10)}...`);
            addLog(`2.4 JWT payload(编码): ${parts[1].substring(0, 10)}...`);
            
            try {
              // 进一步检查 base64 解码过程
              addLog(`2.5 尝试解码payload部分...`);
              const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
              addLog(`2.6 转换后的base64: ${base64.substring(0, 10)}...`);
              
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split('')
                  .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              );
              
              addLog(`2.7 解码JWT payload成功`);
              const payload = JSON.parse(jsonPayload);
              addLog(`2.8 解析JSON成功: ${JSON.stringify(payload).substring(0, 50)}...`);
              addLog(`2.9 解码JWT成功: sub=${payload.sub || '未找到'}, iss=${payload.iss || '未找到'}`);
            } catch (decodeErr) {
              addLog(`2.5 payload解码失败: ${decodeErr}`);
              console.error('JWT payload解码失败:', decodeErr);
            }
          } else {
            addLog(`2.3 JWT格式不正确，应该有3部分但实际有${parts.length}部分`);
            if (parts.length === 2) {
              const [part1, part2] = parts;
              addLog(`2.3.1 分析第1部分: 长度=${part1.length}, 是否像base64编码=${/^[A-Za-z0-9+/=_-]+$/.test(part1)}`);
              addLog(`2.3.2 分析第2部分: 长度=${part2.length}, 是否像base64编码=${/^[A-Za-z0-9+/=_-]+$/.test(part2)}`);
              
              // 检测是否为谷歌访问令牌
              if (part1 === 'ya29' && part2.length > 100) {
                addLog(`2.3.3 这可能是谷歌OAuth2访问令牌(access_token)而不是JWT`);
                addLog(`2.3.4 谷歌OAuth2访问令牌通常不是JWT格式，需要使用不同方法处理`);
              }
            }
          }
        } catch (e) {
          addLog(`2. 解码JWT失败，错误详情: ${e}`);
          console.error('JWT解析出错:', e);
        }
        
        // 尝试直接使用访问令牌获取用户信息
        if (idToken.startsWith('ya29.')) {
          addLog(`3.1 尝试使用Google访问令牌获取用户信息`);
          try {
            // 记录令牌用途
            addLog(`3.2 注意: 如果这是Access Token而非JWT，则应通过Google API使用它`);
          } catch (err) {
            addLog(`3.3 访问令牌处理错误: ${err}`);
          }
        }
        
        // 清除URL中的JWT参数
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // 通过window消息传递JWT给ZkLogin组件
        addLog(`4 通过window消息传递JWT给ZkLogin组件`);
        window.postMessage(
          { type: 'JWT_RECEIVED', jwt: idToken },
          window.location.origin
        );
        
        // 设置标记，表示当前会话已经处理过JWT，避免在消息处理过程中因为状态更新导致重复检查
        sessionStorage.setItem('jwt_already_processed', 'true');
        setJwt(idToken);
      } else {
        addLog(`0.2 URL中未找到id_token参数`);
      }
    }
  };

  // 添加消息监听
  useEffect(() => {
    // 执行JWT检查
    checkForJWT();
    
    // 监听ZKLogin过程中的消息
    const handleZkLoginMessages = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      const { type, data } = event.data || {};
      
      if (type === 'ZK_LOG') {
        addLog(data);
      } else if (type === 'USER_SALT') {
        addLog(`3. User salt管理: ${data}`);
      } else if (type === 'SUI_ADDRESS') {
        addLog(`4. 获取用户的Sui地址: ${data}`);
      } else if (type === 'ZK_PROOF') {
        addLog(`5. 获取零知识证明: 成功`);
      } else if (type === 'JWT_ERROR') {
        addLog(`JWT处理错误: ${data}`);
      } else if (type === 'TOKEN_TYPE_ERROR') {
        addLog(`令牌类型错误: ${data}`);
      }
    };
    
    window.addEventListener('message', handleZkLoginMessages);
    return () => {
      window.removeEventListener('message', handleZkLoginMessages);
      // 在组件卸载时清除会话存储中的检查标记
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('has_checked_jwt');
        // 不要清除jwt_already_processed，以防止在组件重新挂载时重复处理
      }
    };
  }, []);

  useEffect(() => {
    initializeZkLogin();
  }, []);

  return {
    jwt,
    ephemeralKeypair,
    error,
    loading,
    zkLoginInitialized,
    zkLoginMethods: zkLoginMethods.current,
    generateZkLoginParams,
    verifyZkLoginProof,
    setZkLoginMethods,
    clearZkLoginState,
    checkForJWT
  };
} 