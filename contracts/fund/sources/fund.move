module fund::fund {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::transfer;
    use sui::event;
    use coin::test_usdt::{Self, TEST_USDT};
    use sui::coin::{Self, Coin};

    // 错误码
    const ENotAuthorized: u64 = 0;
    const EInsufficientBalance: u64 = 1;

    // 事件
    struct FundReceived has copy, drop {
        amount: u64,
        from: address
    }

    struct FundWithdrawn has copy, drop {
        amount: u64,
        to: address
    }

    // 资金池对象
    struct Fund has key {
        id: UID,
        // 资金池余额
        balance: Balance<TEST_USDT>,
        // 资金池管理员
        admin: address,
        // 总收入
        total_received: u64,
        // 总支出
        total_withdrawn: u64
    }

    // 初始化资金池
    fun init(ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);
        
        let fund = Fund {
            id: object::new(ctx),
            balance: balance::zero<TEST_USDT>(),
            admin,
            total_received: 0,
            total_withdrawn: 0
        };

        // 共享资金池对象，使其可以被任何人访问
        transfer::share_object(fund);
    }

    // 将TEST_USDT添加到资金池中
    public fun add_to_fund(
        fund: &mut Fund, 
        payment: Coin<TEST_USDT>,
        sender: address
    ) {
        let amount = coin::value(&payment);
        
        // 将代币添加到资金池余额
        balance::join(&mut fund.balance, coin::into_balance(payment));
        
        // 更新总收入
        fund.total_received = fund.total_received + amount;
        
        // 发出事件
        event::emit(FundReceived {
            amount,
            from: sender
        });
    }

    // 从资金池中提取TEST_USDT（仅管理员）
    public entry fun withdraw_from_fund(
        fund: &mut Fund,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        // 检查调用者是否为管理员
        assert!(tx_context::sender(ctx) == fund.admin, ENotAuthorized);
        
        // 检查余额是否充足
        assert!(balance::value(&fund.balance) >= amount, EInsufficientBalance);
        
        // 从资金池提取金额
        let payment = coin::from_balance(
            balance::split(&mut fund.balance, amount), 
            ctx
        );
        
        // 更新总支出
        fund.total_withdrawn = fund.total_withdrawn + amount;
        
        // 发出事件
        event::emit(FundWithdrawn {
            amount,
            to: recipient
        });
        
        // 转移给接收者
        transfer::public_transfer(payment, recipient);
    }

    // 更改管理员（仅当前管理员）
    public entry fun change_admin(
        fund: &mut Fund,
        new_admin: address,
        ctx: &mut TxContext
    ) {
        // 检查调用者是否为管理员
        assert!(tx_context::sender(ctx) == fund.admin, ENotAuthorized);
        
        // 更新管理员
        fund.admin = new_admin;
    }

    // 获取资金池余额
    public fun get_fund_balance(fund: &Fund): u64 {
        balance::value(&fund.balance)
    }

    // 获取资金池统计信息
    public fun get_fund_stats(fund: &Fund): (u64, u64, u64) {
        (
            balance::value(&fund.balance),
            fund.total_received,
            fund.total_withdrawn
        )
    }

    // 检查是否为管理员
    public fun is_admin(fund: &Fund, addr: address): bool {
        fund.admin == addr
    }
}
