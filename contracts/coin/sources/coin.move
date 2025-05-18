/// @title Test USDT Coin Module
/// @notice This module implements a test USDT token with public minting capabilities
/// @dev Uses Sui coin standard with controlled public minting
module coin::test_usdt {
    use sui::coin::{Self, TreasuryCap};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::option;
    use sui::object::{Self, UID};
    use sui::dynamic_field as df;

    /// One-time witness type for coin creation
    struct TEST_USDT has drop {}

    /// Public minting authority object containing the capability to mint tokens
    /// @param id - Unique identifier for the object
    /// @param max_mint_amount - Maximum amount of tokens that can be minted in a single transaction per address
    struct MintAuthority has key {
        id: UID,
        max_mint_amount: u64
    }

    /// Field identifier used to store TreasuryCap in dynamic fields
    struct TreasuryCapKey has copy, drop, store {}

    /// One-time initialization function following Sui standard
    /// @param witness - One-time witness for coin creation
    /// @param ctx - Transaction context
    fun init(witness: TEST_USDT, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency<TEST_USDT>(
            witness, 
            8,  // Token decimals
            b"testUSDT",  // Token name
            b"testUSDT",  // Token symbol
            b"Public Mintable Test USDT",  // Token description
            option::none(),      // Token icon (optional)
            ctx
        );
        
        // Create public minting authority object
        let mint_authority = MintAuthority {
            id: object::new(ctx),
            max_mint_amount: 1000_00000000 // 1000 USDT (considering 8 decimal places)
        };
        
        // Store TreasuryCap in MintAuthority's dynamic field
        df::add(&mut mint_authority.id, TreasuryCapKey {}, treasury_cap);
        
        // Freeze metadata to prevent modifications
        transfer::public_freeze_object(metadata);
        
        // Share MintAuthority as a shared object, accessible to anyone
        transfer::share_object(mint_authority);
    }

    /// Public minting function - Can be called by anyone
    /// @dev Mints new tokens and transfers them to the caller
    /// @param mint_authority - Reference to the minting authority object
    /// @param amount - Amount of tokens to mint
    /// @param ctx - Transaction context
    /// @notice The amount is limited by max_mint_amount to prevent abuse
    public entry fun public_mint(
        mint_authority: &mut MintAuthority,    // Minting authority object
        amount: u64,                           // Amount to mint
        ctx: &mut TxContext                    // Transaction context
    ) {
        // Check minting limit
        assert!(amount <= mint_authority.max_mint_amount, 1); // Ensure amount doesn't exceed maximum single mint limit
        
        // Get TreasuryCap from dynamic field
        let treasury_cap = df::borrow_mut<TreasuryCapKey, TreasuryCap<TEST_USDT>>(
            &mut mint_authority.id, TreasuryCapKey {}
        );
        
        // Mint tokens and transfer to caller
        let recipient = tx_context::sender(ctx);
        let coin = coin::mint(treasury_cap, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    /// Get public minting limit information
    /// @param mint_authority - Reference to the minting authority object
    /// @return u64 - The maximum amount that can be minted in a single transaction
    public fun get_mint_limit(mint_authority: &MintAuthority): u64 {
        mint_authority.max_mint_amount
    }
}
