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

-- 只有特定角色可以添加抽奖记录（注意：使用 WITH CHECK）
create policy "只有管理员和服务角色可以添加抽奖记录"
  on lottery_records for insert
  with check (
    auth.jwt() ->> 'role' in ('service_role', 'supabase_admin')
  );

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