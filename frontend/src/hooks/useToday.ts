import { useQuery } from '@tanstack/react-query'
import api from '../api/client'

// ---------- Types ----------

export interface ChampionLead {
  id: string
  name: string
  company: string | null
  country: string | null
  stage: string | null
  intent_score: number
  opens_30d: number
  replies_30d: number
  clicks_30d: number
  days_since_touch: number | null
  primary_signal: string
  suggested_action: 'close' | 'reply' | 'prep' | 'view'
  cta_label: string
}

export interface ChampionsResponse {
  leads: ChampionLead[]
  has_scored_data: boolean
}

export type GoalMetric = 'mrr' | 'meetings_booked' | 'replies_received' | 'outreach_volume'

export interface GoalProgress {
  id: string
  metric: GoalMetric
  target_value: number
  current_value: number
  period_start: string
  period_end: string
  days_remaining: number
  days_elapsed: number
  days_total: number
  pace_expected: number
  status: 'ahead' | 'on_pace' | 'slightly_behind' | 'behind'
}

export interface GoalsResponse {
  goals: GoalProgress[]
  period_start: string
  period_end: string
  period_label: string
}

export interface DigestHighlight {
  type: 'up' | 'down' | 'neutral'
  text: string
}

export interface DailyDigest {
  digest_date: string
  stats: {
    emails_sent: number
    replies: number
    meetings: number
    closed_won: number
  }
  highlights: DigestHighlight[]
  generated_at: string | null
}

export interface StreakDay {
  date: string
  level: 0 | 1 | 2 | 3 | 4
}

export interface StreakResponse {
  current_streak: number
  longest_streak: number
  days: StreakDay[]
}

// ---------- Hooks ----------

export function useChampionLeads() {
  return useQuery<ChampionsResponse>({
    queryKey: ['today', 'champions'],
    queryFn: async () => (await api.get('/today/champions')).data,
  })
}

export function useGoalsCurrent() {
  return useQuery<GoalsResponse>({
    queryKey: ['today', 'goals'],
    queryFn: async () => (await api.get('/goals/current')).data,
  })
}

export function useLatestDigest() {
  return useQuery<DailyDigest>({
    queryKey: ['today', 'digest'],
    queryFn: async () => (await api.get('/digests/latest')).data,
  })
}

export function useActivityStreak() {
  return useQuery<StreakResponse>({
    queryKey: ['today', 'streak'],
    queryFn: async () => (await api.get('/activity/streak')).data,
  })
}
