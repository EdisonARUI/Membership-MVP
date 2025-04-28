module membership::membership {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event::emit;
    use sui::table::{Self, Table};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::package::{Self, Publisher};
    use std::string::{Self, String};
    use std::vector;
    use std::type_name::{Self, TypeName};

    // 错误码
    const EInvalidTier: u64 = 0;
    const EInsufficientPrivilege: u64 = 1;
    const EInvalidBenefit: u64 = 2;
    const EAlreadyUpgraded: u64 = 3;

    // 会员等级
    const TIER_BASIC: u8 = 0;
    const TIER_SILVER: u8 = 1;
    const TIER_GOLD: u8 = 2;
    const TIER_PLATINUM: u8 = 3;

    // 会员对象
    struct Membership has key, store {
        id: UID,
        user_id: ID,
        tier: u8,
        join_time: u64,
        benefits: vector<ID>,
        last_airdrop_claim: u64
    }

    // 会员等级配置
    struct MembershipTier has key, store {
        id: UID,
        tier_level: u8,
        tier_name: String,
        benefits: vector<String>,
        upgrade_conditions: String,
        created_at: u64
    }

    // 会员权益
    struct Benefit has key, store {
        id: UID,
        benefit_name: String,
        description: String,
        eligible_tiers: vector<u8>,
        is_active: bool
    }

    // 管理者容器
    struct MembershipAdmin has key {
        id: UID,
        tiers: Table<u8, ID>, // 等级 -> MembershipTier ID
        benefits: Table<ID, ID>, // Benefit ID -> Benefit
        publisher: Publisher
    }

    // 事件
    struct MembershipCreatedEvent has copy, drop {
        membership_id: ID,
        user_id: ID,
        tier: u8
    }

    struct TierUpgradedEvent has copy, drop {
        membership_id: ID,
        old_tier: u8,
        new_tier: u8
    }

    struct BenefitTriggeredEvent has copy, drop {
        membership_id: ID,
        benefit_id: ID,
        user_id: ID
    }

    struct AirdropDistributedEvent has copy, drop {
        tier: u8,
        token_type: TypeName,
        amount_per_user: u64,
        total_users: u64
    }

    // 初始化函数
    fun init(ctx: &mut TxContext) {
        let admin = MembershipAdmin {
            id: object::new(ctx),
            tiers: table::new(ctx),
            benefits: table::new(ctx),
            publisher: package::claim(ctx)
        };
        
        transfer::share_object(admin);
    }

    // 创建会员等级
    public entry fun create_membership_tier(
        admin: &mut MembershipAdmin,
        tier_level: u8,
        tier_name: vector<u8>,
        benefits: vector<vector<u8>>,
        upgrade_conditions: vector<u8>,
        ctx: &mut TxContext
    ) {
        // 创建会员等级对象
        let tier = MembershipTier {
            id: object::new(ctx),
            tier_level,
            tier_name: string::utf8(tier_name),
            benefits: parse_benefits(benefits),
            upgrade_conditions: string::utf8(upgrade_conditions),
            created_at: tx_context::epoch(ctx)
        };
        
        let tier_id = object::id(&tier);
        
        // 添加到管理者表中
        if (table::contains(&admin.tiers, tier_level)) {
            let old_tier_id = *table::borrow(&admin.tiers, tier_level);
            table::remove(&mut admin.tiers, tier_level);
        };
        
        table::add(&mut admin.tiers, tier_level, tier_id);
        
        // 共享对象，使其可被所有人访问
        transfer::share_object(tier);
    }

    // 将benefits从vector<vector<u8>>转为vector<String>
    fun parse_benefits(benefits: vector<vector<u8>>): vector<String> {
        let i = 0;
        let len = vector::length(&benefits);
        let result = vector::empty<String>();
        
        while (i < len) {
            let benefit = vector::borrow(&benefits, i);
            vector::push_back(&mut result, string::utf8(*benefit));
            i = i + 1;
        };
        
        result
    }

    // 会员等级升级
    public entry fun upgrade_tier(
        membership: &mut Membership,
        target_tier: u8,
        admin: &MembershipAdmin,
        ctx: &mut TxContext
    ) {
        // 确保目标等级有效
        assert!(table::contains(&admin.tiers, target_tier), EInvalidTier);
        
        // 确保新等级高于当前等级
        assert!(target_tier > membership.tier, EAlreadyUpgraded);
        
        // 记录旧等级
        let old_tier = membership.tier;
        
        // 更新等级
        membership.tier = target_tier;
        
        // 发出事件
        emit(TierUpgradedEvent {
            membership_id: object::id(membership),
            old_tier,
            new_tier: target_tier
        });
    }

    // 触发会员权益
    public entry fun trigger_benefit(
        membership: &Membership,
        benefit_id: ID,
        admin: &MembershipAdmin,
        ctx: &mut TxContext
    ) {
        // 确保权益存在
        assert!(table::contains(&admin.benefits, benefit_id), EInvalidBenefit);
        
        // 获取权益对象
        let benefit = table::borrow(&admin.benefits, benefit_id);
        
        // 检查会员等级是否符合要求（简化实现）
        // 在实际实现中，应检查membership.tier是否在benefit.eligible_tiers中
        
        // 发出事件
        emit(BenefitTriggeredEvent {
            membership_id: object::id(membership),
            benefit_id,
            user_id: membership.user_id
        });
    }
    
    // 分发空投奖励
    public entry fun distribute_airdrop<T>(
        admin: &MembershipAdmin,
        tier: u8,
        amount_per_user: u64,
        recipients: vector<address>,
        ctx: &mut TxContext
    ) {
        // 确保等级有效
        assert!(table::contains(&admin.tiers, tier), EInvalidTier);
        
        // 获取所有符合条件的会员数量
        let user_count = vector::length(&recipients);
        
        // 为每个用户铸造并发送代币
        let i = 0;
        while (i < user_count) {
            let recipient = *vector::borrow(&recipients, i);
            
            // 铸造代币（这里假设已有铸造权限）
            // 在实际实现中，应使用publisher执行铸造
            // let coins = coin::mint<T>(amount_per_user, publisher, ctx);
            
            // 模拟发送代币
            // transfer::transfer(coins, recipient);
            
            i = i + 1;
        };
        
        // 发出事件
        emit(AirdropDistributedEvent {
            tier,
            token_type: type_name::get<T>(),
            amount_per_user,
            total_users: user_count
        });
    }
    
    // 创建会员
    public entry fun create_membership(
        user_id: ID,
        ctx: &mut TxContext
    ) {
        // 创建基础会员
        let membership = Membership {
            id: object::new(ctx),
            user_id,
            tier: TIER_BASIC,
            join_time: tx_context::epoch(ctx),
            benefits: vector::empty(),
            last_airdrop_claim: 0
        };
        
        // 发出事件
        emit(MembershipCreatedEvent {
            membership_id: object::id(&membership),
            user_id,
            tier: TIER_BASIC
        });
        
        // 转移会员对象给用户
        transfer::transfer(membership, tx_context::sender(ctx));
    }
}


