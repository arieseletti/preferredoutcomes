-- ============================================================================
-- PREFERRED OUTCOMES // INTELLIGENCE DESK — CLOUDFLARE D1 SCHEMA
-- ============================================================================

-- 1. Paying Entities (Direct Clients & White-Label Agencies)
-- Isolates Agency A completely from Agency B and direct clients.
CREATE TABLE IF NOT EXISTS accounts (
  account_id TEXT PRIMARY KEY,
  account_type TEXT NOT NULL CHECK(account_type IN ('direct', 'white_label')),
  stripe_customer_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT UNIQUE,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  purchased_services_json TEXT NOT NULL DEFAULT '[]', -- Exact svc-* IDs purchased
  brand_name TEXT,                                    -- White-label report header name
  brand_logo_r2_key TEXT,                             -- White-label logo path in R2
  seat_limit INTEGER NOT NULL DEFAULT 1,              -- 1 direct, 5/10+ white-label
  onboarding_completed INTEGER NOT NULL DEFAULT 0,    -- 0 = pending, 1 = complete
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Strictly Separated Monitored Workspaces
-- Each white-label client (1..50+) gets its own isolated row, folder, and recipients.
CREATE TABLE IF NOT EXISTS workspaces (
  workspace_id TEXT PRIMARY KEY,
  parent_account_id TEXT NOT NULL,
  target_company TEXT NOT NULL,
  target_url TEXT,
  competitor_urls_json TEXT NOT NULL DEFAULT '[]',    -- JSON array of up to 5 rival URLs
  active_services_json TEXT NOT NULL DEFAULT '[]',    -- JSON array of active svc-* IDs
  delivery_emails_json TEXT NOT NULL DEFAULT '[]',    -- JSON array of recipient emails
  locale TEXT NOT NULL DEFAULT 'en-US',               -- Supports global / non-English briefs
  timezone TEXT NOT NULL DEFAULT 'America/New_York',  -- Powers Monday 06:00 local delivery
  schedule TEXT NOT NULL DEFAULT 'weekly_mon'
    CHECK(schedule IN ('one_time', 'weekly_mon', 'quarterly', 'realtime')),
  context_notes TEXT,                                 -- Target-specific focus from onboarding
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('pending_onboarding', 'active', 'paused', 'completed')),
  last_delivered_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

-- 3. Non-Stacking 25% Amortized Diagnostic Credit Ledger
-- Tracks only the single highest One-Time diagnostic fee per client (14-day window).
CREATE TABLE IF NOT EXISTS diagnostic_credits (
  credit_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  source_service_id TEXT NOT NULL,                    -- e.g., svc-mirror-audit
  original_amount_cents INTEGER NOT NULL,
  remaining_cents INTEGER NOT NULL,
  active_subscription_id TEXT,
  expires_at TEXT NOT NULL,                           -- ISO timestamp (+14 days)
  status TEXT NOT NULL DEFAULT 'available'
    CHECK(status IN ('available', 'active', 'exhausted', 'forfeited', 'expired')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Historical Intelligence Archive (Data Vault Index)
-- Stores structured metrics per run to power automatic 90-day Quarterly Rollups.
CREATE TABLE IF NOT EXISTS intel_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  metrics_json TEXT NOT NULL,                         -- Rival prices, review counts, AI share %
  r2_evidence_key TEXT NOT NULL,                      -- R2 path: accounts/{account_id}/{workspace_id}/{date}/
  audit_passed INTEGER NOT NULL DEFAULT 1,            -- 1 = passed cross-model faithfulness gate
  delivered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE
);

-- 5. Automated Lifecycle Trigger Log
-- Prevents duplicate Day-10 credit reminders, Day-21 quarterly pitches, or Day-60 annual offers.
CREATE TABLE IF NOT EXISTS lifecycle_events (
  event_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  trigger_key TEXT NOT NULL,                          -- e.g., day_10_credit_reminder, day_21_quarterly_pitch
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_id, trigger_key),
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

-- 6. Autonomous Outreach & Benchmark Mini-Study Pipeline
-- Tracks prospects, 3-signal pre-scan routing, mini-study batches, and follow-up state.
CREATE TABLE IF NOT EXISTS outreach_prospects (
  prospect_id TEXT PRIMARY KEY,
  study_batch_slug TEXT,                              -- Links prospect to a public mini-study
  company_name TEXT NOT NULL,
  website_url TEXT,
  contact_name TEXT,
  contact_email TEXT UNIQUE NOT NULL,
  industry TEXT,
  city_region TEXT,
  locale TEXT NOT NULL DEFAULT 'en-US',
  recommended_service_id TEXT,                        -- Output of 3-signal pre-scan router
  prescan_findings_json TEXT,                         -- Verified 2-bullet teaser facts
  outreach_status TEXT NOT NULL DEFAULT 'queued'
    CHECK(outreach_status IN ('queued', 'sent_initial', 'sent_followup_1', 'sent_followup_2', 'replied', 'converted', 'unsubscribed')),
  last_contacted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(contact_email);
CREATE INDEX IF NOT EXISTS idx_accounts_session ON accounts(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_account ON workspaces(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON workspaces(status, schedule);
CREATE INDEX IF NOT EXISTS idx_credits_email_status ON diagnostic_credits(contact_email, status);
CREATE INDEX IF NOT EXISTS idx_credits_sub ON diagnostic_credits(active_subscription_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_workspace ON intel_snapshots(workspace_id, delivered_at);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach_prospects(outreach_status, last_contacted_at);
