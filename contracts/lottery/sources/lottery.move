module lottery::lottery {
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::random::{Self, Random};
    use sui::math;
    use pool::pool::{Self, InstantPool};
    use authentication::authentication::{Self, AuthRegistry, check_authorization};

    /// 抽奖事件
    struct InstantWin has copy, drop {
        player: address,
        amount: u64
    }

    /// 即时抽奖（集成zkLogin认证 + 链上随机数）
    public entry fun instant_draw(
        pool: &mut InstantPool,
        r: &Random,
        auth: &AuthRegistry,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // 验证 zkLogin
        check_authorization(auth, ctx);
        
        // 获取奖池信息
        let available_prize = pool::get_available_prize(pool);
        assert!(available_prize > 0, 1); // 确保奖池有足够可用余额
        
        // 获取奖池参数
        let min_prize = pool::get_min_prize_amount(pool);
        let max_prize = pool::get_max_prize_amount(pool);
        
        // 根据可用奖金调整实际最大抽奖额
        let actual_max = math::min(max_prize, available_prize);
        let actual_min = math::min(min_prize, available_prize);
        
        // 确保最小值不大于最大值
        assert!(actual_min <= actual_max, 2);
        
        // 生成随机中奖金额
        let generator = random::new_generator(r, ctx);
        let range = actual_max - actual_min + 1;
        let draw_amount = if (range > 0) {
            actual_min + (random::generate_u64(&mut generator) % range)
        } else {
            // 如果范围为0，直接使用最小值
            actual_min
        };
        
        // 提取奖金并发放给玩家
        pool::withdraw_prize(pool, draw_amount, sender, ctx);
        
        // 发送事件
        event::emit(InstantWin {
            player: sender,
            amount: draw_amount
        });
    }
}