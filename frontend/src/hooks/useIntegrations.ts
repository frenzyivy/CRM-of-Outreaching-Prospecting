import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

export interface IntegrationStatus {
  connected: boolean
  partial: boolean
}

export type IntegrationsStatusMap = Record<string, IntegrationStatus>

export function useIntegrationsStatus() {
  return useQuery<IntegrationsStatusMap>({
    queryKey: ['integrations-status'],
    queryFn: async () => (await api.get('/integrations/status')).data,
    staleTime: 30_000,     // re-check every 30s so key changes in .env are picked up
    gcTime: Infinity,
  })
}

export function useConnectIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { integration_id: string; credentials: Record<string, string> }) =>
      (await api.post('/integrations/connect', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations-status'] }),
  })
}

// Map integration IDs to the query keys they power — when disconnected, clear stale data
const INTEGRATION_QUERY_KEYS: Record<string, string[][]> = {
  instantly: [['email-overview'], ['email-daily'], ['email-countries'], ['email-leads']],
  whatsapp: [['whatsapp-analytics']],
}

export function useDisconnectIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (integration_id: string) =>
      (await api.post('/integrations/disconnect', { integration_id })).data,
    onSuccess: (_data, integration_id) => {
      qc.invalidateQueries({ queryKey: ['integrations-status'] })
      // Clear cached data for the disconnected integration's channels
      const keys = INTEGRATION_QUERY_KEYS[integration_id]
      if (keys) {
        keys.forEach((key) => qc.removeQueries({ queryKey: key }))
      }
    },
  })
}

export function useIntegrationCredentials(integration_id: string, enabled: boolean) {
  return useQuery<Record<string, string>>({
    queryKey: ['integrations-credentials', integration_id],
    queryFn: async () => (await api.get(`/integrations/${integration_id}/credentials`)).data,
    enabled,
    staleTime: 0,
  })
}
