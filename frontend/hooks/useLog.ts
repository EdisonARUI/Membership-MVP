import { useState, useCallback } from 'react';

export function useLog() {
  const [logs, setLogs] = useState<string[]>(() => {
    // 从localStorage获取保存的日志
    if (typeof window !== 'undefined') {
      const savedLogs = localStorage.getItem('zklogin_logs');
      return savedLogs ? JSON.parse(savedLogs) : [];
    }
    return [];
  });
  
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => {
      const newLogs = [...prev, logEntry];
      // 保存到localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('zklogin_logs', JSON.stringify(newLogs));
      }
      return newLogs;
    });
    console.log(logEntry);
  }, []);
  
  const clearLogs = useCallback(() => {
    setLogs([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zklogin_logs');
    }
    // 添加一条清空日志的记录
    const timestamp = new Date().toLocaleTimeString();
    setLogs([`[${timestamp}] 日志已清空`]);
  }, []);
  
  return { logs, addLog, clearLogs };
}
