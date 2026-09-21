-- DNU Student Union Core — Supabase/Postgres schema
-- Run in Supabase SQL editor. Idempotent-ish: uses IF NOT EXISTS where possible.
create extension if not exists "pgcrypto";

-- ---------- CORE ----------
create table if not exists committees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  head_user_id uuid,
  created_at timestamptz default now()
);

create table if not exists faculties (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid references faculties(id) on delete cascade,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (faculty_id, name)
);
create index if not exists idx_departments_faculty on departments (faculty_id);

create table if not exists academic_years (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid references faculties(id) on delete cascade,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (faculty_id, name)
);
create index if not exists idx_academic_years_faculty on academic_years (faculty_id);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  student_code text unique not null,
  full_name text not null,
  faculty_id uuid references faculties(id) on delete set null,
  department_id uuid references departments(id) on delete set null,
  academic_year text,
  phone text unique not null,
  email text,
  qr_token uuid unique not null default gen_random_uuid(),
  status text not null default 'active' check (status in ('active','inactive','graduated')),
  created_at timestamptz default now()
);
create index if not exists idx_students_faculty on students (faculty_id);
create index if not exists idx_students_department on students (department_id);
create index if not exists idx_students_year on students (academic_year);
create index if not exists idx_students_name on students (full_name);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete set null,
  phone text unique,
  email text unique,
  password_hash text not null,
  role text not null default 'student'
    check (role in ('super_admin','president','committee_head','event_manager','communication_manager','volunteer','student')),
  committee_id uuid references committees(id) on delete set null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists committee_members (
  committee_id uuid references committees(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  role_in_committee text default 'member',
  joined_at timestamptz default now(),
  primary key (committee_id, student_id)
);

-- ---------- EVENTS ----------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity int,
  committee_id uuid references committees(id) on delete set null,
  created_by uuid references users(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published','closed','cancelled')),
  qr_token uuid unique not null default gen_random_uuid(),
  requires_registration boolean default true,
  created_at timestamptz default now()
);

create table if not exists event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  status text not null default 'registered'
    check (status in ('registered','attended','cancelled','waitlist')),
  registered_at timestamptz default now(),
  attended_at timestamptz,
  check_in_method text check (check_in_method in ('qr','manual')),
  unique (event_id, student_id)
);
create index if not exists idx_reg_event on event_registrations (event_id);
create index if not exists idx_reg_student on event_registrations (student_id);

create table if not exists attendance_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  scanned_by_user_id uuid references users(id) on delete set null,
  scanned_at timestamptz default now()
);

-- ---------- COMMUNICATION (WhatsApp) ----------
create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  variables_json jsonb default '[]',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp','email','sms','inapp')),
  template_id uuid references message_templates(id) on delete set null,
  audience_filter_json jsonb default '{}',
  created_by uuid references users(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft','queued','sending','done','failed')),
  scheduled_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists campaign_recipients (
  campaign_id uuid references campaigns(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued','sent','delivered','failed')),
  sent_at timestamptz,
  delivered_at timestamptz,
  error text,
  primary key (campaign_id, student_id)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  title text not null,
  body text,
  type text,
  related_id uuid,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ---------- REQUESTS ----------
create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  type text not null check (type in ('complaint','suggestion','document','other')),
  title text not null,
  description text,
  status text not null default 'new'
    check (status in ('new','in_review','assigned','resolved','rejected')),
  assigned_to uuid references users(id) on delete set null,
  committee_id uuid references committees(id) on delete set null,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table if not exists request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  body text not null,
  created_at timestamptz default now()
);

-- ---------- POLLS ----------
create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid references users(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','open','closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  is_anonymous boolean default false,
  created_at timestamptz default now()
);

create table if not exists poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references polls(id) on delete cascade,
  text text not null
);

create table if not exists poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references polls(id) on delete cascade,
  option_id uuid references poll_options(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  voted_at timestamptz default now(),
  unique (poll_id, student_id)
);

-- ---------- ACTIVITY + BADGES (no points yet) ----------
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  type text not null check (type in ('event','volunteer','task','other')),
  title text not null,
  hours numeric default 0,
  event_id uuid references events(id) on delete set null,
  verified_by uuid references users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_activities_student on activities (student_id);

create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  icon text,
  is_active boolean default true
);

insert into badges (code, name, description) values
  ('sports_participant', 'مشارك رياضي', 'شارك في نشاط رياضي'),
  ('volunteer', 'متطوع', 'ساهم بساعات تطوعية'),
  ('event_organizer', 'منظم فعاليات', 'ساعد في تنظيم فعالية'),
  ('active_member', 'عضو نشط', 'مشاركة متميزة ومستمرة')
on conflict (code) do nothing;

create table if not exists student_badges (
  student_id uuid references students(id) on delete cascade,
  badge_id uuid references badges(id) on delete cascade,
  awarded_at timestamptz default now(),
  awarded_by uuid references users(id) on delete set null,
  reason text,
  primary key (student_id, badge_id)
);

create table if not exists student_stats (
  student_id uuid primary key references students(id) on delete cascade,
  events_attended int default 0,
  volunteer_hours numeric default 0,
  activities_count int default 0,
  last_updated timestamptz default now()
);

-- Future gamification (Phase 6+): add points_transactions + levels
-- without touching the tables above.

-- ---------- MIGRATION (only if you already ran an older version) ----------
-- alter table students alter column faculty drop not null;
-- alter table students alter column academic_year drop not null;
-- alter table users alter column email drop not null;
-- alter table users add column if not exists phone text unique;
-- faculties / departments (run the CREATE TABLEs above first, then):
-- alter table students add column if not exists faculty_id uuid references faculties(id);
-- alter table students add column if not exists department_id uuid references departments(id);

-- Academic years per faculty (new)
create table if not exists academic_years (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid references faculties(id) on delete cascade,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (faculty_id, name)
);
create index if not exists idx_academic_years_faculty on academic_years (faculty_id);

-- First super_admin: create AFTER running this schema, with YOUR OWN password:
--   1) register the phone from /register, then:
--   update users set role = 'super_admin' where phone = 'YOUR_PHONE';
-- (Never commit real passwords or sbp_/service keys to git.)