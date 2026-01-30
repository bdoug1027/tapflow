-- Tapflow Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ORGANIZATIONS & USERS
-- ============================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'scale')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  monthly_lead_limit INTEGER DEFAULT 100,
  leads_used_this_month INTEGER DEFAULT 0,
  billing_cycle_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CAMPAIGNS
-- ============================================

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  target_location TEXT NOT NULL,
  target_radius_miles INTEGER DEFAULT 25,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  discovery_sources JSONB DEFAULT '["google_maps"]'::jsonb,
  ideal_customer_profile JSONB DEFAULT '{}'::jsonb,
  email_sequence_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROSPECTS (Businesses Found)
-- ============================================

CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  website TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  source TEXT CHECK (source IN ('google_maps', 'yelp', 'apollo', 'manual')),
  source_id TEXT,
  google_rating DECIMAL(2,1),
  google_review_count INTEGER,
  yelp_rating DECIMAL(2,1),
  yelp_review_count INTEGER,
  business_category TEXT,
  tech_stack JSONB DEFAULT '[]'::jsonb,
  social_profiles JSONB DEFAULT '{}'::jsonb,
  enrichment_status TEXT DEFAULT 'pending' CHECK (enrichment_status IN ('pending', 'in_progress', 'completed', 'failed')),
  research_status TEXT DEFAULT 'pending' CHECK (research_status IN ('pending', 'in_progress', 'completed', 'failed')),
  research_data JSONB DEFAULT '{}'::jsonb,
  pain_points JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, source, source_id)
);

-- ============================================
-- CONTACTS (People at Prospects)
-- ============================================

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  email TEXT,
  email_verified BOOLEAN DEFAULT false,
  email_verification_source TEXT,
  phone TEXT,
  linkedin_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEAD SCORING
-- ============================================

CREATE TABLE lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  tier TEXT CHECK (tier IN ('A', 'B', 'C', 'D')),
  scoring_factors JSONB DEFAULT '{}'::jsonb,
  website_quality_score INTEGER,
  online_presence_score INTEGER,
  business_signals_score INTEGER,
  fit_score INTEGER,
  scored_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prospect_id)
);

-- ============================================
-- OUTREACH & EMAIL
-- ============================================

CREATE TABLE outreach_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  sequence_id UUID,
  step_number INTEGER DEFAULT 1,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  personalization_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'scheduled', 'sent', 'failed')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AGENT JOBS (for Inngest tracking)
-- ============================================

CREATE TABLE agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('discovery', 'enrichment', 'research', 'scoring', 'content_generation', 'outreach')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  inngest_run_id TEXT,
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_org_id ON profiles(org_id);
CREATE INDEX idx_campaigns_org_id ON campaigns(org_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_prospects_campaign_id ON prospects(campaign_id);
CREATE INDEX idx_prospects_enrichment_status ON prospects(enrichment_status);
CREATE INDEX idx_contacts_prospect_id ON contacts(prospect_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_lead_scores_prospect_id ON lead_scores(prospect_id);
CREATE INDEX idx_lead_scores_tier ON lead_scores(tier);
CREATE INDEX idx_outreach_emails_prospect_id ON outreach_emails(prospect_id);
CREATE INDEX idx_outreach_emails_status ON outreach_emails(status);
CREATE INDEX idx_agent_jobs_campaign_id ON agent_jobs(campaign_id);
CREATE INDEX idx_agent_jobs_status ON agent_jobs(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Organizations: users can view their org
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Campaigns: users can CRUD campaigns in their org
CREATE POLICY "Users can view org campaigns" ON campaigns
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert org campaigns" ON campaigns
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update org campaigns" ON campaigns
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete org campaigns" ON campaigns
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Prospects: access through campaigns
CREATE POLICY "Users can view org prospects" ON prospects
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert org prospects" ON prospects
  FOR INSERT WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update org prospects" ON prospects
  FOR UPDATE USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Contacts: access through prospects
CREATE POLICY "Users can view org contacts" ON contacts
  FOR SELECT USING (
    prospect_id IN (
      SELECT p.id FROM prospects p
      JOIN campaigns c ON p.campaign_id = c.id
      WHERE c.org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert org contacts" ON contacts
  FOR INSERT WITH CHECK (
    prospect_id IN (
      SELECT p.id FROM prospects p
      JOIN campaigns c ON p.campaign_id = c.id
      WHERE c.org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Lead scores: access through prospects
CREATE POLICY "Users can view org lead scores" ON lead_scores
  FOR SELECT USING (
    prospect_id IN (
      SELECT p.id FROM prospects p
      JOIN campaigns c ON p.campaign_id = c.id
      WHERE c.org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Outreach emails: access through prospects
CREATE POLICY "Users can view org outreach emails" ON outreach_emails
  FOR SELECT USING (
    prospect_id IN (
      SELECT p.id FROM prospects p
      JOIN campaigns c ON p.campaign_id = c.id
      WHERE c.org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update org outreach emails" ON outreach_emails
  FOR UPDATE USING (
    prospect_id IN (
      SELECT p.id FROM prospects p
      JOIN campaigns c ON p.campaign_id = c.id
      WHERE c.org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Agent jobs: access through org
CREATE POLICY "Users can view org agent jobs" ON agent_jobs
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outreach_emails_updated_at BEFORE UPDATE ON outreach_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create a new organization for the user
  INSERT INTO organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || '''s Organization')
  RETURNING id INTO new_org_id;

  -- Create the user's profile
  INSERT INTO profiles (id, org_id, full_name, role)
  VALUES (
    NEW.id,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'owner'
  );

  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
