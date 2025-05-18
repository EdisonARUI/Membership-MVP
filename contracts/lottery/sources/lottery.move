/// @title Instant Lottery Module
/// @notice This module provides instant lottery functionality with zkLogin authentication
/// @dev Implements random prize drawing using on-chain randomness and authentication verification
module lottery::lottery {
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::random::{Self, Random};
    use sui::math;
    use pool::pool::{Self, InstantPool};
    use authentication::authentication::{Self, AuthRegistry, check_authorization};

    /// Event emitted when a player wins a prize in instant lottery
    /// @param player - Address of the winning player
    /// @param amount - Amount of prize won
    struct InstantWin has copy, drop {
        player: address,
        amount: u64
    }

    /// Instant lottery draw function integrating zkLogin authentication and on-chain randomness
    /// @dev Verifies user authentication, generates random prize amount, and distributes rewards
    /// @param pool - Reference to the instant prize pool
    /// @param r - Random object for generating randomness
    /// @param auth - Reference to the authentication registry for zkLogin verification
    /// @param ctx - Transaction context
    public entry fun instant_draw(
        pool: &mut InstantPool,
        r: &Random,
        auth: &AuthRegistry,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Verify zkLogin authentication
        check_authorization(auth, ctx);
        
        // Get prize pool information
        let available_prize = pool::get_available_prize(pool);
        assert!(available_prize > 0, 1); // Ensure pool has sufficient available balance
        
        // Get prize pool parameters
        let min_prize = pool::get_min_prize_amount(pool);
        let max_prize = pool::get_max_prize_amount(pool);
        
        // Adjust actual maximum prize amount based on available funds
        let actual_max = math::min(max_prize, available_prize);
        let actual_min = math::min(min_prize, available_prize);
        
        // Ensure minimum value is not greater than maximum value
        assert!(actual_min <= actual_max, 2);
        
        // Generate random prize amount
        let generator = random::new_generator(r, ctx);
        let range = actual_max - actual_min + 1;
        let draw_amount = if (range > 0) {
            actual_min + (random::generate_u64(&mut generator) % range)
        } else {
            // If range is 0, directly use minimum value
            actual_min
        };
        
        // Withdraw prize and distribute to player
        pool::withdraw_prize(pool, draw_amount, sender, ctx);
        
        // Emit event
        event::emit(InstantWin {
            player: sender,
            amount: draw_amount
        });
    }
}
