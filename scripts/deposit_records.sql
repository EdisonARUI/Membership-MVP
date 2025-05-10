-- 创建充值记录表
create table if not exists deposit_records (
  id uuid primary key default uuid_generate_v4(),
  user_address text not null,
  tx_hash text not null unique,
  amount bigint not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 创建索引
create index if not exists idx_deposit_records_user on deposit_records(user_address);
create index if not exists idx_deposit_records_created_at on deposit_records(created_at);
create index if not exists idx_deposit_records_amount on deposit_records(amount);

-- 启用 RLS
alter table deposit_records enable row level security;

-- 用户只能查看自己的充值记录
create policy "用户只能查看自己的充值记录"
  on deposit_records for select
  using (ture);

-- 允许用户添加自己的充值记录
create policy "用户可以添加自己的充值记录"
  on deposit_records for insert
  with check (true);

-- 自动更新时间戳
create or replace function trigger_set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 创建触发器
create trigger set_deposit_records_timestamp
before update on deposit_records
for each row
execute function trigger_set_timestamp();

-- 创建视图用于统计充值
create or replace view user_deposit_stats as
select 
  user_address,
  count(*) as total_count,
  sum(amount) as total_amount
from 
  deposit_records
group by 
  user_address;
