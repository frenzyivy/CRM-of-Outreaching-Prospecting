import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import type { EmailOverviewData, EmailDailyData, EmailCountryData, EmailLeadsData } from '../types'
import { useIntegrationsStatus } from './useIntegrations'

const SYNC_INTERVAL = 60_000 // 1 min auto-sync

export function useEmailOverview() {
  const { data: intStatus } = useIntegrationsStatus()
  const enabled = intStatus?.instantly?.connected ?? false
  return useQuery<EmailOverviewData>({
    queryKey: ['email-overview'],
    queryFn: async () => (await api.get('/email/overview')).data,
    refetchInterval: SYNC_INTERVAL,
    enabled,
  })
}

export function useEmailDaily() {
  const { data: intStatus } = useIntegrationsStatus()
  const enabled = intStatus?.instantly?.connected ?? false
  return useQuery<EmailDailyData>({
    queryKey: ['email-daily'],
    queryFn: async () => (await api.get('/email/daily')).data,
    refetchInterval: SYNC_INTERVAL,
    enabled,
  })
}

export function useEmailCountries() {
  const { data: intStatus } = useIntegrationsStatus()
  const enabled = intStatus?.instantly?.connected ?? false
  return useQuery<EmailCountryData>({
    queryKey: ['email-countries'],
    queryFn: async () => (await api.get('/email/countries')).data,
    refetchInterval: SYNC_INTERVAL,
    enabled,
  })
}

export function useEmailLeads() {
  const { data: intStatus } = useIntegrationsStatus()
  const enabled = intStatus?.instantly?.connected ?? false
  return useQuery<EmailLeadsData>({
    queryKey: ['email-leads'],
    queryFn: async () => (await api.get('/email/leads')).data,
    refetchInterval: SYNC_INTERVAL,
    enabled,
  })
}

export function useRefreshEmail() {
  const qc = useQueryClient()
  return async () => {
    await api.get('/email/refresh')
    qc.invalidateQueries({ queryKey: ['email-overview'] })
    qc.invalidateQueries({ queryKey: ['email-daily'] })
    qc.invalidateQueries({ queryKey: ['email-countries'] })
    qc.invalidateQueries({ queryKey: ['email-leads'] })
  }
}
