import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import api from '../api/client'
import type {
  EmailOverviewData, EmailDailyData, EmailCountryData, EmailLeadsData,
  AllToolsOverview, ToolCampaignsData, ToolDailyData, EmailPlatformId,
  InstantlySyncStatus, CampaignDetail,
} from '../types'
import { useIntegrationsStatus } from './useIntegrations'

const SYNC_INTERVAL = 60_000 // 1 min auto-sync
const SYNC_STATUS_INTERVAL = 10_000 // 10s for sync status bar

export interface DateRange {
  dateFrom: string | null
  dateTo: string | null
}

function buildDateParams(range?: DateRange) {
  if (!range) return {}
  const params: Record<string, string> = {}
  if (range.dateFrom) params['date_from'] = range.dateFrom
  if (range.dateTo) params['date_to'] = range.dateTo
  return params
}

export function useEmailOverview(range?: DateRange) {
  const { data: intStatus } = useIntegrationsStatus()
  const enabled = intStatus?.instantly?.connected ?? false
  return useQuery<EmailOverviewData>({
    queryKey: ['email-overview', range?.dateFrom, range?.dateTo],
    queryFn: async () =>
      (await api.get('/email/overview', { params: buildDateParams(range) })).data,
    refetchInterval: SYNC_INTERVAL,
    enabled,
  })
}

export function useEmailDaily(range?: DateRange) {
  const { data: intStatus } = useIntegrationsStatus()
  const enabled = intStatus?.instantly?.connected ?? false
  return useQuery<EmailDailyData>({
    queryKey: ['email-daily', range?.dateFrom, range?.dateTo],
    queryFn: async () =>
      (await api.get('/email/daily', { params: buildDateParams(range) })).data,
    refetchInterval: SYNC_INTERVAL,
    enabled,
  })
}

export function useEmailCountries(range?: DateRange) {
  const { data: intStatus } = useIntegrationsStatus()
  const enabled = intStatus?.instantly?.connected ?? false
  return useQuery<EmailCountryData>({
    queryKey: ['email-countries', range?.dateFrom, range?.dateTo],
    queryFn: async () =>
      (await api.get('/email/countries', { params: buildDateParams(range) })).data,
    refetchInterval: SYNC_INTERVAL,
    enabled,
  })
}

export function useEmailLeads(range?: DateRange) {
  const { data: intStatus } = useIntegrationsStatus()
  const enabled = intStatus?.instantly?.connected ?? false
  return useQuery<EmailLeadsData>({
    queryKey: ['email-leads', range?.dateFrom, range?.dateTo],
    queryFn: async () =>
      (await api.get('/email/leads', { params: buildDateParams(range) })).data,
    refetchInterval: SYNC_INTERVAL,
    enabled,
  })
}

export function useRefreshEmail(range?: DateRange) {
  const qc = useQueryClient()
  return async () => {
    await api.get('/email/refresh', { params: buildDateParams(range) })
    qc.invalidateQueries({ queryKey: ['email-overview'] })
    qc.invalidateQueries({ queryKey: ['email-daily'] })
    qc.invalidateQueries({ queryKey: ['email-countries'] })
    qc.invalidateQueries({ queryKey: ['email-leads'] })
    qc.invalidateQueries({ queryKey: ['email-sync-status'] })
  }
}

export function useEmailSyncStatus() {
  return useQuery<InstantlySyncStatus>({
    queryKey: ['email-sync-status'],
    queryFn: async () => (await api.get('/email/sync-status')).data,
    refetchInterval: SYNC_STATUS_INTERVAL,
  })
}

export function useCampaignDetail(campaignId: string | null, range?: DateRange) {
  return useQuery<CampaignDetail>({
    queryKey: ['email-campaign-detail', campaignId, range?.dateFrom, range?.dateTo],
    queryFn: async () =>
      (await api.get(`/email/campaign/${campaignId}`, { params: buildDateParams(range) })).data,
    enabled: !!campaignId,
  })
}

// --- Multi-tool hooks ---

export function useAllToolsOverview() {
  return useQuery<AllToolsOverview>({
    queryKey: ['email-all-overview'],
    queryFn: async () => (await api.get('/email/all/overview')).data,
    refetchInterval: SYNC_INTERVAL,
  })
}

export function useToolCampaigns(tool: string) {
  return useQuery<ToolCampaignsData>({
    queryKey: ['email-tool-campaigns', tool],
    queryFn: async () => (await api.get(`/email/${tool}/campaigns`)).data,
    refetchInterval: SYNC_INTERVAL,
    enabled: !!tool,
  })
}

export function useToolDaily(tool: string, days = 30) {
  return useQuery<ToolDailyData>({
    queryKey: ['email-tool-daily', tool, days],
    queryFn: async () => (await api.get(`/email/${tool}/daily`, { params: { days } })).data,
    refetchInterval: SYNC_INTERVAL,
    enabled: !!tool,
  })
}

export function useSetLeadPlatform() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ leadId, platform }: { leadId: string; platform: EmailPlatformId | null }) =>
      api.patch(`/leads/${leadId}/email-platform`, { platform }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['people'] })
    },
  })
}

export function useBulkAssignPlatform() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ leadIds, platform }: { leadIds: string[]; platform: EmailPlatformId | null }) =>
      api.post('/leads/bulk-assign-platform', { lead_ids: leadIds, platform }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['people'] })
    },
  })
}
