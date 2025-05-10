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

    // 错误码
    const EInsufficientPayment: u64 = 0;
    const EInvalidSubscription: u64 = 1;
    const ENotOwner: u64 = 2;

    // 订阅状态
    const STATUS_ACTIVE: u8 = 0;
    const STATUS_EXPIRED: u8 = 1;
    const STATUS_CANCELLED: u8 = 2;

    // 订阅对象
    struct Subscription has key, store {
        id: UID,
        owner: address,
        start_time: u64,
        end_time: u64,
        amount_paid: u64,
        auto_renew: bool,
        status: u8
    }

    // 事件
    struct SubscriptionCreatedEvent has copy, drop {
        subscription_id: ID,
        owner: address,
        duration: u64,
        amount: u64,
        auto_renew: bool
    }

    struct SubscriptionRenewedEvent has copy, drop {
        subscription_id: ID,
        new_end_time: u64,
        amount: u64
    }

    struct SubscriptionCancelledEvent has copy, drop {
        subscription_id: ID,
        owner: address
    }

    struct SubscriptionExpiredEvent has copy, drop {
        subscription_id: ID,
        owner: address
    }

    // 创建订阅
    public entry fun create_subscription(
        payment: Coin<TEST_USDT>,
        duration: u64,
        auto_renew: bool,
        clock: &Clock,
        auth: &AuthRegistry,
        fund: &mut Fund,
        ctx: &mut TxContext
    ) {
        // 验证 zkLogin 授权
        check_authorization(auth, ctx);
        
        let amount = coin::value(&payment);
        
        // 处理支付，将资金转入订阅资金池
        let sender = tx_context::sender(ctx);
        fund::add_to_fund(fund, payment, sender);
        
        // 计算时间
        let current_time = clock::timestamp_ms(clock);
        let end_time = current_time + duration;
        
        // 创建订阅对象
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
        
        // 发出事件
        emit(SubscriptionCreatedEvent {
            subscription_id,
            owner: tx_context::sender(ctx),
            duration,
            amount,
            auto_renew
        });
        
        // 转移订阅对象给用户
        transfer::transfer(subscription, tx_context::sender(ctx));
    }

    // 续订会员
    public entry fun renew_subscription(
        subscription: &mut Subscription,
        payment: Coin<TEST_USDT>,
        clock: &Clock,
        auth: &AuthRegistry,
        fund: &mut Fund,
        ctx: &mut TxContext
    ) {
        // 验证 zkLogin 授权
        check_authorization(auth, ctx);
        
        // 确认所有权
        assert!(subscription.owner == tx_context::sender(ctx), ENotOwner);
        
        let amount = coin::value(&payment);
        
        // 处理支付，将资金转入订阅资金池
        let sender = tx_context::sender(ctx);
        fund::add_to_fund(fund, payment, sender);
        
        // 计算新的结束时间
        let current_time = clock::timestamp_ms(clock);
        let new_end_time = if (subscription.end_time > current_time) {
            // 如果订阅还未过期，在原有基础上延长
            subscription.end_time + (amount * 365 * 24 * 60 * 60 * 1000) / 365 // 根据支付金额计算延长时间
        } else {
            // 如果订阅已过期，从当前时间开始计算
            current_time + (amount * 365 * 24 * 60 * 60 * 1000) / 365
        };
        
        // 更新订阅
        subscription.end_time = new_end_time;
        subscription.amount_paid = subscription.amount_paid + amount;
        subscription.status = STATUS_ACTIVE;
        
        // 发出事件
        emit(SubscriptionRenewedEvent {
            subscription_id: object::id(subscription),
            new_end_time,
            amount
        });
    }

    // 取消订阅
    public entry fun cancel_subscription(
        subscription: &mut Subscription,
        auth: &AuthRegistry,
        ctx: &mut TxContext
    ) {
        // 验证 zkLogin 授权
        check_authorization(auth, ctx);
        
        // 确认所有权
        assert!(subscription.owner == tx_context::sender(ctx), ENotOwner);
        
        // 设置状态为已取消
        subscription.status = STATUS_CANCELLED;
        subscription.auto_renew = false;
        
        // 发出事件
        emit(SubscriptionCancelledEvent {
            subscription_id: object::id(subscription),
            owner: subscription.owner
        });
    }
    
    // 查询会员状态
    public fun get_subscription_status(
        subscription: &Subscription,
        clock: &Clock
    ): u8 {
        // 如果已取消，直接返回取消状态
        if (subscription.status == STATUS_CANCELLED) {
            return STATUS_CANCELLED
        };
        
        // 检查是否过期
        let current_time = clock::timestamp_ms(clock);
        if (current_time > subscription.end_time) {
            return STATUS_EXPIRED
        };
        
        // 否则返回激活状态
        STATUS_ACTIVE
    }
}


