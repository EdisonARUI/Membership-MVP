/// @title Subscription Management Module
/// @notice This module provides subscription management functionality for membership services
/// @dev Implements creation, renewal, cancellation and status tracking of subscriptions
module subscription::subscription {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::transfer;
    use sui::event::emit;
    use sui::clock::{Self, Clock};
    use std::option::{Self, Option};
    use authentication::authentication::{Self, AuthRegistry, check_authorization};
    use coin::test_usdt::{Self, TEST_USDT};
    use fund::fund::{Self, Fund};

    // Error codes
    const EInsufficientPayment: u64 = 0;
    const EInvalidSubscription: u64 = 1;
    const ENotOwner: u64 = 2;

    // Subscription statuses
    const STATUS_ACTIVE: u8 = 0;
    const STATUS_EXPIRED: u8 = 1;
    const STATUS_CANCELLED: u8 = 2;

    /// Subscription object representing a user's membership
    /// @param id - Unique identifier for the object
    /// @param owner - Address of the subscription owner
    /// @param start_time - Timestamp when subscription begins (milliseconds)
    /// @param end_time - Timestamp when subscription expires (milliseconds)
    /// @param amount_paid - Total amount paid for the subscription
    /// @param auto_renew - Flag indicating if subscription should automatically renew
    /// @param status - Current status of subscription (active, expired, or cancelled)
    struct Subscription has key, store {
        id: UID,
        owner: address,
        start_time: u64,
        end_time: u64,
        amount_paid: u64,
        auto_renew: bool,
        status: u8
    }

    /// Event emitted when a new subscription is created
    /// @param subscription_id - ID of the subscription
    /// @param owner - Address of the subscription owner
    /// @param duration - Duration of the subscription in milliseconds
    /// @param amount - Amount paid for the subscription
    /// @param auto_renew - Whether the subscription will auto-renew
    struct SubscriptionCreatedEvent has copy, drop {
        subscription_id: ID,
        owner: address,
        duration: u64,
        amount: u64,
        auto_renew: bool
    }

    /// Event emitted when a subscription is renewed
    /// @param subscription_id - ID of the subscription
    /// @param new_end_time - New expiration timestamp
    /// @param amount - Amount paid for renewal
    struct SubscriptionRenewedEvent has copy, drop {
        subscription_id: ID,
        new_end_time: u64,
        amount: u64
    }

    /// Event emitted when a subscription is cancelled
    /// @param subscription_id - ID of the subscription
    /// @param owner - Address of the subscription owner
    struct SubscriptionCancelledEvent has copy, drop {
        subscription_id: ID,
        owner: address
    }

    /// Event emitted when a subscription expires
    /// @param subscription_id - ID of the subscription
    /// @param owner - Address of the subscription owner
    struct SubscriptionExpiredEvent has copy, drop {
        subscription_id: ID,
        owner: address
    }

    /// Create a new subscription
    /// @dev Verifies zkLogin authorization and transfers payment to fund
    /// @param payment - TEST_USDT coin used to pay for subscription
    /// @param duration - Duration of subscription in milliseconds
    /// @param auto_renew - Whether the subscription should auto-renew
    /// @param clock - Clock object for timestamp verification
    /// @param auth - Authentication registry for zkLogin verification
    /// @param fund - Fund to receive the subscription payment
    /// @param ctx - Transaction context
    public entry fun create_subscription(
        payment: Coin<TEST_USDT>,
        duration: u64,
        auto_renew: bool,
        clock: &Clock,
        auth: &AuthRegistry,
        fund: &mut Fund,
        ctx: &mut TxContext
    ) {
        // Verify zkLogin authorization
        check_authorization(auth, ctx);
        
        let amount = coin::value(&payment);
        
        // Process payment, transfer funds to subscription fund pool
        let sender = tx_context::sender(ctx);
        fund::add_to_fund(fund, payment, sender);
        
        // Calculate times
        let current_time = clock::timestamp_ms(clock);
        let end_time = current_time + duration;
        
        // Create subscription object
        let subscription = Subscription {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            start_time: current_time,
            end_time,
            amount_paid: amount,
            auto_renew,
            status: STATUS_ACTIVE
        };
        
        let subscription_id = object::uid_to_inner(&subscription.id);
        
        // Emit event
        emit(SubscriptionCreatedEvent {
            subscription_id,
            owner: tx_context::sender(ctx),
            duration,
            amount,
            auto_renew
        });
        
        // Transfer subscription object to user
        transfer::transfer(subscription, tx_context::sender(ctx));
    }

