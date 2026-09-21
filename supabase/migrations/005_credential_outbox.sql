create table if not exists credential_outbox (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  phone text not null,
  message text not null,
  status text not null default 'queued' check (status in ('queued','sent','failed')),
  error text,
  created_at timestamptz default now(),
  sent_at timestamptz
);
create index if not exists idx_credential_outbox_status on credential_outbox (status);
