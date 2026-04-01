export interface Lead {
  id: string
  // Person fields
  first_name?: string
  last_name?: string
  full_name?: string
  title?: string
  email?: string
  phone?: string
  linkedin?: string
  instagram?: string
  facebook?: string
  twitter?: string
  // Company fields
  company_name?: string
  industry?: string
  website?: string
  company_website?: string
  company_linkedin?: string
  company_instagram?: string
  company_facebook?: string
  company_twitter?: string
  company_size?: string
  // Location
  city?: string
  state?: string
  country?: string
  street_address?: string
  postal_code?: string
  // Contact extended
  personal_email?: string
  cc_email?: string
  job_title?: string
  company?: string
  // Company extended
  size?: string
  location?: string
  // Extended
  source?: string
  notes?: string
  instantly_id?: string
  notion_url?: string
  email_status?: string
  email_type?: string
  specialty?: string
  sub_specialties?: string
  star_rating?: string
  number_of_reviews?: string
  lead_quality_remarks?: string
  premium_badge?: string
  detail_page_url?: string
  experience?: string
  skills?: string
  // Pipeline & scoring
  stage: string
  stage_label: string
  lead_score?: number
  lead_tier?: 'hot' | 'warm' | 'cold'
  created_at?: string
  // Extra fields from various sources (kept for compatibility)
  raw_data?: Record<string, unknown>
  [key: string]: unknown
}

export type Contact = Lead
export type Company = Lead

// Helper functions for detecting record type by field presence
export const isCompanyOnly = (lead: Lead) => !!lead.company_name && !lead.first_name && !lead.full_name
export const hasPersonData = (lead: Lead) => !!lead.first_name || !!lead.full_name
export const hasCompanyData = (lead: Lead) => !!lead.company_name

export interface Activity {
  id: number
  lead_id: string
  activity_type: 'email' | 'call' | 'note' | 'stage_change' | 'whatsapp'
  description: string
  created_at: string
}

export interface DashboardStats {
  total_leads: number
  total_companies: number
  total_contacts: number
  outreaches_today: number
  emails_today: number
  calls_today: number
  notes_today: number
  stage_changes_today: number
  meetings_count: number
  proposals_count: number
  closed_won_count: number
  closed_lost_count: number
  response_rate: number
  conversion_rate: number
  free_trial_count: number
  clients_paid: number
  outreach_to_trial: number
  revenue_generated: number
  total_spent: number
  stage_counts: Record<string, number>
}

export interface PipelineData {
  stages: Record<string, Lead[]>
  stage_counts: Record<string, number>
  stage_order: string[]
  stage_labels: Record<string, string>
}

export interface ChartDataPoint {
  day: string
  emails: number
  calls: number
  notes: number
}

export interface InstantlyOverview {
  emails_sent: number
  contacted: number
  leads_count: number
  new_leads_contacted: number
  open_count: number
  unique_opens: number
  reply_count: number
  unique_replies: number
  bounce_count: number
  unsubscribed: number
  link_clicks: number
  unique_clicks: number
  completed: number
  total_opportunities: number
  total_opportunity_value: number
  total_interested: number
  total_meeting_booked: number
  total_meeting_completed: number
  total_closed: number
  open_rate: number
  reply_rate: number
  click_rate: number
  bounce_rate: number
}

export interface InstantlyCampaign {
  id: string
  name: string
  status: number
  status_label: string
}

export interface CampaignAnalytics {
  campaign_id: string
  campaign_name: string
  status: number
  status_label: string
  emails_sent: number
  contacted: number
  opens: number
  replies: number
  bounced: number
  unsubscribed: number
  clicks: number
  completed: number
  opportunities: number
  open_rate: number
  reply_rate: number
  click_rate: number
  bounce_rate: number
}

export interface DailyEmailStat {
  date: string
  sent: number
  opened: number
  replies: number
  clicks: number
  bounced: number
}

export interface CountryStat {
  country: string
  total_leads: number
  contacted: number
  opened: number
  replied: number
  clicked: number
  bounced: number
  interested: number
  meeting_booked: number
  open_rate: number
  reply_rate: number
}

export interface InstantlyLead {
  id: string
  email: string
  first_name: string
  last_name: string
  company_name: string
  company_domain: string
  phone: string
  country: string
  city: string
  status: number
  status_label: string
  interest: number | null
  interest_label: string
  email_open_count: number
  email_reply_count: number
  email_click_count: number
  campaign_id: string
}

export interface LeadStatusBreakdown {
  by_interest: Record<string, number>
  by_status: Record<string, number>
  total: number
}

export interface EmailOverviewData {
  overview: InstantlyOverview
  campaigns: InstantlyCampaign[]
  campaign_analytics: CampaignAnalytics[]
  error: string | null
}

export interface EmailDailyData {
  daily: DailyEmailStat[]
  error: string | null
}

export interface EmailCountryData {
  country_stats: CountryStat[]
  error: string | null
}

export interface EmailLeadsData {
  leads: InstantlyLead[]
  lead_status_breakdown: LeadStatusBreakdown
  error: string | null
}

// --- AI Agent Types ---

export interface AgentModelOption {
  id: string
  name: string
}

export interface AgentStatus {
  provider: string
  model: string
  configured: boolean
  available_models: AgentModelOption[]
}

export interface LeadContext {
  context: Record<string, unknown>
  brief: string
}

export interface DraftEmailRequest {
  lead_id: string
  custom_instructions?: string
  model?: string
}

export interface FollowUpRequest {
  lead_id: string
  follow_up_number?: number
  previous_emails?: string
  custom_instructions?: string
  model?: string
}

export interface LinkedInPostRequest {
  topic: string
  style?: string
  custom_instructions?: string
  model?: string
}

export interface CopywritingRequest {
  content_type: 'landing_page' | 'ad_copy' | 'case_study' | 'website_section'
  topic: string
  audience?: string
  custom_instructions?: string
  model?: string
}

export interface FreeformRequest {
  prompt: string
  lead_id?: string
  system?: string
  model?: string
}

export interface AgentEmailResult {
  email_body: string
  lead_id: string
  lead_name: string
  email_to: string
  type: string
  follow_up_number?: number
  lead_brief: string
}

export interface AgentContentResult {
  content: string
  type: string
  topic?: string
  style?: string
  audience?: string
  lead_id?: string
}

// --- Sync Types ---

export interface SyncContact {
  email: string
  first_name: string
  last_name: string
  company: string
  title: string
  phone: string
  linkedin: string
  notes: string
  valid: boolean
}

export interface SyncPreview {
  missing_contacts: SyncContact[]
  excel_total: number
  instantly_total: number
  already_synced: number
  missing_count: number
  error: string | null
}

export interface SyncCampaign {
  id: string
  name: string
  status: number
  status_label: string
}

export interface SyncPushResult {
  pushed: number
  failed: number
  errors: string[]
}
