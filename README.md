# Membership-MVP

A Web3-based membership and lottery system built on the Sui blockchain.

## Description

This project is a Proof of Concept (POC) implementing a membership-based lottery system on the Sui blockchain. The MVP focuses on three core requirements:

1. **Authentication System**
   - Integration with zkLogin for Web3 authentication
   - Supabase integration for user management
   - Secure registration and login flow

2. **Smart Contract Implementation**
   - Move smart contract deployed on Sui testnet
   - Membership subscription logic ($365/year)
   - Raffle lottery system implementation
   - Comprehensive code documentation and comments

3. **System Verification**
   - Thorough testing of authentication flow
   - Smart contract verification and testing
   - End-to-end system validation

The project provides a modern, user-friendly interface for managing memberships and participating in lottery draws, with a focus on security, transparency, and ease of use.

## Tech Stack

### Frontend
- Next.js (Latest)
- React 19
- TypeScript
- Tailwind CSS
- Radix UI Components
- Sui SDK (@mysten/sui)
- Supabase (Authentication & Database)

### Backend
- Next.js API Routes
- TypeScript
- Supabase Backend Services

### Smart Contracts
- Move Language
- Sui Framework

### Database
- Supabase (PostgreSQL)
- Blockchain storage for lottery records

## Project Structure

```
Membership-MVP/
├── frontend/                # Next.js frontend application
│   ├── app/                # Next.js app directory
│   ├── components/         # Reusable UI components
│   ├── contexts/          # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── interfaces/        # TypeScript interfaces
│   ├── lib/               # Utility libraries
│   ├── utils/             # Utility functions
│   └── config/            # Configuration files
└── contracts/             # Move smart contracts
```