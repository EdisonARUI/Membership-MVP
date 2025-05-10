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

    // 添加事件定义
    struct PrizeAdded has copy, drop {
        amount: u64,
        new_balance: u64
    }
    
    // 提款事件
    struct PrizeWithdrawn has copy, drop {
        amount: u64,
        to: address
    }

    /// 奖池结构
    struct InstantPool has key, store {
        id: UID,
        prize: Balance<SUI>,
        creator: address,
        min_prize_amount: u64,    // 最小中奖金额
        max_prize_amount: u64,    // 最大中奖金额
        min_pool_balance: u64     // 奖池保底金额(低于此额不允许抽奖)
    }

    /// 创建奖池
    public entry fun create_pool(
        prize_coin: Coin<SUI>,
        min_prize_amount: u64,
        max_prize_amount: u64,
        min_pool_balance: u64,
        ctx: &mut TxContext
    ) {
        // 验证参数合理性
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

    /// 添加奖品到奖池
    public entry fun add_prize(
        pool: &mut InstantPool,
        prize_coin: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // 只允许创建者添加奖品
        assert!(tx_context::sender(ctx) == pool.creator, 0);
        
        // 将硬币添加到奖池余额
        let prize_amount = coin::value(&prize_coin);
        coin::put(&mut pool.prize, prize_coin);
        
        // 添加事件记录
        event::emit(PrizeAdded {
            amount: prize_amount,
            new_balance: balance::value(&pool.prize)
        });
    }

    /// 更新奖池参数
    public entry fun update_pool_params(
        pool: &mut InstantPool,
        min_prize_amount: u64,
        max_prize_amount: u64,
        min_pool_balance: u64,
        ctx: &mut TxContext
    ) {
        // 只允许创建者修改参数
        assert!(tx_context::sender(ctx) == pool.creator, 0);
        
        // 验证参数合理性
        assert!(min_prize_amount <= max_prize_amount, 0);
        assert!(balance::value(&pool.prize) >= min_pool_balance + max_prize_amount, 0);
        
        // 更新参数
        pool.min_prize_amount = min_prize_amount;
        pool.max_prize_amount = max_prize_amount;
        pool.min_pool_balance = min_pool_balance;
    }
    
    /// 从奖池提取奖金 - 供抽奖模块调用
    public fun withdraw_prize(
        pool: &mut InstantPool, 
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        // 验证奖池余额是否足够
        let pool_balance = balance::value(&pool.prize);
        assert!(pool_balance > pool.min_pool_balance + amount, 0);
        
        // 从奖池分离金额
        let prize_coin = coin::from_balance(balance::split(&mut pool.prize, amount), ctx);
        
        // 记录提款事件
        event::emit(PrizeWithdrawn {
            amount,
            to: recipient
        });
        
        // 转移到接收者
        transfer::public_transfer(prize_coin, recipient);
    }

    // 提供访问器函数，供其他模块使用
    public fun get_prize_balance(pool: &InstantPool): u64 {
        balance::value(&pool.prize)
    }

    public fun get_min_prize_amount(pool: &InstantPool): u64 {
        pool.min_prize_amount
    }

    public fun get_max_prize_amount(pool: &InstantPool): u64 {
        pool.max_prize_amount
    }

    public fun get_min_pool_balance(pool: &InstantPool): u64 {
        pool.min_pool_balance
    }
    
    // 计算可用于抽奖的金额
    public fun get_available_prize(pool: &InstantPool): u64 {
        let balance = balance::value(&pool.prize);
        if (balance <= pool.min_pool_balance) {
            0
        } else {
            balance - pool.min_pool_balance
        }
    }
}

   