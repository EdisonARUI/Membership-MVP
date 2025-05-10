/**
 * DepositDialog component provides a modal dialog for users to deposit USDT using zkLogin authentication.
 * It allows users to enter an amount, execute a deposit transaction, and view their deposit history and results.
 *
 * Features:
 * - USDT deposit form with validation
 * - Displays deposit result and transaction status
 * - Shows deposit history with total count and amount
 * - Integrates with DepositContext for state and operations
 */
import { useState, useEffect } from 'react';
import { X, Loader2, CreditCard } from 'lucide-react';
import { useDeposit } from '@/contexts/DepositContext';
import { DepositRecord } from '@/interfaces/Deposit';

/**
 * Props for DepositDialog component
 */
interface DepositDialogProps {
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
 * Local UI type for displaying deposit history items
 */
interface DepositHistoryItem {
  amount: number;
  time: Date;
}

/**
 * DepositDialog component for handling USDT deposits and displaying deposit history
 *
 * @param {DepositDialogProps} props - Component props
 * @returns {JSX.Element|null} The rendered dialog or null if not open
 */
export default function DepositDialog({ isOpen, onClose }: DepositDialogProps) {
  const [depositAmount, setDepositAmount] = useState<string>('');
  const { 
    loading, 
    result, 
    depositRecords,
    executeDeposit,
    fetchDepositRecords,
    resetResult 
  } = useDeposit();
  
  /**
   * Converts API deposit records to UI display format
   * @param {DepositRecord[]} records - Array of deposit records
   * @returns {DepositHistoryItem[]} Array of formatted history items
   */
  const convertToHistoryItems = (records: DepositRecord[]): DepositHistoryItem[] => {
    return records.map(record => ({
      amount: record.amount,
      time: new Date(record.created_at)
    }));
  };
  
  /**
   * Fetches deposit history when the dialog is opened
   */
  useEffect(() => {
    if (isOpen) {
      fetchDepositRecords(10);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  
  /**
   * Handles the deposit button click, validates input, and executes deposit
   */
  const handleDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) {
      return;
    }
    await executeDeposit(depositAmount);
  };
  
  if (!isOpen) return null;
  
  // Prepare history items for display
  const historyItems: DepositHistoryItem[] = depositRecords && depositRecords.records 
    ? convertToHistoryItems(depositRecords.records)
    : [];
  
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
          <CreditCard className="h-12 w-12 text-yellow-400 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-white">Deposit USDT</h2>
          <p className="text-gray-400 mt-1">Use zkLogin authentication to securely deposit on-chain</p>
        </div>
        
        {/* Deposit form */}
        <div className="mb-6">
          <div className="relative mb-4">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">$</span>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Enter deposit amount (USD)"
              className="w-full py-2 pl-8 pr-4 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
              disabled={loading}
            />
          </div>
          
          <button 
            onClick={handleDeposit}
            disabled={loading || !depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0}
            className={`w-full py-3 rounded-lg text-center font-semibold ${
              loading || !depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-yellow-400 hover:bg-yellow-500 text-black'
            } transition-colors`}
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5 mx-auto" />
            ) : (
              "Confirm Deposit"
            )}
          </button>
        </div>
        
        {/* Deposit result */}
        {result && (
          <div className={`p-4 rounded-lg mb-6 ${
            result.success ? 'bg-green-900 bg-opacity-30' : 'bg-red-900 bg-opacity-30'
          }`}>
            <p className="text-center">{result.message}</p>
          </div>
        )}
        
        {/* Deposit history */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            My Deposit History
            {depositRecords?.total_count ? (
              <span className="text-sm font-normal text-gray-400 ml-2">
                Total {depositRecords.total_count} times, sum {depositRecords.total_amount ? depositRecords.total_amount / 10**8 : 0} USDT
              </span>
            ) : null}
          </h3>
          <div className="space-y-2">
            {historyItems.length > 0 ? (
              historyItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-700 bg-opacity-50">
                  <div className="overflow-hidden">
                    <p className="text-xs text-gray-400">{item.time.toLocaleString()}</p>
                  </div>
                  <div className="font-semibold text-yellow-400">
                    +{item.amount / 10**8} USDT
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No deposit records</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
