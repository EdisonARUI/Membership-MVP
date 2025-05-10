/**
 * LotteryDialog component provides a modal dialog for users to participate in instant lottery draws using zkLogin authentication.
 * It allows users to execute a draw, view draw results, and see their lottery history and statistics.
 *
 * Features:
 * - Instant lottery draw with zkLogin authentication
 * - Displays draw result and transaction status
 * - Shows lottery history and total statistics
 * - Integrates with LotteryContext for state and operations
 */
import { useEffect } from 'react';
import { X, Loader2, Gift } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useZkLogin } from '@/contexts/ZkLoginContext';
import { useLogContext } from '@/contexts/LogContext';
import { useLottery } from '@/contexts/LotteryContext';
import { LotteryRecord } from '@/interfaces/Lottery';

/**
 * Props for LotteryDialog component
 */
interface LotteryDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  /**
   * Callback to close the dialog
   */
  onClose: () => void;
}

/**
 * Local UI type for displaying lottery history items
 */
interface LotteryHistoryItem {
  player: string;
  amount: number;
  time: Date;
}

/**
 * LotteryDialog component for handling instant lottery draws and displaying history/statistics
 *
 * @param {LotteryDialogProps} props - Component props
 * @returns {JSX.Element|null} The rendered dialog or null if not open
 */
export default function LotteryDialog({ isOpen, onClose }: LotteryDialogProps) {
  const { user } = useUser();
  const { state } = useZkLogin();
  const { zkLoginAddress } = state;
  const { addLog } = useLogContext();
  
  // Use LotteryContext for state and operations
  const { 
    loading, 
    result, 
    lotteryHistory,
    lotteryStats, 
    executeDraw,
    fetchLotteryHistory,
    fetchLotteryStats,
    resetUpdateTimestamp
  } = useLottery();

  /**
   * Converts API lottery records to UI display format
   * @param {LotteryRecord[]} records - Array of lottery records
   * @returns {LotteryHistoryItem[]} Array of formatted history items
   */
  const convertToHistoryItems = (records: LotteryRecord[]): LotteryHistoryItem[] => {
    return records.map(record => ({
      player: record.player_address,
      amount: record.win_amount,
      time: new Date(record.created_at)
    }));
  };
  
  /**
   * Fetches lottery history and statistics when the dialog is opened
   * Resets update timestamp when dialog is closed
   */
  useEffect(() => {
    if (isOpen && zkLoginAddress) {
      fetchLotteryHistory(10, false);
      fetchLotteryStats('all');
    } else if (isOpen && !zkLoginAddress) {
      addLog("zkLogin address not initialized, please complete login first");
    }
    // Reset timestamp on close to ensure fresh data next open
    return () => {
      if (!isOpen) {
        resetUpdateTimestamp();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, zkLoginAddress]);

  /**
   * Handles the draw button click, validates login and zkLogin, and executes draw
   */
  const handleDraw = async () => {
    if (!user || !zkLoginAddress) {
      addLog("Draw failed: Not logged in or zkLogin address not initialized");
      return;
    }
    addLog("Starting lottery draw...");
    await executeDraw();
  };

  if (!isOpen) return null;

  // Prepare history items for display
  const historyItems: LotteryHistoryItem[] = lotteryHistory && lotteryHistory.records 
    ? convertToHistoryItems(lotteryHistory.records)
    : [];
    
  // Get statistics data
  const totalStats = {
    count: lotteryStats?.total_count || 0,
    amount: lotteryStats?.total_amount || 0
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="text-center mb-6">
          <Gift className="h-12 w-12 text-yellow-400 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-white">Instant Lottery</h2>
          <p className="text-gray-400 mt-1">Use zkLogin authentication to participate in real-time on-chain lottery</p>
        </div>
        
        {/* Draw button */}
        <div className="mb-6">
          <button 
            onClick={handleDraw}
            disabled={loading || !user || !zkLoginAddress}
            className={`w-full py-3 rounded-lg text-center font-semibold ${
              loading || !user || !zkLoginAddress 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-yellow-400 hover:bg-yellow-500 text-black'
            } transition-colors`}
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5 mx-auto" />
            ) : !user ? (
              'Please login first'
            ) : !zkLoginAddress ? (
              'Please complete zkLogin authentication'
            ) : (
              'Draw Now'
            )}
          </button>
        </div>
        
        {/* Draw result */}
        {result && (
          <div className={`p-4 rounded-lg mb-6 ${
            result.success && result.amount ? 'bg-green-900 bg-opacity-30' : 'bg-red-900 bg-opacity-30'
          }`}>
            <p className="text-center">{result.message}</p>
          </div>
        )}
        
        {/* Lottery history */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            My Lottery
            {totalStats.count > 0 && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                Total {totalStats.count} times, won {totalStats.amount / 1000000000} SUI
              </span>
            )}
          </h3>
          <div className="space-y-2">
            {historyItems.length > 0 ? (
              historyItems.map((item, idx) => (
                <div key={idx} className={`flex justify-between items-center p-2 rounded ${item.amount > 0 ? 'bg-green-800 bg-opacity-20' : 'bg-slate-700 bg-opacity-50'}`}>
                  <div className="overflow-hidden">
                    <p className="text-xs text-gray-400">{item.time.toLocaleString()}</p>
                  </div>
                  <div className={`font-semibold ${item.amount > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {item.amount > 0 
                      ? `+${item.amount / 1000000000} SUI` 
                      : 'No Win'}
                  </div>
                </div>
              ))
            ) : zkLoginAddress ? (
              <p className="text-gray-500 text-center py-4">No lottery records</p>
            ) : (
              <p className="text-gray-500 text-center py-4">Please complete zkLogin authentication first</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 