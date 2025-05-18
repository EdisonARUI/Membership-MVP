
# Authentication System

## 1. System Responsibilities
The authentication system based on Zero-Knowledge Proof (ZKP) technology is the fundamental infrastructure of the entire membership system, mainly responsible for:

- User identity verification and authorization
- Managing user login status
- Generating and verifying transaction signatures
- Providing secure, privacy-protecting blockchain interaction mechanisms
- Connecting Web2 identity (such as social login) with Web3 wallet addresses

## 2. Core Components

**Frontend Components**:
- `/components/zklogin/`: Provides login UI and user interaction interface
- `/contexts/ZkLoginContext.tsx`: Provides global authentication state and methods
- `/contexts/AuthContext.tsx`: Handles higher-level user authentication logic
- `/hooks/useZkLogin.ts`: Encapsulates authentication business logic
- `/hooks/useZkLoginParams.ts`: Handles authentication parameters
- `/hooks/useZkLoginTransactions.ts`: Handles authentication-related transactions
- `/interfaces/ZkLogin.ts`: Defines authentication data models and interfaces
- `/utils/ZkLoginService.ts`: Provides underlying authentication services
- `/utils/ZkLoginAuthService.ts`: Handles authentication processes and session management

**Blockchain Contracts**:
- `/contracts/authentication/`: Provides on-chain identity verification and permission management

## 3. Module Interaction Relationships

The authentication system is the foundation of the entire application and interacts with almost all other modules:

1. **With Subscription System**:
   - Provides user identity verification
   - Authorizes users to perform subscription operations
   - Provides signature services for subscription transactions

2. **With Lottery System**:
   - Verifies user identity and permissions
   - Provides signatures for lottery transactions
   - Ensures prizes are correctly distributed to verified users

3. **With Deposit System**:
   - Verifies user identity
   - Provides signatures for deposit transactions
   - Ensures funds safely reach user accounts

4. **With Storage Service**:
   - Stores user authentication status
   - Caches authentication-related data

## 4. Inputs and Outputs

**Inputs**:
- JWT token (obtained from OAuth provider)
- User operation requests (login, logout, etc.)
- Temporary key pairs (for transaction signing)
- User salt value (for address derivation)
- Transaction data (transactions pending signature)

**Outputs**:
- Authentication status (logged in/logged out)
- zkLogin address (user's blockchain address)
- Partial signature (PartialZkLoginSignature)
- Signed transactions (ready for submission to blockchain)
- Error messages (when authentication fails)

## 5. Dependent Components

**Internal Dependencies**:
- `StorageService`: Stores authentication data and status
- `SuiService`: Handles SUI blockchain interactions
- `JWT tools`: Processes JWT token parsing and verification
- `AppError`: Standardizes error handling

**External Dependencies**:
- OAuth providers (Google, Facebook, etc.)
- ZKP proof generation service
- SUI blockchain network
- Cryptography libraries (for signature generation)

## 6. Workflow

1. **Initialization Phase**:
   - Generate temporary key pairs
   - Prepare authentication environment

2. **Login Process**:
   - Obtain JWT token from OAuth provider
   - Parse JWT to extract user information
   - Obtain or generate user salt value
   - Generate zero-knowledge proof
   - Derive zkLogin address
   - Update authentication status

3. **Transaction Signing**:
   - Create transaction
   - Generate complete signature using temporary keys and partial signatures
   - Submit transaction to blockchain

4. **Identity Verification**:
   - Verify user permissions
   - Confirm user identity matches the operation
   - Prevent unauthorized access

## 7. Security Features

- **Zero-Knowledge Proof**: Does not expose user private keys
- **JWT Verification**: Ensures identity source is trustworthy
- **Temporary Keys**: Reduces risk of private key exposure
- **Salt Value Derivation**: Increases security of address generation
- **State Management**: Securely stores authentication status

The authentication system, as the fundamental infrastructure of the entire application, ensures that various operations within the application can be securely executed by providing secure, reliable user identity verification and transaction signing services, while protecting user privacy and asset security.
