create table if not exists surveys (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','open','closed')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_surveys_event on surveys (event_id);

create table if not exists survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid references surveys(id) on delete cascade,
  question text not null,
  question_type text not null default 'choice' check (question_type in ('choice','text','rating')),
  options jsonb default '[]',
  is_required boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_survey_questions_survey on survey_questions (survey_id);

create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid references surveys(id) on delete cascade,
  question_id uuid references survey_questions(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  answer text,
  answered_at timestamptz default now(),
  unique (survey_id, question_id, student_id)
);
create index if not exists idx_survey_responses_survey on survey_responses (survey_id);
