import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import type {
  OpenIntelligenceFilters,
  SubjectLinesResponse,
  ABComparisonResponse,
  AnglesResponse,
  StepPerformanceResponse,
  TimeHeatmapResponse,
  PeakHoursResponse,
  InsightsResponse,
  HotLeadsResponse,
  TagsResponse,
  TagCreatePayload,
  TagUpdatePayload,
} from '../types'

const BASE = '/email/open-intelligence'
const STALE = 5 * 60_000 // 5 minutes

function buildParams(f: Partial<OpenIntelligenceFilters>): Record<string, string> {
  const p: Record<string, string> = {}
  if (f.dateFrom)   p['date_from']   = f.dateFrom
  if (f.dateTo)     p['date_to']     = f.dateTo
  if (f.campaignId) p['campaign_id'] = f.campaignId
  if (f.country)    p['country']     = f.country
  if (f.specialty)  p['specialty']   = f.specialty
  return p
}

export function useSubjectLines(
  filters: Partial<OpenIntelligenceFilters> & { sortBy?: string; sortOrder?: string }
) {
  const params = {
    ...buildParams(filters),
    ...(filters.sortBy    ? { sort_by:    filters.sortBy }    : {}),
    ...(filters.sortOrder ? { sort_order: filters.sortOrder } : {}),
  }
  return useQuery<SubjectLinesResponse>({
    queryKey: ['oi-subject-lines', params],
    queryFn:  async () => (await api.get(`${BASE}/subject-lines`, { params })).data,
    staleTime: STALE,
  })
}

export function useABComparison(
  campaignId: string | null,
  stepNumber: number | null,
) {
  return useQuery<ABComparisonResponse>({
    queryKey: ['oi-ab-comparison', campaignId, stepNumber],
    queryFn:  async () =>
      (await api.get(`${BASE}/ab-comparison`, {
        params: { campaign_id: campaignId, step_number: stepNumber },
      })).data,
    enabled:  !!campaignId && stepNumber !== null,
    staleTime: STALE,
  })
}

export function useAngles(filters: Partial<OpenIntelligenceFilters>) {
  const params = buildParams(filters)
  return useQuery<AnglesResponse>({
    queryKey: ['oi-angles', params],
    queryFn:  async () => (await api.get(`${BASE}/angles`, { params })).data,
    staleTime: STALE,
  })
}

export function useStepPerformance(filters: Partial<OpenIntelligenceFilters>) {
  const params = buildParams(filters)
  return useQuery<StepPerformanceResponse>({
    queryKey: ['oi-step-performance', params],
    queryFn:  async () => (await api.get(`${BASE}/step-performance`, { params })).data,
    staleTime: STALE,
  })
}

export function useTimeHeatmap(filters: Partial<OpenIntelligenceFilters>) {
  const params = buildParams(filters)
  return useQuery<TimeHeatmapResponse>({
    queryKey: ['oi-time-heatmap', params],
    queryFn:  async () => (await api.get(`${BASE}/time-heatmap`, { params })).data,
    staleTime: STALE,
  })
}

export function usePeakHours(country: string | null) {
  return useQuery<PeakHoursResponse>({
    queryKey: ['oi-peak-hours', country],
    queryFn:  async () =>
      (await api.get(`${BASE}/peak-hours`, { params: { country } })).data,
    enabled:  !!country,
    staleTime: STALE,
  })
}

export function useInsights(filters: Partial<OpenIntelligenceFilters>) {
  const params = buildParams(filters)
  return useQuery<InsightsResponse>({
    queryKey: ['oi-insights', params],
    queryFn:  async () => (await api.get(`${BASE}/insights`, { params })).data,
    staleTime: STALE,
  })
}

export function useHotLeads() {
  return useQuery<HotLeadsResponse>({
    queryKey: ['oi-hot-leads'],
    queryFn:  async () => (await api.get(`${BASE}/hot-leads`)).data,
    staleTime: STALE,
  })
}

export function useTags(campaignId?: string | null) {
  return useQuery<TagsResponse>({
    queryKey: ['oi-tags', campaignId],
    queryFn:  async () =>
      (await api.get(`${BASE}/tags`, {
        params: campaignId ? { campaign_id: campaignId } : {},
      })).data,
    staleTime: STALE,
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: TagCreatePayload) => api.post(`${BASE}/tags`, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['oi-tags'] }),
  })
}

export function useUpdateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TagUpdatePayload }) =>
      api.put(`${BASE}/tags/${id}`, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['oi-tags'] }),
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`${BASE}/tags/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['oi-tags'] }),
  })
}

export function useSyncOpenEvents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`${BASE}/sync`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oi-subject-lines'] })
      qc.invalidateQueries({ queryKey: ['oi-angles'] })
      qc.invalidateQueries({ queryKey: ['oi-step-performance'] })
      qc.invalidateQueries({ queryKey: ['oi-time-heatmap'] })
      qc.invalidateQueries({ queryKey: ['oi-peak-hours'] })
      qc.invalidateQueries({ queryKey: ['oi-insights'] })
      qc.invalidateQueries({ queryKey: ['oi-hot-leads'] })
    },
  })
}
