/**
 * Lottery Records Table Schema
 * 
 * This script creates and configures the lottery_records table for tracking lottery participation
 * and winnings. It includes table creation, indexes, RLS policies, and triggers for automatic
 * timestamp updates.
 */

-- Enable UUID extension if not already enabled
-- create extension if not exists "uuid-ossp";

-- Create lottery records table
create table if not exists lottery_records (
  id uuid primary key default uuid_generate_v4(),  -- Unique identifier for each lottery record
  player_address text not null,                    -- Player's wallet address
  tx_hash text not null unique,                    -- Unique transaction hash for verification
  win_amount bigint not null default 0,            -- Amount won in the lottery
  created_at timestamptz default now(),            -- Record creation timestamp
  updated_at timestamptz default now()             -- Record last update timestamp
);

-- Create indexes for performance optimization
create index if not exists idx_lottery_records_player on lottery_records(player_address);      -- Index for player address lookups
create index if not exists idx_lottery_records_created_at on lottery_records(created_at);      -- Index for time-based queries
create index if not exists idx_lottery_records_win_amount on lottery_records(win_amount);      -- Index for win amount queries

-- Enable Row Level Security (RLS)
alter table lottery_records enable row level security;

-- RLS Policy: All users can view lottery records
create policy "All users can view lottery records"
  on lottery_records for select
  using (true);

-- RLS Policy: Allow users to add their own lottery records
create policy "Users can add their own lottery records"
  on lottery_records for insert
  with check (true);  -- Note: Actual user validation should be implemented in the application layer

-- Alternative stricter policy (commented out)
-- create policy "Users can add their own lottery records"
--   on lottery_records for insert
--   with check (
--     player_address = auth.uid()::text  -- If player_address is related to user ID
--     -- Or other user identity verification conditions
--   );

-- Function to automatically update timestamp
create or replace function trigger_set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for automatic timestamp updates
create trigger set_lottery_records_timestamp
before update on lottery_records
for each row
execute function trigger_set_timestamp();