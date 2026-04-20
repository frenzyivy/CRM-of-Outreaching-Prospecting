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
  stage_updated_at?: string
  lead_score?: number
  lead_tier?: 'hot' | 'warm' | 'cold'
  created_at?: string
  // Email platform assignment
  email_platform?: 'instantly' | 'convertkit' | 'lemlist' | 'smartlead' | null
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

// ---------------------------------------------------------------------------
// Normalized schema types (post-migration: companies / locations / contacts)
// ---------------------------------------------------------------------------

export interface NormalizedContact {
  id: string
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  title?: string
  phone?: string
  linkedin_url?: string
  instagram_url?: string
  specialty?: string
  sub_specialties?: string
  company_id?: string
  location_id?: string
  email_status?: string
  email_opens?: number
  email_replies?: number
  email_clicks?: number
  email_bounced?: boolean
  last_email_event?: string
  last_email_event_at?: string
  instantly_synced?: boolean
  instantly_campaign_id?: string
  email_platform?: string | null
  source?: string
  raw_data?: Record<string, unknown>
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface NormalizedLocation {
  id: string
  company_id: string
  city?: string
  state?: string
  country?: string
  street_address?: string
  postal_code?: string
  phone?: string
  created_at?: string
  updated_at?: string
  leads?: NormalizedContact[]   // populated in get_company_detail
}

export interface NormalizedCompany {
  id: string
  name: string
  domain: string
  industry?: string
  size?: string
  phone?: string
  linkedin_url?: string
  instagram_url?: string
  facebook_url?: string
  twitter_url?: string
  country?: string
  notes?: string
  pipeline_stage: string
  source?: string
  star_rating?: number
  number_of_reviews?: number
  created_at?: string
  updated_at?: string
  // Computed by company_list_view
  location_count?: number
  lead_count?: number
  // Populated by get_company_detail
  locations?: NormalizedLocation[]
  leads?: NormalizedContact[]
}

export interface Activity {
  id: number
  lead_id: string
  activity_type: 'email' | 'call' | 'note' | 'stage_change'
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
  excel_last_modified: number
  excel_error: string | null
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
  unsub_rate: number
  date_from?: string
  date_to?: string
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
  interested: number
  meetings_booked: number
  open_rate: number
  reply_rate: number
  click_rate: number
  bounce_rate: number
  unsub_rate: number
}

export interface DailyEmailStat {
  date: string
  sent: number
  opened: number
  replies: number
  clicks: number
  bounced: number
  unsubscribed: number
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
  specialty: string
  status: number
  status_label: string
  interest: number | null
  interest_label: string
  email_open_count: number
  email_reply_count: number
  email_click_count: number
  campaign_id: string
}

export interface SequenceStep {
  step_number: number
  emails_sent: number
  unique_opens: number
  unique_replies: number
  unique_clicks: number
  open_rate: number
  reply_rate: number
}

export interface SpecialtyStat {
  specialty: string
  total_leads: number
  opened: number
  replied: number
  interested: number
  open_rate: number
  reply_rate: number
}

export interface InstantlySyncStatus {
  last_sync_at: string | null
  last_sync_ok: boolean | null
  errors: string[]
  platforms_synced: string[]
  records_fetched?: number
  records_upserted?: number
}

export interface CampaignDetail {
  campaign_id: string
  summary: CampaignAnalytics | null
  sequence_steps: SequenceStep[]
  daily: DailyEmailStat[]
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
  sequence_steps: SequenceStep[]
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
  specialty_stats: SpecialtyStat[]
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

// --- Analytics Types ---

export interface AnalyticsSummary {
  unique_companies: number
  total_locations: number
  unique_leads: number
  total_rows: number
  total_unique_emails: number
  leads_with_email: number
  leads_with_phone: number
  leads_with_linkedin: number
  companies_with_phone: number
  avg_completeness: number
  email_status: Array<{ status: string; count: number }>
  country: Array<{ country: string; count: number }>
  company_size: Array<{ size: string; count: number }>
  lead_quality: Array<{ tier: string; count: number }>
  completeness_buckets: Array<{ bucket: string; count: number }>
  duplicates: {
    total_lead_rows: number
    unique_lead_count: number
    unique_company_count: number
    total_rows: number
  }
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
  skipped: number
  failed: number
  errors: string[]
}

// --- Multi-Tool Email Hub Types ---

export type EmailPlatformId = 'instantly' | 'convertkit' | 'lemlist' | 'smartlead'

export interface EmailToolInfo {
  id: EmailPlatformId
  name: string
  connected: boolean
}

export interface ToolQuota {
  tool: string
  plan_name: string
  emails_sent: number
  emails_remaining: number | null
  contacts_used: number | null
  contacts_max: number | null
  reset_date: string | null
  connected: boolean
  error: string | null
}

export interface ToolCampaign {
  id: string
  name: string
  status: string
  sent: number
  open_rate: number
  reply_rate: number
  click_rate: number
  bounce_rate: number
  unsubscribes: number
}

export interface ToolAggregate {
  emails_sent: number
  open_rate: number
  reply_rate: number
  click_rate: number
  bounce_rate: number
}

export interface ToolOverviewResult {
  tool: string
  name: string
  connected: boolean
  quota: ToolQuota
  aggregate: ToolAggregate
}

export interface AllToolsOverview {
  tools: ToolOverviewResult[]
  grand_total: ToolAggregate
  error: string | null
}

export interface ToolCampaignsData {
  campaigns: ToolCampaign[]
  error: string | null
}

export interface ToolDailyStat {
  date: string
  sent: number
  opened: number
  replies: number
  clicks: number
  bounced: number
}

export interface ToolDailyData {
  daily: ToolDailyStat[]
  error: string | null
}

// ---------------------------------------------------------------------------
// AI Assistant types
// ---------------------------------------------------------------------------

export interface LeadGroup {
  id: string
  name: string
  description?: string
  members: string[]
  created_at?: string
}

// ---------------------------------------------------------------------------
// Email Module types
// ---------------------------------------------------------------------------

export type EmailPlatform = 'instantly' | 'convertkit' | 'lemlist' | 'smartlead'
export type HealthStatus = 'healthy' | 'near_limit' | 'maxed'

export interface PlatformConnection {
  id: string
  email_account_id: string
  platform: EmailPlatform
  allocated_daily_limit: number
  platform_account_id?: string
  is_active: boolean
  created_at?: string
}

export interface EmailSyncSnapshot {
  id: string
  email_account_id: string
  platform: EmailPlatform
  sync_date: string
  synced_at?: string
  sent: number
  opened: number
  clicked: number
  replied: number
  bounced: number
  unsubscribed: number
}

export interface EmailAnalyticsDaily {
  id: string
  email_account_id: string
  analytics_date: string
  total_sent: number
  total_opened: number
  total_clicked: number
  total_replied: number
  total_bounced: number
  total_unsubscribed: number
  open_rate?: number
  click_rate?: number
  reply_rate?: number
  bounce_rate?: number
  unsub_rate?: number
  global_limit?: number
  total_allocated?: number
  remaining?: number
  computed_at?: string
}

export interface EmailAccount {
  id: string
  email: string
  global_daily_limit: number
  warmup_score?: number
  created_at?: string
  updated_at?: string
  platform_connections?: PlatformConnection[]
  today?: EmailAnalyticsDaily | null
  snapshots_today?: EmailSyncSnapshot[]
}

export interface EmailOverview {
  total_accounts: number
  total_limit: number
  total_allocated: number
  total_sent: number
  remaining: number
  total_opened: number
  total_clicked: number
  total_replied: number
  total_bounced: number
  total_unsubscribed: number
  open_rate: number
  click_rate: number
  reply_rate: number
  bounce_rate: number
  unsub_rate: number
}

export interface EmailPlatformMetrics {
  platform: EmailPlatform
  connected_accounts: number
  total_allocated: number
  total_sent: number
  remaining: number
  total_opened: number
  total_clicked: number
  total_replied: number
  total_bounced: number
  total_unsubscribed: number
  open_rate: number
  click_rate: number
  reply_rate: number
  bounce_rate: number
  unsub_rate: number
  snapshots: EmailSyncSnapshot[]
}

export interface SyncStatus {
  last_sync: string | null
  errors: Record<string, string>
  note?: string
}

// ===========================================================================
// Open Intelligence Types
// ===========================================================================

export interface OpenIntelligenceFilters {
  dateFrom: string | null
  dateTo: string | null
  campaignId: string | null
  country: string | null
  specialty: string | null
}

export interface SubjectLineRow {
  campaign_id: string
  campaign_name: string
  step_number: number
  variant_id: string
  subject_line: string
  body_angle: string
  body_preview: string
  unique_opens: number
  total_opens: number
  re_open_rate: number
}

export interface SubjectLinesResponse {
  items: SubjectLineRow[]
  total: number
}

export interface ABVariant {
  variant_id: string
  subject_line: string
  body_angle: string
  body_preview: string
  unique_opens: number
  total_opens: number
}

export interface ABComparisonResponse {
  campaign_id: string
  step_number: number
  variants: ABVariant[]
}

export interface AngleRow {
  body_angle: string
  unique_opens: number
  total_opens: number
}

export interface AnglesResponse {
  items: AngleRow[]
}

export interface StepPerformanceRow {
  step_number: number
  unique_opens: number
  total_opens: number
  emails_sent: number
  open_rate: number | null
}

export interface StepPerformanceResponse {
  items: StepPerformanceRow[]
}

export interface HeatmapCell {
  day: number   // 0=Mon, 6=Sun
  hour: number  // 0-23
  count: number
}

export interface TimeHeatmapResponse {
  cells: HeatmapCell[]
  max_count: number
}

export interface PeakHour {
  hour: number
  count: number
}

export interface PeakHoursResponse {
  country: string
  peak_hours: PeakHour[]
}

export interface OIInsight {
  type: string
  message: string
  priority: number
}

export interface InsightsResponse {
  insights: OIInsight[]
}

export interface HotLead {
  lead_email: string
  campaign_id: string
  campaign_name: string | null
  step_number: number
  variant_id: string
  subject_line: string | null
  lead_country: string | null
  lead_specialty: string | null
  open_number: number
}

export interface HotLeadsResponse {
  items: HotLead[]
}

export interface TemplateTag {
  id: string
  campaign_id: string
  step_number: number
  variant_id: string
  subject_line: string | null
  body_preview: string | null
  body_angle: string
  tagged_by: string | null
  tagged_at: string
}

export interface TagsResponse {
  items: TemplateTag[]
}

export interface TagCreatePayload {
  campaign_id: string
  step_number: number
  variant_id?: string
  subject_line?: string
  body_preview?: string
  body_angle: string
  tagged_by?: string
}

export interface TagUpdatePayload {
  body_angle?: string
  subject_line?: string
  body_preview?: string
  tagged_by?: string
}


