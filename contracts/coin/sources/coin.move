module coin::test_usdt {
    // 导入必要的模块
    use sui::coin::{Self, TreasuryCap};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::option;
    use sui::object::{Self, UID};
    use sui::dynamic_field as df;

    // One-time witness type
    struct TEST_USDT has drop {}

    // 公共铸币管理对象，包含铸币能力
    struct MintAuthority has key {
        id: UID,
        // 每个地址单次铸币的最大金额
        max_mint_amount: u64
    }

    // 字段标识符，用于存储TreasuryCap
    struct TreasuryCapKey has copy, drop, store {}

    // 一次性初始化函数，符合Sui标准
    fun init(witness: TEST_USDT, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency<TEST_USDT>(
            witness, 
            8,  // 代币精度
            b"testUSDT",  // 代币名称
            b"testUSDT",  // 代币符号
            b"Public Mintable Test USDT",  // 代币描述
            option::none(),      // 代币图标（可选）
            ctx
        );
        
        // 创建公共铸币管理对象
        let mint_authority = MintAuthority {
            id: object::new(ctx),
            max_mint_amount: 1000_00000000 // 1000 USDT (考虑8位精度)
        };
        
        // 将TreasuryCap存储在MintAuthority的动态字段中
        df::add(&mut mint_authority.id, TreasuryCapKey {}, treasury_cap);
        
        // 冻结元数据，防止修改
        transfer::public_freeze_object(metadata);
        
        // 将MintAuthority设为共享对象，任何人都可以访问
        transfer::share_object(mint_authority);
    }

    // 公共铸造函数 - 任何人都可以调用
    public entry fun public_mint(
        mint_authority: &mut MintAuthority,    // 铸币管理对象
        amount: u64,                           // 铸造数量
        ctx: &mut TxContext                    // 交易上下文
    ) {
        // 检查铸币限额
        assert!(amount <= mint_authority.max_mint_amount, 1); // 确保不超过单次最大铸币金额
        
        // 获取TreasuryCap
        let treasury_cap = df::borrow_mut<TreasuryCapKey, TreasuryCap<TEST_USDT>>(
            &mut mint_authority.id, TreasuryCapKey {}
        );
        
        // 铸造代币并转移给调用者
        let recipient = tx_context::sender(ctx);
        let coin = coin::mint(treasury_cap, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    // 获取公共铸币限制信息
    public fun get_mint_limit(mint_authority: &MintAuthority): u64 {
        mint_authority.max_mint_amount
    }
}
