import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import type { SyncPreview, SyncCampaign, SyncPushResult } from '../types'

export function useSyncPreview() {
  return useQuery<SyncPreview>({
    queryKey: ['sync-preview'],
    queryFn: async () => (await api.get('/sync/preview')).data,
    refetchOnWindowFocus: false,
  })
}

export function useSyncCampaigns() {
  return useQuery<SyncCampaign[]>({
    queryKey: ['sync-campaigns'],
    queryFn: async () => (await api.get('/sync/campaigns')).data,
    refetchOnWindowFocus: false,
  })
}

export function useSyncPush() {
  const qc = useQueryClient()
  return useMutation<SyncPushResult, Error, { campaign_id: string; lead_emails: string[] | null }>({
    mutationFn: async (body) => (await api.post('/sync/push', body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sync-preview'] })
      qc.invalidateQueries({ queryKey: ['email-leads'] })
      qc.invalidateQueries({ queryKey: ['email-overview'] })
    },
  })
}
