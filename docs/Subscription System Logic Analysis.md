
# Subscription System Core Business Logic Analysis

## 1. Subscription Creation Process

### Involved Modules
- Frontend Components: `/components/subscription/`
- Global State: `SubscriptionContext.tsx`, `ZkLoginContext.tsx`, `PaymentContext.tsx`
- Business Logic: `useSubscription.ts`
- Service Layer: `SubscriptionService.ts`, `ZkLoginService.ts`
- Blockchain Contracts: `/contracts/subscription/`, `/contracts/authentication/`
- Data Models: `/interfaces/Subscription.ts`

### Call Chain Diagram

```mermaid
sequenceDiagram
    participant U as User Interface
    participant SC as Subscription Component
    participant SX as SubscriptionContext
    participant PX as PaymentContext
    participant US as useSubscription
    participant SS as SubscriptionService
    participant ZC as ZkLoginContext
    participant ZS as ZkLoginService
    participant ST as StorageService
    participant BC as Blockchain Contract
    
    U->>SC: Select subscription plan
    SC->>SX: Call createSubscription
    SX->>US: Execute subscription creation logic
    US->>SS: Create subscription request
    SS->>ZC: Get user authentication status
    ZC-->>SS: Return user address
    SS->>PX: Initiate payment request
    PX->>PX: Process payment flow
    PX-->>SS: Payment confirmation
    SS->>SS: Prepare subscription transaction
    SS->>ZS: Request transaction signature
    ZS->>ZS: Create and sign transaction
    ZS-->>SS: Return signed transaction
    SS->>BC: Submit subscription creation transaction
    BC-->>SS: Return transaction result
    SS->>ST: Store subscription record
    SS-->>US: Return subscription result
    US-->>SX: Update subscription status
    SX-->>SC: Notify UI update
    SC-->>U: Display subscription success
```

### Data Flow Diagram

```mermaid
flowchart LR
    A[Subscription Plan Selection] --> B[User Identity Data]
    B --> C[Payment Data]
    C --> D[Subscription Transaction Data]
    D --> E[Signed Transaction]
    E --> F[Transaction Result]
    F --> G[Subscription Record]
    G --> H[Subscription Status]
    
    subgraph Storage Location
    I[SubscriptionContext] -.-> |Temporarily store selected plan| A
    J[ZkLoginContext] -.-> |Store user data| B
    K[PaymentContext] -.-> |Store payment information| C
    L[Memory State] -.-> |Temporarily store transaction data| D
    M[Blockchain] -.-> |Permanently store transaction and subscription| F
    N[Database/Cache] -.-> |Store subscription record| G
    O[SubscriptionContext] -.-> |Save subscription status| H
    end
```

### State Persistence
- Subscription plan data: Temporarily stored in `SubscriptionContext` memory
- User identity information: Stored in `ZkLoginContext` and `localStorage`
- Payment data: Temporarily stored in `PaymentContext` memory
- Transaction data: Permanently stored on blockchain
- Subscription records: Saved in database and on blockchain
- Subscription status: Persisted to `localStorage` through `SubscriptionContext`

## 2. Subscription Management Process

### Involved Modules
- Frontend Components: `/components/subscription/`
- Global State: `SubscriptionContext.tsx`
- Business Logic: `useSubscription.ts`
- Service Layer: `SubscriptionService.ts`
- Data Models: `/interfaces/Subscription.ts`

### Call Chain Diagram

```mermaid
sequenceDiagram
    participant U as User Interface
    participant SC as Subscription Management Component
    participant SX as SubscriptionContext
    participant US as useSubscription
    participant SS as SubscriptionService
    participant ST as StorageService
    participant BC as Blockchain Contract
    
    U->>SC: Access subscription management
    SC->>SX: Call getSubscriptionStatus
    SX->>US: Execute query logic
    US->>SS: Query subscription status
    SS->>BC: Query on-chain subscription data
    BC-->>SS: Return subscription data
    SS->>ST: Get local cache data
    ST-->>SS: Return cache data
    SS->>SS: Merge and process data
    SS-->>US: Return subscription status
    US-->>SX: Update status
    SX-->>SC: Notify UI update
    SC-->>U: Display subscription information
    
    U->>SC: Modify auto-renewal settings
    SC->>SX: Call updateAutoRenewal
    SX->>US: Execute update logic
    US->>SS: Update renewal settings
    SS->>BC: Submit settings update
    BC-->>SS: Return update result
    SS->>ST: Update local data
    SS-->>US: Return operation result
    US-->>SX: Update settings status
    SX-->>SC: Notify UI update
    SC-->>U: Display settings updated
```

### Data Flow Diagram

```mermaid
flowchart LR
    A[Query Request] --> B[On-chain Subscription Data]
    A --> C[Local Cache Data]
    B --> D[Merged Subscription Data]
    C --> D
    D --> E[Processed Subscription Status]
    
    F[Settings Update Request] --> G[Update Transaction Data]
    G --> H[Update Result]
    H --> I[Updated Settings Status]
    
    subgraph Storage Location
    J[Blockchain] -.-> |Store subscription data| B
    K[localStorage] -.-> |Cache subscription information| C
    L[SubscriptionContext] -.-> |Save subscription status| E
    M[Blockchain] -.-> |Store settings update| H
    N[localStorage] -.-> |Cache settings status| I
    end
```

### State Persistence
- Subscription status data: Stored both on blockchain and in local cache
- Local cache: Uses `localStorage` and `SubscriptionContext` for storage
- Settings preferences: Stored on blockchain, with local cache copy
- Operation results: Temporarily stored in memory, possibly recorded in logs

## 3. Subscription Cancellation Process

