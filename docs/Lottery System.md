
# Lottery System

## 1. System Responsibilities
The lottery system is an incentive feature of the membership platform, mainly responsible for:

- Providing instant lottery experience
- Managing prize pool funds and reward distribution
- Ensuring lottery fairness and randomness
- Recording lottery history and statistics
- Processing reward distribution
- Providing membership lottery benefits

## 2. Core Components

**Frontend Components**:
- `/components/lottery/`: Provides lottery-related UI interfaces
- `/contexts/LotteryContext.tsx`: Provides global lottery status and methods
- `/hooks/useLottery.ts`: Encapsulates lottery business logic (though not shown in the directory, it may exist)
- `/interfaces/Lottery.ts`: Defines lottery data models and interfaces
- `/utils/LotteryService.ts`: Provides underlying lottery service implementation

**Blockchain Contracts**:
- `/contracts/lottery/`: Provides on-chain lottery logic and random number generation
- `/contracts/pool/`: Manages prize pool funds

## 3. Module Interaction Relationships

The lottery system interacts closely with other modules:

1. **With Authentication System**:
   - Depends on user identity verification
   - Obtains user address information
   - Uses zkLogin for transaction signing

2. **With Subscription System**:
   - Checks membership benefits and lottery eligibility
   - Membership level may affect lottery frequency or winning probability
   - Shares user subscription status

3. **With Deposit System**:
   - Processes reward distribution
   - Interacts with user wallet
   - Handles fund transfers

4. **With Payment System**:
   - Records reward transactions
   - Processes fund transfers

## 4. Inputs and Outputs

**Inputs**:
- User lottery requests
- User identity information (zkLogin address)
- Lottery parameters (if there are specific parameters)
- Membership benefit information
- Random number seeds

**Outputs**:
- Lottery results (success/failure)
- Winning amount
- Transaction confirmation and ID
- Lottery history records
- Statistical data (total number of draws, total prize amount, etc.)
- Error messages (when operations fail)

## 5. Dependent Components

**Internal Dependencies**:
- `ZkLoginContext`: Provides user authentication and transaction signing
- `DepositContext`: Handles reward fund distribution
- `SubscriptionContext`: Checks membership benefits
- `SuiPriceContext`: Provides currency price information
- `StorageService`: Stores lottery data
- `config/contracts.ts`: Obtains contract addresses and configurations

**External Dependencies**:
- SUI blockchain network
- On-chain random number generator
- Data storage service
- Notification service (winning notifications)

## 6. Workflow

1. **Lottery Process**:
   - Verify user identity and permissions
   - Check user lottery eligibility
   - Prepare lottery transaction
   - Call smart contract to execute lottery
   - Obtain random results
   - Determine winning amount
   - Distribute rewards
   - Record lottery results

2. **Reward Distribution Process**:
   - Confirm winning results
   - Transfer funds from prize pool
   - Distribute to user account
   - Update prize pool balance

3. **History Query Process**:
   - Retrieve user history records
   - Calculate statistical data
   - Display lottery history

4. **Prize Pool Management Process**:
   - Monitor prize pool balance
   - Adjust reward distribution
   - Ensure prize pool sustainability

## 7. Data Models

- **DrawResult**: Single lottery result
- **LotteryRecord**: Lottery history record
- **LotteryStats**: Lottery statistical data
- **DrawRequestParams/DrawResponseData**: API interaction data structures

## 8. Technical Features

1. **On-chain Randomness**:
   - Uses blockchain random number generator
   - Ensures lottery fairness and non-manipulability

2. **Smart Contract Security**:
   - Secure management of prize pool funds
   - Prevention of lottery vulnerabilities and attacks

3. **Transaction Efficiency**:
   - Optimizes lottery transactions
   - Reduces blockchain fees

4. **RESTful Specification Compliance**:
   - Uses standard HTTP methods
   - Resource-type URI design
   - Comprehensive error handling mechanism
   - Supports filtering and pagination

As an incentive mechanism for the membership platform, the lottery system enhances user engagement and platform stickiness by providing a fair and transparent lottery experience, while ensuring the security of the lottery process and the smoothness of user experience through tight integration with other systems.
