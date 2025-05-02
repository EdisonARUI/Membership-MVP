type LogDisplayProps = {
  logs: string[];
  onClearLogs: () => void;
};

export function LogDisplay({ logs, onClearLogs }: LogDisplayProps) {
  return (
    <div className="mb-10 p-6 bg-slate-800 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold">测试日志</h3>
        <button 
          onClick={onClearLogs}
          className="px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded border border-red-500/30"
        >
          清空日志
        </button>
      </div>
      <div className="p-4 bg-slate-900 rounded-lg overflow-auto max-h-96">
        {logs.length === 0 ? (
          <p className="text-slate-400">暂无日志</p>
        ) : (
          <ul className="space-y-1 text-xs font-mono">
            {logs.map((log, index) => (
              <li key={index} className="pb-1 border-b border-slate-700">
                {log}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
