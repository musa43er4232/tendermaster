-- ============================================================================
-- TenderMaster — Supabase/Postgres schema + Row Level Security
--
-- Run this once in the Supabase SQL editor (SQL → New query → paste → Run).
-- It creates one company per authenticated user and scopes every record to
-- that user, plus a subscriptions table the Stripe webhook writes to.
--
-- Also create a Storage bucket named `documents` (private) for uploaded files
-- (certificates, stamps, signatures, generated PDFs) — policies at the bottom.
-- ============================================================================

-- ---------- Tables ----------

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legal_name text not null,
  brand_name text,
  org_type text,
  head_office text,
  phone text,
  email text,
  incorp_place text,
  incorp_year int,
  secp_number text,
  ntn text,
  stamp_doc_id uuid,
  signature_doc_id uuid,
  logo_doc_id uuid,
  readiness_score int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists credentials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  kind text not null,
  label text,
  number text,
  category text,
  issue_date timestamptz,
  expiry_date timestamptz,
  status text not null default 'active',
  document_id uuid
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  client text,
  value_pkr numeric,
  sector text,
  role text,
  start_date timestamptz,
  end_date timestamptz,
  status text not null default 'completed',
  capacity text,
  completion_cert_id uuid
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  designation text,
  qualification text,
  pec_reg text,
  years int,
  nationality text,
  cv_doc_id uuid
);

create table if not exists financials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  year int not null,
  turnover_pkr numeric,
  net_worth_pkr numeric,
  audited_doc_id uuid,
  unique (company_id, year)
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  kind text not null,
  title text not null,
  file_name text,
  file_path text,        -- Storage object path in the `documents` bucket
  mime_type text,
  size_bytes int,
  expiry_date timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists tenders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  agency text,
  work_type text,
  ref_no text,
  estimated_cost_pkr numeric,
  bid_value_pkr numeric,
  earnest_money_pkr numeric,
  earnest_money_pct numeric,
  required_pec_cat text,
  method text,
  validity_days int,
  completion_time text,
  submission_deadline timestamptz,
  opening_date timestamptz,
  summary text,
  extracted_json jsonb,
  verdict text,
  predicted_score int,
  verdict_reasons jsonb,
  status text not null default 'evaluating',
  outcome text,
  outcome_reason text,
  agreement_amount_pkr numeric,
  award_doc_id uuid,
  submitted_at timestamptz,
  submission_pdf_path text,
  submission_generated_at timestamptz,
  submission_page_count int,
  submission_missing_count int,
  created_at timestamptz not null default now()
);

create table if not exists requirements (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references tenders(id) on delete cascade,
  text text not null,
  type text not null,
  category text,
  result text,
  detail text
);

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references tenders(id) on delete cascade,
  label text not null,
  required boolean not null default true,
  status text not null default 'missing',
  document_id uuid,
  ai_help text,
  sort_order int not null default 0
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  tender_id uuid references tenders(id) on delete cascade,
  kind text not null,
  message text not null,
  due_date timestamptz not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  agency text,
  source text,
  work_type text,
  ref_no text,
  estimated_cost_pkr numeric,
  earnest_money_pct numeric,
  required_pec_cat text,
  required_registrations jsonb,
  city text,
  submission_deadline timestamptz,
  published_date timestamptz,
  url text,
  status text not null default 'new',
  imported_tender_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  price_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_credentials_company on credentials(company_id);
create index if not exists idx_projects_company on projects(company_id);
create index if not exists idx_documents_company on documents(company_id);
create index if not exists idx_tenders_company on tenders(company_id);
create index if not exists idx_requirements_tender on requirements(tender_id);
create index if not exists idx_checklist_tender on checklist_items(tender_id);
create index if not exists idx_reminders_company on reminders(company_id);
create index if not exists idx_leads_company on leads(company_id);

-- ---------- Row Level Security ----------

alter table companies       enable row level security;
alter table credentials     enable row level security;
alter table projects        enable row level security;
alter table people          enable row level security;
alter table financials      enable row level security;
alter table documents       enable row level security;
alter table tenders         enable row level security;
alter table requirements    enable row level security;
alter table checklist_items enable row level security;
alter table reminders       enable row level security;
alter table leads           enable row level security;
alter table subscriptions   enable row level security;

-- A user owns their own company row.
create policy "own company" on companies
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Child tables: accessible when the parent company belongs to the user.
do $$
declare t text;
begin
  foreach t in array array['credentials','projects','people','financials','documents','tenders','reminders','leads']
  loop
    execute format($f$
      create policy "own %1$s" on %1$s
        for all
        using (company_id in (select id from companies where user_id = auth.uid()))
        with check (company_id in (select id from companies where user_id = auth.uid()));
    $f$, t);
  end loop;
end $$;

-- Tender children (requirements, checklist_items) key off the tender's company.
create policy "own requirements" on requirements
  for all
  using (tender_id in (select id from tenders where company_id in (select id from companies where user_id = auth.uid())))
  with check (tender_id in (select id from tenders where company_id in (select id from companies where user_id = auth.uid())));

create policy "own checklist" on checklist_items
  for all
  using (tender_id in (select id from tenders where company_id in (select id from companies where user_id = auth.uid())))
  with check (tender_id in (select id from tenders where company_id in (select id from companies where user_id = auth.uid())));

-- Subscriptions: user reads their own; writes come from the service role
-- (webhook), which bypasses RLS entirely.
create policy "read own subscription" on subscriptions
  for select using (user_id = auth.uid());

-- ---------- Storage (run after creating a private bucket named `documents`) ----------
-- create policy "own files read" on storage.objects for select
--   using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy "own files write" on storage.objects for insert
--   with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy "own files update" on storage.objects for update
--   using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy "own files delete" on storage.objects for delete
--   using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
