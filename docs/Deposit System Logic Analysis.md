
# Deposit System Logic Analysis

## 1. Deposit Process

### Involved Modules
- Frontend Components: `/components/deposit/`
- Global State: `DepositContext.tsx`, `ZkLoginContext.tsx`
- Business Logic: `useDeposit.ts`
- Service Layer: `DepositService.ts`, `ZkLoginService.ts`
- Blockchain Contracts: `/contracts/coin/`
- Data Models: `/interfaces/Deposit.ts`

### Call Chain Diagram

```mermaid
sequenceDiagram
    participant U as User Interface
    participant DC as Deposit Component
    participant DX as DepositContext
    participant UD as useDeposit
    participant DS as DepositService
    participant ZC as ZkLoginContext
    participant ZS as ZkLoginService
    participant ST as StorageService
    participant CC as Coin Contract
    
    U->>DC: Initiate deposit request
    DC->>DX: Call deposit method
    DX->>UD: Execute deposit logic
    UD->>DS: Create deposit request
    DS->>ZC: Get user authentication status
    ZC-->>DS: Return user address
    DS->>DS: Prepare deposit transaction
    DS->>ZS: Request transaction signature
    ZS->>ZS: Create and sign transaction
    ZS-->>DS: Return signed transaction
    DS->>CC: Call public_mint method
    CC->>CC: Execute token minting
    CC-->>DS: Return transaction result
    DS->>ST: Record deposit history
    DS-->>UD: Return deposit result
    UD-->>DX: Update deposit status
    DX-->>DC: Notify UI update
    DC-->>U: Display deposit success
```

### Data Flow Diagram

```mermaid
flowchart LR
    A[Deposit Request] --> B[User Identity Data]
    B --> C[Deposit Amount Data]
    C --> D[Transaction Data]
    D --> E[Signed Transaction]
    E --> F[Minting Instruction]
    F --> G[Transaction Result]
    G --> H[Deposit Record]
    H --> I[Balance Update]
    
    subgraph Storage Location
    J[DepositContext] -.-> |Temporarily store deposit request| A
    K[ZkLoginContext] -.-> |Store user identity| B
    L[Memory State] -.-> |Temporarily store transaction data| D
    M[Blockchain] -.-> |Permanently store transaction result| G
    N[Database/Cache] -.-> |Store deposit history| H
    O[DepositContext] -.-> |Save latest balance| I
    end
```

### State Persistence
- Deposit request: Temporarily stored in `DepositContext` memory
- User identity data: Stored in `ZkLoginContext` and `localStorage`
- Transaction data: Temporarily stored in memory
- Minting result: Permanently stored on blockchain
- Deposit record: Stored in database and possibly in local cache
- User balance: Stored on blockchain, cached in `DepositContext`

## 2. Balance Query Process

### Involved Modules
- Frontend Components: `/components/deposit/`
- Global State: `DepositContext.tsx`, `ZkLoginContext.tsx`
- Business Logic: `useDeposit.ts`
- Service Layer: `DepositService.ts`, `SuiService.ts`
- Data Models: `/interfaces/Deposit.ts`

### Call Chain Diagram

```mermaid
sequenceDiagram
    participant U as User Interface
    participant DC as Deposit Component
    participant DX as DepositContext
    participant UD as useDeposit
    participant DS as DepositService
    participant ZC as ZkLoginContext
    participant SU as SuiService
    participant BC as Blockchain
    
    U->>DC: Query balance
    DC->>DX: Call getBalance method
    DX->>UD: Execute query logic
    UD->>DS: Request balance information
    DS->>ZC: Get user address
    ZC-->>DS: Return user address
    DS->>SU: Query token balance
    SU->>BC: Send balance query request
    BC-->>SU: Return balance data
    SU-->>DS: Return formatted balance
    DS-->>UD: Return balance information
    UD-->>DX: Update balance status
    DX-->>DC: Notify UI update
    DC-->>U: Display current balance
```

### Data Flow Diagram

```mermaid
flowchart LR
    A[Balance Query Request] --> B[User Address]
    B --> C[On-chain Query]
    C --> D[Raw Balance Data]
    D --> E[Formatted Balance]
    E --> F[Balance Display Data]
    
    subgraph Storage Location
    G[ZkLoginContext] -.-> |Store user address| B
    H[Blockchain] -.-> |Store actual balance| D
    I[Memory State] -.-> |Temporarily store formatted data| E
    J[DepositContext] -.-> |Cache balance information| F
    end
```

### State Persistence
- User address: Stored in `ZkLoginContext` and `localStorage`
- Actual balance: Permanently stored on blockchain
- Formatted balance: Temporarily stored in memory
- Balance cache: Possibly cached short-term in `DepositContext` and `localStorage`
- Query timestamp: Possibly saved in frontend cache to control query frequency

