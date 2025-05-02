module lottery::lottery {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::transfer;
    use sui::sui::SUI;
    use sui::coin::{Self, Coin};
    use sui::event;
    use authentication::authentication::{Self, AuthRegistry, check_authorization};
    use sui::random::{Self, Random};

    /// 奖池结构
    struct InstantPool has key {
        id: UID,
        prize: Balance<SUI>,
        creator: address
    }

    /// 抽奖事件
    struct InstantWin has copy, drop {
        player: address,
        amount: u64
    }

    /// 创建奖池，接收 SUI coin 作为奖品
    public entry fun create_pool(
        prize_coin: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let prize = coin::into_balance(prize_coin);
        let pool = InstantPool {
            id: object::new(ctx),
            prize,
            creator: tx_context::sender(ctx)
        };
        transfer::share_object(pool);
    }

    /// 即时抽奖（集成zkLogin认证 + 链上随机数）
    public entry fun instant_draw(
        pool: &mut InstantPool,
        r: &Random,                // 使用 Random 对象
        auth: &AuthRegistry,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);

        // 验证 zkLogin
        check_authorization(auth, ctx);

        // 使用 random 模块生成随机数（范围 0-99）
        let generator = random::new_generator(r, ctx);
        let rand_val = random::generate_u64(&mut generator) % 100;

        if (rand_val < 50) {
            let prize_amount = balance::value(&pool.prize);
            let reward = coin::from_balance(balance::split(&mut pool.prize, prize_amount), ctx);
            transfer::public_transfer(reward, sender);
            event::emit(InstantWin {
                player: sender,
                amount: prize_amount
            });
        }
    }
}