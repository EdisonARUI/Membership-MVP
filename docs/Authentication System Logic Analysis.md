
# Authentication System Core Business Logic Analysis

## 1. Login Flow

### Involved Modules
- Frontend Components: `/components/zklogin/`
- Global State: `ZkLoginContext.tsx`, `AuthContext.tsx`
- Business Logic: `useZkLogin.ts`, `useZkLoginParams.ts`
- Service Layer: `ZkLoginService.ts`, `ZkLoginAuthService.ts`
- Data Models: `/interfaces/ZkLogin.ts`
- External Dependencies: OAuth Provider, ZKP Proof Service

### Call Chain Diagram

```mermaid
sequenceDiagram
    participant U as User Interface
    participant C as ZkLogin Component
    participant ZC as ZkLoginContext
    participant AC as AuthContext
    participant H as useZkLogin
    participant ZS as ZkLoginService
    participant AS as ZkLoginAuthService
    participant SS as StorageService
    participant O as OAuth Provider
    participant ZP as ZKP Proof Service
    
    U->>C: Click Login
    C->>ZC: Call login method
    ZC->>H: Execute login logic
    H->>ZS: Request authentication
    ZS->>O: Get JWT token
    O-->>ZS: Return JWT token
    ZS->>AS: JWT parsing
    AS->>AS: Extract user information
    AS->>SS: Get/generate salt value
    AS->>ZP: Request zero-knowledge proof generation
    ZP-->>AS: Return proof result
    AS->>AS: Derive zkLogin address
    AS->>SS: Store authentication data
    AS-->>ZS: Return authentication result
    ZS-->>H: Return login status
    H-->>ZC: Update global state
    ZC-->>AC: Update advanced authentication state
    ZC-->>C: State update notification
    C-->>U: Display login success
```

### Data Flow Diagram

```mermaid
flowchart LR
    A[User Input] --> B[JWT Token]
    B --> C[User Information]
    C --> D[Salt Value]
    D --> E[Temporary Key Pair]
    E --> F[Zero-Knowledge Proof]
    F --> G[zkLogin Address]
    G --> H[Authentication State]
    
    subgraph Storage Location
    I[localStorage] -.-> |Store JWT Token| B
    J[SessionStorage] -.-> |Store Temporary Key| E
    K[Memory State] -.-> |Store Authentication State| H
    end
```

### State Persistence
- JWT Token: Stored in `localStorage`, with expiration time
- User Salt Value: Stored in `localStorage` or database
- Temporary Key: Stored in session storage (`sessionStorage`), automatically cleared when session ends
- Authentication State: Saved in memory via `ZkLoginContext`, restored from storage service after page refresh

## 2. Transaction Signing Flow

### Involved Modules
- Business Components: Subscription/Lottery/Deposit components
- Business Logic: `useZkLoginTransactions.ts`
- Service Layer: `ZkLoginService.ts`, `SuiService.ts`
- Blockchain Contracts: `/contracts/authentication/`

### Call Chain Diagram

```mermaid
sequenceDiagram
    participant U as User Interface
    participant BC as Business Component
    participant BX as Business Context
    participant TH as useZkLoginTransactions
    participant ZS as ZkLoginService
    participant SS as StorageService
    participant SU as SuiService
    participant BC as Blockchain Contract
    
    U->>BC: Trigger operation requiring signature
    BC->>BX: Call transaction method
    BX->>TH: Request transaction signature
    TH->>ZS: Create transaction
    ZS->>SS: Get temporary key
    ZS->>ZS: Generate partial signature
    ZS->>ZS: Combine complete signature
    ZS->>SU: Submit signed transaction
    SU->>BC: Submit to chain
    BC-->>SU: Return transaction result
    SU-->>ZS: Return transaction status
    ZS-->>TH: Return operation result
    TH-->>BX: Update business state
    BX-->>BC: Update UI state
    BC-->>U: Display operation result
```

### Data Flow Diagram

```mermaid
flowchart LR
    A[Transaction Request] --> B[Transaction Data]
    B --> C[Unsigned Transaction]
    C --> D[Temporary Key]
    C --> E[Partial Signature]
    D --> F[Complete Signature]
    E --> F
    F --> G[Signed Transaction]
    G --> H[Transaction Result]
    
    subgraph Storage Location
    I[SessionStorage] -.-> |Store Temporary Key| D
    J[ZkLoginContext] -.-> |Temporarily save transaction state| H
    K[Database/On-chain] -.-> |Permanently save transaction result| H
    end
```

### State Persistence
- Temporary Key: Temporarily stored in session storage
- Transaction Data: Temporarily stored in memory
- Transaction Result: Saved on the blockchain, may also be cached in the frontend
- Transaction State: Briefly saved in memory via `ZkLoginContext`

## 3. Identity Verification Flow

### Involved Modules
- Application Components: Any component requiring permission verification
- Global State: `AuthContext.tsx`, `ZkLoginContext.tsx`
- Service Layer: `ZkLoginAuthService.ts`, `StorageService.ts`

### Call Chain Diagram

```mermaid
sequenceDiagram
    participant U as User Interface
    participant AC as Application Component
    participant AX as AuthContext
    participant ZC as ZkLoginContext
    participant AS as ZkLoginAuthService
    participant SS as StorageService
    
    U->>AC: Access restricted resource
    AC->>AX: Verify user permission
    AX->>ZC: Check authentication state
    ZC->>AS: Verify session validity
    AS->>SS: Get stored authentication data
    SS-->>AS: Return authentication data
    AS->>AS: Check data validity
    opt Session Invalid
        AS->>AS: Trigger re-authentication
    end
    AS-->>ZC: Return verification result
    ZC-->>AX: Update permission state
    AX-->>AC: Return verification result
    alt Verification Success
        AC-->>U: Display restricted resource
    else Verification Failure
        AC-->>U: Display no permission prompt
    end
```

### Data Flow Diagram

```mermaid
flowchart LR
    A[Permission Verification Request] --> B[Authentication State]
    B --> C[Session Data]
    C --> D[Authentication Data Validity]
    D --> E[Permission Verification Result]
    
    subgraph Storage Location
    F[ZkLoginContext] -.-> |Save authentication state| B
    G[localStorage] -.-> |Store session data| C
    H[Memory State] -.-> |Temporarily save verification result| E
    end
```

### State Persistence
- Authentication State: Saved in memory via `ZkLoginContext`
- Session Data: Stored in `localStorage`, with expiration time
- Permission Information: Briefly saved in memory via `AuthContext`
- Verification Result: Not persisted, verified again when needed
