/**
 * LogDisplay component provides a debug panel for viewing, clearing, and managing application logs and zkLogin state.
 * It also displays network status and zkLogin ephemeral keypair status for troubleshooting.
 *
 * Features:
 * - Displays application logs with error highlighting and detail toggling
 * - Allows clearing logs and resetting zkLogin state
 * - Periodically checks and displays Sui node network status
 * - Shows zkLogin ephemeral keypair and address status
 */
import { useZkLogin } from "@/contexts/ZkLoginContext";
import { useState, useEffect } from "react";
import { SuiService } from "@/utils/SuiService";
import { useLogContext } from "@/contexts/LogContext";

export function LogDisplay() {
  const { clearState, state } = useZkLogin();
  const { logs, clearLogs, addLog } = useLogContext();
  const [showFullErrors, setShowFullErrors] = useState(false);
  const [networkStatus, setNetworkStatus] = useState({
    suiNode: "Checking...",
    timestamp: new Date()
  });
  
  /**
   * Periodically checks the Sui node network status and updates the state.
   * Runs immediately on mount and every 30 seconds.
   */
  useEffect(() => {
    // Check immediately
    checkNetworkStatus();
    // Set interval for periodic checks
    const intervalId = setInterval(checkNetworkStatus, 30000);
    return () => clearInterval(intervalId);
  }, []);
  
  /**
   * Checks the Sui node network status and updates the networkStatus state.
   * On error, displays the error message.
   */
  const checkNetworkStatus = async () => {
    try {
      const epoch = await SuiService.getCurrentEpoch();
      setNetworkStatus({
        suiNode: `Online (Epoch: ${epoch})`,
        timestamp: new Date()
      });
    } catch (error: any) {
      setNetworkStatus({
        suiNode: `Error: ${error.message || 'Connection failed'}`,
        timestamp: new Date()
      });
    }
  };
  
  /**
   * Resets zkLogin state and reloads the page to ensure all state is cleared.
   */
  const handleResetZkLogin = () => {
    clearState();
    window.location.reload();
  };
  
  /**
   * Clears all logs and adds a log entry indicating logs have been cleared.
   */
  const handleClearLogs = () => {
    clearLogs();
    addLog("Logs have been cleared");
  };
  
  /**
   * Processes logs for display, optionally hiding full error details unless toggled.
   */
  const processedLogs = showFullErrors 
    ? logs 
    : logs.map((log: string) => {
        if (log.includes('Unexpected response format') || log.includes('Error response:')) {
          // Keep only the basic error message
          return log.split('Unexpected response format')[0] || log.split('Error response:')[0] || log;
        }
        return log;
      });

  return (
    <div className="mb-10 p-6 bg-slate-800 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold">Debug Logs</h3>
        <div className="flex space-x-2">
          <button 
            onClick={checkNetworkStatus}
            className="px-2 py-1 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded border border-green-500/30"
          >
            Check Network
          </button>
          <button 
            onClick={() => setShowFullErrors(!showFullErrors)}
            className={`px-2 py-1 text-xs ${showFullErrors ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-500/20 text-blue-400'} hover:bg-blue-500/30 rounded border border-blue-500/30`}
          >
            {showFullErrors ? 'Hide Details' : 'Show Details'}
          </button>
          <button 
            onClick={handleResetZkLogin}
            className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded border border-yellow-500/30"
          >
            Reset zkLogin
          </button>
          <button 
            onClick={handleClearLogs}
            className="px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded border border-red-500/30"
          >
            Clear Logs
          </button>
        </div>
      </div>
      
      {/* Status panel */}
      <div className="mb-4 p-3 bg-slate-700/40 rounded text-xs">
        <h4 className="font-semibold mb-1">System Status</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-slate-400 mr-2">Sui Node:</span>
            <span className={networkStatus.suiNode.includes('Error') ? 'text-red-400' : 'text-green-400'}>
              {networkStatus.suiNode}
            </span>
          </div>
          <div>
            <span className="text-slate-400 mr-2">Ephemeral Key Status:</span>
            <span className={state.isInitialized ? 'text-green-400' : 'text-yellow-400'}>
              {state.isInitialized ? 'Initialized' : 'Not Initialized'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 mr-2">Last Checked:</span>
            <span className="text-slate-300">{networkStatus.timestamp.toLocaleTimeString()}</span>
          </div>
          <div>
            <span className="text-slate-400 mr-2">zkLogin Address:</span>
            <span className="text-slate-300 truncate max-w-[120px] inline-block align-bottom">
              {state.zkLoginAddress || 'None'}
            </span>
          </div>
        </div>
        {state.error && (
          <div className="mt-2 text-red-400">
            <span className="font-semibold">Error: </span>
            <span>{state.error}</span>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-slate-900 rounded-lg overflow-auto max-h-96">
        {!logs || logs.length === 0 ? (
          <p className="text-slate-400">No logs available</p>
        ) : (
          <ul className="space-y-1 text-xs font-mono">
            {processedLogs.map((log: string, index: number) => (
              <li key={index} className={`pb-1 border-b border-slate-700 ${log.includes('Error') || log.includes('Failed') ? 'text-red-400' : ''}`}>
                {log}
                {showFullErrors && logs[index].includes('Error response:') && (
                  <div className="mt-1 p-2 bg-red-900/20 rounded border border-red-900/30 whitespace-pre-wrap overflow-auto max-h-48">
                    {logs[index].split('Error response:')[1] || ''}
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
