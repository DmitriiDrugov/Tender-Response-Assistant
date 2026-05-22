-- Tender Workspace: new fields for Priority 1-2 features

-- requirements: requirement_type, next_action, owner/team/due_date/workflow_status,
--               confidence_reason, ai_assumptions, evidence_used, evidence_strength
alter table requirements
  add column if not exists requirement_type   text,
  add column if not exists next_action        text,
  add column if not exists owner_name         text,
  add column if not exists team               text,
  add column if not exists due_date           date,
  add column if not exists workflow_status    text not null default 'not_started',
  add column if not exists confidence_reason  text,
  add column if not exists ai_assumptions     text,
  add column if not exists evidence_used      text[] default '{}',
  add column if not exists evidence_strength  text;

-- risks: business_impact, owner/team, decision, mitigation, false positive
alter table risks
  add column if not exists business_impact       text,
  add column if not exists owner_name            text,
  add column if not exists team                  text,
  add column if not exists decision              text,
  add column if not exists mitigation            text,
  add column if not exists is_false_positive     boolean not null default false,
  add column if not exists false_positive_reason text;

-- required_documents: status text (may already exist), is_required, source_section, owner, due_date
alter table required_documents
  add column if not exists status         text not null default 'missing',
  add column if not exists is_required    boolean not null default true,
  add column if not exists source_section text,
  add column if not exists owner_name     text,
  add column if not exists due_date       date;

-- tenders: clarification_deadline, management_brief, bid_recommendation, bid_readiness_score
alter table tenders
  add column if not exists clarification_deadline    date,
  add column if not exists internal_review_deadline  date,
  add column if not exists final_approval_deadline   date,
  add column if not exists management_brief          text,
  add column if not exists bid_recommendation        text,
  add column if not exists bid_readiness_score       int;

-- clarification_questions: new table
create table if not exists clarification_questions (
  id             uuid        primary key default gen_random_uuid(),
  tender_id      uuid        not null references tenders(id) on delete cascade,
  requirement_id uuid        references requirements(id) on delete set null,
  reason         text,
  question_text  text        not null,
  priority       text        not null default 'medium',
  status         text        not null default 'draft',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists clarification_questions_tender_id_idx on clarification_questions(tender_id);

create trigger clarification_questions_updated_at
  before update on clarification_questions
  for each row execute function set_updated_at();
