'use client';

import { useState } from 'react';

export default function VerifyKeyPage() {
  const [privateKey, setPrivateKey] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!privateKey.trim()) {
      setError('请输入私钥');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/verify-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ privateKey }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || '验证失败');
      }
    } catch (err: any) {
      setError(err.message || '请求出错');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">私钥验证工具</h1>
      <p className="mb-4 text-gray-400">
        此工具可以验证您的私钥对应的Sui钱包地址。您的私钥不会被发送到任何外部服务，所有处理都在您的浏览器和本地服务器内完成。
      </p>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          私钥（Base64或十六进制格式）
        </label>
        <textarea
          className="w-full p-2 border rounded-md bg-slate-800 border-slate-700 text-white h-24"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder="输入您的私钥..."
        />
      </div>
      
      <button
        className={`px-4 py-2 rounded-md ${
          loading
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        } text-white`}
        onClick={handleVerify}
        disabled={loading}
      >
        {loading ? '验证中...' : '验证私钥'}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-900 bg-opacity-50 border border-red-800 rounded-md text-white">
          {error}
        </div>
      )}
      
      {result && (
        <div className="mt-4 p-4 bg-slate-800 rounded-md border border-slate-700">
          <h2 className="text-xl font-semibold mb-2">验证结果</h2>
          <div className="grid gap-2">
            <div>
              <span className="font-medium">钱包地址:</span>
              <p className="break-all bg-slate-900 p-2 rounded mt-1">
                {result.address}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium">字节长度:</span>
                <p className="bg-slate-900 p-2 rounded mt-1">
                  {result.bytesLength}
                </p>
              </div>
              <div>
                <span className="font-medium">私钥格式:</span>
                <p className="bg-slate-900 p-2 rounded mt-1">
                  {result.privateKeyFormat}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 