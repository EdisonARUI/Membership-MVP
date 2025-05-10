/**
 * Deposit Records Table Schema
 * 
 * This script creates and configures the deposit_records table for tracking user deposits.
 * It includes table creation, indexes, RLS policies, and triggers for automatic timestamp updates.
 */

-- Create deposit records table
create table if not exists deposit_records (
  id uuid primary key default uuid_generate_v4(),  -- Unique identifier for each deposit record
  user_address text not null,                      -- User's wallet address
  tx_hash text not null unique,                    -- Unique transaction hash for verification
  amount bigint not null,                          -- Deposit amount in smallest unit
  created_at timestamptz default now(),            -- Record creation timestamp
  updated_at timestamptz default now()             -- Record last update timestamp
);

-- Create indexes for performance optimization
create index if not exists idx_deposit_records_user on deposit_records(user_address);      -- Index for user address lookups
create index if not exists idx_deposit_records_created_at on deposit_records(created_at);  -- Index for time-based queries
create index if not exists idx_deposit_records_amount on deposit_records(amount);          -- Index for amount-based queries

-- Enable Row Level Security (RLS)
alter table deposit_records enable row level security;

-- RLS Policy: Users can only view their own deposit records
create policy "Users can only view their own deposit records"
  on deposit_records for select
  using (true);  -- Note: Actual user validation should be implemented in the application layer

-- RLS Policy: Allow users to add their own deposit records
create policy "Users can add their own deposit records"
  on deposit_records for insert
  with check (true);  -- Note: Actual user validation should be implemented in the application layer

-- Function to automatically update timestamp
create or replace function trigger_set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for automatic timestamp updates
create trigger set_deposit_records_timestamp
before update on deposit_records
for each row
execute function trigger_set_timestamp();

-- Create view for deposit statistics
create or replace view user_deposit_stats as
select 
  user_address,
  count(*) as total_count,    -- Total number of deposits
  sum(amount) as total_amount  -- Total deposit amount
from 
  deposit_records
group by 
  user_address;
