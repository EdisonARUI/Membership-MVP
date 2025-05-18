/// @title Authentication Module
/// @notice This module provides authentication functionality for user identity verification
/// @dev Implements zkLogin verification, wallet binding, and authorization checks
module authentication::authentication {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::event::emit;
    use sui::transfer;
    use std::vector;
    use sui::table::{Self, Table};
    use sui::bcs;

    /// User authentication object that stores identity verification information
    /// @param id - Unique identifier for the object
    /// @param user_id - Byte vector representing user identifier
    /// @param wallet_address - User's wallet address
    /// @param is_kyc_verified - Flag indicating if KYC verification is complete
    /// @param zk_verified - Flag indicating if zero-knowledge verification is complete
    struct UserAuth has key, store {
        id: UID,
        user_id: vector<u8>,
        wallet_address: address,
        is_kyc_verified: bool,
        zk_verified: bool
    }

    /// Authentication registry that stores all verified addresses
    /// @param id - Unique identifier for the object
    /// @param verified_addresses - Table mapping addresses to verification status
    struct AuthRegistry has key {
        id: UID,
        // Address -> Verification status
        verified_addresses: Table<address, bool>
    }

    /// Event emitted when zero-knowledge proof verification is completed
    /// @param user_id - Byte vector representing user identifier
    /// @param verified - Result of verification
    struct ZkProofVerifiedEvent has copy, drop {
        user_id: vector<u8>,
        verified: bool
    }

    /// Event emitted when a wallet address is bound to a user
    /// @param user_id - Byte vector representing user identifier
    /// @param wallet_address - User's wallet address
    struct WalletBindedEvent has copy, drop {
        user_id: vector<u8>,
        wallet_address: address
    }

    /// Event emitted when KYC verification is completed
    /// @param user_id - Byte vector representing user identifier
    /// @param verified - Result of verification
    struct KycVerifiedEvent has copy, drop {
        user_id: vector<u8>,
        verified: bool
    }

    // Error codes
    const EInvalidProof: u64 = 0;
    const EInvalidWallet: u64 = 1;
    const EInvalidKYC: u64 = 2;
    const ENotAuthorized: u64 = 3;

    /// Initialization function, creates authentication registry
    /// @dev Called once when the module is published
    /// @param ctx - Transaction context
    fun init(ctx: &mut TxContext) {
        transfer::share_object(AuthRegistry {
            id: object::new(ctx),
            verified_addresses: table::new(ctx)
        });
    }

    /// zkLogin verification - Simplified version, only verifies address
    /// @dev In the actual zkLogin process, frontend handles most of the logic
    /// This function is only responsible for recording verified addresses
    /// @param registry - Reference to the authentication registry
    /// @param ctx - Transaction context
    public entry fun register_zk_address(
        registry: &mut AuthRegistry,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // If address already exists, remove old record
        if (table::contains(&registry.verified_addresses, sender)) {
            table::remove(&mut registry.verified_addresses, sender);
        };
        
        // Add new record
        table::add(&mut registry.verified_addresses, sender, true);
        
        // Emit event
        emit(ZkProofVerifiedEvent {
            user_id: bcs::to_bytes(&sender), // Use address as user ID
            verified: true
        });
    }

    /// Verify if an address has been authenticated
    /// @param registry - Reference to the authentication registry
    /// @param addr - Address to check
    /// @return bool - True if address is verified, false otherwise
    public fun is_address_verified(
        registry: &AuthRegistry,
        addr: address
    ): bool {
        table::contains(&registry.verified_addresses, addr) && 
        *table::borrow(&registry.verified_addresses, addr)
    }

    /// Authorization check function - For use by other contracts
    /// @dev Aborts with ENotAuthorized if address is not verified
    /// @param registry - Reference to the authentication registry
    /// @param ctx - Transaction context
    public fun check_authorization(
        registry: &AuthRegistry,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(is_address_verified(registry, sender), ENotAuthorized);
    }

    /// User wallet address binding - Simplified version
    /// @param registry - Reference to the authentication registry
    /// @param user_id - Byte vector representing user identifier
    /// @param ctx - Transaction context
    public entry fun bind_wallet_address(
        registry: &mut AuthRegistry,
        user_id: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Add to verification table
        if (!table::contains(&registry.verified_addresses, sender)) {
            table::add(&mut registry.verified_addresses, sender, true);
        } else {
            let verified = table::borrow_mut(&mut registry.verified_addresses, sender);
            *verified = true;
        };
        
        // Emit event
        emit(WalletBindedEvent {
            user_id,
            wallet_address: sender
        });
    }

    /// Protected action example - Only verified addresses can call
    /// @dev Demonstrates how to protect functions with authorization check
    /// @param registry - Reference to the authentication registry
    /// @param ctx - Transaction context
    public entry fun protected_action(
        registry: &AuthRegistry,
        ctx: &TxContext
    ) {
        // Verify caller identity
        check_authorization(registry, ctx);
        
        // Execute protected operation...
        // ...
    }
}
