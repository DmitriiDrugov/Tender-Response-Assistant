create table pipeline_events (
  id          uuid        primary key default gen_random_uuid(),
  tender_id   uuid        references tenders(id) on delete cascade,
  stage       text        not null,
  status      text        not null,
  error       text,
  created_at  timestamptz not null default now()
);
create index pipeline_events_created_at_idx on pipeline_events(created_at desc);
create index pipeline_events_tender_id_idx  on pipeline_events(tender_id);
