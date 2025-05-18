
## Executive Summary
This project developed a membership subscription platform based on zkLogin, integrating deposit, lottery, and subscription functionalities.

## Product Overview
The platform provides users with a one-stop experience from authentication, deposit, and subscription to lottery participation: users log in with one click via Google, and the system automatically generates blockchain identity based on zkLogin, eliminating the need for mnemonic phrases or private keys; users can then enter the deposit page, select an amount, and the smart contract mints corresponding USDT assets; during subscription, users select a membership plan and confirm to generate a subscription object on-chain with instant activation of benefits; finally, users can participate in lotteries to receive different amounts of SUI rewards. The entire process requires no blockchain expertise, allowing users to securely and conveniently own and manage on-chain assets and benefits through a familiar web interface.

## System Architecture
The overall project is based on a six-layer application architecture with modular design, clearly dividing the complete process from frontend to the Sui chain. The top layer is the user interface layer, containing authentication, subscription, lottery, deposit, and other functional components; below is the state management layer, managing state information of different modules in user sessions through multiple Contexts; the business logic layer uses Hooks to encapsulate core process logic of various modules, maintaining clear code structure; the service layer serves as an intermediate bridge connecting the data layer and contract layer, handling transaction construction, contract calls, and data reading/writing; the data layer uses Supabase to store user operation records and business data; the bottom layer is the contract layer, containing authentication, subscription, lottery, and payment core smart contract modules supporting business operations.

## System Interaction Logic
The overall system interaction logic can be divided into vertical interaction and horizontal integration.

For vertical interaction, the system adopts a top-down event-driven mechanism: user operations on the frontend interface first trigger UI component events, then call global methods provided by Context, which further call custom Hooks that encapsulate specific business logic, and finally the Hook triggers Service to build transactions and interact with the Sui chain. After transactions are executed on the Sui chain, events are emitted, and Service obtains the latest status through monitoring or active queries, feeding data back to Hook and Context to update the frontend state. Finally, UI components respond to state changes and complete interface refreshes, achieving a complete front-end and back-end interaction loop.

For horizontal integration, various functional modules work together through shared basic services. For example, the authentication module provides unified identity verification capabilities for subscription, lottery, and other functions, while the deposit module provides financial support for other modules; the system adopts an "on-chain primary, off-chain supplementary" data synchronization mechanism, using blockchain data as the only trusted source, combined with Supabase to store user details and business data, ensuring consistency between the two through regular synchronization. At the same time, a multi-layer state management strategy is adopted based on data lifecycle: Context is used for immediate state sharing between components, sessionStorage maintains session-level state, localStorage caches long-term user data, while critical business data is permanently stored on-chain, ensuring security and traceability.

## Authentication System
The entire authentication system consists of three parts: user login, transaction signing, and identity verification.

### 1. User Login Flow
Users trigger the authentication process by clicking the login button. The system first obtains a JWT token through Google, then parses the token to extract user information, generates a usersalt and temporary key pair, requests the ZKP proof service to generate zero-knowledge proof, derives the zkLogin address based on the proof result, and finally stores authentication data at different levels (JWT token in localStorage, temporary key in sessionStorage, authentication state in memory), completing the entire login process.

### 2. Transaction Signing Flow
When users perform operations requiring signatures (such as subscription, lottery, deposit), the system first initiates transaction requests from business components, obtains temporary keys through ZkLoginService, generates partial signatures and combines them into complete signatures, then submits the signed transactions to the Sui chain through SuiService. Transaction results are simultaneously updated to the Sui chain and frontend state, ensuring the security and traceability of the entire process.

### 3. Identity Verification Flow
When users access resources requiring authorization, the system performs dual verification through AuthContext and ZkLoginContext, first checking authentication status, then verifying session validity. If the session is valid, access is allowed; if invalid, a re-authentication process is triggered. The entire verification process ensures the authenticity of user identity and the accuracy of access permissions.

## Deposit System
The entire deposit system consists of two parts: user deposit and deposit history.

### 1. User Deposit
After users initiate deposit requests, the system verifies user identity through ZkLoginContext, prepares deposit transactions and signs them through ZkLoginService, then calls the public_mint method of the Coin contract to execute token minting. After successful transactions, deposit history is recorded, the deposit status in DepositContext is updated, and finally, deposit success information is displayed on the user interface.

### 2. Deposit History Query Flow
When users request to view deposit history, the system obtains the user address through ZkLoginContext, simultaneously queries deposit records in local cache and database, merges all historical data for formatting processing, stores the processed history records in DepositContext, and finally displays the complete deposit history on the user interface.

## Lottery System
The entire lottery system consists of two parts: user lottery participation and lottery history.

### 1. Lottery Flow
After users click the lottery button, the system verifies user identity through ZkLoginContext, prepares and signs lottery transactions, submits them to the blockchain, then the Lottery contract generates random results, the Pool contract calculates reward amounts and checks pool balance, confirms reward availability before returning lottery results, and finally the system updates lottery records and status, completing the entire lottery process.

### 2. History Query Flow
When users request to view lottery history, the system obtains the user address through ZkLoginContext, simultaneously queries records in local cache, database, and blockchain, merges all historical data for calculation and statistics, stores the processed results in LotteryContext, and finally displays the complete lottery history records on the user interface.

## Subscription System
The entire subscription system consists of three parts: creating subscriptions, canceling subscriptions, and renewing subscriptions.

### 1. Subscription Creation Flow
After users select a subscription plan, the system first verifies user identity through ZkLoginContext, then processes payment flow through PaymentContext. After payment confirmation, the system prepares subscription transactions and signs them through ZkLoginService, finally submitting the signed transactions to blockchain contracts. After successful transactions, local storage and subscription status in SubscriptionContext are updated, completing the entire subscription creation process.

### 2. Subscription Cancellation Flow
After users initiate subscription cancellation requests, the system verifies user identity through ZkLoginContext, prepares cancellation transactions and signs them through ZkLoginService, then submits the signed transactions to blockchain contracts. After transaction confirmation, subscription status in the database and local storage is updated, and UI is notified to update through SubscriptionContext, completing the subscription cancellation operation.

### 3. Subscription Renewal Flow
The system supports both manual and automatic renewal methods: manual renewal is triggered by users actively, while automatic renewal is automatically executed when the system detects that the subscription is about to expire. During the renewal process, the system verifies user identity, processes payment flow, prepares and signs renewal transactions, updates subscription records and status after submission to the blockchain, ensuring the continuity of subscriptions and the extension of user benefits.

## Achievements and Challenges
During project development, multiple achievements were made: through in-depth exploration of zkLogin technology, we mastered the core principles and practical paths of zero-knowledge proofs in Web3 identity authentication, successfully achieving seamless integration of traditional Web2 login authorization with the Web3 world; in architecture design, adopting the Context-Hooks-Service layered pattern not only achieved clear logical separation of concerns but also significantly improved code maintainability and extensibility; additionally, we became proficient in deploying frontend applications on Vercel and implementing user off-chain authentication and data storage through Supabase, perfecting the overall system infrastructure.

At the same time, the project also faces some challenges that need to be addressed: currently incomplete user detail pages, lacking asset overview, subscription NFT visualization, and on-chain behavior history display; payment remains at the simulated token minting stage, without integration of real payment services like Stripe and KYC services; lack of recommendation mechanisms and integration with mainstream social platforms for user growth; in terms of authentication experience, only Google login is supported, lacking support for Apple, X, Telegram, and other login methods.
