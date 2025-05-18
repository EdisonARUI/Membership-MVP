
# Lottery System Logic Analysis

## 1. Lottery Process

### Involved Modules
- Frontend Components: `/components/lottery/`
- Global State: `LotteryContext.tsx`, `ZkLoginContext.tsx`, `SubscriptionContext.tsx`
- Business Logic: `useLottery.ts`
- Service Layer: `LotteryService.ts`, `ZkLoginService.ts`
- Blockchain Contracts: `/contracts/lottery/`, `/contracts/pool/`
- Data Models: `/interfaces/Lottery.ts`

### Call Chain Diagram

```mermaid
sequenceDiagram
    participant U as User Interface
    participant LC as Lottery Component
    participant LX as LotteryContext
    participant SX as SubscriptionContext
    participant UL as useLottery
    participant LS as LotteryService
    participant ZC as ZkLoginContext
    participant ZS as ZkLoginService
    participant ST as StorageService
    participant LT as Lottery Contract
    participant PL as Pool Contract
    
    U->>LC: Click lottery button
    LC->>LX: Call draw method
    LX->>UL: Execute lottery logic
    UL->>SX: Check membership benefits
    SX-->>UL: Return benefit status
    UL->>LS: Create lottery request
    LS->>ZC: Get user authentication status
    ZC-->>LS: Return user address
    LS->>LS: Prepare lottery transaction
    LS->>ZS: Request transaction signature
    ZS->>ZS: Create and sign transaction
    ZS-->>LS: Return signed transaction
    LS->>LT: Submit lottery transaction
    LT->>LT: Generate random result
    LT->>PL: Calculate reward amount
    PL->>PL: Check prize pool balance
    PL-->>LT: Confirm reward availability
    LT-->>LS: Return lottery result
    LS->>ST: Store lottery record
    LS-->>UL: Return lottery result
    UL-->>LX: Update lottery status
    LX-->>LC: Notify UI update
    LC-->>U: Display lottery result
```

### Data Flow Diagram

```mermaid
flowchart LR
    A[Lottery Request] --> B[Membership Benefit Data]
    B --> C[User Identity Data]
    C --> D[Lottery Transaction Data]
    D --> E[Signed Transaction]
    E --> F[Random Number Generation]
    F --> G[Reward Calculation]
    G --> H[Lottery Result]
    H --> I[Lottery Record]
    
    subgraph Storage Location
    J[LotteryContext] -.-> |Temporarily store lottery request| A
    K[SubscriptionContext] -.-> |Store membership benefits| B
    L[ZkLoginContext] -.-> |Store user identity| C
    M[Memory State] -.-> |Temporarily store transaction data| D
    N[Blockchain] -.-> |Generate random number| F
    O[Blockchain] -.-> |Calculate reward logic| G
    P[Blockchain] -.-> |Permanently store lottery result| H
    Q[Database/Cache] -.-> |Store lottery record| I
    end
```

### State Persistence
- Lottery request: Temporarily stored in `LotteryContext` memory
- Membership benefits: Stored in `SubscriptionContext` and on blockchain
- User identity: Stored in `ZkLoginContext` and `localStorage`
- Lottery transaction: Temporarily stored in memory, eventually stored on blockchain
- Lottery result: Permanently stored on blockchain
- Lottery record: Stored in database and possibly in local cache

## 2. Reward Distribution Process

### Involved Modules
- Global State: `LotteryContext.tsx`, `DepositContext.tsx`
- Business Logic: `useLottery.ts`
- Service Layer: `LotteryService.ts`, `DepositService.ts`
- Blockchain Contracts: `/contracts/pool/`, `/contracts/fund/`, `/contracts/coin/`

### Call Chain Diagram

