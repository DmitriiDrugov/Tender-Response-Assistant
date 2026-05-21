-- Tender Response Assistant — initial schema
-- Demo is passcode-gated at the application layer; RLS intentionally disabled.

create extension if not exists "pgcrypto";

create table tenders (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled tender',
  issuing_authority text,
  country text,
  language text,
  publication_date date,
  submission_deadline date,
  submission_method text,
  estimated_value_amount numeric,
  estimated_value_currency text,
  contract_duration text,
  scope_summary text,
  tender_id_external text,
  raw_text text,
  pdf_storage_path text,
  extraction_status text not null default 'pending',
  matching_status text not null default 'pending',
  drafting_status text not null default 'pending',
  risks_status text not null default 'pending',
  drafting_progress_total int not null default 0,
  drafting_progress_done int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tender_lots (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references tenders(id) on delete cascade,
  lot_id_external text,
  title text,
  description text,
  estimated_value_amount numeric,
  estimated_value_currency text
);
create index tender_lots_tender_id_idx on tender_lots(tender_id);

create table capabilities (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  description text,
  evidence text,
  created_at timestamptz not null default now()
);
create index capabilities_category_idx on capabilities(category);

create table requirements (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references tenders(id) on delete cascade,
  ordinal int not null default 0,
  text text not null,
  category text,
  is_mandatory boolean not null default false,
  source_excerpt text,
  match_status text,
  matched_capability_ids uuid[] default '{}',
  gap_description text,
  suggested_action text,
  confidence text,
  draft_response text,
  reviewer_notes text,
  reviewed_at timestamptz,
  overridden_by_user boolean not null default false,
  updated_at timestamptz not null default now()
);
create index requirements_tender_id_idx on requirements(tender_id);
create index requirements_status_idx on requirements(tender_id, match_status);

create table risks (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references tenders(id) on delete cascade,
  category text not null,
  description text not null,
  source_location text,
  severity text not null,
  recommended_action text
);
create index risks_tender_id_idx on risks(tender_id);

create table required_documents (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references tenders(id) on delete cascade,
  name text not null,
  checked boolean not null default false
);
create index required_documents_tender_id_idx on required_documents(tender_id);

create table evaluation_criteria (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references tenders(id) on delete cascade,
  criterion text not null,
  weight_percent numeric
);
create index evaluation_criteria_tender_id_idx on evaluation_criteria(tender_id);

create table request_logs (
  id uuid primary key default gen_random_uuid(),
  route text not null,
  model text,
  input_tokens int,
  output_tokens int,
  duration_ms int,
  status text not null,
  error text,
  tender_id uuid references tenders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index request_logs_created_at_idx on request_logs(created_at desc);

-- updated_at trigger for tenders and requirements
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tenders_updated_at before update on tenders
for each row execute function set_updated_at();

create trigger requirements_updated_at before update on requirements
for each row execute function set_updated_at();

-- Storage bucket for tender PDFs (idempotent)
insert into storage.buckets (id, name, public)
values ('tender-pdfs', 'tender-pdfs', false)
on conflict (id) do nothing;
