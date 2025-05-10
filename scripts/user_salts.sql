-- 创建 zkLogin 用户盐值表
create table if not exists zklogin_user_salts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  provider text not null,
  provider_user_id text not null,
  audience text not null,
  salt text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(provider, provider_user_id, audience)
);

-- 创建索引提高查询效率
create index if not exists idx_zklogin_user_salts_provider on zklogin_user_salts(provider);
create index if not exists idx_zklogin_user_salts_provider_user_id on zklogin_user_salts(provider_user_id);
create index if not exists idx_zklogin_user_salts_user_id on zklogin_user_salts(user_id);

-- 启用 RLS
alter table zklogin_user_salts enable row level security;

-- RLS 策略：允许已登录用户查询
create policy "已登录用户可查询盐值"
  on zklogin_user_salts for select
  using (auth.role() = 'authenticated');

-- ✅ 修复后的插入策略：使用 WITH CHECK 而非 USING
create policy "服务角色可插入盐值"
  on zklogin_user_salts for insert
  with check (
    auth.jwt() ->> 'role' in ('service_role', 'supabase_admin', 'authenticated')
  );