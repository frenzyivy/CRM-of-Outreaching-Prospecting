// ─── Dashboard Data ───
// All data exports are empty/zeroed. Connect to your backend API to populate.

// ─── KPI Data ───
export interface EnhancedKPI {
  meetingsToday: number
  nextMeetingInHours: number
  responseRate: number
  responseRateChange: number
  pipelineValue: number
  pipelineValueChange: number
  conversionRate: number
  conversionRateChange: number
  totalLeadsChange: number
  outreachesChange: number
  emailsChange: number
  callsChange: number
}

export const enhancedKPIs: EnhancedKPI = {
  meetingsToday: 0,
  nextMeetingInHours: 0,
  responseRate: 0,
  responseRateChange: 0,
  pipelineValue: 0,
  pipelineValueChange: 0,
  conversionRate: 0,
  conversionRateChange: 0,
  totalLeadsChange: 0,
  outreachesChange: 0,
  emailsChange: 0,
  callsChange: 0,
}

// ─── Activity Feed ───
export type ActivityAction = 'email_sent' | 'call_made' | 'call_answered' | 'call_missed' | 'meeting_booked' | 'follow_up' | 'stage_change' | 'email_replied'

export interface ActivityFeedItem {
  id: string
  timestamp: string
  action: ActivityAction
  contactName: string
  company: string
  result: string
  category: 'email' | 'call' | 'meeting' | 'pipeline'
}

export const activityFeed: ActivityFeedItem[] = []

// ─── Today's Schedule ───
export interface ScheduleItem {
  id: string
  time: string
  endTime: string
  contactName: string
  company: string
  meetingType: 'intro_call' | 'demo' | 'follow_up' | 'proposal_review'
  status: 'confirmed' | 'pending' | 'rescheduled'
  joinLink?: string
}

export const todaySchedule: ScheduleItem[] = []

export const weekSchedule: ScheduleItem[] = []

// ─── Geographic Distribution ───
export interface GeoData {
  country: string
  code: string
  leads: number
  companies: number
  responseRate: number
}

export const geographicData: GeoData[] = []

// ─── Prospecting Trend (30 days) ───
export interface ProspectingDay {
  date: string
  leadsAdded: number
  emailsSent: number
  callsMade: number
  repliesReceived: number
  emailsMA7?: number
  callsMA7?: number
  repliesMA7?: number
}

export const prospectingData: ProspectingDay[] = []

// ─── Lead Segmentation ───
export interface SegmentData {
  name: string
  value: number
  color: string
}

export const companyTypeSegments: SegmentData[] = []

export const companySizeSegments: SegmentData[] = []

export const leadSourceSegments: SegmentData[] = []

// ─── Pipeline Funnel ───
export interface FunnelStage {
  stage: string
  label: string
  count: number
  color: string
}

export const funnelData: FunnelStage[] = []

// ─── Pipeline Velocity ───
export interface VelocityStage {
  stage: string
  label: string
  avgDays: number
  benchmark: number
}

export const velocityData: VelocityStage[] = []

export const avgSalesCycleLength = 0

// ─── Stage Movement ───
export interface StageMovement {
  from: string
  fromLabel: string
  to: string
  toLabel: string
  count: number
  direction: 'positive' | 'negative'
}

export const stageMovements: StageMovement[] = []

// ─── Email Performance ───
export interface EmailFunnelStep {
  label: string
  value: number
  rate?: number
}

export const emailFunnel: EmailFunnelStep[] = []

export interface EmailTemplate {
  subject: string
  openRate: number
  replyRate: number
  sent: number
}

export const topTemplates: EmailTemplate[] = []

export const emailHeatmap: { day: number; hour: number; value: number }[] = []

// ─── Call Performance ───
export interface CallMetrics {
  totalCalls: number
  connected: number
  avgDuration: string
  meetingsFromCalls: number
  connectRate: number
}

export const callMetrics: CallMetrics = {
  totalCalls: 0,
  connected: 0,
  avgDuration: '0:00',
  meetingsFromCalls: 0,
  connectRate: 0,
}

export interface CallOutcome {
  label: string
  value: number
  color: string
}

export const callOutcomes: CallOutcome[] = []

export const callHeatmap: { day: number; hour: number; value: number }[] = []

// ─── Follow-up Effectiveness ───
export interface FollowUpData {
  followUpNumber: number
  label: string
  responseRate: number
  totalSent: number
  replies: number
}

export const followUpData: FollowUpData[] = []

export const followUpTimingData: { delayDays: number; responseRate: number }[] = []

export const optimalFollowUps = 0

// ─── Deal Tracker ───
export interface DealStageValue {
  stage: string
  label: string
  value: number
  weightedValue: number
  probability: number
  count: number
}

export const dealStageValues: DealStageValue[] = []

export const avgDealSize = 0
export const totalPipelineValue = 0
export const weightedPipelineValue = 0

// ─── Revenue Forecast ───
export interface ForecastScenario {
  label: string
  value: number
  color: string
}

export const monthlyForecast: ForecastScenario[] = []

export const quarterlyForecast: ForecastScenario[] = []

export const monthlyTarget = 0
export const quarterlyTarget = 0

// ─── Won vs Lost Analysis ───
export interface WonLostMonth {
  month: string
  won: number
  lost: number
  winRate: number
}

export const wonLostHistory: WonLostMonth[] = []

export interface LostReason {
  reason: string
  count: number
}

export const lostReasons: LostReason[] = []

// ─── Filter Options ───
export const filterOptions = {
  dateRanges: ['Today', 'This Week', 'This Month', 'Custom'] as const,
  countries: ['All'] as const,
  companyTypes: ['All'] as const,
  pipelineStages: ['All', 'New', 'Researched', 'Email Sent', 'Follow-up 1', 'Follow-up 2', 'Responded', 'Meeting', 'Proposal', 'Closed Won', 'Closed Lost'] as const,
}

export type DateRange = (typeof filterOptions.dateRanges)[number]
