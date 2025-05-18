
# Subscription System

## 1. System Responsibilities
The subscription system is the core business function of the membership platform, mainly responsible for:

- Managing membership subscription plans
- Processing user subscription purchases, renewals, and cancellations
- Managing subscription status and lifecycle
- Providing membership benefit control
- Handling subscription payments and records

## 2. Core Components

**Frontend Components**:
- `/components/subscription/`: Provides subscription-related UI interfaces
- `/contexts/SubscriptionContext.tsx`: Provides global subscription status and methods
- `/hooks/useSubscription.ts`: Encapsulates subscription business logic
- `/interfaces/Subscription.ts`: Defines subscription data models and interfaces
- `/utils/SubscriptionService.ts`: Provides underlying subscription service implementation

**Blockchain Contracts**:
- `/contracts/subscription/`: Provides on-chain subscription management and benefit control

## 3. Module Interaction Relationships

The subscription system has extensive interactions with other modules:

1. **With Authentication System**:
   - Depends on user identity verification
   - Obtains user address information
   - Uses zkLogin for transaction signing

2. **With Deposit System**:
   - Processes subscription payments
   - Checks user balance
   - Completes token transfers

3. **With Lottery System**:
   - Subscription status affects lottery permissions
   - Membership level may affect lottery benefits
   - Shares resources and user data

4. **With Payment System**:
   - Handles subscription payment processes
   - Receives payment confirmations
   - Provides refund mechanisms

## 4. Inputs and Outputs

**Inputs**:
- User-selected subscription plans
- Payment information and authorization
- Subscription operation requests (creation, renewal, cancellation)
- Automatic renewal settings
- User identity information

**Outputs**:
- Subscription status and details
- Transaction confirmation and ID
- Subscription benefit activation
- Bills and payment records
- Subscription expiration reminders
- Error messages (when operations fail)

## 5. Dependent Components

**Internal Dependencies**:
- `ZkLoginContext`: Provides user authentication and transaction signing
- `PaymentContext`: Handles payment processes
- `DepositContext`: Manages user funds
- `StorageService`: Stores subscription data
- `config/tokens.ts`: Obtains token configurations
- `config/contracts.ts`: Obtains contract addresses and configurations

**External Dependencies**:
- SUI blockchain network
- Payment gateway or service
- Data storage service
- Notification service (subscription status changes)

## 6. Workflow

1. **Subscription Creation Process**:
   - User selects subscription plan
   - Verifies user identity and balance
   - Prepares payment transaction
   - Signs and submits transaction
   - Records subscription information
   - Activates membership benefits

2. **Subscription Management Process**:
   - Queries subscription status
   - Handles automatic renewal settings
   - Manages subscription lifecycle
   - Processes subscription change requests

3. **Subscription Cancellation Process**:
   - Verifies user identity and permissions
   - Submits cancellation transaction
   - Updates subscription status
   - Adjusts related benefits

4. **Subscription Renewal Process**:
   - Checks subscription expiration status
   - Prepares renewal transaction
   - Processes payment
   - Extends subscription period
   - Maintains membership benefits

## 7. Data Models

- **SubscriptionPlan**: Defines different subscription plans (monthly, quarterly, annual, etc.)
- **Subscription**: Records user's specific subscription details
- **SubscriptionStatus**: Tracks the current status of subscriptions
- **SubscriptionTransaction**: Records transactions related to subscriptions

## 8. RESTful Specification Compliance

The subscription system follows standard RESTful design:
- Uses standard HTTP methods
- Resource-type URI design
- Standardized status code usage
- Supports filtering and pagination
- Comprehensive error handling

As the core business module of the membership platform, the subscription system ensures users can smoothly obtain and manage membership benefits by providing complete subscription lifecycle management, while closely integrating with other systems to provide fundamental membership identity and benefit management functions for the entire application.
