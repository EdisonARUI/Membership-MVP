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
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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
  // Initialize state from storage only once
  const [logs, setLogs] = useState<string[]>(() => {
    const storedLogs = AppStorage.getLogs();
    memoryLogsCache = storedLogs;
    return storedLogs;
  });

  // Use refs to track update state and prevent loops
  const isUpdatingRef = useRef(false);
  const lastUpdateRef = useRef<number>(Date.now());

  // Handle storage change events
  useEffect(() => {
    const handleStorageChange = () => {
      // Prevent rapid consecutive updates
      const now = Date.now();
      if (now - lastUpdateRef.current < 100) {
        return;
      }
      lastUpdateRef.current = now;

      if (!isUpdatingRef.current) {
        const newLogs = AppStorage.getLogs();
        if (JSON.stringify(newLogs) !== JSON.stringify(logs)) {
          setLogs(newLogs);
          memoryLogsCache = newLogs;
        }
      }
    };

    window.addEventListener(LOG_UPDATED_EVENT, handleStorageChange);
    return () => window.removeEventListener(LOG_UPDATED_EVENT, handleStorageChange);
  }, [logs]);

  /**
   * Adds a log message, updates state, persists to storage, and notifies other components
   * @param log - The log message to add
   */
  const addLog = useCallback((log: string) => {
    if (isUpdatingRef.current) return;

    isUpdatingRef.current = true;
    try {
      const newLogs = [...logs, log];
      setLogs(newLogs);
      memoryLogsCache = newLogs;
      AppStorage.setLogs(newLogs);
      window.dispatchEvent(new CustomEvent(LOG_UPDATED_EVENT));
    } finally {
      isUpdatingRef.current = false;
    }
  }, [logs]);

  /**
   * Clears all logs, updates state, persists to storage, and notifies other components
   */
  const clearLogs = useCallback(() => {
    if (isUpdatingRef.current) return;

    isUpdatingRef.current = true;
    try {
      setLogs([]);
      memoryLogsCache = [];
      AppStorage.setLogs([]);
      window.dispatchEvent(new CustomEvent(LOG_UPDATED_EVENT));
    } finally {
      isUpdatingRef.current = false;
    }
  }, []);

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
