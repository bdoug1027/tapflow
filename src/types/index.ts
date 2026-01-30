// Database types matching Supabase schema

export interface Organization {
  id: string;
  name: string;
  plan: 'starter' | 'growth' | 'scale';
  stripe_customer_id: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  org_id: string;
  name: string;
  business_type: string;
  target_location: string;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
}

export interface Prospect {
  id: string;
  campaign_id: string;
  company_name: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  source: 'google_maps' | 'yelp' | 'apollo' | 'manual';
  created_at: string;
}

export interface Contact {
  id: string;
  prospect_id: string;
  name: string | null;
  title: string | null;
  email: string | null;
  email_verified: boolean;
  linkedin_url: string | null;
  is_primary: boolean;
}

export interface LeadScore {
  id: string;
  prospect_id: string;
  score: number;
  tier: 'A' | 'B' | 'C';
  scoring_factors: ScoringFactors;
  scored_at: string;
}

export interface ScoringFactors {
  website_quality: number;
  social_presence: number;
  tech_stack_fit: number;
  company_size: number;
  engagement_signals: number;
  notes: string[];
}

export interface OutreachMessage {
  id: string;
  contact_id: string;
  campaign_id: string;
  subject: string;
  body: string;
  status: 'draft' | 'approved' | 'sent' | 'replied' | 'bounced';
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  created_at: string;
}

// Inngest event types
export type TapflowEvents = {
  'campaign/created': { data: { campaign_id: string; org_id: string } };
  'discovery/started': { data: { campaign_id: string } };
  'prospect/found': { data: { prospect_id: string; campaign_id: string } };
  'prospect/enriched': { data: { prospect_id: string } };
  'prospect/scored': { data: { prospect_id: string; score: number; tier: string } };
  'outreach/generated': { data: { contact_id: string; message_id: string } };
  'outreach/approved': { data: { message_id: string } };
  'outreach/sent': { data: { message_id: string } };
  'reply/received': { data: { message_id: string; reply_text: string } };
};

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Dashboard view types
export interface ProspectWithScore extends Prospect {
  contacts: Contact[];
  lead_score: LeadScore | null;
}

export interface CampaignWithStats extends Campaign {
  prospect_count: number;
  contacted_count: number;
  replied_count: number;
}
