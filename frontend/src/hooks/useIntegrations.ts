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
    staleTime: Infinity,   // status only changes on connect/disconnect — invalidated then
    gcTime: Infinity,      // keep in cache for the whole session
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

export function useDisconnectIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (integration_id: string) =>
      (await api.post('/integrations/disconnect', { integration_id })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations-status'] }),
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