```mermaid
sequenceDiagram
    participant LT as Lottery Contract
    participant PL as Pool Contract
    participant FD as Fund Contract
    participant CN as Coin Contract
    participant LS as LotteryService
    participant DS as DepositService
    participant UL as useLottery
    participant LX as LotteryContext
    participant DX as DepositContext
    participant UI as User Interface
    
    LT->>PL: Trigger reward distribution
    PL->>PL: Calculate reward amount
    PL->>FD: Request fund transfer
    FD->>CN: Execute token transfer
    CN-->>FD: Confirm transfer completion
    FD-->>PL: Return transfer result
    PL-->>LT: Confirm reward distribution
    LT-->>LS: Return complete result
    LS->>DS: Notify balance update
    LS->>UL: Return final result
    UL-->>LX: Update lottery data
    DS-->>DX: Update user balance
    LX-->>UI: Display winning information
    DX-->>UI: Update balance display
```

### Data Flow Diagram

```mermaid
flowchart LR
    A[Lottery Result] --> B[Reward Amount]
    B --> C[Fund Transfer Request]
    C --> D[Token Transfer Transaction]
    D --> E[Transfer Result]
    E --> F[Reward Distribution Confirmation]
    F --> G[Balance Update]
    G --> H[User Notification]
    
    subgraph Storage Location
    I[Blockchain] -.-> |Store lottery result| A
    J[Blockchain] -.-> |Calculate reward amount| B
    K[Memory State] -.-> |Temporarily store transfer request| C
    L[Blockchain] -.-> |Permanently store transfer record| D
    M[Pool Contract] -.-> |Update prize pool balance| E
    N[LotteryContext] -.-> |Store reward status| F
    O[DepositContext] -.-> |Update user balance| G
    P[Notification Service] -.-> |Send winning notification| H
    end
```

### State Persistence
- Lottery result: Permanently stored on blockchain
- Reward amount: Calculated and stored in transactions on blockchain
- Transfer record: Permanently stored on blockchain
- Prize pool balance: Stored in Pool contract on blockchain
- User balance: Stored on blockchain, cached in `DepositContext`
- Reward status: Stored in `LotteryContext`, possibly saved to local storage

## 3. History Query Process

### Involved Modules
- Frontend Components: `/components/lottery/`
- Global State: `LotteryContext.tsx`, `ZkLoginContext.tsx`
- Business Logic: `useLottery.ts`
- Service Layer: `LotteryService.ts`, `StorageService.ts`
- Data Models: `/interfaces/Lottery.ts`

### Call Chain Diagram

```mermaid
sequenceDiagram
    participant U as User Interface
    participant LC as Lottery Component
    participant LX as LotteryContext
    participant UL as useLottery
    participant LS as LotteryService
    participant ZC as ZkLoginContext
    participant ST as StorageService
    participant DB as Database/API
    participant BC as Blockchain
    
    U->>LC: Request lottery history
    LC->>LX: Call getLotteryHistory
    LX->>UL: Execute query logic
    UL->>LS: Request history records
    LS->>ZC: Get user address
    ZC-->>LS: Return user address
    LS->>ST: Query local cache
    ST-->>LS: Return cache results
    LS->>DB: Request complete history
    DB->>BC: Query on-chain records
    BC-->>DB: Return on-chain data
    DB-->>LS: Return history records
    LS->>LS: Calculate statistical data
    LS-->>UL: Return processed results
    UL-->>LX: Update history status
    LX-->>LC: Notify UI update
    LC-->>U: Display lottery history
```

### Data Flow Diagram

```mermaid
flowchart LR
    A[History Query Request] --> B[User Identity Data]
    B --> C[Query Parameters]
    C --> D[Local Cache Data]
    C --> E[Database Records]
    C --> F[On-chain Transaction Records]
    D --> G[Merged History Data]
    E --> G
    F --> G
    G --> H[Statistical Calculation]
    H --> I[Formatted History Records]
    I --> J[History Display Data]
    
    subgraph Storage Location
    K[LotteryContext] -.-> |Temporarily store query request| A
    L[ZkLoginContext] -.-> |Store user identity| B
    M[localStorage] -.-> |Cache query parameters| C
    N[localStorage] -.-> |Store history cache| D
    O[Database] -.-> |Store history records| E
    P[Blockchain] -.-> |Store transaction records| F
    Q[Memory State] -.-> |Temporarily merge data| G
    R[LotteryContext] -.-> |Cache statistical data| H
    S[LotteryContext] -.-> |Save history data| J
    end
```

