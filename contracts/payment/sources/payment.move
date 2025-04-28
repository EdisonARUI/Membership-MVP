
module payment::payment {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::event::emit;
    use sui::table::{Self, Table};
    use std::option::{Self, Option};

    // 错误码
    const EInsufficientAmount: u64 = 0;
    const EInvalidPaymentType: u64 = 1;
    const EInvalidTransaction: u64 = 2;
    const EPaymentNotFound: u64 = 3;

    // 支付类型
    const PAYMENT_TYPE_SUBSCRIPTION: u8 = 0;
    const PAYMENT_TYPE_UPGRADE: u8 = 1;
    const PAYMENT_TYPE_OTHER: u8 = 2;

    // 交易状态
    const TX_STATUS_PENDING: u8 = 0;
    const TX_STATUS_COMPLETED: u8 = 1;
    const TX_STATUS_FAILED: u8 = 2;
    const TX_STATUS_REFUNDED: u8 = 3;

    // 支付记录对象
    struct Payment has key, store {
        id: UID,
        payment_type: u8,
        amount: u64,
        sender: address,
        recipient: address,
        status: u8,
        timestamp: u64,
        related_object_id: Option<ID>
    }

    // 支付状态记录器
    struct PaymentRegistry has key {
        id: UID,
        payments: Table<ID, u8> // 支付ID -> 状态
    }

    // 事件
    struct PaymentProcessedEvent has copy, drop {
        payment_id: ID,
        payment_type: u8,
        amount: u64,
        sender: address,
        recipient: address,
        status: u8
    }

    struct PaymentFailedEvent has copy, drop {
        payment_id: ID,
        reason: u8
    }

    struct PaymentRollbackEvent has copy, drop {
        payment_id: ID,
        amount: u64,
        recipient: address
    }

    // 单例模式创建全局支付记录器
    fun init(ctx: &mut TxContext) {
        transfer::share_object(PaymentRegistry {
            id: object::new(ctx),
            payments: table::new(ctx)
        });
    }

    // 处理支付
    public entry fun process_payment(
        payment: Coin<SUI>,
        payment_type: u8,
        recipient: address,
        registry: &mut PaymentRegistry,
        ctx: &mut TxContext
    ) {
        // 检查支付类型
        assert!(
            payment_type == PAYMENT_TYPE_SUBSCRIPTION || 
            payment_type == PAYMENT_TYPE_UPGRADE || 
            payment_type == PAYMENT_TYPE_OTHER,
            EInvalidPaymentType
        );
        
        let amount = coin::value(&payment);
        let sender = tx_context::sender(ctx);
        
        // 创建支付记录
        let payment_record = Payment {
            id: object::new(ctx),
            payment_type,
            amount,
            sender,
            recipient,
            status: TX_STATUS_PENDING,
            timestamp: tx_context::epoch(ctx),
            related_object_id: option::none()
        };
        
        let payment_id = object::id(&payment_record);
        
        // 记录到注册表
        table::add(&mut registry.payments, payment_id, TX_STATUS_PENDING);
        
        // 转账给接收方
        transfer::public_transfer(payment, recipient);
        
        // 更新状态为已完成
        table::remove(&mut registry.payments, payment_id);
        table::add(&mut registry.payments, payment_id, TX_STATUS_COMPLETED);
        
        // 创建新的支付记录（已完成状态）
        let completed_payment = Payment {
            id: object::new(ctx),
            payment_type,
            amount,
            sender,
            recipient,
            status: TX_STATUS_COMPLETED,
            timestamp: tx_context::epoch(ctx),
            related_object_id: option::none()
        };
        
        // 发出事件
        emit(PaymentProcessedEvent {
            payment_id,
            payment_type,
            amount,
            sender,
            recipient,
            status: TX_STATUS_COMPLETED
        });
        
        // 将支付记录转移给发送者保存
        transfer::transfer(completed_payment, sender);
        
        // 销毁原始支付记录
        let Payment {
            id,
            payment_type: _,
            amount: _,
            sender: _,
            recipient: _,
            status: _,
            timestamp: _,
            related_object_id: _
        } = payment_record;
        object::delete(id);
    }

    // 验证交易状态
    public fun verify_transaction(
        registry: &PaymentRegistry,
        tx_id: ID
    ): u8 {
        // 检查交易是否存在
        if (table::contains(&registry.payments, tx_id)) {
            // 返回状态
            *table::borrow(&registry.payments, tx_id)
        } else {
            // 如果不存在，返回失败状态
            TX_STATUS_FAILED
        }
    }

    // 支付失败回滚
    public entry fun rollback_payment(
        payment_id: ID,
        registry: &mut PaymentRegistry,
        refund: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // 检查交易是否存在
        assert!(table::contains(&registry.payments, payment_id), EPaymentNotFound);
        
        // 获取当前状态
        let status = *table::borrow(&registry.payments, payment_id);
        
        // 只有失败的交易才能回滚
        assert!(status == TX_STATUS_FAILED, EInvalidTransaction);
        
        // 更新状态为已退款
        table::remove(&mut registry.payments, payment_id);
        table::add(&mut registry.payments, payment_id, TX_STATUS_REFUNDED);
        
        // 退款给发送者
        let amount = coin::value(&refund);
        let recipient = tx_context::sender(ctx);
        
        transfer::public_transfer(refund, recipient);
        
        // 发出事件
        emit(PaymentRollbackEvent {
            payment_id,
            amount,
            recipient
        });
    }
}


