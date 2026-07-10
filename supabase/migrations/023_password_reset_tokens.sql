-- Tokens de recuperación de contraseña (residentes y personal)

create table password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_type text not null check (user_type in ('resident', 'staff')),
  user_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index password_reset_tokens_user_idx
  on password_reset_tokens (user_type, user_id);

create index password_reset_tokens_expires_idx
  on password_reset_tokens (expires_at)
  where used_at is null;

grant select, insert, update, delete on table public.password_reset_tokens to service_role;
