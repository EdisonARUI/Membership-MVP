
# Deposit System

## 1. System Responsibilities
The deposit system is the financial entry point for the membership platform, mainly responsible for:

- Providing test token (TEST_USDT) deposit functionality
- Managing user fund deposits
- Recording deposit history and transactions
- Maintaining user fund balances
- Supporting the financial needs of other business modules
- Providing simulated fund services in the development environment

## 2. Core Components

**Frontend Components**:
- `/components/deposit/`: Provides deposit-related UI interfaces
- `/contexts/DepositContext.tsx`: Provides global deposit status and methods
- `/hooks/useDeposit.ts`: Encapsulates deposit business logic
- `/interfaces/Deposit.ts`: Defines deposit data models and interfaces
- `/utils/DepositService.ts`: Provides underlying deposit service implementation

**Blockchain Contracts**:
- `/contracts/coin/`: Provides token minting and management functions
- `/contracts/fund/`: Manages fund transfers

## 3. Module Interaction Relationships

The deposit system is the foundation of platform fund transfers, closely interacting with other modules:

1. **With Authentication System**:
   - Depends on user identity verification
   - Obtains user address information
   - Uses zkLogin for transaction signing

2. **With Subscription System**:
   - Provides financial support for subscription payments
   - Ensures users have sufficient balance to complete subscriptions

3. **With Lottery System**:
   - Provides financial support for lottery prize pools
   - Assists with prize distribution

4. **With Payment System**:
   - Coordinates payment processes
   - Handles deposit confirmations
   - Provides fund query interfaces

## 4. Inputs and Outputs

**Inputs**:
- User deposit requests
- Deposit amounts
- User identity information (zkLogin address)
- Transaction signature data
- Payment confirmation information

**Outputs**:
- Deposit results (success/failure)
- Transaction confirmation and ID
- User balance updates
- Deposit history records
- Error messages (when operations fail)

## 5. Dependent Components

**Internal Dependencies**:
- `ZkLoginContext`: Provides user authentication and transaction signing
- `PaymentContext`: Coordinates payment processes
- `StorageService`: Stores deposit data
- `config/tokens.ts`: Obtains token configuration information
- `config/contracts.ts`: Obtains contract addresses and configurations

**External Dependencies**:
- SUI blockchain network
- Token contracts (especially TEST_USDT)
- Data storage service
- Notification service (deposit confirmation notifications)

## 6. Workflow

1. **Deposit Process**:
   - User initiates deposit request
   - Verifies user identity
   - Prepares deposit transaction
   - Calls the contract's public_mint method
   - Executes token minting
   - Updates user balance
   - Records deposit history

2. **Balance Query Process**:
   - Gets user address
   - Queries on-chain token balance
   - Formats and displays balance

3. **Deposit History Query Process**:
   - Gets user deposit records
   - Calculates statistical data
   - Displays deposit history

4. **Deposit Failure Handling**:
   - Detects transaction anomalies
   - Records error information
   - Provides retry mechanisms

## 7. Data Models

- **DepositRequest**: Deposit request parameters
- **DepositResponse**: Deposit response data
- **DepositRecord**: Deposit record
- **DepositRecordsResponse**: Deposit history query results

## 8. Technical Features

1. **Token Minting Mechanism**:
   - Uses contract public_mint method
   - Simulates real deposit processes
   - Facilitates development and testing

2. **Transaction Security**:
   - Uses zkLogin signatures to ensure transaction security
   - Complete transaction confirmation mechanism
   - Exception handling and recovery mechanisms

3. **RESTful Specification Compliance**:
   - Uses standard HTTP methods
   - Resource-type URI design
   - Comprehensive error handling
   - Supports query filtering

4. **Development Convenience**:
   - Provides quick deposits in test environments
   - Simplifies development processes
   - Facilitates feature testing

As the financial entry point for the platform, the deposit system ensures users can smoothly obtain platform tokens through simple and secure deposit mechanisms, supporting the normal operation of other business functions, especially providing convenient financial support for verifying the entire application process in development and testing environments.
