-- Tapflow Initial Schema
-- Version 1.0 - January 2026

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations (multi-tenant)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'scale')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  usage_credits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  target_location TEXT NOT NULL,
  search_radius_miles INTEGER DEFAULT 25,
  ideal_customer_profile JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'draft')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prospects (discovered businesses)
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  website TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  source TEXT CHECK (source IN ('google_maps', 'yelp', 'apollo', 'manual', 'import')),
  source_id TEXT, -- External ID from source
  tech_stack JSONB,
  social_profiles JSONB,
  enrichment_data JSONB,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'enriched', 'scored', 'contacted', 'replied', 'converted', 'disqualified')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, source, source_id)
);

-- Contacts (people at prospects)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  email TEXT,
  email_verified BOOLEAN DEFAULT false,
  email_verification_date TIMESTAMPTZ,
  phone TEXT,
  linkedin_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Scores
CREATE TABLE lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE UNIQUE,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  tier TEXT CHECK (tier IN ('A', 'B', 'C')),
  scoring_factors JSONB,
  model_version TEXT DEFAULT 'v1',
  scored_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach Messages
CREATE TABLE outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  sequence_step INTEGER DEFAULT 1,
  subject TEXT,
  body TEXT,
  personalization_data JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'scheduled', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  external_message_id TEXT, -- ID from Instantly/Resend
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach Sequences (templates)
CREATE TABLE outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL, -- Array of {delay_days, subject_template, body_template}
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log (audit trail)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_campaigns_org_id ON campaigns(org_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_prospects_campaign_id ON prospects(campaign_id);
CREATE INDEX idx_prospects_status ON prospects(status);
CREATE INDEX idx_contacts_prospect_id ON contacts(prospect_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_lead_scores_prospect_id ON lead_scores(prospect_id);
CREATE INDEX idx_lead_scores_tier ON lead_scores(tier);
CREATE INDEX idx_outreach_messages_contact_id ON outreach_messages(contact_id);
CREATE INDEX idx_outreach_messages_status ON outreach_messages(status);
CREATE INDEX idx_activity_log_org_id ON activity_log(org_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- Row Level Security Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access data from their organization
CREATE POLICY "Users can view own org" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can view own profile" ON profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY "Users can access org campaigns" ON campaigns
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can access org prospects" ON prospects
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can access org contacts" ON contacts
  FOR ALL USING (
    prospect_id IN (
      SELECT id FROM prospects WHERE campaign_id IN (
        SELECT id FROM campaigns WHERE org_id IN (
          SELECT org_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can access org lead_scores" ON lead_scores
  FOR ALL USING (
    prospect_id IN (
      SELECT id FROM prospects WHERE campaign_id IN (
        SELECT id FROM campaigns WHERE org_id IN (
          SELECT org_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can access org outreach" ON outreach_messages
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can access org sequences" ON outreach_sequences
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can view org activity" ON activity_log
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update timestamps
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_outreach_messages_updated_at BEFORE UPDATE ON outreach_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_outreach_sequences_updated_at BEFORE UPDATE ON outreach_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create org and profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create new organization
  INSERT INTO organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.email))
  RETURNING id INTO new_org_id;
  
  -- Create profile linked to org
  INSERT INTO profiles (id, org_id, full_name, role)
  VALUES (
    NEW.id,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'owner'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