## 3. Deposit History Query Process

### Involved Modules
- Frontend Components: `/components/deposit/`
- Global State: `DepositContext.tsx`, `ZkLoginContext.tsx`
- Business Logic: `useDeposit.ts`
- Service Layer: `DepositService.ts`, `StorageService.ts`
- Data Models: `/interfaces/Deposit.ts`

### Call Chain Diagram

```mermaid
sequenceDiagram
    participant U as User Interface
    participant DC as Deposit Component
    participant DX as DepositContext
    participant UD as useDeposit
    participant DS as DepositService
    participant ZC as ZkLoginContext
    participant ST as StorageService
    participant DB as Database/API
    
    U->>DC: Request deposit history
    DC->>DX: Call getDepositHistory
    DX->>UD: Execute query logic
    UD->>DS: Request deposit records
    DS->>ZC: Get user address
    ZC-->>DS: Return user address
    DS->>ST: Query local cache
    ST-->>DS: Return cache results
    DS->>DB: Request complete history records
    DB-->>DS: Return deposit history
    DS->>DS: Merge and process data
    DS-->>UD: Return history records
    UD-->>DX: Update history status
    DX-->>DC: Notify UI update
    DC-->>U: Display deposit history
```

### Data Flow Diagram

```mermaid
flowchart LR
    A[History Query Request] --> B[User Identity Data]
    B --> C[Query Parameters]
    C --> D[Cache Data]
    C --> E[Remote Data]
    D --> F[Merged History Data]
    E --> F
    F --> G[Formatted History Records]
    G --> H[History Display Data]
    
    subgraph Storage Location
    I[ZkLoginContext] -.-> |Store user identity| B
    J[DepositContext] -.-> |Store query parameters| C
    K[localStorage] -.-> |Store history cache| D
    L[Database/API] -.-> |Store complete history| E
    M[Memory State] -.-> |Temporarily merge data| F
    N[DepositContext] -.-> |Cache formatted history| H
    end
```

### State Persistence
- Query parameters: Temporarily stored in `DepositContext` memory
- User identity: Stored in `ZkLoginContext` and `localStorage`
- History cache: Possibly stored short-term in `localStorage`
- Complete history: Stored in backend database or retrieved from on-chain transaction records
- Merged data: Temporarily stored in memory
- Display data: Cached in `DepositContext`, possibly saved in `sessionStorage`

## 4. Deposit Failure Handling Process

### Involved Modules
- Frontend Components: `/components/deposit/`
- Global State: `DepositContext.tsx`, `LogContext.tsx`
- Business Logic: `useDeposit.ts`
- Service Layer: `DepositService.ts`

### Call Chain Diagram

```mermaid
sequenceDiagram
    participant U as User Interface
    participant DC as Deposit Component
    participant DX as DepositContext
    participant LX as LogContext
    participant UD as useDeposit
    participant DS as DepositService
    participant ST as StorageService
    
    alt Transaction Exception
        DS->>DS: Detect transaction failure
        DS->>LX: Record error information
        DS-->>UD: Return error result
        UD-->>DX: Update error status
        DX-->>DC: Notify UI update
        DC-->>U: Display error message
    end
    
    U->>DC: Request retry deposit
    DC->>DX: Call retryDeposit
    DX->>UD: Execute retry logic
    UD->>DS: Submit retry request
    DS->>DS: Prepare retry transaction
    DS->>ST: Record retry attempt
    
    alt Retry Success
        DS-->>UD: Return success result
        UD-->>DX: Update deposit status
        DX-->>DC: Notify UI update
        DC-->>U: Display deposit success
    else Retry Failure
        DS->>LX: Record retry failure
        DS-->>UD: Return failure result
        UD-->>DX: Update error status
        DX-->>DC: Notify UI update
        DC-->>U: Display error and suggestions
    end
```

### Data Flow Diagram

```mermaid
flowchart LR
    A[Transaction Failure] --> B[Error Data]
    B --> C[Error Status]
    C --> D[Retry Request]
    D --> E[Retry Transaction Data]
    E --> F[Retry Result]
    F --> G[Final Status]
    
    subgraph Storage Location
    H[Memory] -.-> |Temporarily store error data| B
    I[LogContext] -.-> |Record error information| B
    J[DepositContext] -.-> |Store error status| C
    K[localStorage] -.-> |Cache failed request| D
    L[Memory State] -.-> |Temporarily store retry data| E
    M[Database/Logs] -.-> |Record failure/retry history| F
    N[DepositContext] -.-> |Save final status| G
    end
```

### State Persistence
- Error data: Recorded in logging system and memory
- Error status: Stored in `DepositContext`
- Failed request: Possibly cached in `localStorage` for retry
- Retry history: Possibly recorded in database or logging system
- Final status: Updated to `DepositContext`, possibly saved in local storage
