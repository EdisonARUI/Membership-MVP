-- 启用扩展（如果尚未启用）
-- create extension if not exists "uuid-ossp";

-- 创建抽奖记录表
create table if not exists lottery_records (
  id uuid primary key default uuid_generate_v4(),
  player_address text not null,
  tx_hash text not null unique,
  win_amount bigint not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 创建索引
create index if not exists idx_lottery_records_player on lottery_records(player_address);
create index if not exists idx_lottery_records_created_at on lottery_records(created_at);
create index if not exists idx_lottery_records_win_amount on lottery_records(win_amount);

-- 启用 RLS
alter table lottery_records enable row level security;

-- 所有用户可查看抽奖记录
create policy "所有用户可查看抽奖记录"
  on lottery_records for select
  using (true);

-- 新策略：允许用户添加自己的抽奖记录
create policy "用户可以添加自己的抽奖记录"
  on lottery_records for insert
  with check (true);  -- 允许所有插入，因为验证在API层进行

-- 如果需要更严格的控制，可以使用以下策略（假设用户认证信息与player_address有关联）
-- create policy "用户可以添加自己的抽奖记录"
--   on lottery_records for insert
--   with check (
--     player_address = auth.uid()::text  -- 如果player_address与用户ID相关
--     -- 或者其他能验证用户身份的条件
--   );

-- 自动更新时间戳
create or replace function trigger_set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 创建触发器
create trigger set_lottery_records_timestamp
before update on lottery_records
for each row
execute function trigger_set_timestamp();