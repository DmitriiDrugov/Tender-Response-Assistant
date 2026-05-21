alter table requirements
  add column draft_status text not null default 'pending'
    check (draft_status in ('pending', 'generating', 'ready', 'blocked', 'failed', 'skipped'));

-- Backfill existing rows that already have a draft_response
update requirements
  set draft_status = case
    when draft_response like '[REQUIRES BID MANAGER DECISION]%' then 'blocked'
    when draft_response is not null then 'ready'
    else 'pending'
  end
where draft_status = 'pending';
