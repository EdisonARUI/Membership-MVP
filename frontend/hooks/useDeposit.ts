/**
 * Hook for managing recharge operations using SUI Devnet Faucet
 * Provides functionality to recharge user accounts with test SUI tokens
 */
import { useState, useCallback } from 'react';
import { useSuiPrice } from '@/contexts/SuiPriceContext';
import { useLogContext } from '@/contexts/LogContext';

const FAUCET_URL = 'https://faucet.devnet.sui.io/v2/gas';

/**
 * Hook for managing recharge operations
 * Handles SUI token recharging via the Devnet faucet
 * 
 * @returns {Object} Recharge controls and state
 */
export function useRecharge() {
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const { addLog } = useLogContext();
  const { suiPrice, isLoadingPrice, getSuiPrice } = useSuiPrice();
  
  /**
   * Handles the recharge process
   * Converts USD amount to SUI and requests tokens from faucet
   * 
   * @param {string} amount - Amount in USD to recharge
   * @returns {Promise<number>} Amount of SUI tokens recharged
   * @throws {Error} If recharge fails or wallet address not found
   */
  const handleRecharge = async (amount: string) => {
    const zkLoginAddress = localStorage.getItem('zkLogin_address');
    if (!zkLoginAddress) {
      throw new Error('Wallet address not found, please complete zkLogin process first');
    }
    
    // Get real-time SUI price
    const currentPrice = suiPrice || await getSuiPrice();
    
    // Convert USD to SUI: USD amount / SUI price = SUI amount
    const suiAmount = Number(amount) / currentPrice;
    
    addLog(`Starting recharge process, USD amount: ${amount}, SUI price: ${currentPrice} USD/SUI, converted to SUI: ${suiAmount.toFixed(2)}`);
    
    // Call Sui Devnet Faucet
    const response = await fetch(FAUCET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        FixedAmountRequest: {
          recipient: zkLoginAddress,
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Recharge failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    addLog(`Recharge successful: ${JSON.stringify(result)}`);
    
    return suiAmount;
  };
  
  return { 
    showRechargeDialog, 
    setShowRechargeDialog, 
    handleRecharge,
    suiPrice,
    isLoadingPrice
  };
}
