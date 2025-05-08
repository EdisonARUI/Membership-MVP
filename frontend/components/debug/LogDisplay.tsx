import { useZkLogin } from "@/contexts/ZkLoginContext";
import { useState, useEffect } from "react";
import { SuiService } from "@/utils/sui";

export function LogDisplay() {
  const { clearState, state, logs, clearLogs } = useZkLogin();
  const [showFullErrors, setShowFullErrors] = useState(false);
  const [networkStatus, setNetworkStatus] = useState({
    suiNode: "检查中...",
    timestamp: new Date()
  });
  
  // 定期检查网络状态
  useEffect(() => {
    // 立即检查一次
    checkNetworkStatus();
    
    // 设置定时检查
    const intervalId = setInterval(checkNetworkStatus, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // 检查网络状态
  const checkNetworkStatus = async () => {
    try {
      const epoch = await SuiService.getCurrentEpoch();
      setNetworkStatus({
        suiNode: `正常 (Epoch: ${epoch})`,
        timestamp: new Date()
      });
    } catch (error: any) {
      setNetworkStatus({
        suiNode: `错误: ${error.message || '连接失败'}`,
        timestamp: new Date()
      });
    }
  };
  
  const handleResetZkLogin = () => {
    // 使用Context提供的重置方法
    clearState();
    
    // 刷新页面以确保所有状态被重置
    window.location.reload();
  };
  
  // 查找并处理日志中的错误响应信息
  const processedLogs = showFullErrors 
    ? logs 
    : logs.map(log => {
        if (log.includes('非预期的响应格式') || log.includes('错误响应:')) {
          // 保留基本错误信息
          return log.split('非预期的响应格式')[0] || log.split('错误响应:')[0] || log;
        }
        return log;
      });

  return (
    <div className="mb-10 p-6 bg-slate-800 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold">测试日志</h3>
        <div className="flex space-x-2">
          <button 
            onClick={checkNetworkStatus}
            className="px-2 py-1 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded border border-green-500/30"
          >
            检查网络
          </button>
          <button 
            onClick={() => setShowFullErrors(!showFullErrors)}
            className={`px-2 py-1 text-xs ${showFullErrors ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-500/20 text-blue-400'} hover:bg-blue-500/30 rounded border border-blue-500/30`}
          >
            {showFullErrors ? '隐藏详细错误' : '显示详细错误'}
          </button>
          <button 
            onClick={handleResetZkLogin}
            className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded border border-yellow-500/30"
          >
            重置zkLogin
          </button>
          <button 
            onClick={clearLogs}
            className="px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded border border-red-500/30"
          >
            清空日志
          </button>
        </div>
      </div>
      
      {/* 状态信息面板 */}
      <div className="mb-4 p-3 bg-slate-700/40 rounded text-xs">
        <h4 className="font-semibold mb-1">系统状态</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-slate-400 mr-2">Sui节点:</span>
            <span className={networkStatus.suiNode.includes('错误') ? 'text-red-400' : 'text-green-400'}>
              {networkStatus.suiNode}
            </span>
          </div>
          <div>
            <span className="text-slate-400 mr-2">临时密钥状态:</span>
            <span className={state.isInitialized ? 'text-green-400' : 'text-yellow-400'}>
              {state.isInitialized ? '已初始化' : '未初始化'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 mr-2">最后检查:</span>
            <span className="text-slate-300">{networkStatus.timestamp.toLocaleTimeString()}</span>
          </div>
          <div>
            <span className="text-slate-400 mr-2">zkLogin地址:</span>
            <span className="text-slate-300 truncate max-w-[120px] inline-block align-bottom">
              {state.zkLoginAddress || '无'}
            </span>
          </div>
        </div>
        {state.error && (
          <div className="mt-2 text-red-400">
            <span className="font-semibold">错误: </span>
            <span>{state.error}</span>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-slate-900 rounded-lg overflow-auto max-h-96">
        {!logs || logs.length === 0 ? (
          <p className="text-slate-400">暂无日志</p>
        ) : (
          <ul className="space-y-1 text-xs font-mono">
            {processedLogs.map((log, index) => (
              <li key={index} className={`pb-1 border-b border-slate-700 ${log.includes('错误') || log.includes('失败') ? 'text-red-400' : ''}`}>
                {log}
                {showFullErrors && logs[index].includes('错误响应:') && (
                  <div className="mt-1 p-2 bg-red-900/20 rounded border border-red-900/30 whitespace-pre-wrap overflow-auto max-h-48">
                    {logs[index].split('错误响应:')[1] || ''}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