### State Persistence
- Query parameters: Temporarily stored in `LotteryContext` memory
- User identity: Stored in `ZkLoginContext` and `localStorage`
- History cache: Possibly stored short-term in `localStorage`
- Complete history: Stored in database and on blockchain
- Statistical data: Temporarily calculated, possibly cached in `LotteryContext`
- Display data: Cached in `LotteryContext`, possibly stored short-term in `sessionStorage`

## 4. Prize Pool Management Process

### Involved Modules
- Global State: `LotteryContext.tsx`
- Business Logic: `useLottery.ts` (possible management function)
- Service Layer: `LotteryService.ts`
- Blockchain Contracts: `/contracts/pool/`, `/contracts/fund/`

### Call Chain Diagram

```mermaid
sequenceDiagram
    participant A as Admin Interface
    participant LX as LotteryContext
    participant UL as useLottery
    participant LS as LotteryService
    participant ZS as ZkLoginService
    participant PL as Pool Contract
    participant FD as Fund Contract
    
    A->>LX: Request prize pool status
    LX->>UL: Execute query logic
    UL->>LS: Request prize pool data
    LS->>PL: Query prize pool balance
    PL-->>LS: Return prize pool status
    LS-->>UL: Return formatted data
    UL-->>LX: Update prize pool status
    LX-->>A: Display prize pool information
    
    alt Adjust Prize Pool Configuration
        A->>LX: Submit adjustment request
        LX->>UL: Execute configuration update
        UL->>LS: Create update transaction
        LS->>ZS: Request admin signature
        ZS-->>LS: Return signed transaction
        LS->>PL: Submit configuration update
        PL->>PL: Update prize pool parameters
        PL-->>LS: Confirm update completion
        LS-->>UL: Return update result
        UL-->>LX: Update configuration status
        LX-->>A: Display update success
    end
    
    alt Prize Pool Deposit
        A->>LX: Submit deposit request
        LX->>UL: Execute deposit logic
        UL->>LS: Create deposit transaction
        LS->>ZS: Request admin signature
        ZS-->>LS: Return signed transaction
        LS->>FD: Submit fund transfer
        FD->>PL: Transfer funds to prize pool
        PL-->>FD: Confirm funds received
        FD-->>LS: Confirm deposit completion
        LS-->>UL: Return deposit result
        UL-->>LX: Update prize pool status
        LX-->>A: Display deposit success
    end
```

### Data Flow Diagram

```mermaid
flowchart LR
    A[Prize Pool Query Request] --> B[On-chain Prize Pool Data]
    B --> C[Formatted Prize Pool Information]
    
    D[Configuration Adjustment Request] --> E[Admin Identity Verification]
    E --> F[Update Parameter Transaction]
    F --> G[Configuration Update Result]
    
    H[Prize Pool Deposit Request] --> I[Admin Identity Verification]
    I --> J[Fund Transfer Transaction]
    J --> K[Deposit Result]
    K --> L[Updated Prize Pool Status]
    
    subgraph Storage Location
    M[Blockchain] -.-> |Store prize pool status| B
    N[LotteryContext] -.-> |Cache prize pool information| C
    O[ZkLoginContext] -.-> |Store admin identity| E
    P[Memory State] -.-> |Temporarily store transaction data| F
    Q[Blockchain] -.-> |Permanently store configuration update| G
    R[Memory State] -.-> |Temporarily store transaction data| J
    S[Blockchain] -.-> |Permanently store deposit record| K
    T[Pool Contract] -.-> |Update prize pool balance| L
    end
```

### State Persistence
- Prize pool status: Permanently stored in Pool contract on blockchain
- Prize pool information: Temporarily cached in `LotteryContext`
- Admin identity: Stored in `ZkLoginContext` and `localStorage`
- Configuration parameters: Permanently stored in Pool contract on blockchain
- Deposit record: Permanently stored on blockchain
- Management logs: Possibly saved in database or dedicated logging system