    /// Renew an existing subscription
    /// @dev Extends subscription duration based on payment amount
    /// @param subscription - Reference to the subscription object
    /// @param payment - TEST_USDT coin used to pay for renewal
    /// @param clock - Clock object for timestamp verification
    /// @param auth - Authentication registry for zkLogin verification
    /// @param fund - Fund to receive the renewal payment
    /// @param ctx - Transaction context
    public entry fun renew_subscription(
        subscription: &mut Subscription,
        payment: Coin<TEST_USDT>,
        clock: &Clock,
        auth: &AuthRegistry,
        fund: &mut Fund,
        ctx: &mut TxContext
    ) {
        // Verify zkLogin authorization
        check_authorization(auth, ctx);
        
        // Confirm ownership
        assert!(subscription.owner == tx_context::sender(ctx), ENotOwner);
        
        let amount = coin::value(&payment);
        
        // Process payment, transfer funds to subscription fund pool
        let sender = tx_context::sender(ctx);
        fund::add_to_fund(fund, payment, sender);
        
        // Calculate new end time
        let current_time = clock::timestamp_ms(clock);
        let new_end_time = if (subscription.end_time > current_time) {
            // If subscription hasn't expired, extend from current end time
            subscription.end_time + (amount * 365 * 24 * 60 * 60 * 1000) / 365 // Calculate extension time based on payment amount
        } else {
            // If subscription has expired, start from current time
            current_time + (amount * 365 * 24 * 60 * 60 * 1000) / 365
        };
        
        // Update subscription
        subscription.end_time = new_end_time;
        subscription.amount_paid = subscription.amount_paid + amount;
        subscription.status = STATUS_ACTIVE;
        
        // Emit event
        emit(SubscriptionRenewedEvent {
            subscription_id: object::id(subscription),
            new_end_time,
            amount
        });
    }

    /// Cancel an active subscription
    /// @dev Only the owner can cancel their subscription
    /// @param subscription - Reference to the subscription object
    /// @param auth - Authentication registry for zkLogin verification
    /// @param ctx - Transaction context
    public entry fun cancel_subscription(
        subscription: &mut Subscription,
        auth: &AuthRegistry,
        ctx: &mut TxContext
    ) {
        // Verify zkLogin authorization
        check_authorization(auth, ctx);
        
        // Confirm ownership
        assert!(subscription.owner == tx_context::sender(ctx), ENotOwner);
        
        // Set status to cancelled
        subscription.status = STATUS_CANCELLED;
        subscription.auto_renew = false;
        
        // Emit event
        emit(SubscriptionCancelledEvent {
            subscription_id: object::id(subscription),
            owner: subscription.owner
        });
    }
    
    /// Get current status of a subscription
    /// @dev Checks if subscription is cancelled, expired, or active
    /// @param subscription - Reference to the subscription object
    /// @param clock - Clock object for timestamp verification
    /// @return u8 - Current status code (0=active, 1=expired, 2=cancelled)
    public fun get_subscription_status(
        subscription: &Subscription,
        clock: &Clock
    ): u8 {
        // If cancelled, return cancelled status
        if (subscription.status == STATUS_CANCELLED) {
            return STATUS_CANCELLED
        };
        
        // Check if expired
        let current_time = clock::timestamp_ms(clock);
        if (current_time > subscription.end_time) {
            return STATUS_EXPIRED
        };
        
        // Otherwise return active status
        STATUS_ACTIVE
    }
}
