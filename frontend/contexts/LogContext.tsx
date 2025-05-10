import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppStorage } from '@/utils/StorageService';

// 定义日志事件名称
const LOG_UPDATED_EVENT = 'storage-logs-updated';

// 定义日志状态的类型
interface LogState {
  logs: string[];
  addLog: (log: string) => void;
  clearLogs: () => void;
}

// 创建默认值
const defaultLogState: LogState = {
  logs: [],
  addLog: () => {},
  clearLogs: () => {}
};

// 创建LogContext.tsx
const LogContext = createContext<LogState>(defaultLogState);

// 单例内存日志缓存，确保跨组件共享同一份数据
let memoryLogsCache: string[] = [];

// 创建useLog钩子
export function useLog(): LogState {
  const [logs, setLogs] = useState<string[]>(() => {
    // 初始化时从 AppStorage 读取日志
    const storedLogs = AppStorage.getLogs();
    memoryLogsCache = storedLogs;
    return storedLogs;
  });
  
  // 全局事件监听，接收其他组件发出的日志更新事件
  useEffect(() => {
    // 定义事件处理函数
    const handleStorageChange = () => {
      // 从内存缓存更新状态
      setLogs([...memoryLogsCache]);
    };
    
    // 添加事件监听
    window.addEventListener(LOG_UPDATED_EVENT, handleStorageChange);
    
    // 组件卸载时移除事件监听
    return () => window.removeEventListener(LOG_UPDATED_EVENT, handleStorageChange);
  }, []);
  
  // 当日志更新时保存到 AppStorage
  useEffect(() => {
    // 为避免初始化触发存储操作，检查是否与内存缓存一致
    if (JSON.stringify(logs) !== JSON.stringify(memoryLogsCache)) {
      AppStorage.setLogs(logs);
      memoryLogsCache = [...logs];
    }
  }, [logs]);
  
  const addLog = (log: string) => {
    // 更新组件状态
    setLogs(prev => {
      const newLogs = [...prev, log];
      // 更新内存缓存
      memoryLogsCache = newLogs;
      // 保存到存储
      AppStorage.setLogs(newLogs);
      // 触发自定义事件，通知其他组件
      window.dispatchEvent(new CustomEvent(LOG_UPDATED_EVENT));
      return newLogs;
    });
  };
  
  const clearLogs = () => {
    // 清空日志
    setLogs([]);
    memoryLogsCache = [];
    AppStorage.setLogs([]);
    // 触发自定义事件，通知其他组件
    window.dispatchEvent(new CustomEvent(LOG_UPDATED_EVENT));
  };
  
  return { logs, addLog, clearLogs };
}

export function LogProvider({ children }: { children: ReactNode }) {
  const logState = useLog(); // 只创建一个实例
  return (
    <LogContext.Provider value={logState}>
      {children}
    </LogContext.Provider>
  );
}

export function useLogContext(): LogState {
  return useContext(LogContext);
}
