/// @title Prize Pool Module
/// @notice This module manages an instant lottery prize pool with configurable parameters
/// @dev Implements prize storage, withdrawal mechanisms and parameter management for lottery applications
module pool::pool {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::transfer;
    use sui::sui::SUI;
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::random::{Self, Random};
    use sui::math;

    /// Event emitted when prize is added to the pool
    /// @param amount - Amount of SUI added to the prize pool
    /// @param new_balance - New total balance of the prize pool after addition
    struct PrizeAdded has copy, drop {
        amount: u64,
        new_balance: u64
    }
    
    /// Event emitted when prize is withdrawn from the pool
    /// @param amount - Amount of SUI withdrawn from the prize pool
    /// @param to - Address of the recipient
    struct PrizeWithdrawn has copy, drop {
        amount: u64,
        to: address
    }

    /// Prize pool structure for instant lottery rewards
    /// @param id - Unique identifier for the object
    /// @param prize - SUI balance stored in the prize pool
    /// @param creator - Address of the pool creator who has administrative rights
    /// @param min_prize_amount - Minimum prize amount that can be won
    /// @param max_prize_amount - Maximum prize amount that can be won
    /// @param min_pool_balance - Minimum pool balance that must be maintained (no draws allowed below this amount)
    struct InstantPool has key, store {
        id: UID,
        prize: Balance<SUI>,
        creator: address,
        min_prize_amount: u64,    // Minimum prize amount
        max_prize_amount: u64,    // Maximum prize amount
        min_pool_balance: u64     // Minimum pool balance (draws not allowed below this amount)
    }

    /// Create a new prize pool with initial funds and parameters
    /// @dev Shares the pool as a shared object accessible to all users
    /// @param prize_coin - Initial SUI coin to fund the prize pool
    /// @param min_prize_amount - Minimum prize amount that can be won
    /// @param max_prize_amount - Maximum prize amount that can be won
    /// @param min_pool_balance - Minimum pool balance that must be maintained
    /// @param ctx - Transaction context
    public entry fun create_pool(
        prize_coin: Coin<SUI>,
        min_prize_amount: u64,
        max_prize_amount: u64,
        min_pool_balance: u64,
        ctx: &mut TxContext
    ) {
        // Validate parameter reasonability
        assert!(min_prize_amount <= max_prize_amount, 0);
        assert!(coin::value(&prize_coin) >= min_pool_balance + max_prize_amount, 0);
        
        let prize = coin::into_balance(prize_coin);
        let pool = InstantPool {
            id: object::new(ctx),
            prize,
            creator: tx_context::sender(ctx),
            min_prize_amount,
            max_prize_amount,
            min_pool_balance
        };
        transfer::share_object(pool);
    }

    /// Add more prizes to the pool
    /// @dev Only the pool creator can add prizes
    /// @param pool - Reference to the prize pool
    /// @param prize_coin - SUI coin to add to the prize pool
    /// @param ctx - Transaction context
    public entry fun add_prize(
        pool: &mut InstantPool,
        prize_coin: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // Only allow creator to add prizes
        assert!(tx_context::sender(ctx) == pool.creator, 0);
        
        // Add coin to pool balance
        let prize_amount = coin::value(&prize_coin);
        coin::put(&mut pool.prize, prize_coin);
        
        // Emit event record
        event::emit(PrizeAdded {
            amount: prize_amount,
            new_balance: balance::value(&pool.prize)
        });
    }

    /// Update prize pool parameters
    /// @dev Only the pool creator can update parameters
    /// @param pool - Reference to the prize pool
    /// @param min_prize_amount - New minimum prize amount
    /// @param max_prize_amount - New maximum prize amount
    /// @param min_pool_balance - New minimum pool balance
    /// @param ctx - Transaction context
    public entry fun update_pool_params(
        pool: &mut InstantPool,
        min_prize_amount: u64,
        max_prize_amount: u64,
        min_pool_balance: u64,
        ctx: &mut TxContext
    ) {
        // Only allow creator to modify parameters
        assert!(tx_context::sender(ctx) == pool.creator, 0);
        
        // Validate parameter reasonability
        assert!(min_prize_amount <= max_prize_amount, 0);
        assert!(balance::value(&pool.prize) >= min_pool_balance + max_prize_amount, 0);
        
        // Update parameters
        pool.min_prize_amount = min_prize_amount;
        pool.max_prize_amount = max_prize_amount;
        pool.min_pool_balance = min_pool_balance;
    }
    
    /// Withdraw prize from the pool - Called by lottery module
    /// @dev Ensures pool balance remains above minimum threshold after withdrawal
    /// @param pool - Reference to the prize pool
    /// @param amount - Amount to withdraw
    /// @param recipient - Address to receive the prize
    /// @param ctx - Transaction context
    public fun withdraw_prize(
        pool: &mut InstantPool, 
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        // Verify pool balance is sufficient
        let pool_balance = balance::value(&pool.prize);
        assert!(pool_balance > pool.min_pool_balance + amount, 0);
        
        // Split amount from pool
        let prize_coin = coin::from_balance(balance::split(&mut pool.prize, amount), ctx);
        
        // Record withdrawal event
        event::emit(PrizeWithdrawn {
            amount,
            to: recipient
        });
        
        // Transfer to recipient
        transfer::public_transfer(prize_coin, recipient);
    }

    /// Get current prize balance in the pool
    /// @param pool - Reference to the prize pool
    /// @return u64 - Current balance of the prize pool
    public fun get_prize_balance(pool: &InstantPool): u64 {
        balance::value(&pool.prize)
    }

    /// Get minimum prize amount
    /// @param pool - Reference to the prize pool
    /// @return u64 - Minimum prize amount that can be won
    public fun get_min_prize_amount(pool: &InstantPool): u64 {
        pool.min_prize_amount
    }

    /// Get maximum prize amount
    /// @param pool - Reference to the prize pool
    /// @return u64 - Maximum prize amount that can be won
    public fun get_max_prize_amount(pool: &InstantPool): u64 {
        pool.max_prize_amount
    }

    /// Get minimum required pool balance
    /// @param pool - Reference to the prize pool
    /// @return u64 - Minimum balance that must be maintained in the pool
    public fun get_min_pool_balance(pool: &InstantPool): u64 {
        pool.min_pool_balance
    }
    
    /// Calculate available prize amount for lottery draws
    /// @dev Returns amount above minimum required balance that can be used for prizes
    /// @param pool - Reference to the prize pool
    /// @return u64 - Available amount for lottery draws
    public fun get_available_prize(pool: &InstantPool): u64 {
        let balance = balance::value(&pool.prize);
        if (balance <= pool.min_pool_balance) {
            0
        } else {
            balance - pool.min_pool_balance
        }
    }
}