### Involved Modules
- Frontend Components: `/components/subscription/`
- Global State: `SubscriptionContext.tsx`, `ZkLoginContext.tsx`
- Business Logic: `useSubscription.ts`
- Service Layer: `SubscriptionService.ts`, `ZkLoginService.ts`
- Blockchain Contracts: `/contracts/subscription/`

### Call Chain Diagram

```mermaid
sequenceDiagram
    participant U as User Interface
    participant SC as Subscription Component
    participant SX as SubscriptionContext
    participant US as useSubscription
    participant SS as SubscriptionService
    participant ZC as ZkLoginContext
    participant ZS as ZkLoginService
    participant ST as StorageService
    participant BC as Blockchain Contract
    
    U->>SC: Request subscription cancellation
    SC->>SX: Call cancelSubscription
    SX->>US: Execute cancellation logic
    US->>SS: Submit cancellation request
    SS->>ZC: Get user authentication
    ZC-->>SS: Return user address
    SS->>SS: Prepare cancellation transaction
    SS->>ZS: Request transaction signature
    ZS->>ZS: Create and sign transaction
    ZS-->>SS: Return signed transaction
    SS->>BC: Submit subscription cancellation transaction
    BC-->>SS: Confirm transaction result
    SS->>ST: Update subscription record
    SS-->>US: Return operation result
    US-->>SX: Update subscription status
    SX-->>SC: Notify UI update
    SC-->>U: Display cancellation success
```

### Data Flow Diagram

```mermaid
flowchart LR
    A[Cancellation Request] --> B[User Identity Verification]
    B --> C[Cancellation Transaction Data]
    C --> D[Signed Transaction]
    D --> E[Transaction Result]
    E --> F[Updated Subscription Record]
    F --> G[Subscription Status Change]
    
    subgraph Storage Location
    H[ZkLoginContext] -.-> |Store user identity| B
    I[Memory State] -.-> |Temporarily store transaction data| C
    J[Blockchain] -.-> |Permanently store cancellation transaction| E
    K[Database/Cache] -.-> |Update subscription status| F
    L[SubscriptionContext] -.-> |Reflect subscription change| G
    end
```

### State Persistence
- Cancellation request: Temporarily saved in memory
- Authentication data: Stored in `ZkLoginContext` and `localStorage`
- Transaction result: Permanently saved on blockchain
- Subscription status: Updated in database and `localStorage`
- Status change: Saved through `SubscriptionContext` and notified to UI

## 4. Subscription Renewal Process

### Involved Modules
- Frontend Components: `/components/subscription/`
- Global State: `SubscriptionContext.tsx`, `PaymentContext.tsx`, `ZkLoginContext.tsx`
- Business Logic: `useSubscription.ts`
- Service Layer: `SubscriptionService.ts`, `PaymentService.ts`, `ZkLoginService.ts`
- Blockchain Contracts: `/contracts/subscription/`, `/contracts/fund/`

### Call Chain Diagram

```mermaid
sequenceDiagram
    participant U as User Interface
    participant SC as Subscription Component
    participant SX as SubscriptionContext
    participant PX as PaymentContext
    participant US as useSubscription
    participant SS as SubscriptionService
    participant ZC as ZkLoginContext
    participant ZS as ZkLoginService
    participant ST as StorageService
    participant BC as Blockchain Contract
    
    alt Manual Renewal
        U->>SC: Request subscription renewal
        SC->>SX: Call renewSubscription
    else Automatic Renewal
        SX->>SX: Detect subscription about to expire
        SX->>SX: Trigger automatic renewal
    end
    
    SX->>US: Execute renewal logic
    US->>SS: Create renewal request
    SS->>ZC: Get user identity
    ZC-->>SS: Return user address
    SS->>PX: Initiate payment request
    PX->>PX: Process payment flow
    PX-->>SS: Payment confirmation
    SS->>SS: Prepare renewal transaction
    SS->>ZS: Request transaction signature
    ZS->>ZS: Create and sign transaction
    ZS-->>SS: Return signed transaction
    SS->>BC: Submit subscription renewal transaction
    BC-->>SS: Return transaction result
    SS->>ST: Update subscription record
    SS-->>US: Return renewal result
    US-->>SX: Update subscription status
    SX-->>SC: Notify UI update
    SC-->>U: Display renewal success
```

### Data Flow Diagram

```mermaid
flowchart LR
    A[Renewal Trigger] --> B[Subscription Expiration Check]
    B --> C[User Identity Data]
    C --> D[Payment Data]
    D --> E[Renewal Transaction Data]
    E --> F[Signed Transaction]
    F --> G[Transaction Result]
    G --> H[Updated Subscription Record]
    H --> I[Subscription Status Change]
    
    subgraph Storage Location
    J[SubscriptionContext] -.-> |Store auto-renewal settings| A
    K[Database/Cache] -.-> |Store subscription expiration data| B
    L[ZkLoginContext] -.-> |Store user identity| C
    M[PaymentContext] -.-> |Store payment information| D
    N[Memory State] -.-> |Temporarily store transaction data| E
    O[Blockchain] -.-> |Permanently store renewal transaction| G
    P[Database/Cache] -.-> |Update subscription record| H
    Q[SubscriptionContext] -.-> |Update subscription status| I
    end
```

### State Persistence
- Auto-renewal settings: Saved on blockchain and in local storage
- Subscription expiration data: Tracked in database and local cache
- Payment information: Temporarily saved in `PaymentContext` memory
- Transaction result: Permanently saved on blockchain
- Subscription status: Updated in database, local storage, and `SubscriptionContext`
- Operation records: Possibly recorded in logs and on blockchain
