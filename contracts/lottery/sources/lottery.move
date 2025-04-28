module lottery::lottery {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event::emit;
    use sui::table::{Self, Table};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use std::string::{Self, String};
    use std::vector;
    use std::hash;
    use std::option::{Self, Option};
    use sui::bcs;

    // 错误码
    const EInvalidInvitation: u64 = 0;
    const EInvitationAlreadyUsed: u64 = 1;
    const ELotteryNotActive: u64 = 2;
    const EInvalidRandomness: u64 = 3;
    const EAlreadyClaimed: u64 = 4;
    const ENotWinner: u64 = 5;

    // 奖励状态
    const REWARD_UNCLAIMED: u8 = 0;
    const REWARD_CLAIMED: u8 = 1;

    // 抽奖状态
    const LOTTERY_PENDING: u8 = 0;
    const LOTTERY_ACTIVE: u8 = 1;
    const LOTTERY_EXECUTED: u8 = 2;
    const LOTTERY_ENDED: u8 = 3;

    struct Invitation has key, store {
        id: UID,
        creator: address,
        code: vector<u8>,
        used: bool,
        created_at: u64
    }

    struct LotteryPool has key {
        id: UID,
        total_participants: u64,
        prize_pool: Balance<SUI>,
        status: u8,
        winners: Table<address, bool>,
        participants: vector<address>,
        random_seed: Option<vector<u8>>,
        start_time: u64,
        end_time: u64
    }

    struct InvitationRegistry has key {
        id: UID,
        invitations: Table<vector<u8>, ID>, // 邀请码 -> 邀请对象ID
        user_invitations: Table<address, vector<vector<u8>>> // 用户 -> 邀请码列表
    }

    struct InvitationCreatedEvent has copy, drop {
        invitation_id: ID,
        creator: address,
        code: vector<u8>
    }

    struct InvitationUsedEvent has copy, drop {
        invitation_code: vector<u8>,
        user_id: ID,
        referrer: address
    }

    struct LotteryExecutedEvent has copy, drop {
        lottery_id: ID,
        winners_count: u64,
        total_prize: u64
    }

    struct RewardClaimedEvent has copy, drop {
        user_id: ID,
        lottery_id: ID,
        amount: u64
    }

    // 初始化函数
    fun init(ctx: &mut TxContext) {
        // 创建邀请注册表
        let registry = InvitationRegistry {
            id: object::new(ctx),
            invitations: table::new(ctx),
            user_invitations: table::new(ctx)
        };
        
        // 创建初始抽奖池
        let lottery = LotteryPool {
            id: object::new(ctx),
            total_participants: 0,
            prize_pool: balance::zero<SUI>(),
            status: LOTTERY_PENDING,
            winners: table::new(ctx),
            participants: vector::empty(),
            random_seed: option::none(),
            start_time: tx_context::epoch(ctx),
            end_time: tx_context::epoch(ctx) + 7 * 24 * 60 * 60 // 一周后结束
        };
        
        // 共享对象
        transfer::share_object(registry);
        transfer::share_object(lottery);
    }

    // 创建邀请码
    public entry fun create_invitation(
        registry: &mut InvitationRegistry,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // 基于发送者地址和时间戳生成唯一邀请码
        let seed = vector::empty<u8>();
        vector::append(&mut seed, bcs::to_bytes(&sender));
        vector::append(&mut seed, bcs::to_bytes(&tx_context::epoch(ctx)));
        
        let code = hash::sha3_256(seed);
        
        // 创建邀请对象
        let invitation = Invitation {
            id: object::new(ctx),
            creator: sender,
            code: code,
            used: false,
            created_at: tx_context::epoch(ctx)
        };
        
        let invitation_id = object::id(&invitation);
        
        // 添加到注册表
        table::add(&mut registry.invitations, code, invitation_id);
        
        // 添加到用户的邀请列表
        if (!table::contains(&registry.user_invitations, sender)) {
            table::add(&mut registry.user_invitations, sender, vector::empty<vector<u8>>());
        };
        
        let user_codes = table::borrow_mut(&mut registry.user_invitations, sender);
        vector::push_back(user_codes, code);
        
        // 发出事件
        emit(InvitationCreatedEvent {
            invitation_id,
            creator: sender,
            code
        });
        
        // 将邀请对象转移给创建者
        transfer::transfer(invitation, sender);
    }

    // 使用邀请码
    public entry fun use_invitation(
        registry: &mut InvitationRegistry,
        invitation_code: vector<u8>,
        lottery: &mut LotteryPool,
        ctx: &mut TxContext
    ) {
        // 检查邀请码是否存在
        assert!(table::contains(&registry.invitations, invitation_code), EInvalidInvitation);
        
        let invitation_id = *table::borrow(&registry.invitations, invitation_code);
        
        // 获取邀请对象 (简化实现，实际应通过ID获取并验证)
        // 检查邀请码是否已使用
        // assert!(!invitation.used, EInvitationAlreadyUsed);
        
        // 记录使用者
        let user_id = object::id_from_address(tx_context::sender(ctx));
        
        // 添加到抽奖池参与者
        if (lottery.status == LOTTERY_ACTIVE) {
            vector::push_back(&mut lottery.participants, tx_context::sender(ctx));
            lottery.total_participants = lottery.total_participants + 1;
        };
        
        // 发出事件 (这里简化了邀请人的获取)
        let referrer = tx_context::sender(ctx); // 实际应从invitation对象获取
        
        emit(InvitationUsedEvent {
            invitation_code,
            user_id,
            referrer
        });
    }

    // 执行抽奖
    public entry fun execute_lottery(
        lottery: &mut LotteryPool,
        verified_random: vector<u8>,
        ctx: &mut TxContext
    ) {
        // 检查抽奖池状态
        assert!(lottery.status == LOTTERY_ACTIVE, ELotteryNotActive);
        
        // 检查随机性
        assert!(!vector::is_empty(&verified_random), EInvalidRandomness);
        
        // 设置随机种子
        lottery.random_seed = option::some(verified_random);
        
        // 确定获奖者数量 (简化实现，实际应根据规则确定)
        let winners_count = lottery.total_participants / 10; // 10%的参与者获奖
        if (winners_count == 0 && lottery.total_participants > 0) {
            winners_count = 1; // 至少有一个获奖者
        };
        
        // 随机选择获奖者
        let i = 0;
        while (i < winners_count && i < vector::length(&lottery.participants)) {
            let random_idx = derive_random_number(verified_random, i) % vector::length(&lottery.participants);
            let winner = *vector::borrow(&lottery.participants, random_idx);
            
            // 添加到获奖者列表
            if (!table::contains(&lottery.winners, winner)) {
                table::add(&mut lottery.winners, winner, true);
            };
            
            i = i + 1;
        };
        
        // 更新状态
        lottery.status = LOTTERY_EXECUTED;
        
        // 发出事件
        emit(LotteryExecutedEvent {
            lottery_id: object::id(lottery),
            winners_count,
            total_prize: balance::value(&lottery.prize_pool)
        });
    }
    
    // 领取奖励
    public entry fun claim_reward(
        lottery: &mut LotteryPool,
        ctx: &mut TxContext
    ) {
        // 检查抽奖池状态
        assert!(lottery.status == LOTTERY_EXECUTED, ELotteryNotActive);
        
        let sender = tx_context::sender(ctx);
        
        // 检查是否是获奖者
        assert!(table::contains(&lottery.winners, sender), ENotWinner);
        
        // 检查是否已领取
        assert!(*table::borrow(&lottery.winners, sender), EAlreadyClaimed);
        
        // 标记为已领取
        table::remove(&mut lottery.winners, sender);
        table::add(&mut lottery.winners, sender, false);
        
        // 计算奖励金额（平分奖池）
        let winner_count = table::length(&lottery.winners);
        let prize_per_winner = balance::value(&lottery.prize_pool) / winner_count;
        
        // 从奖池中提取奖励
        let reward = coin::from_balance(balance::split(&mut lottery.prize_pool, prize_per_winner), ctx);
        
        // 转移给获奖者
        transfer::public_transfer(reward, sender);
        
        // 发出事件
        emit(RewardClaimedEvent {
            user_id: object::id_from_address(sender),
            lottery_id: object::id(lottery),
            amount: prize_per_winner
        });
    }
    
    // 从随机种子生成随机数
    fun derive_random_number(seed: vector<u8>, nonce: u64): u64 {
        let input = vector::empty<u8>();
        vector::append(&mut input, seed);
        vector::append(&mut input, bcs::to_bytes(&nonce));
        
        let hash_bytes = hash::sha3_256(input);
        
        // 将前8个字节解释为u64 (简化实现)
        let value: u64 = 0;
        let i = 0;
        while (i < 8) {
            value = (value << 8) + (*vector::borrow(&hash_bytes, i) as u64);
            i = i + 1;
        };
        
        value
    }
}


