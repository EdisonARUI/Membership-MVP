/**
 * LogContext provides centralized logging functionality for the application.
 * It enables components to add and clear logs, and ensures logs are persisted and synchronized across components.
 *
 * Features:
 * - Centralized log state management
 * - Persistent storage of logs
 * - Synchronization of logs across components via custom events
 * - Singleton memory cache for log sharing
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppStorage } from '@/utils/StorageService';

/**
 * Name of the custom event for log updates
 */
const LOG_UPDATED_EVENT = 'storage-logs-updated';

/**
 * LogState defines the shape of the log context, including log entries and operations.
 */
interface LogState {
  /**
   * Array of log messages
   */
  logs: string[];
  /**
   * Adds a log message
   * @param log - The log message to add
   */
  addLog: (log: string) => void;
  /**
   * Clears all log messages
   */
  clearLogs: () => void;
}

/**
 * Default log state with no-op functions
 */
const defaultLogState: LogState = {
  logs: [],
  addLog: () => {},
  clearLogs: () => {}
};

/**
 * LogContext provides the log state and operations to consumers
 */
const LogContext = createContext<LogState>(defaultLogState);

/**
 * Singleton memory log cache to ensure log sharing across components
 */
let memoryLogsCache: string[] = [];

/**
 * useLog hook manages application logs, handles log persistence, and synchronizes logs across components.
 *
 * @returns {LogState} The log state and operations
 */
export function useLog(): LogState {
  const [logs, setLogs] = useState<string[]>(() => {
    // Initialize logs from AppStorage
    const storedLogs = AppStorage.getLogs();
    memoryLogsCache = storedLogs;
    return storedLogs;
  });
  
  useEffect(() => {
    // Event handler for log updates from other components
    const handleStorageChange = () => {
      setLogs([...memoryLogsCache]);
    };
    // Listen for custom log update events
    window.addEventListener(LOG_UPDATED_EVENT, handleStorageChange);
    // Cleanup event listener on unmount
    return () => window.removeEventListener(LOG_UPDATED_EVENT, handleStorageChange);
  }, []);
  
  useEffect(() => {
    // Persist logs to AppStorage if changed
    if (JSON.stringify(logs) !== JSON.stringify(memoryLogsCache)) {
      AppStorage.setLogs(logs);
      memoryLogsCache = [...logs];
    }
  }, [logs]);
  
  /**
   * Adds a log message, updates state, persists to storage, and notifies other components
   * @param log - The log message to add
   */
  const addLog = (log: string) => {
    setLogs(prev => {
      const newLogs = [...prev, log];
      memoryLogsCache = newLogs;
      AppStorage.setLogs(newLogs);
      window.dispatchEvent(new CustomEvent(LOG_UPDATED_EVENT));
      return newLogs;
    });
  };
  
  /**
   * Clears all logs, updates state, persists to storage, and notifies other components
   */
  const clearLogs = () => {
    setLogs([]);
    memoryLogsCache = [];
    AppStorage.setLogs([]);
    window.dispatchEvent(new CustomEvent(LOG_UPDATED_EVENT));
  };
  
  return { logs, addLog, clearLogs };
}

/**
 * LogProvider supplies the log context to its children
 * @param props.children - Child components
 */
export function LogProvider({ children }: { children: ReactNode }) {
  const logState = useLog();
  return (
    <LogContext.Provider value={logState}>
      {children}
    </LogContext.Provider>
  );
}

/**
 * useLogContext provides access to the log context
 * @returns {LogState} The log state and operations
 */
export function useLogContext(): LogState {
  return useContext(LogContext);
}
