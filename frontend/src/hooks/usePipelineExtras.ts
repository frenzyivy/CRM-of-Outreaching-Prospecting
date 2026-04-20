import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

// ─── Types ────────────────────────────────────────────────────────────────

export interface PipelineSummary {
  open_leads: number
  won_leads: number
  closed_leads: number
  cold_pool: number
  stuck_leads: number
  close_rate_pct: number
  avg_deal_value_eur: number
  weighted_pipeline_eur: number
  value_source: 'placeholder' | 'deals_table'
  stage_counts: Record<string, number>
}

export type LeakageAlertType =
  | 'stuck_followup2'
  | 'no_post_meeting_followup'
  | 'unanswered_positive_replies'
  | 'ghosted'
  | 'stale_proposals'

export interface LeakageAlert {
  alert_type: LeakageAlertType
  title: string
  count: number
  total_value: number | null
  severity: 'danger' | 'warn' | 'brand'
  cta: { action: string; label: string }
}

export interface LeakageResponse {
  alerts: LeakageAlert[]
  total: number
}

// ─── Hooks ────────────────────────────────────────────────────────────────

export function usePipelineSummary() {
  return useQuery<PipelineSummary>({
    queryKey: ['pipeline', 'summary'],
    queryFn: async () => (await api.get('/pipeline/summary')).data,
    staleTime: 60_000,
  })
}

export function useLeakageAlerts() {
  return useQuery<LeakageResponse>({
    queryKey: ['leakage', 'alerts'],
    queryFn: async () => (await api.get('/leakage/alerts')).data,
    staleTime: 60_000,
  })
}

export interface BulkActionResult {
  alert_type: LeakageAlertType
  action: string
  queued: number
  requested: number
}

export function useLeakageBulkAction() {
  const qc = useQueryClient()
  return useMutation<BulkActionResult, Error, { alertType: LeakageAlertType; leadIds?: string[]; note?: string }>({
    mutationFn: async ({ alertType, leadIds, note }) => {
      const res = await api.post(`/leakage/alerts/${alertType}/bulk-action`, {
        lead_ids: leadIds,
        note,
      })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leakage'] })
      qc.invalidateQueries({ queryKey: ['pipeline'] })
    },
  })
}
