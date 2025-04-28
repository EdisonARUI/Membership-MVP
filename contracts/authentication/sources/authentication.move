module authentication::authentication {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::event::emit;
    use sui::transfer;
    use std::vector;
    use sui::table::{Self, Table};
    use sui::bcs;

    // 用户认证对象
    struct UserAuth has key, store {
        id: UID,
        user_id: vector<u8>,
        wallet_address: address,
        is_kyc_verified: bool,
        zk_verified: bool
    }

    // 认证注册表，用于存储所有已认证地址
    struct AuthRegistry has key {
        id: UID,
        // 地址 -> 是否认证
        verified_addresses: Table<address, bool>
    }

    // 事件
    struct ZkProofVerifiedEvent has copy, drop {
        user_id: vector<u8>,
        verified: bool
    }

    struct WalletBindedEvent has copy, drop {
        user_id: vector<u8>,
        wallet_address: address
    }

    struct KycVerifiedEvent has copy, drop {
        user_id: vector<u8>,
        verified: bool
    }

    // 错误码
    const EInvalidProof: u64 = 0;
    const EInvalidWallet: u64 = 1;
    const EInvalidKYC: u64 = 2;
    const ENotAuthorized: u64 = 3;

    // 初始化函数，创建认证注册表
    fun init(ctx: &mut TxContext) {
        transfer::share_object(AuthRegistry {
            id: object::new(ctx),
            verified_addresses: table::new(ctx)
        });
    }

    // zkLogin验证 - 简化版本，只验证地址
    // 在实际zkLogin流程中，前端会处理大部分逻辑
    // 这个函数只负责记录已验证的地址
    public entry fun register_zk_address(
        registry: &mut AuthRegistry,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // 如果地址已存在，删除旧记录
        if (table::contains(&registry.verified_addresses, sender)) {
            table::remove(&mut registry.verified_addresses, sender);
        };
        
        // 添加新记录
        table::add(&mut registry.verified_addresses, sender, true);
        
        // 发出事件
        emit(ZkProofVerifiedEvent {
            user_id: bcs::to_bytes(&sender), // 使用地址作为用户ID
            verified: true
        });
    }

    // 验证地址是否已认证
    public fun is_address_verified(
        registry: &AuthRegistry,
        addr: address
    ): bool {
        table::contains(&registry.verified_addresses, addr) && 
        *table::borrow(&registry.verified_addresses, addr)
    }

    // 授权检查函数 - 用于其他合约调用
    public fun check_authorization(
        registry: &AuthRegistry,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(is_address_verified(registry, sender), ENotAuthorized);
    }

    // 用户钱包地址绑定 - 简化版本
    public entry fun bind_wallet_address(
        registry: &mut AuthRegistry,
        user_id: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // 添加到验证表
        if (!table::contains(&registry.verified_addresses, sender)) {
            table::add(&mut registry.verified_addresses, sender, true);
        } else {
            let verified = table::borrow_mut(&mut registry.verified_addresses, sender);
            *verified = true;
        };
        
        // 发出事件
        emit(WalletBindedEvent {
            user_id,
            wallet_address: sender
        });
    }


    // 受保护的操作示例 - 只有经过验证的地址才能调用
    public entry fun protected_action(
        registry: &AuthRegistry,
        ctx: &TxContext
    ) {
        // 验证调用者身份
        check_authorization(registry, ctx);
        
        // 执行受保护的操作...
        // ...
    }
}


