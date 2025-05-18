/// @title Fund Management Module
/// @notice This module provides functionality for managing a centralized fund pool
/// @dev Implements fund deposit, withdrawal, and administrative operations for TEST_USDT tokens
module fund::fund {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::transfer;
    use sui::event;
    use coin::test_usdt::{Self, TEST_USDT};
    use sui::coin::{Self, Coin};

    // Error codes
    const ENotAuthorized: u64 = 0;
    const EInsufficientBalance: u64 = 1;

    /// Event emitted when funds are received into the pool
    /// @param amount - Amount of TEST_USDT received
    /// @param from - Address of the sender
    struct FundReceived has copy, drop {
        amount: u64,
        from: address
    }

    /// Event emitted when funds are withdrawn from the pool
    /// @param amount - Amount of TEST_USDT withdrawn
    /// @param to - Address of the recipient
    struct FundWithdrawn has copy, drop {
        amount: u64,
        to: address
    }

    /// Fund pool object that holds and manages TEST_USDT tokens
    /// @param id - Unique identifier for the object
    /// @param balance - Balance of TEST_USDT tokens in the fund
    /// @param admin - Address of the fund administrator
    /// @param total_received - Cumulative amount of tokens received by the fund
    /// @param total_withdrawn - Cumulative amount of tokens withdrawn from the fund
    struct Fund has key {
        id: UID,
        // Fund balance
        balance: Balance<TEST_USDT>,
        // Fund administrator
        admin: address,
        // Total income
        total_received: u64,
        // Total expenditure
        total_withdrawn: u64
    }

    /// Initialize the fund pool
    /// @dev Creates a new fund with the transaction sender as admin
    /// @param ctx - Transaction context
    fun init(ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);
        
        let fund = Fund {
            id: object::new(ctx),
            balance: balance::zero<TEST_USDT>(),
            admin,
            total_received: 0,
            total_withdrawn: 0
        };

        // Share the fund object, making it accessible to anyone
        transfer::share_object(fund);
    }

    /// Add TEST_USDT to the fund pool
    /// @param fund - Reference to the fund pool
    /// @param payment - TEST_USDT coin to be added to the fund
    /// @param sender - Address of the sender
    public fun add_to_fund(
        fund: &mut Fund, 
        payment: Coin<TEST_USDT>,
        sender: address
    ) {
        let amount = coin::value(&payment);
        
        // Add tokens to the fund balance
        balance::join(&mut fund.balance, coin::into_balance(payment));
        
        // Update total income
        fund.total_received = fund.total_received + amount;
        
        // Emit event
        event::emit(FundReceived {
            amount,
            from: sender
        });
    }

    /// Withdraw TEST_USDT from the fund pool (admin only)
    /// @dev Only the admin can withdraw funds
    /// @param fund - Reference to the fund pool
    /// @param amount - Amount of TEST_USDT to withdraw
    /// @param recipient - Address to receive the withdrawn tokens
    /// @param ctx - Transaction context
    public entry fun withdraw_from_fund(
        fund: &mut Fund,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        // Check if caller is the admin
        assert!(tx_context::sender(ctx) == fund.admin, ENotAuthorized);
        
        // Check if balance is sufficient
        assert!(balance::value(&fund.balance) >= amount, EInsufficientBalance);
        
        // Withdraw amount from the fund
        let payment = coin::from_balance(
            balance::split(&mut fund.balance, amount), 
            ctx
        );
        
        // Update total expenditure
        fund.total_withdrawn = fund.total_withdrawn + amount;
        
        // Emit event
        event::emit(FundWithdrawn {
            amount,
            to: recipient
        });
        
        // Transfer to recipient
        transfer::public_transfer(payment, recipient);
    }

    /// Change the fund administrator (current admin only)
    /// @dev Only the current admin can change the admin
    /// @param fund - Reference to the fund pool
    /// @param new_admin - Address of the new administrator
    /// @param ctx - Transaction context
    public entry fun change_admin(
        fund: &mut Fund,
        new_admin: address,
        ctx: &mut TxContext
    ) {
        // Check if caller is the admin
        assert!(tx_context::sender(ctx) == fund.admin, ENotAuthorized);
        
        // Update admin
        fund.admin = new_admin;
    }

    /// Get the current balance of the fund pool
    /// @param fund - Reference to the fund pool
    /// @return u64 - Current balance of TEST_USDT in the fund
    public fun get_fund_balance(fund: &Fund): u64 {
        balance::value(&fund.balance)
    }

    /// Get fund statistics
    /// @param fund - Reference to the fund pool
    /// @return (u64, u64, u64) - Tuple containing current balance, total received, and total withdrawn
    public fun get_fund_stats(fund: &Fund): (u64, u64, u64) {
        (
            balance::value(&fund.balance),
            fund.total_received,
            fund.total_withdrawn
        )
    }

    /// Check if an address is the fund administrator
    /// @param fund - Reference to the fund pool
    /// @param addr - Address to check
    /// @return bool - True if the address is the admin, false otherwise
    public fun is_admin(fund: &Fund, addr: address): bool {
        fund.admin == addr
    }
}
